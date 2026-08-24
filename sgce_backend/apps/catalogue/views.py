from rest_framework import generics
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.core.exceptions import ValidationError as DjangoValidationError

from apps.utilisateurs.permissions import IsAdmin

from .models import Composant, FamilleProduit, LigneMatierePremiere, LigneOperation, Machine, Produit
from .serializers import (
    ComposantSerializer,
    FamilleProduitSerializer,
    LigneMatierePremiereSerializer,
    LigneOperationSerializer,
    MachineSerializer,
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
        "composants__lignes_matiere_premiere__article", "composants__lignes_operation__machine"
    )
    serializer_class = ProduitSerializer


class ProduitDetailView(LectureOuAdminMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = Produit.objects.select_related("famille").prefetch_related(
        "composants__lignes_matiere_premiere__article", "composants__lignes_operation__machine"
    )
    serializer_class = ProduitSerializer


class ComposantListCreateView(LectureOuAdminMixin, generics.ListCreateAPIView):
    queryset = Composant.objects.select_related("produit")
    serializer_class = ComposantSerializer


class ComposantDetailView(LectureOuAdminMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = Composant.objects.select_related("produit")
    serializer_class = ComposantSerializer


class MachineListCreateView(LectureOuAdminMixin, generics.ListCreateAPIView):
    queryset = Machine.objects.all()
    serializer_class = MachineSerializer


class MachineDetailView(LectureOuAdminMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = Machine.objects.all()
    serializer_class = MachineSerializer


class LigneMatierePremiereListCreateView(LectureOuAdminMixin, generics.ListCreateAPIView):
    queryset = LigneMatierePremiere.objects.select_related("composant", "article")
    serializer_class = LigneMatierePremiereSerializer


class LigneMatierePremiereDetailView(LectureOuAdminMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = LigneMatierePremiere.objects.select_related("composant", "article")
    serializer_class = LigneMatierePremiereSerializer


class LigneOperationListCreateView(LectureOuAdminMixin, generics.ListCreateAPIView):
    queryset = LigneOperation.objects.select_related("composant", "machine")
    serializer_class = LigneOperationSerializer


class LigneOperationDetailView(LectureOuAdminMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset = LigneOperation.objects.select_related("composant", "machine")
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
