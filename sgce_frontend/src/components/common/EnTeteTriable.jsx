import { TableCell, TableSortLabel } from "@mui/material";
import { alpha } from "@mui/material/styles";

// Style commun des cellules d'en-tête : fond translucide (les données
// restent visibles quand elles glissent dessous) avec flou d'arrière-plan
// pour garder le texte de l'en-tête lisible, texte gras en capitales pour
// bien distinguer l'en-tête des lignes de données.
export const STYLE_EN_TETE = {
  bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.1 : 0.05),
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
  color: "text.primary",
  fontWeight: 700,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 0.4,
  whiteSpace: "nowrap",
};

// Cellule d'en-tête cliquable : affiche une icône de tri et trie les
// données par la colonne concernée (croissant puis décroissant).
export default function EnTeteTriable({
  cle, cleTri, directionTri, onTri, align = "center", children, sx,
}) {
  return (
    <TableCell align={align} sx={{ ...STYLE_EN_TETE, ...sx }}>
      <TableSortLabel
        active={cleTri === cle}
        direction={cleTri === cle ? directionTri : "asc"}
        onClick={() => onTri(cle)}
      >
        {children}
      </TableSortLabel>
    </TableCell>
  );
}
