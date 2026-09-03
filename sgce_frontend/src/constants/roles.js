export const ROLES = {
  ADMIN: "ADMIN",
  AGENT_SDO: "AGENT_SDO",
  CHEF_ATELIER: "CHEF_ATELIER",
  MAGASINIER: "MAGASINIER",
};

export const LIBELLES_ROLES = {
  ADMIN: "Administrateur",
  AGENT_SDO: "Agent SDO",
  CHEF_ATELIER: "Chef d'atelier",
  MAGASINIER: "Magasinier",
};

export const COULEURS_ROLES = {
  ADMIN: "#6A1B9A",
  AGENT_SDO: "#1565C0",
  CHEF_ATELIER: "#EF6C00",
  MAGASINIER: "#2E7D32",
};

export const LIBELLES_STATUT_COMMANDE = {
  EN_ATTENTE: "En attente",
  DEVIS: "Devis en cours",
  VALIDEE: "Validée",
  EN_PRODUCTION: "En production",
  LIVREE: "Livrée",
  ANNULEE: "Annulée",
};

export const COULEURS_STATUT_COMMANDE = {
  EN_ATTENTE: "default",
  DEVIS: "info",
  VALIDEE: "primary",
  EN_PRODUCTION: "warning",
  LIVREE: "success",
  ANNULEE: "error",
};

export const LIBELLES_NATURE_COMMANDE = {
  SUR_CONFECTION: "Sur confection (sur-mesure)",
  STANDARDISEE: "Standardisée (prix fixe)",
};

export const LIBELLES_STATUT_PRODUCTION = {
  CREE: "Créé",
  EN_COURS: "En cours",
  TERMINE: "Terminé",
};

export const LIBELLES_STATUT_ETAPE = {
  A_FAIRE: "À faire",
  EN_COURS: "En cours",
  TERMINEE: "Terminée",
};

export const LIBELLES_RESULTAT_CONTROLE = {
  SOUS_MARGE: "Sous-marge (déficitaire)",
  DANS_LA_NORME: "Dans la norme",
  SUR_MARGE: "Sur-marge (surestimation)",
};

export const COULEURS_RESULTAT_CONTROLE = {
  SOUS_MARGE: "error",
  DANS_LA_NORME: "success",
  SUR_MARGE: "warning",
};
