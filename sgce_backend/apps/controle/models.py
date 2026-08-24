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
    fiche de controle (relation OneToOne).
    RG24 : le resultat (beneficiaire / deficitaire / a l'equilibre) et le
    signalement d'ecart significatif sont calcules automatiquement a partir
    du cout reel, du prix de vente du devis et de la marge cible - ils ne
    sont jamais saisis manuellement.
    """

    SEUIL_ECART_SIGNIFICATIF = Decimal("5")  # points de pourcentage (marge réelle vs marge cible)

    class Resultat(models.TextChoices):
        BENEFICIAIRE = "BENEFICIAIRE", "Bénéficiaire"
        DEFICITAIRE = "DEFICITAIRE", "Déficitaire"
        EQUILIBRE = "EQUILIBRE", "À l'équilibre"

    dossier = models.OneToOneField(
        DossierFabrication, on_delete=models.CASCADE, related_name="controle_prix_revient"
    )
    composant = models.ForeignKey(
        "catalogue.Composant", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="controles_prix_revient",
        help_text=(
            "Composant comparé (prévisionnel/réel) lorsque le dossier est rattaché à un "
            "produit du catalogue (RG28, mise à jour STI). Laissé vide pour une comparaison globale."
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
    marge_reelle_pourcentage = models.DecimalField(
        max_digits=6, decimal_places=2, editable=False, default=0
    )
    ecart_prix_revient = models.DecimalField(
        max_digits=12, decimal_places=2, editable=False, default=0,
        help_text="Coût réel total - prix de revient estimé au devis (positif = dépassement).",
    )
    resultat = models.CharField(
        max_length=15, choices=Resultat.choices, editable=False, default=Resultat.EQUILIBRE
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

    def __str__(self):
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

    def _calculer(self):
        """Calcule marge_reelle_pourcentage, ecart_prix_revient, resultat et ecart_significatif (RG24)."""
        devis = self.dossier.commande.devis
        cout_reel = self.cout_reel_total
        prix_vente = devis.prix_vente or Decimal("0")

        self.ecart_prix_revient = cout_reel - (devis.prix_revient or Decimal("0"))

        if prix_vente:
            self.marge_reelle_pourcentage = ((prix_vente - cout_reel) / prix_vente) * Decimal("100")
        else:
            self.marge_reelle_pourcentage = Decimal("0")

        if self.marge_reelle_pourcentage > 0:
            self.resultat = self.Resultat.BENEFICIAIRE
        elif self.marge_reelle_pourcentage < 0:
            self.resultat = self.Resultat.DEFICITAIRE
        else:
            self.resultat = self.Resultat.EQUILIBRE

        self.ecart_significatif = (
            abs(self.marge_reelle_pourcentage - self.marge_cible_pourcentage)
            >= self.SEUIL_ECART_SIGNIFICATIF
        )

    def save(self, *args, **kwargs):
        self.full_clean()
        self._calculer()
        super().save(*args, **kwargs)
