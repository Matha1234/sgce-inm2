import axiosClient from "./axiosClient";

// --- Estimation à la volée (sans enregistrement en base) ---
// POST /api/ia/estimer/
export const estimerCout = (donnees) =>
  axiosClient.post("/ia/estimer/", donnees).then((r) => r.data);

// --- Entraînement du modèle XGBoost (Admin uniquement) ---
// POST /api/ia/entrainer/
export const entrainerModele = () =>
  axiosClient.post("/ia/entrainer/").then((r) => r.data);

// --- Estimations IA enregistrées (liées à un devis) ---
// GET /api/estimations/
// Filtres optionnels : ?devis=<id>, ?commande=<id>, ?methode=XGBOOST|HEURISTIQUE
export const listerEstimations = (params) =>
  axiosClient.get("/estimations/", { params }).then((r) => r.data);

// GET /api/estimations/<id>/
export const recupererEstimation = (id) =>
  axiosClient.get(`/estimations/${id}/`).then((r) => r.data);