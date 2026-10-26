from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.utilisateurs.permissions import IsAdmin, IsAgentSDO

from .ml.estimation_service import entrainer_modele, predire_cout
from .models import EstimationIA
from .serializers import EstimationIASerializer, EstimationInputSerializer


class EstimerCoutView(APIView):
    """
    POST /api/ia/estimer/
    Retourne une estimation du prix de revient et de la durée de production
    pour un type de document, une quantité et un atelier donnés.
    Réservé à l'Agent SDO (et l'Administrateur).
    """

    permission_classes = [IsAgentSDO]

    def post(self, request):
        serializer = EstimationInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        resultat = predire_cout(**serializer.validated_data)
        return Response(resultat)


class EntrainerModeleView(APIView):
    """
    POST /api/ia/entrainer/
    Relance l'entraînement du modèle XGBoost sur l'historique disponible.
    Réservé à l'Administrateur.
    """

    permission_classes = [IsAdmin]

    def post(self, request):
        resultat = entrainer_modele()
        return Response(resultat)


class EstimationIAListView(generics.ListAPIView):
    """
    GET /api/estimations/
    Liste de toutes les estimations IA enregistrées (Agent SDO / Admin).

    Filtres optionnels :
      ?devis=<id>
      ?methode=XGBOOST|HEURISTIQUE
      ?commande=<id>
    """

    queryset = EstimationIA.objects.select_related(
        "devis",
        "devis__commande",
        "devis__commande__organisme",
    ).order_by("-date_estimation")
    serializer_class = EstimationIASerializer
    permission_classes = [IsAgentSDO]

    def get_queryset(self):
        queryset = super().get_queryset()
        devis_id = self.request.query_params.get("devis")
        if devis_id:
            queryset = queryset.filter(devis_id=devis_id)
        commande_id = self.request.query_params.get("commande")
        if commande_id:
            queryset = queryset.filter(devis__commande_id=commande_id)
        methode = self.request.query_params.get("methode")
        if methode:
            queryset = queryset.filter(methode=methode.upper())
        return queryset


class EstimationIADetailView(generics.RetrieveAPIView):
    """
    GET /api/estimations/<id>/
    Détail d'une estimation IA (lecture seule).
    """

    queryset = EstimationIA.objects.select_related(
        "devis",
        "devis__commande",
        "devis__commande__organisme",
    ).all()
    serializer_class = EstimationIASerializer
    permission_classes = [IsAgentSDO]