import os

from django.conf import settings

from apps.commandes.models import Devis

MODEL_DIR = os.path.join(settings.BASE_DIR, "apps", "ia", "ml", "modeles")
MODEL_PATH_PRIX = os.path.join(MODEL_DIR, "modele_prix.joblib")
MODEL_PATH_DUREE = os.path.join(MODEL_DIR, "modele_duree.joblib")

# RG20 : nombre minimal de devis necessaires avant d'entrainer un modele fiable
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
    """Construit un DataFrame a partir de tous les devis existants (reels et fictifs)."""
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
    ]
    return pd.DataFrame(lignes)


def entrainer_modele():
    """Entraine les modeles XGBoost (prix et duree) sur l'historique disponible."""
    import joblib
    import pandas as pd
    from xgboost import XGBRegressor

    df = construire_dataset()
    if len(df) < SEUIL_HISTORIQUE_MINIMAL:
        return {
            "entraine": False,
            "raison": (
                f"Historique insuffisant ({len(df)} devis disponibles, "
                f"{SEUIL_HISTORIQUE_MINIMAL} requis - RG20)."
            ),
        }

    df_encoded = pd.get_dummies(df, columns=["type_document", "atelier"])
    colonnes_features = [
        c for c in df_encoded.columns if c not in ("prix_revient", "duree_production")
    ]

    X = df_encoded[colonnes_features]
    y_prix = df_encoded["prix_revient"]
    y_duree = df_encoded["duree_production"]

    modele_prix = XGBRegressor(n_estimators=100, max_depth=4, random_state=42)
    modele_prix.fit(X, y_prix)

    modele_duree = XGBRegressor(n_estimators=100, max_depth=4, random_state=42)
    modele_duree.fit(X, y_duree)

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump({"modele": modele_prix, "colonnes": colonnes_features}, MODEL_PATH_PRIX)
    joblib.dump({"modele": modele_duree, "colonnes": colonnes_features}, MODEL_PATH_DUREE)

    return {"entraine": True, "nb_exemples": len(df)}


def _charger_modele(path):
    import joblib

    if not os.path.exists(path):
        return None
    return joblib.load(path)


def predire_cout(type_document, quantite, atelier):
    """
    Predit le prix de revient et la duree de production. Si aucun modele
    entraine n'est disponible, applique le repli heuristique (RG20).
    """
    import pandas as pd

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

    # Securite : un prix de revient ne peut jamais etre negatif ou nul.
    # Sur un historique encore limite, XGBoost peut extrapoler de facon
    # aberrante pour des combinaisons peu representees dans les donnees
    # d'entrainement ; on retombe dans ce cas sur l'estimation heuristique.
    if prix_predit <= 0:
        return _estimation_heuristique(type_document, quantite, atelier)

    return {
        "prix_predit": round(prix_predit, 2),
        "duree_predite": int(duree_predite),
        "version_modele": "xgboost-v1",
        "methode": "XGBOOST",
    }


def _estimation_heuristique(type_document, quantite, atelier):
    """Estimation de secours (RG20), calcul simple et transparent."""
    prix_base = PRIX_BASE_HEURISTIQUE.get(type_document, 400)
    multiplicateur = 1.4 if atelier == "SPB" else 1.0

    prix_predit = round(prix_base * multiplicateur * (quantite / 100), 2)
    duree_predite = max(1, int(round(2 + (quantite / 800) * multiplicateur)))

    return {
        "prix_predit": prix_predit,
        "duree_predite": duree_predite,
        "version_modele": "heuristique-v0",
        "methode": "HEURISTIQUE",
    }