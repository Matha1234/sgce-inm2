import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Alert, Snackbar } from "@mui/material";

const ContexteNotifier = createContext(null);

/**
 * Notificateur global : affiche un message de confirmation temporaire
 * (Snackbar) après le succès d'une action, depuis n'importe quelle page.
 *
 * Utilisation :
 *   const { afficherSucces } = useNotifier();
 *   afficherSucces("Commande créée avec succès.");
 */
export function NotifierProvider({ children }) {
  const [message, setMessage] = useState(null);

  const fermer = useCallback(() => setMessage(null), []);
  const afficherSucces = useCallback((texte) => setMessage({ texte, type: "success" }), []);
  const afficherErreur = useCallback((texte) => setMessage({ texte, type: "error" }), []);

  const valeur = useMemo(() => ({ afficherSucces, afficherErreur }), [afficherSucces, afficherErreur]);

  return (
    <ContexteNotifier.Provider value={valeur}>
      {children}
      <Snackbar
        open={Boolean(message)}
        autoHideDuration={4000}
        onClose={fermer}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={message?.type || "success"}
          variant="filled"
          onClose={fermer}
          sx={{ fontWeight: 600, alignItems: "center", boxShadow: 3 }}
        >
          {message?.texte}
        </Alert>
      </Snackbar>
    </ContexteNotifier.Provider>
  );
}

// eslint-disable-next-line react/only-export-components -- hook exposé avec son provider
export function useNotifier() {
  const contexte = useContext(ContexteNotifier);
  if (!contexte) {
    throw new Error("useNotifier doit être utilisé sous <NotifierProvider>.");
  }
  return contexte;
}
