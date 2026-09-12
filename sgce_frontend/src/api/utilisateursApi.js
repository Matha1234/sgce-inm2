import axiosClient from "./axiosClient";

// --- Notifications ---
export const listerNotifications = (lueSeulement) => {
  const params = lueSeulement === undefined ? {} : { lue: lueSeulement };
  return axiosClient.get("/notifications/", { params }).then((r) => r.data);
};
export const marquerNotificationLue = (id) =>
  axiosClient.patch(`/notifications/${id}/lue/`, {}).then((r) => r.data);
export const marquerToutesNotificationsLues = () =>
  axiosClient.post("/notifications/tout-marquer-lu/").then((r) => r.data);
export const supprimerNotification = (id) =>
  axiosClient.delete(`/notifications/${id}/`).then((r) => r.data);
export const supprimerToutesNotifications = () =>
  axiosClient.delete("/notifications/tout-supprimer/").then((r) => r.data);

// --- Utilisateurs (Administrateur) ---
export const listerUtilisateurs = () => axiosClient.get("/utilisateurs/").then((r) => r.data);
export const creerUtilisateur = (donnees) => axiosClient.post("/utilisateurs/", donnees).then((r) => r.data);
export const modifierUtilisateur = (id, donnees) =>
  axiosClient.patch(`/utilisateurs/${id}/`, donnees).then((r) => r.data);

// --- Annuaire interne (tous les utilisateurs authentifiés) ---
export const listerAnnuaire = () => axiosClient.get("/utilisateurs/annuaire/").then((r) => r.data);

// --- Profil personnel ---
export const mettreAJourProfil = (donnees) =>
  axiosClient.patch("/auth/me/", donnees).then((r) => r.data);
export const mettreAJourPhotoProfil = (fichier) => {
  const formData = new FormData();
  formData.append("photo", fichier);
  return axiosClient
    .patch("/auth/me/", formData, { headers: { "Content-Type": "multipart/form-data" } })
    .then((r) => r.data);
};
export const changerMotDePasse = (donnees) =>
  axiosClient.post("/auth/changer-mot-de-passe/", donnees).then((r) => r.data);

export const supprimerUtilisateur = (id) =>
  axiosClient.delete(`/utilisateurs/${id}/`).then((r) => r.data);