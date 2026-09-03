from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.commandes.models import DossierFabrication, SequenceCounter


class Facture(models.Model):
    """
    Facture liee a un dossier de fabrication (RG12 : un dossier peut donner
    lieu a plusieurs factures - proforma puis definitive). La facture
    definitive ne peut etre emise qu'apres la fin de la production (RG13),
    verification faite dans le serializer.
    """

    class TypeFacture(models.TextChoices):
        PROFORMA = "PROFORMA", "Facture proforma"
        DEFINITIVE = "DEFINITIVE", "Facture définitive"

    class StatutPaiement(models.TextChoices):
        EN_ATTENTE = "EN_ATTENTE", "En attente"
        PAYEE = "PAYEE", "Payée"
        IMPAYEE = "IMPAYEE", "Impayée"

    dossier = models.ForeignKey(
        DossierFabrication, on_delete=models.PROTECT, related_name="factures"
    )
    numero_facture = models.CharField(max_length=20, unique=True, blank=True)
    type_facture = models.CharField(
        max_length=15, choices=TypeFacture.choices, default=TypeFacture.PROFORMA
    )
    montant = models.DecimalField(max_digits=12, decimal_places=2)
    statut_paiement = models.CharField(
        max_length=15, choices=StatutPaiement.choices, default=StatutPaiement.EN_ATTENTE,
        help_text="Statut de paiement de la facture.",
    )
    date_facture = models.DateTimeField(auto_now_add=True)
    emise_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name="factures_emises",
    )

    class Meta:
        db_table = "factures"
        ordering = ["-date_facture"]

    def __str__(self):
        return f"{self.numero_facture} ({self.get_type_facture_display()})"

    def save(self, *args, **kwargs):
        if not self.numero_facture:
            annee = timezone.now().year
            prefixe = "PRO" if self.type_facture == self.TypeFacture.PROFORMA else "DEF"
            compteur = SequenceCounter.prochain(f"{prefixe}-{annee}")
            self.numero_facture = f"{prefixe}-{annee}-{compteur:04d}"
        super().save(*args, **kwargs)