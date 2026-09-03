from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from apps.commandes.models import DossierFabrication


class ControlePrixRevient(models.Model):
    """
    Fiche de controle du prix de revient, etablie a la cloture d'un dossier
    de fabrication (RG23, RG24).

    Objectif (theme de stage, module "Controle du prix de revient et
    analyse de rentabilite") : comparer, a la cloture, le cout reellement
    constate (matieres + temps machine) au prix de revient estime au devis,
    calculer la marge reellement degagee par rapport a une marge cible, et
    signaler les ecarts significatifs afin d'alimenter, a terme, le module
    d'estimation intelligente (apps.ia).

    RG23 : le controle ne peut etre etabli qu'apres la cloture complete du
    dossier (statut TERMINE), et un dossier ne fait l'objet que d'une seule
    fiche de controle par composant (contrainte unique dossier + composant).
    RG24 : le resultat (beneficiaire / deficitaire / a l'equilibre) et le
    signalement d'ecart significatif sont calcules automatiquement a partir
    du cout reel, du prix de vente du devis et de la marge cible - ils ne
    sont jamais saisis manuellement.
    RG28 (mise à jour STI) : lorsque le dossier est rattaché à un produit
    du catalogue, le contrôle est établi composant par composant et compare
    le réel constaté au prévisionnel de la LigneDevis correspondante ; pour
    un devis hors catalogue, une seule fiche globale compare le réel total
    au prix de revient estimé du devis.
    """

    SEUIL_ECART_SIGNIFICATIF = Decimal("5")  # points de pourcentage (marge réelle vs marge cible)

    class Resultat(models.TextChoices):
        SOUS_MARGE = "SOUS_MARGE", "Sous-marge (déficitaire)"
        DANS_LA_NORME = "DANS_LA_NORME", "Dans la norme"
        SUR_MARGE = "SUR_MARGE", "Sur-marge (surestimation)"

    dossier = models.ForeignKey(
        DossierFabrication, on_delete=models.CASCADE, related_name="controles_prix_revient"
    )
    composant = models.ForeignKey(
        "catalogue.Composant", on_delete=models.PROTECT, null=True, blank=True,
        related_name="controles_prix_revient",
        help_text=(
            "Composant contrôlé (prévisionnel/réel) lorsque le dossier est rattaché à un "
            "produit du catalogue (RG28, mise à jour STI). Laissé vide pour une "
            "comparaison globale (devis hors catalogue)."
        ),
    )
    ligne_devis = models.ForeignKey(
        "commandes.LigneDevis", on_delete=models.PROTECT, null=True, blank=True,
        related_name="controles_prix_revient",
        help_text=(
            "Ligne de devis prévisionnelle comparée (RG28, mise à jour STI) : "
            "déduite automatiquement du composant contrôlé."
        ),
    )

    cout_matieres_reel = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Coût réel des matières consommées, déclaré par le Chef d'atelier.",
    )
    cout_temps_machine_reel = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Coût réel du temps machine consommé, déclaré par le Chef d'atelier.",
    )
    marge_cible_pourcentage = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal("20"),
        help_text="Marge cible attendue (%), par défaut 20 %.",
    )
    commentaire = models.CharField(max_length=255, blank=True)

    # Champs calcules automatiquement a la sauvegarde (RG24) - non saisis manuellement.
    marge_reelle = models.DecimalField(
        max_digits=12, decimal_places=2, editable=False, default=0,
        help_text="Marge réelle en valeur (part_vente - cout_reel).",
    )
    marge_reelle_pourcentage = models.DecimalField(
        max_digits=6, decimal_places=2, editable=False, default=0
    )
    ecart_prix_revient = models.DecimalField(
        max_digits=12, decimal_places=2, editable=False, default=0,
        help_text="Coût réel total - prix de revient estimé au devis (positif = dépassement).",
    )
    resultat = models.CharField(
        max_length=15, choices=Resultat.choices, editable=False, default=Resultat.DANS_LA_NORME
    )
    ecart_significatif = models.BooleanField(default=False, editable=False)

    date_controle = models.DateTimeField(auto_now_add=True)
    controle_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="controles_effectues",
    )

    class Meta:
        db_table = "controles_prix_revient"
        verbose_name = "Contrôle du prix de revient"
        verbose_name_plural = "Contrôles du prix de revient"
        ordering = ["-date_controle"]
        constraints = [
            # RG23 + RG28 : une seule fiche par dossier et par composant.
            models.UniqueConstraint(
                fields=["dossier", "composant"], name="unique_controle_dossier_composant"
            ),
        ]

    def __str__(self):
        if self.composant_id:
            return f"Contrôle {self.dossier.numero_dossier} — {self.composant} ({self.get_resultat_display()})"
        return f"Contrôle {self.dossier.numero_dossier} ({self.get_resultat_display()})"

    @property
    def cout_reel_total(self):
        return (self.cout_matieres_reel or 0) + (self.cout_temps_machine_reel or 0)

    def clean(self):
        if self.dossier_id and self.dossier.statut_production != DossierFabrication.Statut.TERMINE:
            raise ValidationError(
                "Le contrôle du prix de revient ne peut être établi qu'après la "
                "clôture complète du dossier (RG23)."
            )
        if self.dossier_id and self.composant_id and not self.ligne_devis_id:
            raise ValidationError(
                {
                    "composant": (
                        "Le contrôle par composant exige une LigneDevis prévisionnelle "
                        "à comparer (RG28)."
                    )
                }
            )

    def _previsionnel_composant(self):
        """Prévisionnel de la ligne de devis comparée (RG28) : coût total estimé du composant."""
        if self.ligne_devis_id:
            return self.ligne_devis.cout_total_estime
        return Decimal("0")

    def _part_prix_vente_composant(self, devis):
        """
        Part du prix de vente imputable au composant contrôlé (RG24, RG28) :
        répartie au prorata du poids du composant dans le prix de revient
        estimé du devis (prévisionnel composant / prix de revient total).
        """
        cout_estime = self._previsionnel_composant()
        prix_revient_devis = devis.prix_revient or Decimal("0")
        prix_vente = devis.prix_vente or Decimal("0")
        if not cout_estime or not prix_revient_devis or not prix_vente:
            return Decimal("0")
        poids = cout_estime / prix_revient_devis
        return (prix_vente * poids).quantize(Decimal("0.01"))

    def _calculer(self):
        """
        Calcule marge_reelle, marge_reelle_pourcentage, ecart_prix_revient,
        resultat et ecart_significatif (RG24, RG36).

        RG36 (mise a jour STI) : le resultat est qualifie selon la
        fourchette de marge du produit catalogue (marge_min / marge_max).
        """
        devis = self.dossier.commande.devis
        cout_reel = self.cout_reel_total

        if self.composant_id:
            # RG28 : comparaison composant par composant (réel vs LigneDevis).
            self.ecart_prix_revient = cout_reel - self._previsionnel_composant()
            part_vente = self._part_prix_vente_composant(devis)
        else:
            # Comparaison globale : réel total vs prix de revient estimé.
            self.ecart_prix_revient = cout_reel - (devis.prix_revient or Decimal("0"))
            part_vente = devis.prix_vente or Decimal("0")

        self.marge_reelle = part_vente - cout_reel
        if part_vente:
            self.marge_reelle_pourcentage = ((part_vente - cout_reel) / part_vente) * Decimal("100")
        else:
            self.marge_reelle_pourcentage = Decimal("0")

        # RG36 : qualification selon la fourchette du produit catalogue.
        produit_catalogue = devis.produit_catalogue
        if produit_catalogue is not None:
            marge_min = produit_catalogue.marge_min
            marge_max = produit_catalogue.marge_max
        else:
            # Hors catalogue : valeurs par défaut.
            marge_min = Decimal("10")
            marge_max = Decimal("30")

        if self.marge_reelle_pourcentage < marge_min:
            self.resultat = self.Resultat.SOUS_MARGE
        elif self.marge_reelle_pourcentage > marge_max:
            self.resultat = self.Resultat.SUR_MARGE
        else:
            self.resultat = self.Resultat.DANS_LA_NORME

        self.ecart_significatif = (
            abs(self.marge_reelle_pourcentage - self.marge_cible_pourcentage)
            >= self.SEUIL_ECART_SIGNIFICATIF
        )

    def save(self, *args, **kwargs):
        self.full_clean()
        self._calculer()
        super().save(*args, **kwargs)
