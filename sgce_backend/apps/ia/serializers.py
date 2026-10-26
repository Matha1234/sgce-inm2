from rest_framework import serializers

from .models import EstimationIA


class EstimationInputSerializer(serializers.Serializer):
    type_document = serializers.CharField()
    quantite = serializers.IntegerField(min_value=1)
    atelier = serializers.CharField()


class EstimationIASerializer(serializers.ModelSerializer):
    devis_id = serializers.IntegerField(source="devis.id", read_only=True)
    commande_id = serializers.IntegerField(source="devis.commande_id", read_only=True)
    commande_numero = serializers.SerializerMethodField()

    class Meta:
        model = EstimationIA
        fields = [
            "id",
            "devis_id",
            "commande_id",
            "commande_numero",
            "prix_predit",
            "duree_predite",
            "date_estimation",
            "version_modele",
            "methode",
            "score_confiance",
        ]

    def get_commande_numero(self, obj):
        cmd = getattr(obj.devis, "commande", None)
        if not cmd:
            return None
        return getattr(cmd, "numero_commande", None) or str(cmd.pk)