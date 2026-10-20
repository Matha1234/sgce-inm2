from rest_framework import serializers

from apps.commandes.models import Commande

from .models import EstimationIA


class EstimationInputSerializer(serializers.Serializer):
    """Donnees necessaires pour demander une estimation, avant creation de la commande."""

    type_document = serializers.ChoiceField(choices=Commande.TypeDocument.choices)
    quantite = serializers.IntegerField(min_value=1)
    atelier = serializers.ChoiceField(choices=Commande.Atelier.choices)


class EstimationIASerializer(serializers.ModelSerializer):
    """
    Lecture d'une estimation IA avec infos utiles pour la liste / le detail :
    commande liee, prix du devis, statut de validation.
    """

    devis_id = serializers.IntegerField(source="devis.id", read_only=True)
    commande_id = serializers.IntegerField(source="devis.commande_id", read_only=True)
    commande_numero = serializers.CharField(
        source="devis.commande.numero", read_only=True, allow_null=True
    )
    organisme_nom = serializers.CharField(
        source="devis.commande.organisme.nom", read_only=True, allow_null=True
    )
    type_document = serializers.CharField(
        source="devis.commande.type_document", read_only=True, allow_null=True
    )
    quantite = serializers.IntegerField(
        source="devis.commande.quantite", read_only=True, allow_null=True
    )
    atelier = serializers.CharField(
        source="devis.commande.atelier", read_only=True, allow_null=True
    )
    prix_revient_devis = serializers.DecimalField(
        source="devis.prix_revient",
        max_digits=12,
        decimal_places=2,
        read_only=True,
        allow_null=True,
    )
    prix_vente_devis = serializers.DecimalField(
        source="devis.prix_vente",
        max_digits=12,
        decimal_places=2,
        read_only=True,
        allow_null=True,
    )
    devis_valide = serializers.BooleanField(source="devis.valide", read_only=True)

    class Meta:
        model = EstimationIA
        fields = [
            "id",
            "devis",
            "devis_id",
            "commande_id",
            "commande_numero",
            "organisme_nom",
            "type_document",
            "quantite",
            "atelier",
            "prix_predit",
            "duree_predite",
            "date_estimation",
            "version_modele",
            "methode",
            "score_confiance",
            "prix_revient_devis",
            "prix_vente_devis",
            "devis_valide",
        ]
        read_only_fields = fields