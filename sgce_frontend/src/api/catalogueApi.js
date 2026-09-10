import axiosClient from "./axiosClient";

// --- Familles de produits ---
export const listerFamilles = () => axiosClient.get("/catalogue/familles/").then((r) => r.data);
export const creerFamille = (donnees) => axiosClient.post("/catalogue/familles/", donnees).then((r) => r.data);
export const supprimerFamille = (id) => axiosClient.delete(`/catalogue/familles/${id}/`).then((r) => r.data);

// --- Produits du catalogue ---
export const listerProduits = () => axiosClient.get("/catalogue/produits/").then((r) => r.data);
export const recupererProduit = (id) => axiosClient.get(`/catalogue/produits/${id}/`).then((r) => r.data);
export const creerProduit = (donnees) => axiosClient.post("/catalogue/produits/", donnees).then((r) => r.data);
export const modifierProduit = (id, donnees) =>
  axiosClient.patch(`/catalogue/produits/${id}/`, donnees).then((r) => r.data);
export const supprimerProduit = (id) => axiosClient.delete(`/catalogue/produits/${id}/`).then((r) => r.data);

// --- Composants ---
export const creerComposant = (donnees) => axiosClient.post("/catalogue/composants/", donnees).then((r) => r.data);
export const supprimerComposant = (id) => axiosClient.delete(`/catalogue/composants/${id}/`).then((r) => r.data);

// --- Postes de charge (RG31, ex-machines) ---
export const listerPostesDeCharge = () => axiosClient.get("/catalogue/postes-de-charge/").then((r) => r.data);
export const creerPosteDeCharge = (donnees) => axiosClient.post("/catalogue/postes-de-charge/", donnees).then((r) => r.data);

// --- Lignes de nomenclature (matière première / opération) ---
export const creerLigneMatiere = (donnees) =>
  axiosClient.post("/catalogue/lignes-matiere/", donnees).then((r) => r.data);
export const supprimerLigneMatiere = (id) =>
  axiosClient.delete(`/catalogue/lignes-matiere/${id}/`).then((r) => r.data);

export const creerLigneOperation = (donnees) =>
  axiosClient.post("/catalogue/lignes-operation/", donnees).then((r) => r.data);
export const supprimerLigneOperation = (id) =>
  axiosClient.delete(`/catalogue/lignes-operation/${id}/`).then((r) => r.data);

// --- Estimation (RG27) ---
export const estimerPrixRevientCatalogue = (produitId, quantite) =>
  axiosClient
    .post("/catalogue/estimer/", { produit: produitId, quantite })
    .then((r) => r.data);

// --- Révision des standards (RG37) — boucle de rétroaction, réservé Admin ---
export const listerComposantsAReviser = () =>
  axiosClient.get("/catalogue/composants-a-reviser/").then((r) => r.data);
