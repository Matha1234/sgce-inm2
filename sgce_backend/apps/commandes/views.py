from rest_framework import generics
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated

from apps.utilisateurs.permissions import IsAgentSDO, IsChefAtelier, IsMagasinier

from .models import (
    Article,
    Atelier,
    Commande,
    Devis,
    DossierFabrication,
    EtapeProduction,
    ExecutionOperation,
    LigneMatiereDevis,
    LigneOperationDevis,
    MouvementStock,
    OptionDevis,
    OrganismeClient,
)
from .serializers import (
    ArticleSerializer,
    AtelierSerializer,
    CommandeSerializer,
    DevisSerializer,
    DossierFabricationSerializer,
    EtapeProductionSerializer,
    ExecutionOperationSerializer,
    LigneMatiereDevisSerializer,
    LigneOperationDevisSerializer,
    MouvementStockSerializer,
    OptionDevisSerializer,
    OrganismeClientSerializer,
)


# ------------------------------------------------------------------
# Organismes / Commandes / Devis
# ------------------------------------------------------------------

class OrganismeClientListCreateView(generics.ListCreateAPIView):
    """Liste et creation des organismes clients - reserve a l'Agent SDO / Admin."""

    queryset = OrganismeClient.objects.all().order_by("nom")
    serializer_class = OrganismeClientSerializer
    permission_classes = [IsAgentSDO]


class CommandeListCreateView(generics.ListCreateAPIView):
    """
    Liste des commandes : accessible a tout utilisateur authentifie.
    Creation : reservee a l'Agent SDO (et l'Administrateur).

    GET ?organisme=<id> - historique des commandes (et de leur devis, imbrique
    dans CommandeSerializer) d'un organisme client donne (UC-14 : « consulter
    l'historique des commandes et devis d'un client »), auparavant absent.
    """

    queryset = Commande.objects.select_related("organisme", "devis").all()
    serializer_class = CommandeSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAgentSDO()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = super().get_queryset()
        organisme_id = self.request.query_params.get("organisme")
        if organisme_id:
            queryset = queryset.filter(organisme_id=organisme_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user)


class CommandeDetailView(generics.RetrieveUpdateAPIView):
    """Consultation d'une commande ; modification reservee a l'Agent SDO/Admin."""

    queryset = Commande.objects.select_related("organisme", "devis").all()
    serializer_class = CommandeSerializer

    def get_permissions(self):
        if self.request.method in {"PUT", "PATCH"}:
            return [IsAgentSDO()]
        return [IsAuthenticated()]


class DevisCreateView(generics.CreateAPIView):
    """
    Creation du devis d'une commande - reservee a l'Agent SDO (RG16).
    Calcule automatiquement une estimation intelligente des couts (RG4).

    Si le devis est marque comme pluriannuel (`pluriannuel=true`), et que
    le taux d'inflation projete n'a pas ete fourni explicitement, il est
    calcule automatiquement a partir de l'historique interne de l'INM, et
    le prix de vente est ajuste vers un prix unitaire equilibre sur toute
    la duree du contrat (RG22).
    """

    queryset = Devis.objects.all()
    serializer_class = DevisSerializer
    permission_classes = [IsAgentSDO]

    def perform_create(self, serializer):
        produit_catalogue = serializer.validated_data.get("produit_catalogue")
        prix_revient_kwargs = {}

        if produit_catalogue and "prix_revient" not in serializer.validated_data:
            # RG27 : le prix de revient d'un devis rattaché au catalogue est
            # calculé automatiquement, composant par composant, plutôt que
            # saisi manuellement.
            commande = serializer.validated_data["commande"]
            resultat = produit_catalogue.calculer_prix_revient(commande.quantite)
            prix_revient_kwargs["prix_revient"] = resultat["prix_revient"]

        devis = serializer.save(**prix_revient_kwargs)

        if produit_catalogue:
            # RG27 + RG28 : génère les LigneDevis (chiffrage prévisionnel par
            # composant) et applique les remarques techniques de l'Agent SDO,
            # qui prévalent sur le catalogue en cas de divergence (RG30).
            remarques = {
                r["composant"]: r.get("remarque", "")
                for r in serializer.validated_data.get("remarques_lignes", [])
            }
            devis.generer_lignes_devis(remarques)

        from apps.ia.ml.estimation_service import predire_cout
        from apps.ia.ml.inflation_service import projeter_devis_pluriannuel
        from apps.ia.models import EstimationIA

        resultat = predire_cout(
            type_document=devis.commande.type_document,
            quantite=devis.commande.quantite,
            atelier=devis.commande.atelier,
        )
        EstimationIA.objects.update_or_create(
            devis=devis,
            defaults={
                "prix_predit": resultat["prix_predit"],
                "duree_predite": resultat["duree_predite"],
                "version_modele": resultat["version_modele"],
            },
        )

        if devis.pluriannuel and devis.duree_contrat_annees:
            projection = projeter_devis_pluriannuel(
                prix_revient_actuel=devis.prix_vente,
                duree_annees=devis.duree_contrat_annees,
                taux_inflation_pct=devis.taux_inflation_projete,  # None -> calcule automatiquement
            )
            devis.taux_inflation_projete = projection["taux_inflation_projete"]
            devis.prix_vente = projection["prix_vente_equilibre"]
            devis.save(update_fields=["taux_inflation_projete", "prix_vente"])


class DevisDetailView(generics.RetrieveUpdateAPIView):
    """
    Consultation et validation d'un devis - reservee a l'Agent SDO (RG16).
    La validation fait passer la commande associee au statut VALIDEE (RG5)
    et declenche automatiquement la generation du dossier de fabrication
    (RG4, RG5, RG8, RG34 - UC-03, memoire section 5.10.4).

    Correctif (UC-13, tableau des acteurs : « modifie un devis tant qu'il
    n'est pas validé ») : un devis déjà validé ne peut plus être modifié -
    cette contrainte n'était pas encore appliquée côté vue.
    """

    queryset = Devis.objects.select_related("commande").all()
    serializer_class = DevisSerializer
    permission_classes = [IsAgentSDO]

    def perform_update(self, serializer):
        from django.core.exceptions import ValidationError as DjangoValidationError
        from django.db import transaction
        from rest_framework.exceptions import ValidationError as DRFValidationError

        devis = serializer.save()
        if devis.valide:
            try:
                with transaction.atomic():
                    if not devis.valide_par:
                        devis.valide_par = self.request.user
                        devis.save(update_fields=["valide_par"])
                    Commande.objects.filter(pk=devis.commande_id).update(
                        statut=Commande.Statut.VALIDEE
                    )

                    # RG4/RG5/RG8/RG34 (UC-03) : génération automatique du
                    # dossier de fabrication à la validation, sans action
                    # manuelle supplémentaire de l'Agent SDO. Regroupée dans
                    # la même transaction que la mise à jour du statut de la
                    # commande : un échec (ex. aucun atelier de référence
                    # configuré) annule les deux plutôt que de laisser la
                    # commande passer VALIDEE sans dossier associé.
                    from .services import generer_dossier_fabrication

                    generer_dossier_fabrication(devis)
            except DjangoValidationError as exc:
                raise DRFValidationError(
                    {"dossier_fabrication": getattr(exc, "messages", [str(exc)])}
                )


# ------------------------------------------------------------------
# Ateliers / Dossiers de fabrication / Etapes de production
# ------------------------------------------------------------------

class AtelierListView(generics.ListAPIView):
    """Liste des ateliers de reference (SPA, SPB)."""

    queryset = Atelier.objects.all()
    serializer_class = AtelierSerializer
    permission_classes = [IsAuthenticated]


class DossierFabricationListCreateView(generics.ListCreateAPIView):
    """
    Liste des dossiers de fabrication. Un Chef d'atelier ne voit que les
    dossiers de l'atelier qu'il dirige. Creation reservee a l'Agent SDO.
    """

    queryset = DossierFabrication.objects.select_related("commande", "atelier").prefetch_related("etapes")
    serializer_class = DossierFabricationSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAgentSDO()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if getattr(user, "role", None) == "CHEF_ATELIER":
            qs = qs.filter(atelier__chef_atelier=user)
        return qs


class DossierFabricationDetailView(generics.RetrieveUpdateAPIView):
    """Seul le Chef d'atelier de l'atelier concerne (ou l'Admin) peut modifier le statut (RG17)."""

    queryset = DossierFabrication.objects.select_related("commande", "atelier").prefetch_related("etapes")
    serializer_class = DossierFabricationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if getattr(user, "role", None) == "CHEF_ATELIER":
            qs = qs.filter(atelier__chef_atelier=user)
        return qs

    def perform_update(self, serializer):
        dossier = self.get_object()
        user = self.request.user
        est_admin = getattr(user, "role", None) == "ADMIN"
        est_chef_du_bon_atelier = dossier.atelier.chef_atelier_id == user.id

        if not (est_admin or est_chef_du_bon_atelier):
            raise PermissionDenied(
                "Seul le chef de cet atelier (ou l'Administrateur) peut modifier ce dossier (RG17)."
            )
        serializer.save()


class EtapeProductionListCreateView(generics.ListCreateAPIView):
    """
    Liste des etapes de production. Correctif : la lecture etait reservee au
    seul Chef d'atelier (IsChefAtelier), empechant l'Agent SDO ou le
    Magasinier de consulter l'avancement - desormais ouverte a tout
    utilisateur authentifie, comme pour les dossiers de fabrication.
    La creation reste reservee au Chef d'atelier (et l'Admin), et un Chef
    d'atelier ne voit/ne peut creer que les etapes des dossiers de son
    propre atelier (correctif : aucune verification d'appartenance
    n'existait auparavant).
    """

    queryset = EtapeProduction.objects.select_related("dossier", "dossier__atelier").all()
    serializer_class = EtapeProductionSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsChefAtelier()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if getattr(user, "role", None) == "CHEF_ATELIER":
            qs = qs.filter(dossier__atelier__chef_atelier=user)
        return qs

    def perform_create(self, serializer):
        dossier = serializer.validated_data.get("dossier")
        user = self.request.user
        est_admin = getattr(user, "role", None) == "ADMIN"
        est_chef_du_bon_atelier = dossier and dossier.atelier.chef_atelier_id == user.id

        if not (est_admin or est_chef_du_bon_atelier):
            raise PermissionDenied(
                "Seul le chef de l'atelier concerné (ou l'Administrateur) peut ajouter une étape à ce dossier (RG17)."
            )
        serializer.save()


class EtapeProductionDetailView(generics.RetrieveUpdateAPIView):
    """
    Consultation et mise a jour d'une etape de production. Correctif :
    lecture ouverte a tout utilisateur authentifie ; la modification reste
    reservee au Chef d'atelier proprietaire du dossier (ou l'Admin), verifie
    explicitement comme pour DossierFabricationDetailView (RG17).
    """

    queryset = EtapeProduction.objects.select_related("dossier", "dossier__atelier").all()
    serializer_class = EtapeProductionSerializer
    permission_classes = [IsAuthenticated]

    def perform_update(self, serializer):
        etape = self.get_object()
        user = self.request.user
        est_admin = getattr(user, "role", None) == "ADMIN"
        est_chef_du_bon_atelier = etape.dossier.atelier.chef_atelier_id == user.id

        if not (est_admin or est_chef_du_bon_atelier):
            raise PermissionDenied(
                "Seul le chef de l'atelier concerné (ou l'Administrateur) peut modifier cette étape (RG17)."
            )
        serializer.save()


# ------------------------------------------------------------------
# Stock : Articles et mouvements
# ------------------------------------------------------------------

class ArticleListCreateView(generics.ListCreateAPIView):
    """Liste et creation des articles de stock - reservees au Magasinier (et Admin)."""

    queryset = Article.objects.all()
    serializer_class = ArticleSerializer
    permission_classes = [IsMagasinier]


class ArticleDetailView(generics.RetrieveUpdateAPIView):
    """
    Consultation et mise a jour d'un article. La quantite en stock reste
    en lecture seule ici (cf. ArticleSerializer) : elle ne change que via
    la creation d'un MouvementStock, pour garantir la tracabilite.
    """

    queryset = Article.objects.all()
    serializer_class = ArticleSerializer
    permission_classes = [IsMagasinier]


class MouvementStockListCreateView(generics.ListCreateAPIView):
    """
    Liste et creation des mouvements de stock - reservees au Magasinier
    (et Admin). La verification de disponibilite (RG11) est faite dans le
    serializer, avec une seconde protection atomique au niveau du modele.
    """

    queryset = MouvementStock.objects.select_related("article", "dossier").all()
    serializer_class = MouvementStockSerializer
    permission_classes = [IsMagasinier]

    def perform_create(self, serializer):
        serializer.save(valide_par=self.request.user)


# ------------------------------------------------------------------
# Options de devis, details matiere/operation, executions
# ------------------------------------------------------------------

class OptionDevisListCreateView(generics.ListCreateAPIView):
    """
    Liste et creation des options de personnalisation d'un devis (RG33).
    Accessible en lecture a tout utilisateur authentifie ;
    creation reservee a l'Agent SDO (et l'Administrateur).
    """

    queryset = OptionDevis.objects.select_related("devis").all()
    serializer_class = OptionDevisSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        devis_id = self.request.query_params.get("devis")
        if devis_id:
            queryset = queryset.filter(devis_id=devis_id)
        return queryset

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAgentSDO()]
        return [IsAuthenticated()]


class OptionDevisDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Consultation, modification et suppression d'une option de devis.
    Corrige une absence : seule la creation etait exposee jusqu'ici, alors
    que l'Agent SDO doit pouvoir ajuster ou retirer une personnalisation
    tant que le devis n'est pas valide (UC-13, RG16).
    """

    queryset = OptionDevis.objects.select_related("devis").all()
    serializer_class = OptionDevisSerializer
    permission_classes = [IsAgentSDO]

    def perform_update(self, serializer):
        self._verifier_devis_modifiable(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self._verifier_devis_modifiable(instance)
        devis = instance.devis
        instance.delete()
        devis.recalculer_et_sauvegarder_prix_revient()

    @staticmethod
    def _verifier_devis_modifiable(option):
        if option.devis.valide:
            raise PermissionDenied(
                "Un devis déjà validé ne peut plus être modifié (RG16, UC-13)."
            )


class LigneMatiereDevisListCreateView(generics.ListCreateAPIView):
    """
    Liste et creation des lignes matiere d'une ligne de devis (RG39).
    Accessible en lecture a tout utilisateur authentifie ;
    creation reservee a l'Agent SDO.
    """

    queryset = LigneMatiereDevis.objects.select_related("article", "ligne_devis").all()
    serializer_class = LigneMatiereDevisSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        ligne_devis_id = self.request.query_params.get("ligne_devis")
        if ligne_devis_id:
            queryset = queryset.filter(ligne_devis_id=ligne_devis_id)
        return queryset

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAgentSDO()]
        return [IsAuthenticated()]


class LigneMatiereDevisDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Consultation, ajustement et suppression d'une ligne matière du devis
    (RG39). Corrige une absence : seule la création était exposée, alors
    que l'Agent SDO doit pouvoir ajuster la quantité estimée (ex. suite à
    une option) tant que le devis n'est pas validé (UC-13, RG16).
    """

    queryset = LigneMatiereDevis.objects.select_related("article", "ligne_devis__devis").all()
    serializer_class = LigneMatiereDevisSerializer
    permission_classes = [IsAgentSDO]

    def perform_update(self, serializer):
        self._verifier_devis_modifiable(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self._verifier_devis_modifiable(instance)
        devis = instance.ligne_devis.devis
        instance.delete()
        devis.recalculer_et_sauvegarder_prix_revient()

    @staticmethod
    def _verifier_devis_modifiable(ligne):
        if ligne.ligne_devis.devis.valide:
            raise PermissionDenied(
                "Un devis déjà validé ne peut plus être modifié (RG16, UC-13)."
            )


class LigneOperationDevisListCreateView(generics.ListCreateAPIView):
    """
    Liste et creation des lignes operation d'une ligne de devis (RG39).
    Accessible en lecture a tout utilisateur authentifie ;
    creation reservee a l'Agent SDO.
    """

    queryset = LigneOperationDevis.objects.select_related("poste", "ligne_devis").all()
    serializer_class = LigneOperationDevisSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        ligne_devis_id = self.request.query_params.get("ligne_devis")
        if ligne_devis_id:
            queryset = queryset.filter(ligne_devis_id=ligne_devis_id)
        return queryset

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAgentSDO()]
        return [IsAuthenticated()]


class LigneOperationDevisDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Consultation, ajustement et suppression d'une ligne opération du devis
    (RG39). Corrige une absence : seule la création était exposée, alors
    que l'Agent SDO doit pouvoir ajuster le temps estimé tant que le devis
    n'est pas validé (UC-13, RG16).
    """

    queryset = LigneOperationDevis.objects.select_related("poste", "ligne_devis__devis").all()
    serializer_class = LigneOperationDevisSerializer
    permission_classes = [IsAgentSDO]

    def perform_update(self, serializer):
        self._verifier_devis_modifiable(serializer.instance)
        serializer.save()

    def perform_destroy(self, instance):
        self._verifier_devis_modifiable(instance)
        devis = instance.ligne_devis.devis
        instance.delete()
        devis.recalculer_et_sauvegarder_prix_revient()

    @staticmethod
    def _verifier_devis_modifiable(ligne):
        if ligne.ligne_devis.devis.valide:
            raise PermissionDenied(
                "Un devis déjà validé ne peut plus être modifié (RG16, UC-13)."
            )


class ExecutionOperationListCreateView(generics.ListCreateAPIView):
    """
    Liste et creation des executions d'operation sur un poste (RG35, RG38).
    Accessible en lecture a tout utilisateur authentifie ;
    creation reservee au Chef d'atelier (et l'Administrateur).
    """

    queryset = ExecutionOperation.objects.select_related(
        "dossier", "poste", "ligne_operation_devis", "utilisateur"
    ).all()
    serializer_class = ExecutionOperationSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        dossier_id = self.request.query_params.get("dossier")
        if dossier_id:
            queryset = queryset.filter(dossier_id=dossier_id)
        if getattr(self.request.user, "role", None) == "CHEF_ATELIER":
            queryset = queryset.filter(dossier__atelier__chef_atelier=self.request.user)
        return queryset

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsChefAtelier()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        execution = serializer.validated_data["dossier"]
        user = self.request.user
        if getattr(user, "role", None) != "ADMIN" and execution.atelier.chef_atelier_id != user.id:
            raise PermissionDenied(
                "Vous ne pouvez saisir une exécution que pour votre atelier (RG17)."
            )
        serializer.save(utilisateur=user)


class ExecutionOperationDetailView(generics.RetrieveUpdateAPIView):
    """
    Consultation et mise a jour d'une execution d'operation.
    Modification reservee au Chef d'atelier (ou l'Administrateur).
    """

    queryset = ExecutionOperation.objects.select_related(
        "dossier", "poste", "ligne_operation_devis", "utilisateur"
    ).all()
    serializer_class = ExecutionOperationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        if getattr(self.request.user, "role", None) == "CHEF_ATELIER":
            qs = qs.filter(dossier__atelier__chef_atelier=self.request.user)
        return qs

    def perform_update(self, serializer):
        execution = self.get_object()
        user = self.request.user
        est_admin = getattr(user, "role", None) == "ADMIN"
        est_chef_du_bon_atelier = (
            execution.dossier.atelier.chef_atelier_id == user.id
        )
        if not (est_admin or est_chef_du_bon_atelier):
            raise PermissionDenied(
                "Seul le chef de l'atelier concerné (ou l'Administrateur) "
                "peut modifier cette saisie (RG17)."
            )
        serializer.save()