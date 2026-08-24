from rest_framework import serializers

from .models import (
    Article,
    Atelier,
    Commande,
    Devis,
    DossierFabrication,
    EtapeProduction,
    MouvementStock,
    OrganismeClient,
)


class OrganismeClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganismeClient
        fields = ["id", "nom", "type", "adresse"]


class EstimationIAResumeSerializer(serializers.Serializer):
    """Resume en lecture seule de l'estimation IA liee a un devis."""

    prix_predit = serializers.DecimalField(max_digits=12, decimal_places=2)
    duree_predite = serializers.IntegerField()
    version_modele = serializers.CharField()


class DevisSerializer(serializers.ModelSerializer):
    estimation_ia = serializers.SerializerMethodField()

    class Meta:
        model = Devis
        fields = [
            "id", "commande", "produit_catalogue", "options_ajustees",
            "prix_revient", "prix_vente", "duree_production",
            "date_devis", "valide", "valide_par", "estimation_ia",
            "pluriannuel", "duree_contrat_annees", "taux_inflation_projete",
        ]
        read_only_fields = ["date_devis", "valide_par", "estimation_ia"]
        extra_kwargs = {"prix_revient": {"required": False}}

    def get_estimation_ia(self, obj):
        estimation = getattr(obj, "estimation_ia", None)
        if estimation is None:
            return None
        return EstimationIAResumeSerializer(estimation).data

    def validate(self, attrs):
        """
        RG27 (mise à jour STI) : un devis rattaché à un produit du catalogue
        calcule automatiquement son prix de revient à partir de la
        nomenclature du produit ; un devis hors catalogue doit fournir son
        prix de revient explicitement.
        """
        produit_catalogue = attrs.get(
            "produit_catalogue", getattr(self.instance, "produit_catalogue", None)
        )
        prix_revient = attrs.get(
            "prix_revient", getattr(self.instance, "prix_revient", None)
        )
        if not produit_catalogue and prix_revient is None:
            raise serializers.ValidationError(
                {
                    "prix_revient": (
                        "Obligatoire pour un devis hors catalogue "
                        "(aucun produit_catalogue renseigné) - RG27."
                    )
                }
            )
        """RG22 : un devis pluriannuel doit porter une duree et un taux d'inflation avant validation."""
        pluriannuel = attrs.get("pluriannuel", getattr(self.instance, "pluriannuel", False))
        valide = attrs.get("valide", getattr(self.instance, "valide", False))

        if pluriannuel and valide:
            duree = attrs.get("duree_contrat_annees", getattr(self.instance, "duree_contrat_annees", None))
            taux = attrs.get("taux_inflation_projete", getattr(self.instance, "taux_inflation_projete", None))
            erreurs = {}
            if not duree:
                erreurs["duree_contrat_annees"] = "Obligatoire pour valider un devis pluriannuel (RG22)."
            elif duree > Devis.DUREE_CONTRAT_MAX_ANNEES:
                erreurs["duree_contrat_annees"] = (
                    f"Ne peut excéder {Devis.DUREE_CONTRAT_MAX_ANNEES} ans (RG22)."
                )
            if taux is None:
                erreurs["taux_inflation_projete"] = (
                    "Le taux d'inflation projeté est obligatoire pour valider un devis pluriannuel (RG22)."
                )
            if erreurs:
                raise serializers.ValidationError(erreurs)

        return attrs


class CommandeSerializer(serializers.ModelSerializer):
    organisme_nom = serializers.CharField(source="organisme.nom", read_only=True)
    devis = DevisSerializer(read_only=True)
    a_un_dossier = serializers.SerializerMethodField()

    class Meta:
        model = Commande
        fields = [
            "id", "numero", "date_commande", "statut", "delai_contractuel",
            "nature", "type_document", "quantite", "atelier", "est_fictif",
            "organisme", "organisme_nom", "cree_par", "devis", "a_un_dossier",
        ]
        read_only_fields = ["numero", "date_commande", "cree_par", "est_fictif"]

    def get_a_un_dossier(self, obj):
        return hasattr(obj, "dossier_fabrication")

    def validate(self, attrs):
        """RG19 : delai contractuel obligatoire si l'organisme n'est pas un particulier."""
        organisme = attrs.get("organisme") or getattr(self.instance, "organisme", None)
        delai = attrs.get(
            "delai_contractuel",
            getattr(self.instance, "delai_contractuel", None),
        )

        # RG21 : la nature (sur confection / standardisee) determine le
        # circuit de devis applique des la creation et ne peut plus changer
        # une fois le devis valide, pour eviter d'appliquer retroactivement
        # une autre logique de calcul a une commande deja engagee.
        if self.instance is not None and "nature" in attrs:
            devis = getattr(self.instance, "devis", None)
            if devis is not None and devis.valide and attrs["nature"] != self.instance.nature:
                raise serializers.ValidationError(
                    {
                        "nature": (
                            "La nature de la commande ne peut plus être modifiée "
                            "après validation du devis (RG21)."
                        )
                    }
                )

        if (
            organisme
            and organisme.type != OrganismeClient.TypeOrganisme.PARTICULIER
            and not delai
        ):
            raise serializers.ValidationError(
                {
                    "delai_contractuel": (
                        "Le délai contractuel est obligatoire pour une "
                        "commande étatique (RG19)."
                    )
                }
            )
        return attrs


class AtelierSerializer(serializers.ModelSerializer):
    chef_atelier_nom = serializers.CharField(
        source="chef_atelier.get_full_name", read_only=True, default=None
    )

    class Meta:
        model = Atelier
        fields = ["id", "nom", "chef_atelier", "chef_atelier_nom"]


class EtapeProductionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EtapeProduction
        fields = ["id", "dossier", "libelle", "statut", "date_debut", "date_fin"]


class DossierFabricationSerializer(serializers.ModelSerializer):
    atelier_nom = serializers.CharField(source="atelier.get_nom_display", read_only=True)
    commande_numero = serializers.CharField(source="commande.numero", read_only=True)
    etapes = EtapeProductionSerializer(many=True, read_only=True)

    class Meta:
        model = DossierFabrication
        fields = [
            "id", "commande", "commande_numero", "numero_dossier",
            "atelier", "atelier_nom", "statut_production", "date_creation", "etapes",
        ]
        read_only_fields = ["numero_dossier", "date_creation"]
        extra_kwargs = {"atelier": {"required": False}}

    def validate(self, attrs):
        """RG5 : dossier cree uniquement pour une commande validee, une seule fois."""
        commande = attrs.get("commande") or getattr(self.instance, "commande", None)
        if commande and self.instance is None:
            if commande.statut != Commande.Statut.VALIDEE:
                raise serializers.ValidationError(
                    {"commande": "Un dossier de fabrication ne peut être créé que pour une commande validée (RG5)."}
                )
            if hasattr(commande, "dossier_fabrication"):
                raise serializers.ValidationError(
                    {"commande": "Cette commande dispose déjà d'un dossier de fabrication (RG5)."}
                )

        # Correctif : Commande.atelier (texte, choisi des la creation de la
        # commande pour l'estimation IA) et DossierFabrication.atelier (FK,
        # affectation reelle - RG6) pouvaient diverger silencieusement car
        # rien ne les reliait. Si l'atelier n'est pas explicitement fourni a
        # la creation du dossier, on le derive de Commande.atelier plutot
        # que de laisser un champ obligatoire echouer ou diverger.
        if not attrs.get("atelier") and commande:
            try:
                attrs["atelier"] = Atelier.objects.get(nom=commande.atelier)
            except Atelier.DoesNotExist:
                raise serializers.ValidationError(
                    {"atelier": f"Aucun atelier de référence pour « {commande.atelier} »."}
                )
        return attrs

    def create(self, validated_data):
        dossier = super().create(validated_data)
        self._synchroniser_atelier_commande(dossier)
        return dossier

    def update(self, instance, validated_data):
        dossier = super().update(instance, validated_data)
        self._synchroniser_atelier_commande(dossier)
        return dossier

    @staticmethod
    def _synchroniser_atelier_commande(dossier):
        """
        Correctif : des qu'un dossier de fabrication existe, il devient la
        source de verite pour l'atelier (RG6). On resynchronise
        Commande.atelier pour eliminer toute divergence entre les deux champs.
        """
        nom_atelier = dossier.atelier.nom
        if dossier.commande.atelier != nom_atelier:
            Commande.objects.filter(pk=dossier.commande_id).update(atelier=nom_atelier)


class ArticleSerializer(serializers.ModelSerializer):
    est_en_alerte = serializers.BooleanField(read_only=True)

    class Meta:
        model = Article
        fields = [
            "id", "designation", "classe_comptable", "type_papier", "type_encre",
            "type_film", "unite", "cout_unitaire", "quantite_stock", "seuil_securite", "est_en_alerte",
        ]
        # La quantite en stock ne doit jamais etre modifiee directement :
        # elle n'evolue que via la creation de MouvementStock, pour garder
        # une tracabilite complete (RG8, RG9, RG10).
        read_only_fields = ["quantite_stock"]


class MouvementStockSerializer(serializers.ModelSerializer):
    article_designation = serializers.CharField(source="article.designation", read_only=True)
    dossier_numero = serializers.CharField(source="dossier.numero_dossier", read_only=True, default=None)

    class Meta:
        model = MouvementStock
        fields = [
            "id", "article", "article_designation", "dossier", "dossier_numero",
            "type_mouvement", "quantite", "date_mouvement", "valide_par",
        ]
        read_only_fields = ["date_mouvement", "valide_par"]

    def validate(self, attrs):
        """
        RG11 : le magasin ne peut valider une sortie que si la quantite en
        stock est suffisante. Verification immediate ici pour un retour 400
        propre ; une seconde verification atomique existe aussi au niveau
        du modele (protection contre les acces concurrents).
        """
        if self.instance is not None:
            raise serializers.ValidationError(
                "Un mouvement de stock ne peut pas être modifié après sa création."
            )

        article = attrs.get("article")
        type_mouvement = attrs.get("type_mouvement")
        quantite = attrs.get("quantite")

        if type_mouvement == MouvementStock.TypeMouvement.SORTIE and article and quantite:
            if article.quantite_stock < quantite:
                raise serializers.ValidationError(
                    {
                        "quantite": (
                            f"Quantité en stock insuffisante pour « {article.designation} » "
                            f"(disponible : {article.quantite_stock} {article.unite}) - RG11."
                        )
                    }
                )
        return attrs