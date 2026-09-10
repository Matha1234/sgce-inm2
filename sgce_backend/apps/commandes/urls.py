from django.urls import path

from .views import (
    ArticleDetailView,
    ArticleListCreateView,
    AtelierListView,
    CommandeDetailView,
    CommandeListCreateView,
    DevisCreateView,
    DevisDetailView,
    DossierFabricationDetailView,
    DossierFabricationListCreateView,
    EtapeProductionDetailView,
    EtapeProductionListCreateView,
    ExecutionOperationDetailView,
    ExecutionOperationListCreateView,
    LigneMatiereDevisDetailView,
    LigneMatiereDevisListCreateView,
    LigneOperationDevisDetailView,
    LigneOperationDevisListCreateView,
    MouvementStockListCreateView,
    OptionDevisDetailView,
    OptionDevisListCreateView,
    OrganismeClientListCreateView,
)

urlpatterns = [
    path("organismes/", OrganismeClientListCreateView.as_view(), name="organismes-list"),

    path("commandes/", CommandeListCreateView.as_view(), name="commandes-list"),
    path("commandes/<int:pk>/", CommandeDetailView.as_view(), name="commandes-detail"),

    path("devis/", DevisCreateView.as_view(), name="devis-create"),
    path("devis/<int:pk>/", DevisDetailView.as_view(), name="devis-detail"),

    path("ateliers/", AtelierListView.as_view(), name="ateliers-list"),

    path("dossiers/", DossierFabricationListCreateView.as_view(), name="dossiers-list"),
    path("dossiers/<int:pk>/", DossierFabricationDetailView.as_view(), name="dossiers-detail"),

    path("etapes/", EtapeProductionListCreateView.as_view(), name="etapes-list"),
    path("etapes/<int:pk>/", EtapeProductionDetailView.as_view(), name="etapes-detail"),

    path("articles/", ArticleListCreateView.as_view(), name="articles-list"),
    path("articles/<int:pk>/", ArticleDetailView.as_view(), name="articles-detail"),

    path("mouvements/", MouvementStockListCreateView.as_view(), name="mouvements-list"),

    path("options-devis/", OptionDevisListCreateView.as_view(), name="options-devis-list"),
    path("options-devis/<int:pk>/", OptionDevisDetailView.as_view(), name="options-devis-detail"),

    path("lignes-matiere-devis/", LigneMatiereDevisListCreateView.as_view(), name="lignes-matiere-devis-list"),
    path("lignes-matiere-devis/<int:pk>/", LigneMatiereDevisDetailView.as_view(), name="lignes-matiere-devis-detail"),

    path("lignes-operation-devis/", LigneOperationDevisListCreateView.as_view(), name="lignes-operation-devis-list"),
    path("lignes-operation-devis/<int:pk>/", LigneOperationDevisDetailView.as_view(), name="lignes-operation-devis-detail"),

    path("executions-operation/", ExecutionOperationListCreateView.as_view(), name="executions-operation-list"),
    path("executions-operation/<int:pk>/", ExecutionOperationDetailView.as_view(), name="executions-operation-detail"),
]