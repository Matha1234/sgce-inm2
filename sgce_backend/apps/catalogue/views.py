from rest_framework import generics
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.core.exceptions import ValidationError as DjangoValidationError

from apps.utilisateurs.permissions import IsAdmin

from .models import (
    Composant,
    FamilleProduit,
    LigneMatierePremiere,
    LigneOperation,
    PosteDeCharge,
    Produit,
)
from .serializers import (
    ComposantSerializer,
    FamilleProduitSerializer,
    LigneMatierePremiereSerializer,
    LigneOperationSerializer,
    PosteDeChargeSerializer,
    ProduitEstimationInputSerializer,
    ProduitSerializer,
)


class LectureOuAdminMixin:
    """
    Lecture (GET) ouverte à tout utilisateur authentifié — l'Agent SDO doit
    pouvoir parcourir le catalogue pour créer un devis. Écriture (POST/PUT/
    PATCH/DELETE) réservée à l'Administrateur (RG26 : « ne peuvent être
    définies que par l'Administrateur »).
    """

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [IsAuthenticated()]
        return [IsAdmin()]


class FamilleProduitListCreateView(LectureOuAdminMixin, generics.ListCreateAPIView):
    queryset = FamilleProduit.objects.all()
    serializer_class = FamilleProduitSerializer


class FamilleProduitDetailView(LectureOuAdminMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = FamilleProduit.objects.all()
    serializer_class = FamilleProduitSerializer


class ProduitListCreateView(LectureOuAdminMixin, generics.ListCreateAPIView):
    queryset = Produit.objects.select_related("famille").prefetch_related(
        "composants__lignes_matiere_premiere__article", "composants__lignes_operation__poste"
    )
    serializer_class = ProduitSerializer


class ProduitDetailView(LectureOuAdminMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = Produit.objects.select_related("famille").prefetch_related(
        "composants__lignes_matiere_premiere__article", "composants__lignes_operation__poste"
    )
    serializer_class = ProduitSerializer


class ComposantListCreateView(LectureOuAdminMixin, generics.ListCreateAPIView):
    queryset = Composant.objects.select_related("produit")
    serializer_class = ComposantSerializer


class ComposantDetailView(LectureOuAdminMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = Composant.objects.select_related("produit")
    serializer_class = ComposantSerializer


class PosteDeChargeListCreateView(LectureOuAdminMixin, generics.ListCreateAPIView):
    queryset = PosteDeCharge.objects.all()
    serializer_class = PosteDeChargeSerializer


class PosteDeChargeDetailView(LectureOuAdminMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = PosteDeCharge.objects.all()
    serializer_class = PosteDeChargeSerializer


class LigneMatierePremiereListCreateView(LectureOuAdminMixin, generics.ListCreateAPIView):
    queryset = LigneMatierePremiere.objects.select_related("composant", "article")
    serializer_class = LigneMatierePremiereSerializer


class LigneMatierePremiereDetailView(LectureOuAdminMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = LigneMatierePremiere.objects.select_related("composant", "article")
    serializer_class = LigneMatierePremiereSerializer


class LigneOperationListCreateView(LectureOuAdminMixin, generics.ListCreateAPIView):
    queryset = LigneOperation.objects.select_related("composant", "poste")
    serializer_class = LigneOperationSerializer


class LigneOperationDetailView(LectureOuAdminMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = LigneOperation.objects.select_related("composant", "poste")
    serializer_class = LigneOperationSerializer


class EstimerPrixRevientCatalogueView(APIView):
    """
    POST /api/catalogue/estimer/
    Calcule le prix de revient d'un produit du catalogue pour une quantité
    donnée (RG27). Utilisé par le formulaire de création de devis avant
    l'appel complémentaire au module d'estimation IA (apps.ia).
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ProduitEstimationInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            resultat = serializer.calculer()
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.messages if hasattr(exc, "messages") else str(exc))
        return Response(resultat)


class ComposantsAReviserView(APIView):
    """
    GET /api/catalogue/composants-a-reviser/
    Réservé à l'Administrateur.

    RG37 : « en cas d'écart significatif et récurrent entre le
    prévisionnel et le réel sur une ligne d'opération ou de matière
    première, les valeurs standards du catalogue doivent être révisées
    pour les commandes futures — boucle de rétroaction ». Cette règle
    n'avait encore aucun support côté API : point d'entrée absent pour que
    l'Administrateur identifie les composants concernés.

    Un composant est signalé dès lors qu'il cumule au moins deux contrôles
    de prix de revient en écart significatif (ControlePrixRevient.
    ecart_significatif = True), ce qui objective le caractère « récurrent »
    de RG37 plutôt qu'un incident isolé.
    """

    SEUIL_OCCURRENCES = 2

    permission_classes = [IsAdmin]

    def get(self, request):
        from django.db.models import Avg, Count

        from apps.controle.models import ControlePrixRevient

        composants = (
            ControlePrixRevient.objects.filter(
                ecart_significatif=True, composant__isnull=False
            )
            .values(
                "composant_id",
                "composant__designation",
                "composant__produit__nom",
            )
            .annotate(
                nombre_ecarts=Count("id"),
                ecart_moyen=Avg("ecart_prix_revient"),
            )
            .filter(nombre_ecarts__gte=self.SEUIL_OCCURRENCES)
            .order_by("-nombre_ecarts")
        )

        donnees = [
            {
                "composant_id": ligne["composant_id"],
                "produit": ligne["composant__produit__nom"],
                "composant": ligne["composant__designation"],
                "nombre_ecarts_significatifs": ligne["nombre_ecarts"],
                "ecart_moyen": ligne["ecart_moyen"],
            }
            for ligne in composants
        ]
        return Response(donnees)