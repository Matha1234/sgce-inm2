import { useMemo, useState } from "react";

// Comparateur générique pour le tri des colonnes de tableau : gère les
// nombres, les dates ISO et les chaînes (tri insensible à la casse).
// Les valeurs vides sont toujours classées en dernier.
export function comparerValeurs(a, b) {
  const videA = a === null || a === undefined || a === "";
  const videB = b === null || b === undefined || b === "";
  if (videA && videB) return 0;
  if (videA) return 1;
  if (videB) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  const nombreA = Number(a);
  const nombreB = Number(b);
  if (
    !Number.isNaN(nombreA) && !Number.isNaN(nombreB)
    && String(a).trim() !== "" && String(b).trim() !== ""
  ) {
    return nombreA - nombreB;
  }
  const dateA = new Date(a).getTime();
  const dateB = new Date(b).getTime();
  if (!Number.isNaN(dateA) && !Number.isNaN(dateB) && /^\d{4}-\d{2}-\d{2}/.test(String(a))) {
    return dateA - dateB;
  }
  return String(a).localeCompare(String(b), "fr", { sensitivity: "base" });
}

// État de tri réutilisable pour les tableaux : le clic sur une colonne
// trie par ordre croissant, un second clic inverse l'ordre.
export function useTriTableau(donnees) {
  const [cleTri, setCleTri] = useState(null);
  const [directionTri, setDirectionTri] = useState("asc");

  const gererTri = (cle) => {
    if (cleTri === cle) {
      setDirectionTri((direction) => (direction === "asc" ? "desc" : "asc"));
    } else {
      setCleTri(cle);
      setDirectionTri("asc");
    }
  };

  const donneesTriees = useMemo(() => {
    if (!cleTri) return donnees;
    const facteur = directionTri === "asc" ? 1 : -1;
    return [...donnees].sort((x, y) => comparerValeurs(x[cleTri], y[cleTri]) * facteur);
  }, [donnees, cleTri, directionTri]);

  return { cleTri, directionTri, gererTri, donneesTriees };
}
