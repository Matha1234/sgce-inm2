from rest_framework import serializers

from apps.commandes.models import Commande

from .models import EstimationIA


class EstimationInputSerializer(serializers.Serializer):
    """Donnees necessaires pour demander une estimation, avant creation de la commande."""

    type_document = serializers.ChoiceField(choices=Commande.TypeDocument.choices)
    quantite = serializers.IntegerField(min_value=1)
    atelier = serializers.ChoiceField(choices=Commande.Atelier.choices)


class EstimationIASerializer(serializers.ModelSerializer):
    class Meta:
        model = EstimationIA
        fields = ["id", "devis", "prix_predit", "duree_predite", "date_estimation", "version_modele", "methode", "score_confiance"]
        read_only_fields = fields