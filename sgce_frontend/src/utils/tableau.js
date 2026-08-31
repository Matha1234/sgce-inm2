import { useLayoutEffect, useState } from "react";

// Mesure la hauteur réelle (en-tête + 5 lignes de données) du tableau pour
// que le cadre affiche exactement 5 entrées sans barre de défilement.
// Le cadre conserve toujours cette hauteur : dès qu'on augmente le nombre
// d'entrées par page, la barre de défilement apparaît automatiquement pour
// voir les données cachées. La mesure s'adapte au rendu réel (police,
// thème, zoom), sans valeur fixe en pixels.
export function useHauteurCinqLignes(ref, nbLignes) {
  const [hauteur, setHauteur] = useState(null);
  useLayoutEffect(() => {
    const conteneur = ref.current;
    if (!conteneur || nbLignes === 0) return;
    const enTete = conteneur.querySelector("thead")?.offsetHeight ?? 0;
    const lignes = conteneur.querySelectorAll("tbody tr");
    if (lignes.length === 0) return;
    const hauteurLigne = Math.max(...Array.from(lignes, (ligne) => ligne.offsetHeight));
    setHauteur(enTete + hauteurLigne * 5 + 1);
  }, [ref, nbLignes]);
  return hauteur;
}
