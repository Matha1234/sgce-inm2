from rest_framework import serializers

from apps.commandes.models import DossierFabrication, LigneDevis

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
    composant_ordre = serializers.IntegerField(source="composant.ordre", read_only=True, default=None)
    cout_estime_comparaison = serializers.SerializerMethodField(
        help_text="Prévisionnel comparé : LigneDevis du composant (RG28) ou prix de revient du devis."
    )
    # RG9/RG10-like traçabilité : controle_par n'était exposé que comme
    # identifiant brut, sans libellé exploitable côté interface.
    controle_par_nom = serializers.SerializerMethodField()

    class Meta:
        model = ControlePrixRevient
        fields = [
            "id", "dossier", "dossier_numero", "commande_numero", "atelier_nom",
            "composant", "composant_designation", "composant_ordre", "ligne_devis",
            "cout_matieres_reel", "cout_temps_machine_reel", "cout_reel_total",
            "cout_estime_comparaison",
            "marge_cible_pourcentage", "marge_reelle", "marge_reelle_pourcentage",
            "prix_revient_estime", "prix_vente", "ecart_prix_revient",
            "resultat", "ecart_significatif", "commentaire",
            "date_controle", "controle_par", "controle_par_nom",
        ]
        read_only_fields = [
            "ligne_devis", "marge_reelle", "marge_reelle_pourcentage", "ecart_prix_revient", "resultat",
            "ecart_significatif", "date_controle", "controle_par",
        ]

    def get_controle_par_nom(self, obj):
        if not obj.controle_par_id:
            return None
        return obj.controle_par.get_full_name() or obj.controle_par.username

    def get_cout_estime_comparaison(self, obj):
        if obj.ligne_devis_id:
            return obj.ligne_devis.cout_total_estime
        return obj.dossier.commande.devis.prix_revient

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

    def validate(self, attrs):
        """
        RG28 (mise à jour STI) : le contrôle est établi composant par
        composant lorsque le devis du dossier instancie un produit du
        catalogue (le prévisionnel comparé est la LigneDevis du composant) ;
        pour un devis hors catalogue, une seule fiche globale par dossier.
        """
        dossier = attrs.get("dossier", getattr(self.instance, "dossier", None))
        composant = attrs.get("composant", getattr(self.instance, "composant", None))

        if dossier is None:
            return attrs

        devis = dossier.commande.devis
        if self.instance is None:
            qs = ControlePrixRevient.objects.filter(dossier=dossier)
            if composant is not None:
                qs = qs.filter(composant=composant)
            else:
                qs = qs.filter(composant__isnull=True)
            if qs.exists():
                raise serializers.ValidationError(
                    {
                        "composant": (
                            "Un contrôle existe déjà pour ce dossier et ce composant "
                            "(RG23) ; un seul contrôle par composant à la clôture."
                        )
                    }
                )

        if devis.produit_catalogue_id:
            # Catalogue : contrôle obligatoirement par composant (RG28).
            if composant is None:
                raise serializers.ValidationError(
                    {
                        "composant": (
                            "Ce dossier est rattaché à un produit du catalogue : "
                            "le contrôle doit être établi composant par composant (RG28)."
                        )
                    }
                )
            ligne = LigneDevis.objects.filter(devis=devis, composant=composant).first()
            if ligne is None:
                raise serializers.ValidationError(
                    {
                        "composant": (
                            "Aucune LigneDevis prévisionnelle pour ce composant sur ce devis ; "
                            "le contrôle composant par composant est impossible (RG28)."
                        )
                    }
                )
            attrs["ligne_devis"] = ligne
        else:
            # Hors catalogue : contrôle global uniquement.
            if composant is not None:
                raise serializers.ValidationError(
                    {
                        "composant": (
                            "Ce devis ne provient pas du catalogue : le contrôle est "
                            "global (sans composant) - RG28."
                        )
                    }
                )
            attrs["ligne_devis"] = None

        return attrs


class TableauBordRentabiliteSerializer(serializers.Serializer):
    """Indicateurs agrégés destinés au tableau de bord de la Direction (EF-7.1)."""

    nombre_controles = serializers.IntegerField()
    nombre_sous_marge = serializers.IntegerField()
    nombre_dans_la_norme = serializers.IntegerField()
    nombre_sur_marge = serializers.IntegerField()
    nombre_ecarts_significatifs = serializers.IntegerField()
    marge_moyenne_pourcentage = serializers.DecimalField(max_digits=6, decimal_places=2)
