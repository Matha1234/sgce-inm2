from django.urls import path

from .views import (
    ComposantDetailView,
    ComposantListCreateView,
    EstimerPrixRevientCatalogueView,
    FamilleProduitDetailView,
    FamilleProduitListCreateView,
    LigneMatierePremiereDetailView,
    LigneMatierePremiereListCreateView,
    LigneOperationDetailView,
    LigneOperationListCreateView,
    MachineDetailView,
    MachineListCreateView,
    ProduitDetailView,
    ProduitListCreateView,
)

urlpatterns = [
    path("catalogue/familles/", FamilleProduitListCreateView.as_view(), name="famille-produit-list"),
    path("catalogue/familles/<int:pk>/", FamilleProduitDetailView.as_view(), name="famille-produit-detail"),

    path("catalogue/produits/", ProduitListCreateView.as_view(), name="produit-list"),
    path("catalogue/produits/<int:pk>/", ProduitDetailView.as_view(), name="produit-detail"),

    path("catalogue/composants/", ComposantListCreateView.as_view(), name="composant-list"),
    path("catalogue/composants/<int:pk>/", ComposantDetailView.as_view(), name="composant-detail"),

    path("catalogue/machines/", MachineListCreateView.as_view(), name="machine-list"),
    path("catalogue/machines/<int:pk>/", MachineDetailView.as_view(), name="machine-detail"),

    path("catalogue/lignes-matiere/", LigneMatierePremiereListCreateView.as_view(), name="ligne-matiere-list"),
    path("catalogue/lignes-matiere/<int:pk>/", LigneMatierePremiereDetailView.as_view(), name="ligne-matiere-detail"),

    path("catalogue/lignes-operation/", LigneOperationListCreateView.as_view(), name="ligne-operation-list"),
    path("catalogue/lignes-operation/<int:pk>/", LigneOperationDetailView.as_view(), name="ligne-operation-detail"),

    path("catalogue/estimer/", EstimerPrixRevientCatalogueView.as_view(), name="catalogue-estimer"),
]
