from django.contrib.auth.models import AbstractUser
from django.db import models


class Utilisateur(AbstractUser):
    """
    Modele utilisateur personnalise de la plateforme SGCFC.
    Ajoute un champ 'role' a choix fixes par rapport a AbstractUser.
    Correspond a la table 'utilisateurs' documentee dans
    docs/schema/01_schema_utilisateurs.sql
    """

    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Administrateur"
        AGENT_SDO = "AGENT_SDO", "Agent SDO"
        CHEF_ATELIER = "CHEF_ATELIER", "Chef d'atelier"
        MAGASINIER = "MAGASINIER", "Magasinier"

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.AGENT_SDO,
        help_text="Role unique de l'utilisateur (RG14 : un utilisateur = un seul role).",
    )
    photo = models.ImageField(
        upload_to="photos_profil/", null=True, blank=True,
        help_text="Photo de profil de l'utilisateur.",
    )

    class Meta:
        db_table = "utilisateurs"
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"