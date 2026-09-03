"""
Module Catalogue (mise a jour STI - memoire, section 5.2.5/5.2.6).

Contexte metier : plutot que de laisser l'Agent SDO ressaisir librement la
structure de cout de chaque commande, le SDO/STI ont clarifie un principe de
Catalogue de produits, decompose en composants numerotes, chacun porteur de
sa propre nomenclature de matieres premieres et de sa propre gamme
d'operations. Un Devis instancie ensuite ce catalogue pour une quantite
donnee (RG27), au lieu de recalculer une structure de cout ad hoc.

Bounded context : Referentiel & Catalogue (BC1, memoire section 5.8.1).
"""

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models


class FamilleProduit(models.Model):
    """
    Regroupe les produits du catalogue partageant un meme mode de calcul de
    cout (RG25). Le decoupage en familles evite de melanger des logiques de
    decomposition incompatibles (ex. feuille volante vs brochure reliee).
    """

    class Nom(models.TextChoices):
        FEUILLE_VOLANTE = "FEUILLE_VOLANTE", "Feuille volante"
        BROCHURE = "BROCHURE", "Brochure"
        MAGAZINE_LIVRE = "MAGAZINE_LIVRE", "Magazine / Livre / Agenda"
        CARNET_REGISTRE = "CARNET_REGISTRE", "Carnet de factures / Registre"

    nom = models.CharField(max_length=30, choices=Nom.choices, unique=True)
    structure_type = models.CharField(
        max_length=30, blank=True,
        help_text="Description libre du mode de décomposition attendu pour cette famille.",
    )

    class Meta:
        db_table = "familles_produits"
        verbose_name = "Famille de produits"
        verbose_name_plural = "Familles de produits"
        ordering = ["nom"]

    def __str__(self):
        return self.get_nom_display()


class Produit(models.Model):
    """
    Modele du catalogue (ex. « Registre 150p », « Agenda », « Flyer A4 »),
    instancie par un Devis pour une quantite donnee (RG27).

    RG36 (mise a jour STI) : le produit porte une fourchette de marge
    acceptable (marge_min / marge_max), utilisee par le controle du prix
    de revient pour qualifier le resultat en SOUS_MARGE, DANS_LA_NORME
    ou SUR_MARGE.
    """

    famille = models.ForeignKey(
        FamilleProduit, on_delete=models.PROTECT, related_name="produits"
    )
    reference = models.CharField(
        max_length=30, blank=True,
        help_text="Reference interne du produit (optionnelle).",
    )
    nom = models.CharField(max_length=80)
    description = models.TextField(
        blank=True,
        help_text="Description libre du produit.",
    )
    actif = models.BooleanField(
        default=True,
        help_text="Un produit désactivé n'apparaît plus dans le choix du devis.",
    )
    marge_min = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("10"),
        help_text="Marge minimale acceptable (en %) — RG36.",
    )
    marge_max = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("30"),
        help_text="Marge maximale acceptable (en %) — RG36.",
    )
    date_maj = models.DateTimeField(
        auto_now=True,
        help_text="Date de derniere modification du produit.",
    )

    class Meta:
        db_table = "produits_catalogue"
        verbose_name = "Produit du catalogue"
        verbose_name_plural = "Produits du catalogue"
        ordering = ["famille__nom", "nom"]

    def __str__(self):
        return f"{self.nom} ({self.famille.get_nom_display()})"

    def calculer_prix_revient(self, quantite):
        """
        RG27 + RG29 (mise à jour STI) : calcule le prix de revient d'un
        devis instanciant ce produit pour `quantite` exemplaires.

        Une ligne (matière première ou opération) est qualifiée de charge
        fixe (indépendante du volume, ex. calage machine, création de
        plaques/clichés) ou de charge variable (proportionnelle à la
        quantité). La charge fixe est un coût de lot : elle est incluse en
        totalité dans le prix de revient et s'amortit sur la quantité totale
        commandée (coût par exemplaire = charge fixe / quantité) ; seule la
        part variable suit une règle de trois stricte sur le volume (RG29).

        Retourne un dictionnaire contenant le prix de revient total et le
        détail par composant (coûts matières, opérations, parts fixe et
        variable), qui sert de support prévisionnel à la génération des
        LigneDevis (RG27) puis à la comparaison du contrôle du prix de
        revient à la clôture (RG28).
        """
        if quantite is None or quantite <= 0:
            raise ValidationError("La quantité commandée doit être strictement positive (RG27).")

        quantite = Decimal(str(quantite))
        total = Decimal("0")
        detail_composants = []

        composants = self.composants.prefetch_related(
            "lignes_matiere_premiere__article", "lignes_operation__poste"
        )
        if not composants.exists():
            raise ValidationError(
                f"Le produit « {self.nom} » ne comporte aucun composant : "
                "impossible de calculer un prix de revient (RG26)."
            )

        for composant in composants:
            cout_matiere = Decimal("0")
            cout_operation = Decimal("0")
            part_fixe = Decimal("0")
            part_variable = Decimal("0")

            for ligne in composant.lignes_matiere_premiere.all():
                prix_article = ligne.article.cout_unitaire or Decimal("0")
                cout_ligne = ligne.quantite_unitaire * prix_article
                if ligne.type_charge == LigneMatierePremiere.TypeCharge.FIXE:
                    # Charge fixe : coût du lot entier (ex. plaques, calage),
                    # inclus en totalité dans le prix de revient et amorti
                    # par exemplaire (charge fixe / quantité).
                    part_fixe += cout_ligne
                    cout_matiere += cout_ligne
                else:
                    # Charge variable : coût unitaire × quantité (RG29).
                    part_variable += cout_ligne * quantite
                    cout_matiere += cout_ligne * quantite

            for ligne in composant.lignes_operation.all():
                cout_horaire = ligne.poste.cout_horaire or Decimal("0")
                # temps_unitaire est exprime en minutes (memoire, dictionnaire des donnees)
                cout_ligne = (ligne.temps_unitaire / Decimal("60")) * cout_horaire
                if ligne.type_charge == LigneOperation.TypeCharge.FIXE:
                    # Charge fixe (ex. calage machine) : coût du lot entier.
                    part_fixe += cout_ligne
                    cout_operation += cout_ligne
                else:
                    part_variable += cout_ligne * quantite
                    cout_operation += cout_ligne * quantite

            cout_composant = cout_matiere + cout_operation
            total += cout_composant
            detail_composants.append(
                {
                    "composant_id": composant.id,
                    "ordre": composant.ordre,
                    "designation": composant.designation,
                    "cout_matiere_estime": cout_matiere.quantize(Decimal("0.01")),
                    "cout_operation_estime": cout_operation.quantize(Decimal("0.01")),
                    "part_fixe_amortie": part_fixe.quantize(Decimal("0.01")),
                    "part_variable": part_variable.quantize(Decimal("0.01")),
                }
            )

        return {
            "prix_revient": total.quantize(Decimal("0.01")),
            "detail_composants": detail_composants,
        }


class Composant(models.Model):
    """
    Decomposition numerotee d'un produit du catalogue (RG26). Ex. pour une
    brochure : Composant 1 = Couverture, Composant 2 = Interieur.
    """

    produit = models.ForeignKey(Produit, on_delete=models.CASCADE, related_name="composants")
    ordre = models.PositiveSmallIntegerField(help_text="Rang du composant (1..N).")
    designation = models.CharField(max_length=60)

    class Meta:
        db_table = "composants_produit"
        verbose_name = "Composant"
        verbose_name_plural = "Composants"
        ordering = ["produit_id", "ordre"]
        unique_together = [("produit", "ordre")]

    def __str__(self):
        return f"{self.produit.nom} — Composant {self.ordre} ({self.designation})"

    def clean(self):
        if self.ordre is not None and self.ordre < 1:
            raise ValidationError({"ordre": "Le rang d'un composant doit être supérieur ou égal à 1 (RG26)."})


class PosteDeCharge(models.Model):
    """
    Poste de production automatisé ou manuel référencé par une ligne
    d'opération (RG31, mise à jour STI — ex-Machine). Son coût horaire
    couvre selon le cas l'amortissement et l'électricité (poste Machine),
    ou la main-d'œuvre directe (poste Manuel).
    """

    class TypePoste(models.TextChoices):
        MACHINE = "MACHINE", "Machine (amortissement + électricité)"
        MANUEL = "MANUEL", "Manuel (main-d'œuvre directe)"

    nom = models.CharField(max_length=60)
    type_poste = models.CharField(
        max_length=10, choices=TypePoste.choices, default=TypePoste.MACHINE,
        help_text="Nature du poste : automatisé (machine) ou manuel (RG31).",
    )
    cout_horaire = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        db_table = "postes_de_charge"
        verbose_name = "Poste de charge"
        verbose_name_plural = "Postes de charge"
        ordering = ["nom"]

    def __str__(self):
        return self.nom


class LigneMatierePremiere(models.Model):
    """
    Ligne de nomenclature d'un composant (RG26, RG27).

    RG29 (mise à jour STI) : la ligne est qualifiée de charge fixe
    (indépendante du volume, ex. plaques/clichés, calage) ou de charge
    variable (proportionnelle à la quantité). La part fixe est amortie sur
    la quantité totale commandée ; la part variable suit une règle de
    trois stricte sur le volume.
    """

    class TypeCharge(models.TextChoices):
        FIXE = "FIXE", "Charge fixe (amortie sur la quantité totale)"
        VARIABLE = "VARIABLE", "Charge variable (proportionnelle à la quantité)"

    composant = models.ForeignKey(
        Composant, on_delete=models.CASCADE, related_name="lignes_matiere_premiere"
    )
    article = models.ForeignKey(
        "commandes.Article", on_delete=models.PROTECT, related_name="lignes_catalogue"
    )
    quantite_unitaire = models.DecimalField(
        max_digits=10, decimal_places=3,
        help_text="Quantité de matière requise par exemplaire produit (ou par lot pour une charge fixe).",
    )
    type_charge = models.CharField(
        max_length=10, choices=TypeCharge.choices, default=TypeCharge.VARIABLE,
        help_text="Nature de la charge : fixe (amortie) ou variable (proportionnelle) — RG29.",
    )
    formule_calcul = models.CharField(
        max_length=255, blank=True,
        help_text="Formule spécifique pour les cas non strictement linéaires (optionnel).",
    )

    class Meta:
        db_table = "lignes_matiere_premiere_composant"
        verbose_name = "Ligne de matière première"
        verbose_name_plural = "Lignes de matière première"

    def __str__(self):
        return f"{self.composant} — {self.article.designation} ({self.quantite_unitaire})"


class LigneOperation(models.Model):
    """
    Ligne de gamme d'un composant (RG26, RG27).

    RG29 (mise à jour STI) : comme pour la matière première, la ligne est
    qualifiée de charge fixe (ex. calage machine, montage de la plaque)
    ou de charge variable (ex. impression, pliage, piquage par exemplaire).
    """

    class TypeCharge(models.TextChoices):
        FIXE = "FIXE", "Charge fixe (amortie sur la quantité totale)"
        VARIABLE = "VARIABLE", "Charge variable (proportionnelle à la quantité)"

    composant = models.ForeignKey(
        Composant, on_delete=models.CASCADE, related_name="lignes_operation"
    )
    poste = models.ForeignKey(
        PosteDeCharge, on_delete=models.PROTECT, related_name="lignes_catalogue"
    )
    libelle = models.CharField(
        max_length=60,
        help_text="Ex. impression recto/verso, pliage, piquage, assemblage.",
    )
    temps_unitaire = models.DecimalField(
        max_digits=8, decimal_places=2,
        help_text="Temps requis par exemplaire produit (ou par lot pour une charge fixe), en minutes.",
    )
    type_charge = models.CharField(
        max_length=10, choices=TypeCharge.choices, default=TypeCharge.VARIABLE,
        help_text="Nature de la charge : fixe (amortie) ou variable (proportionnelle) — RG29.",
    )
    formule_calcul = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "lignes_operation_composant"
        verbose_name = "Ligne d'opération"
        verbose_name_plural = "Lignes d'opération"

    def __str__(self):
        return f"{self.composant} — {self.libelle} ({self.temps_unitaire} min)"
