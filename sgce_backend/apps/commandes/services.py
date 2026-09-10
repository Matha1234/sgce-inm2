"""
Services metier du domaine Devis & Estimation / Production & Stock.

Comble un ecart identifie entre le memoire (chapitre 5) et le code : la
section 5.10.4 (diagramme de sequence UC-03) et les regles RG4/RG5/RG8/RG34
decrivent un declenchement AUTOMATIQUE, par signal, de la generation du
dossier de fabrication a la validation du devis - alors que le code ne
proposait jusqu'ici qu'une creation manuelle (DossierFabricationListCreateView).

`generer_dossier_fabrication` est appele depuis DevisDetailView des qu'un
devis passe a valide=True (RG4) et réalise, en une seule transaction :

  1. RG8 : affectation a l'atelier (SPA/SPB) le moins charge parmi les
     ateliers de reference (equilibrage de charge entre machines) ;
  2. RG7 : generation des etapes de production a partir de la gamme
     d'operations reellement engagee au devis (LigneOperationDevis),
     composant par composant, dans l'ordre d'execution ;
  3. RG34 : reservation des matieres premieres necessaires (mouvement
     RESERVATION), agregee par article, avant toute sortie physique
     reelle - avec verification de disponibilite (RG11) via le modele
     MouvementStock existant.

Idempotent : ne fait rien si la commande dispose deja d'un dossier (RG5 -
« une seule fois par commande »).
"""

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Count, Q

from .models import (
    Atelier,
    DossierFabrication,
    EtapeProduction,
    LigneMatiereDevis,
    LigneOperationDevis,
    MouvementStock,
)


def _choisir_atelier_le_moins_charge():
    """
    RG8 : « l'affectation d'un dossier à un atelier équilibre la charge
    entre les machines disponibles ». Choisit l'atelier de reference
    (SPA/SPB) ayant le moins de dossiers actifs (non termines) en cours.
    """
    ateliers = list(
        Atelier.objects.annotate(
            charge_active=Count(
                "dossiers",
                filter=~Q(dossiers__statut_production=DossierFabrication.Statut.TERMINE),
            )
        ).order_by("charge_active", "nom")
    )
    if not ateliers:
        raise ValidationError(
            "Aucun atelier de référence (SPA/SPB) n'est configuré : "
            "impossible d'affecter automatiquement le dossier de "
            "fabrication (RG6)."
        )
    return ateliers[0]


def generer_dossier_fabrication(devis):
    """
    RG4/RG5 (mise à jour STI, UC-03) : génère automatiquement le dossier
    de fabrication d'une commande à la validation de son devis.

    Retourne le dossier créé, ou le dossier déjà existant (idempotent,
    RG5 : une seule fois par commande).
    """
    commande = devis.commande
    if hasattr(commande, "dossier_fabrication"):
        return commande.dossier_fabrication

    with transaction.atomic():
        atelier = _choisir_atelier_le_moins_charge()
        dossier = DossierFabrication.objects.create(commande=commande, atelier=atelier)

        # Correctif de coherence (meme logique que DossierFabricationSerializer
        # cote creation manuelle) : Commande.atelier (texte, utilise par le
        # module IA) doit rester synchronise avec l'affectation reelle (RG6).
        if commande.atelier != atelier.nom:
            commande.atelier = atelier.nom
            commande.save(update_fields=["atelier"])

        # RG7 : une ou plusieurs etapes de production, generees a partir de
        # la gamme d'operations effectivement engagee au devis (et non du
        # catalogue générique - RG35/RG39), composant par composant, dans
        # l'ordre d'execution.
        lignes_operation = (
            LigneOperationDevis.objects.filter(ligne_devis__devis=devis)
            .select_related("poste", "ligne_devis__composant")
            .order_by("ligne_devis__composant__ordre", "ordre_execution")
        )
        for rang, ligne in enumerate(lignes_operation, start=1):
            EtapeProduction.objects.create(
                dossier=dossier,
                ordre=rang,
                libelle=f"{ligne.ligne_devis.composant.designation} — {ligne.poste.nom}",
                poste=ligne.poste,
            )

        # RG34 : réservation des matières nécessaires avant toute sortie
        # physique réelle, agrégée par article (plusieurs composants ou
        # options du devis peuvent partager le même article). La
        # vérification de disponibilité (RG11) est appliquée par
        # MouvementStock.save() : une réservation impossible fait échouer
        # toute la transaction, sans dossier orphelin ni réservation
        # partielle.
        besoins = {}
        lignes_matiere = LigneMatiereDevis.objects.filter(
            ligne_devis__devis=devis
        ).select_related("article")
        for ligne in lignes_matiere:
            besoins[ligne.article_id] = (
                besoins.get(ligne.article_id, Decimal("0")) + ligne.quantite_estimee
            )

        for article_id, quantite in besoins.items():
            if quantite <= 0:
                continue
            MouvementStock.objects.create(
                article_id=article_id,
                dossier=dossier,
                type_mouvement=MouvementStock.TypeMouvement.RESERVATION,
                quantite=quantite,
                commentaire=(
                    f"Réservation automatique à la génération du dossier "
                    f"{dossier.numero_dossier} (RG34)."
                ),
            )

    return dossier
