from django.db import models

from apps.commandes.models import Devis


class EstimationIA(models.Model):
    """
    Estimation intelligente des couts associee a un devis (RG4).

    RG20 : l'estimation peut provenir du modele XGBoost entraine ou du
    repli heuristique ; la methode utilisee est enregistree dans le champ
    `methode`.
    """

    class Methode(models.TextChoices):
        XGBOOST = "XGBOOST", "XGBoost"
        HEURISTIQUE = "HEURISTIQUE", "Heuristique"

    devis = models.OneToOneField(Devis, on_delete=models.CASCADE, related_name="estimation_ia")
    prix_predit = models.DecimalField(max_digits=12, decimal_places=2)
    duree_predite = models.PositiveIntegerField(help_text="Durée de production prédite, en jours.")
    date_estimation = models.DateTimeField(auto_now_add=True)
    version_modele = models.CharField(
        max_length=50,
        default="heuristique-v0",
        help_text="Identifie si la prediction vient du modele XGBoost entraine ou du repli heuristique (RG20).",
    )
    methode = models.CharField(
        max_length=15, choices=Methode.choices, default=Methode.HEURISTIQUE,
        help_text="Methode utilisee pour l'estimation (XGBoost ou heuristique).",
    )
    score_confiance = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        help_text="Score de confiance de l'estimation (0-100 %), pertinent pour XGBoost.",
    )

    class Meta:
        db_table = "estimations_ia"
        verbose_name = "Estimation IA"
        verbose_name_plural = "Estimations IA"

    def __str__(self):
        return f"Estimation pour devis #{self.devis_id} ({self.version_modele})"