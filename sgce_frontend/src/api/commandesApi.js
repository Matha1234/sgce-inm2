import axiosClient from "./axiosClient";

// --- Organismes clients ---
export const listerOrganismes = () => axiosClient.get("/organismes/").then((r) => r.data);
export const creerOrganisme = (donnees) => axiosClient.post("/organismes/", donnees).then((r) => r.data);

// --- Commandes ---
// UC-14 : ?organisme=<id> pour l'historique des commandes/devis d'un client.
export const listerCommandes = (params) => axiosClient.get("/commandes/", { params }).then((r) => r.data);
export const recupererCommande = (id) => axiosClient.get(`/commandes/${id}/`).then((r) => r.data);
export const creerCommande = (donnees) => axiosClient.post("/commandes/", donnees).then((r) => r.data);
export const modifierCommande = (id, donnees) =>
  axiosClient.patch(`/commandes/${id}/`, donnees).then((r) => r.data);

// --- Devis ---
export const creerDevis = (donnees) => axiosClient.post("/devis/", donnees).then((r) => r.data);
export const recupererDevis = (id) => axiosClient.get(`/devis/${id}/`).then((r) => r.data);
export const modifierDevis = (id, donnees) => axiosClient.patch(`/devis/${id}/`, donnees).then((r) => r.data);

// --- Ateliers ---
export const listerAteliers = () => axiosClient.get("/ateliers/").then((r) => r.data);

// --- Dossiers de fabrication ---
export const listerDossiers = () => axiosClient.get("/dossiers/").then((r) => r.data);
export const recupererDossier = (id) => axiosClient.get(`/dossiers/${id}/`).then((r) => r.data);
export const creerDossier = (donnees) => axiosClient.post("/dossiers/", donnees).then((r) => r.data);
export const modifierDossier = (id, donnees) =>
  axiosClient.patch(`/dossiers/${id}/`, donnees).then((r) => r.data);

// --- Etapes de production ---
export const listerEtapes = () => axiosClient.get("/etapes/").then((r) => r.data);
export const creerEtape = (donnees) => axiosClient.post("/etapes/", donnees).then((r) => r.data);
export const modifierEtape = (id, donnees) => axiosClient.patch(`/etapes/${id}/`, donnees).then((r) => r.data);

// --- Stock ---
export const listerArticles = () => axiosClient.get("/articles/").then((r) => r.data);
export const recupererArticle = (id) => axiosClient.get(`/articles/${id}/`).then((r) => r.data);
export const creerArticle = (donnees) => axiosClient.post("/articles/", donnees).then((r) => r.data);
export const modifierArticle = (id, donnees) =>
  axiosClient.patch(`/articles/${id}/`, donnees).then((r) => r.data);

export const listerMouvements = () => axiosClient.get("/mouvements/").then((r) => r.data);
export const creerMouvement = (donnees) => axiosClient.post("/mouvements/", donnees).then((r) => r.data);

// --- Facturation ---
export const listerFactures = () => axiosClient.get("/factures/").then((r) => r.data);
export const creerFacture = (donnees) => axiosClient.post("/factures/", donnees).then((r) => r.data);

// --- Options de devis (RG33) — personnalisation sur-mesure ---
export const listerOptionsDevis = (devisId) =>
  axiosClient.get("/options-devis/", { params: devisId ? { devis: devisId } : undefined }).then((r) => r.data);
export const creerOptionDevis = (donnees) => axiosClient.post("/options-devis/", donnees).then((r) => r.data);
export const modifierOptionDevis = (id, donnees) =>
  axiosClient.patch(`/options-devis/${id}/`, donnees).then((r) => r.data);
export const supprimerOptionDevis = (id) => axiosClient.delete(`/options-devis/${id}/`).then((r) => r.data);

// --- Détail matière/opération du devis (RG39) ---
export const listerLignesMatiereDevis = (ligneDevisId) =>
  axiosClient
    .get("/lignes-matiere-devis/", { params: ligneDevisId ? { ligne_devis: ligneDevisId } : undefined })
    .then((r) => r.data);
export const modifierLigneMatiereDevis = (id, donnees) =>
  axiosClient.patch(`/lignes-matiere-devis/${id}/`, donnees).then((r) => r.data);
export const supprimerLigneMatiereDevis = (id) =>
  axiosClient.delete(`/lignes-matiere-devis/${id}/`).then((r) => r.data);

export const listerLignesOperationDevis = (ligneDevisId) =>
  axiosClient
    .get("/lignes-operation-devis/", { params: ligneDevisId ? { ligne_devis: ligneDevisId } : undefined })
    .then((r) => r.data);
export const modifierLigneOperationDevis = (id, donnees) =>
  axiosClient.patch(`/lignes-operation-devis/${id}/`, donnees).then((r) => r.data);
export const supprimerLigneOperationDevis = (id) =>
  axiosClient.delete(`/lignes-operation-devis/${id}/`).then((r) => r.data);

// --- Exécutions d'opération (RG35, RG38) — temps réel saisi par le Chef d'atelier ---
export const listerExecutionsOperation = (dossierId) =>
  axiosClient
    .get("/executions-operation/", { params: dossierId ? { dossier: dossierId } : undefined })
    .then((r) => r.data);
export const creerExecutionOperation = (donnees) =>
  axiosClient.post("/executions-operation/", donnees).then((r) => r.data);
export const modifierExecutionOperation = (id, donnees) =>
  axiosClient.patch(`/executions-operation/${id}/`, donnees).then((r) => r.data);
