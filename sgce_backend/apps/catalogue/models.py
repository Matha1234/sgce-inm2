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
    """

    famille = models.ForeignKey(
        FamilleProduit, on_delete=models.PROTECT, related_name="produits"
    )
    nom = models.CharField(max_length=80)
    actif = models.BooleanField(
        default=True,
        help_text="Un produit désactivé n'apparaît plus dans le choix du devis.",
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
        RG27 : calcule le prix de revient d'un devis instanciant ce produit
        pour `quantite` exemplaires, en additionnant, pour chaque composant,
        le coût des lignes de matière première (quantité unitaire × prix de
        l'article) et le coût des lignes d'opération (temps unitaire ×
        (coût horaire de la machine / 60)), multipliés par la quantité.
        """
        if quantite is None or quantite <= 0:
            raise ValidationError("La quantité commandée doit être strictement positive (RG27).")

        quantite = Decimal(str(quantite))
        total = Decimal("0")

        composants = self.composants.prefetch_related(
            "lignes_matiere_premiere__article", "lignes_operation__machine"
        )
        if not composants.exists():
            raise ValidationError(
                f"Le produit « {self.nom} » ne comporte aucun composant : "
                "impossible de calculer un prix de revient (RG26)."
            )

        for composant in composants:
            for ligne in composant.lignes_matiere_premiere.all():
                prix_article = ligne.article.cout_unitaire or Decimal("0")
                total += ligne.quantite_unitaire * prix_article * quantite
            for ligne in composant.lignes_operation.all():
                cout_horaire = ligne.machine.cout_horaire or Decimal("0")
                # temps_unitaire est exprime en minutes (memoire, dictionnaire des donnees)
                total += (ligne.temps_unitaire / Decimal("60")) * cout_horaire * quantite

        return total.quantize(Decimal("0.01"))


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


class Machine(models.Model):
    """Poste ou machine de production referencee par une ligne d'operation."""

    nom = models.CharField(max_length=60)
    cout_horaire = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        db_table = "machines_postes"
        verbose_name = "Machine / Poste"
        verbose_name_plural = "Machines / Postes"
        ordering = ["nom"]

    def __str__(self):
        return self.nom


class LigneMatierePremiere(models.Model):
    """Ligne de nomenclature d'un composant (RG26, RG27)."""

    composant = models.ForeignKey(
        Composant, on_delete=models.CASCADE, related_name="lignes_matiere_premiere"
    )
    article = models.ForeignKey(
        "commandes.Article", on_delete=models.PROTECT, related_name="lignes_catalogue"
    )
    quantite_unitaire = models.DecimalField(
        max_digits=10, decimal_places=3,
        help_text="Quantité de matière requise par exemplaire produit.",
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
    """Ligne de gamme d'un composant (RG26, RG27)."""

    composant = models.ForeignKey(
        Composant, on_delete=models.CASCADE, related_name="lignes_operation"
    )
    machine = models.ForeignKey(
        Machine, on_delete=models.PROTECT, related_name="lignes_catalogue"
    )
    libelle = models.CharField(
        max_length=60,
        help_text="Ex. impression recto/verso, pliage, piquage, assemblage.",
    )
    temps_unitaire = models.DecimalField(
        max_digits=8, decimal_places=2,
        help_text="Temps machine requis par exemplaire produit, en minutes.",
    )
    formule_calcul = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = "lignes_operation_composant"
        verbose_name = "Ligne d'opération"
        verbose_name_plural = "Lignes d'opération"

    def __str__(self):
        return f"{self.composant} — {self.libelle} ({self.temps_unitaire} min)"
