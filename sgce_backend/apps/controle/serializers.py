from rest_framework import serializers

from apps.commandes.models import DossierFabrication

from .models import ControlePrixRevient


class ControlePrixRevientSerializer(serializers.ModelSerializer):
    dossier_numero = serializers.CharField(source="dossier.numero_dossier", read_only=True)
    commande_numero = serializers.CharField(source="dossier.commande.numero", read_only=True)
    atelier_nom = serializers.CharField(source="dossier.atelier.get_nom_display", read_only=True)
    prix_revient_estime = serializers.DecimalField(
        source="dossier.commande.devis.prix_revient", max_digits=12, decimal_places=2, read_only=True
    )
    prix_vente = serializers.DecimalField(
        source="dossier.commande.devis.prix_vente", max_digits=12, decimal_places=2, read_only=True
    )
    cout_reel_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    composant_designation = serializers.CharField(source="composant.designation", read_only=True, default=None)

    class Meta:
        model = ControlePrixRevient
        fields = [
            "id", "dossier", "dossier_numero", "commande_numero", "atelier_nom",
            "composant", "composant_designation",
            "cout_matieres_reel", "cout_temps_machine_reel", "cout_reel_total",
            "marge_cible_pourcentage", "marge_reelle_pourcentage",
            "prix_revient_estime", "prix_vente", "ecart_prix_revient",
            "resultat", "ecart_significatif", "commentaire",
            "date_controle", "controle_par",
        ]
        read_only_fields = [
            "marge_reelle_pourcentage", "ecart_prix_revient", "resultat",
            "ecart_significatif", "date_controle", "controle_par",
        ]

    def validate_dossier(self, dossier):
        """RG23 : uniquement pour un dossier clôturé (statut TERMINE)."""
        if dossier.statut_production != DossierFabrication.Statut.TERMINE:
            raise serializers.ValidationError(
                "Le contrôle du prix de revient ne peut être établi qu'après la "
                "clôture complète du dossier (RG23)."
            )
        if not hasattr(dossier, "commande") or not hasattr(dossier.commande, "devis"):
            raise serializers.ValidationError(
                "Ce dossier n'est rattaché à aucun devis validé ; le contrôle est impossible."
            )
        return dossier


class TableauBordRentabiliteSerializer(serializers.Serializer):
    """Indicateurs agrégés destinés au tableau de bord de la Direction (EF-7.1)."""

    nombre_controles = serializers.IntegerField()
    nombre_beneficiaires = serializers.IntegerField()
    nombre_deficitaires = serializers.IntegerField()
    nombre_a_l_equilibre = serializers.IntegerField()
    nombre_ecarts_significatifs = serializers.IntegerField()
    marge_moyenne_pourcentage = serializers.DecimalField(max_digits=6, decimal_places=2)
