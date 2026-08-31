import axios from "axios";

import { API_BASE_URL } from "./axiosClient";
import axiosClient from "./axiosClient";

// Le login n'utilise pas axiosClient (pas encore de token a injecter),
// mais une instance axios brute pointant sur la meme base.
export const seConnecter = (username, password) =>
  axios.post(`${API_BASE_URL}/auth/login/`, { username, password }).then((r) => r.data);

export const recupererProfil = () => axiosClient.get("/auth/me/").then((r) => r.data);

// Accès public (pas de jeton disponible avant connexion) : même instance
// axios brute que le login.
export const demanderReinitialisationMotDePasse = (email) =>
  axios.post(`${API_BASE_URL}/auth/mot-de-passe-oublie/`, { email }).then((r) => r.data);

export const reinitialiserMotDePasse = (uid, token, nouveauMotDePasse) =>
  axios
    .post(`${API_BASE_URL}/auth/reinitialiser-mot-de-passe/`, {
      uid,
      token,
      nouveau_mot_de_passe: nouveauMotDePasse,
    })
    .then((r) => r.data);
