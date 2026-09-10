from rest_framework import serializers

from .models import (
    Composant,
    FamilleProduit,
    LigneMatierePremiere,
    LigneOperation,
    PosteDeCharge,
    Produit,
)


class FamilleProduitSerializer(serializers.ModelSerializer):
    class Meta:
        model = FamilleProduit
        fields = ["id", "nom", "structure_type"]


class PosteDeChargeSerializer(serializers.ModelSerializer):
    type_poste_libelle = serializers.CharField(source="get_type_poste_display", read_only=True)

    class Meta:
        model = PosteDeCharge
        fields = ["id", "nom", "type_poste", "type_poste_libelle", "cout_horaire"]


class LigneMatierePremiereSerializer(serializers.ModelSerializer):
    article_designation = serializers.CharField(source="article.designation", read_only=True)
    article_unite = serializers.CharField(source="article.unite", read_only=True)
    type_charge_libelle = serializers.CharField(source="get_type_charge_display", read_only=True)

    class Meta:
        model = LigneMatierePremiere
        fields = [
            "id", "composant", "article", "article_designation", "article_unite",
            "quantite_unitaire", "type_charge", "type_charge_libelle", "formule_calcul",
        ]


class LigneOperationSerializer(serializers.ModelSerializer):
    poste_nom = serializers.CharField(source="poste.nom", read_only=True)
    poste_type_libelle = serializers.CharField(source="poste.get_type_poste_display", read_only=True)
    type_charge_libelle = serializers.CharField(source="get_type_charge_display", read_only=True)

    class Meta:
        model = LigneOperation
        fields = [
            "id", "composant", "poste", "poste_nom", "poste_type_libelle", "libelle",
            "temps_unitaire", "type_charge", "type_charge_libelle", "formule_calcul",
        ]


class ComposantSerializer(serializers.ModelSerializer):
    lignes_matiere_premiere = LigneMatierePremiereSerializer(many=True, read_only=True)
    lignes_operation = LigneOperationSerializer(many=True, read_only=True)

    class Meta:
        model = Composant
        fields = [
            "id", "produit", "ordre", "designation",
            "lignes_matiere_premiere", "lignes_operation",
        ]

    def validate(self, attrs):
        """RG26 : numérotation unique et ordonnée par produit."""
        produit = attrs.get("produit") or getattr(self.instance, "produit", None)
        ordre = attrs.get("ordre", getattr(self.instance, "ordre", None))
        if produit and ordre:
            qs = Composant.objects.filter(produit=produit, ordre=ordre)
            if self.instance is not None:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"ordre": f"Le rang {ordre} est déjà utilisé pour ce produit (RG26)."}
                )
        return attrs


class ProduitSerializer(serializers.ModelSerializer):
    famille_nom = serializers.CharField(source="famille.get_nom_display", read_only=True)
    composants = ComposantSerializer(many=True, read_only=True)
    nombre_composants = serializers.IntegerField(source="composants.count", read_only=True)

    class Meta:
        model = Produit
        fields = [
            "id", "famille", "famille_nom", "reference", "nom", "description", "actif",
            "marge_min", "marge_max", "date_maj",
            "composants", "nombre_composants",
        ]


class ProduitEstimationInputSerializer(serializers.Serializer):
    """Entrée pour le calcul du prix de revient catalogue (RG27)."""

    produit = serializers.PrimaryKeyRelatedField(queryset=Produit.objects.filter(actif=True))
    quantite = serializers.IntegerField(min_value=1)

    def calculer(self):
        produit = self.validated_data["produit"]
        quantite = self.validated_data["quantite"]
        resultat = produit.calculer_prix_revient(quantite)
        return {
            "produit": produit.id,
            "produit_nom": produit.nom,
            "quantite": quantite,
            "prix_revient_catalogue": resultat["prix_revient"],
            "detail_composants": resultat["detail_composants"],
        }