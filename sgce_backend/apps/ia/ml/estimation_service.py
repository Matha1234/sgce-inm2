"""
Service d'estimation intelligente des couts (Sprint 4-5 / Phase 1 Sprint A).

Deux modes (RG20) :
- historique insuffisant → heuristique (version_modele = heuristique-v0)
- assez de devis → XGBoost (version_modele = xgboost-v1)
"""

import os

from django.conf import settings

from apps.commandes.models import Devis

MODEL_DIR = os.path.join(settings.BASE_DIR, "apps", "ia", "ml", "modeles")
MODEL_PATH_PRIX = os.path.join(MODEL_DIR, "modele_prix.joblib")
MODEL_PATH_DUREE = os.path.join(MODEL_DIR, "modele_duree.joblib")

SEUIL_HISTORIQUE_MINIMAL = 20

PRIX_BASE_HEURISTIQUE = {
    "JOURNAL_OFFICIEL": 500,
    "BULLETIN_ANNONCES": 300,
    "FORMULAIRE_ADMINISTRATIF": 150,
    "CACHET_ADMINISTRATIF": 2000,
    "DOCUMENT_FIDUCIAIRE": 1200,
    "AUTRE": 400,
}


def construire_dataset():
    """Construit un DataFrame a partir de tous les devis existants."""
    import pandas as pd

    qs = Devis.objects.select_related("commande").all()
    lignes = [
        {
            "type_document": devis.commande.type_document,
            "quantite": devis.commande.quantite,
            "atelier": devis.commande.atelier,
            "prix_revient": float(devis.prix_revient),
            "duree_production": devis.duree_production,
        }
        for devis in qs
        if devis.commande_id and devis.prix_revient is not None
    ]
    return pd.DataFrame(lignes)


def _charger_modele(chemin):
    if not os.path.exists(chemin):
        return None
    import joblib
    return joblib.load(chemin)


def entrainer_modele():
    """Entraine les modeles XGBoost (prix et duree)."""
    import joblib
    import pandas as pd
    from xgboost import XGBRegressor

    df = construire_dataset()
    if len(df) < SEUIL_HISTORIQUE_MINIMAL:
        return {
            "entraine": False,
            "raison": f"Historique insuffisant ({len(df)} < {SEUIL_HISTORIQUE_MINIMAL})",
            "nb_exemples": len(df),
        }

    os.makedirs(MODEL_DIR, exist_ok=True)

    y_prix = df["prix_revient"]
    y_duree = df["duree_production"]
    X = pd.get_dummies(df[["type_document", "quantite", "atelier"]], columns=["type_document", "atelier"])

    modele_prix = XGBRegressor(n_estimators=50, max_depth=4, random_state=42)
    modele_duree = XGBRegressor(n_estimators=50, max_depth=4, random_state=42)
    modele_prix.fit(X, y_prix)
    modele_duree.fit(X, y_duree)

    joblib.dump({"modele": modele_prix, "colonnes": list(X.columns)}, MODEL_PATH_PRIX)
    joblib.dump({"modele": modele_duree, "colonnes": list(X.columns)}, MODEL_PATH_DUREE)

    return {"entraine": True, "nb_exemples": len(df)}


def predire_cout(type_document, quantite, atelier):
    """Predoit prix et duree ; renvoie aussi methode et score_confiance."""
    import pandas as pd

    n = Devis.objects.count()
    if n < SEUIL_HISTORIQUE_MINIMAL:
        return _estimation_heuristique(type_document, quantite, atelier)

    modele_prix_data = _charger_modele(MODEL_PATH_PRIX)
    modele_duree_data = _charger_modele(MODEL_PATH_DUREE)

    if modele_prix_data is None or modele_duree_data is None:
        return _estimation_heuristique(type_document, quantite, atelier)

    colonnes = modele_prix_data["colonnes"]
    ligne = pd.DataFrame(
        [{"type_document": type_document, "quantite": quantite, "atelier": atelier}]
    )
    ligne_encoded = pd.get_dummies(ligne, columns=["type_document", "atelier"])
    ligne_encoded = ligne_encoded.reindex(columns=colonnes, fill_value=0)

    prix_predit = float(modele_prix_data["modele"].predict(ligne_encoded)[0])
    duree_predite = max(1, round(float(modele_duree_data["modele"].predict(ligne_encoded)[0])))

    if prix_predit <= 0:
        return _estimation_heuristique(type_document, quantite, atelier)

    return {
        "prix_predit": round(prix_predit, 2),
        "duree_predite": int(duree_predite),
        "version_modele": "xgboost-v1",
        "methode": "XGBOOST",
        "score_confiance": 75.00,
    }


def _estimation_heuristique(type_document, quantite, atelier):
    """Estimation de secours (RG20)."""
    prix_base = PRIX_BASE_HEURISTIQUE.get(type_document, 400)
    multiplicateur = 1.4 if atelier == "SPB" else 1.0

    prix_predit = round(prix_base * multiplicateur * (quantite / 100), 2)
    duree_predite = max(1, int(round(2 + (quantite / 800) * multiplicateur)))

    return {
        "prix_predit": prix_predit,
        "duree_predite": duree_predite,
        "version_modele": "heuristique-v0",
        "methode": "HEURISTIQUE",
        "score_confiance": 50.00,
    }