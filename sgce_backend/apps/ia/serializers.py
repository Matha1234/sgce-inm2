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
    organisme_nom = serializers.SerializerMethodField()
    type_document = serializers.SerializerMethodField()
    quantite = serializers.SerializerMethodField()
    atelier = serializers.SerializerMethodField()
    prix_revient_devis = serializers.SerializerMethodField()
    prix_vente_devis = serializers.SerializerMethodField()
    devis_valide = serializers.SerializerMethodField()

    class Meta:
        model = EstimationIA
        fields = [
            "id",
            "devis_id",
            "commande_id",
            "commande_numero",
            "organisme_nom",
            "type_document",
            "quantite",
            "atelier",
            "prix_revient_devis",
            "prix_vente_devis",
            "devis_valide",
            "prix_predit",
            "duree_predite",
            "date_estimation",
            "version_modele",
            "methode",
            "score_confiance",
        ]

    def _commande(self, obj):
        return getattr(obj.devis, "commande", None)

    def get_commande_numero(self, obj):
        cmd = self._commande(obj)
        if not cmd:
            return None
        return getattr(cmd, "numero_commande", None) or getattr(cmd, "numero", None) or str(cmd.pk)

    def get_organisme_nom(self, obj):
        cmd = self._commande(obj)
        if not cmd:
            return None
        org = getattr(cmd, "organisme", None)
        return getattr(org, "nom", None) if org else None

    def get_type_document(self, obj):
        cmd = self._commande(obj)
        return getattr(cmd, "type_document", None) if cmd else None

    def get_quantite(self, obj):
        cmd = self._commande(obj)
        return getattr(cmd, "quantite", None) if cmd else None

    def get_atelier(self, obj):
        cmd = self._commande(obj)
        return getattr(cmd, "atelier", None) if cmd else None

    def get_prix_revient_devis(self, obj):
        return getattr(obj.devis, "prix_revient", None)

    def get_prix_vente_devis(self, obj):
        return getattr(obj.devis, "prix_vente", None)

    def get_devis_valide(self, obj):
        return getattr(obj.devis, "valide", None)