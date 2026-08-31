from django.conf import settings
from django.db import models


class Message(models.Model):
    """
    Message interne echange entre deux utilisateurs du SGCFC-INM (boite de
    reception accessible depuis l'icone de messagerie de la barre de
    navigation). Ne remplace pas les notifications systeme (apps.notifications),
    qui restent generees automatiquement par les evenements metier.
    """

    expediteur = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="messages_envoyes"
    )
    destinataire = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="messages_recus"
    )
    objet = models.CharField(max_length=150, blank=True)
    contenu = models.TextField()
    date_envoi = models.DateTimeField(auto_now_add=True)
    lu = models.BooleanField(default=False)

    class Meta:
        db_table = "messages_internes"
        verbose_name = "Message"
        verbose_name_plural = "Messages"
        ordering = ["-date_envoi"]

    def __str__(self):
        return f"{self.expediteur} → {self.destinataire} : {self.objet or self.contenu[:30]}"
