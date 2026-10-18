import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { LANGUES, traductions } from "./translations";

const CLE_STOCKAGE = "sgcfc_langue";

const LanguageContext = createContext({
  langue: "fr",
  setLangue: () => {},
  t: (cle) => cle,
  langues: LANGUES,
});

function resoudreCle(obj, chemin) {
  if (!chemin) return "";
  return chemin.split(".").reduce((acc, part) => {
    if (acc && typeof acc === "object" && part in acc) return acc[part];
    return undefined;
  }, obj);
}

export function LanguageProvider({ children }) {
  const [langue, setLangueState] = useState(() => {
    try {
      const sauve = localStorage.getItem(CLE_STOCKAGE);
      if (sauve && traductions[sauve]) return sauve;
    } catch {
      /* ignore */
    }
    return "fr";
  });

  const setLangue = useCallback((code) => {
    if (!traductions[code]) return;
    setLangueState(code);
    try {
      localStorage.setItem(CLE_STOCKAGE, code);
    } catch {
      /* ignore */
    }
    // Attribut HTML pour accessibilité / CSS éventuel
    document.documentElement.lang = code === "mg" ? "mg" : code;
  }, []);

  useEffect(() => {
    document.documentElement.lang = langue === "mg" ? "mg" : langue;
  }, [langue]);

  const t = useCallback(
    (cle, replacments = {}) => {
      const dict = traductions[langue] || traductions.fr;
      let texte = resoudreCle(dict, cle);
      if (texte === undefined) {
        texte = resoudreCle(traductions.fr, cle) ?? cle;
      }
      if (typeof texte !== "string") return cle;
      Object.entries(replacments).forEach(([k, v]) => {
        texte = texte.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      });
      return texte;
    },
    [langue]
  );

  const value = useMemo(
    () => ({ langue, setLangue, t, langues: LANGUES }),
    [langue, setLangue, t]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

/** Hook : const { t, langue, setLangue, langues } = useLangue(); */
export function useLangue() {
  return useContext(LanguageContext);
}