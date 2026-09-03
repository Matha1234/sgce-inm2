import axiosClient from "./axiosClient";

// --- Contrôle du prix de revient ---
export const listerControles = () => axiosClient.get("/controles/").then((r) => r.data);

// RG28 : un dossier peut porter plusieurs fiches (une par composant) —
// la liste complète est retournée, le composant NULL désigne le contrôle global.
export const recupererControlesParDossier = (dossierId) =>
  axiosClient
    .get("/controles/", { params: { dossier: dossierId } })
    .then((r) => {
      const data = Array.isArray(r.data) ? r.data : r.data.results || [];
      return data;
    });

export const creerControle = (donnees) =>
  axiosClient.post("/controles/", donnees).then((r) => r.data);

export const recupererTableauBordRentabilite = () =>
  axiosClient.get("/controles/tableau-bord/").then((r) => r.data);
