from django.urls import path

from .views import (
    EntrainerModeleView,
    EstimerCoutView,
    EstimationIADetailView,
    EstimationIAListView,
)

urlpatterns = [
    path("ia/estimer/", EstimerCoutView.as_view(), name="ia-estimer"),
    path("ia/entrainer/", EntrainerModeleView.as_view(), name="ia-entrainer"),
    path("estimations/", EstimationIAListView.as_view(), name="estimations-list"),
    path("estimations/<int:pk>/", EstimationIADetailView.as_view(), name="estimations-detail"),
]