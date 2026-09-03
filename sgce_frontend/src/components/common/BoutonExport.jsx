/**
 * Bouton d'export réutilisable — menu déroulant professionnel PDF / Excel / Word.
 *
 * Props:
 *   surPdf / surExcel / surWord : async () => void — gestionnaires d'export
 *   libelle   : string  (défaut "Exporter")
 *   taille    : string  ("small" | "medium")
 *   compact   : boolean — version réduite (bordures fines) pour en-têtes denses
 *   sx        : object  — styles supplémentaires passés au bouton
 *   couleur   : string  (MUI couleur)
 *   desactive : boolean
 *
 * Le menu affiche toujours les trois formats ; un format sans gestionnaire
 * est désactivé avec la mention « Non disponible pour cette vue ».
 */
import { useState } from "react";
import {
  Box, Button, CircularProgress, Divider, ListItemIcon, ListItemText,
  Menu, MenuItem, Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import TableChartIcon from "@mui/icons-material/TableChart";
import DescriptionIcon from "@mui/icons-material/Description";

// Couleurs officielles des formats (chartes Adobe / Microsoft Office)
const COULEUR_FORMAT = {
  pdf: "#d93025",
  excel: "#107c41",
  word: "#2b579a",
};

const FORMATS = [
  {
    type: "pdf",
    icone: <PictureAsPdfIcon fontSize="small" />,
    libelle: "PDF",
    description: "Document figé, prêt à imprimer",
  },
  {
    type: "excel",
    icone: <TableChartIcon fontSize="small" />,
    libelle: "Excel",
    description: "Tableau de données modifiable (.xlsx)",
  },
  {
    type: "word",
    icone: <DescriptionIcon fontSize="small" />,
    libelle: "Word",
    description: "Document éditable (.docx)",
  },
];

export default function BoutonExport({
  surPdf,
  surExcel,
  surWord,
  libelle = "Exporter",
  taille = "small",
  compact = false,
  couleur = "primary",
  desactive = false,
  sx,
}) {
  const [ancrage, setAncrage] = useState(null);
  const [enCours, setEnCours] = useState(null);

  async function gerer(type, fn) {
    setEnCours(type);
    setAncrage(null);
    try {
      await fn();
    } finally {
      setEnCours(null);
    }
  }

  const gestionnaires = { pdf: surPdf, excel: surExcel, word: surWord };

  return (
    <>
      <Button
        variant="outlined"
        size={taille}
        color={couleur}
        startIcon={
          enCours ? (
            <CircularProgress size={compact ? 11 : 14} />
          ) : (
            <DownloadIcon sx={{ fontSize: compact ? 14 : undefined }} />
          )
        }
        endIcon={<KeyboardArrowDownIcon sx={{ fontSize: compact ? 14 : 18 }} />}
        onClick={(e) => setAncrage(e.currentTarget)}
        disabled={desactive || Boolean(enCours)}
        sx={{
          flexShrink: 0,
          whiteSpace: "nowrap",
          ...(compact && { px: 1, py: 0.15, minHeight: 0, fontSize: 12, lineHeight: 1.5 }),
          ...sx,
        }}
      >
        {enCours ? `Export ${enCours.toUpperCase()}…` : libelle}
      </Button>

      <Menu
        anchorEl={ancrage}
        open={Boolean(ancrage)}
        onClose={() => setAncrage(null)}
        slotProps={{
          paper: {
            sx: { minWidth: 300, borderRadius: 2, mt: 0.5, boxShadow: (t) => t.shadows[8] },
          },
        }}
      >
        <Typography
          variant="caption"
          sx={{
            display: "block", px: 2, py: 0.75,
            color: "text.secondary", fontWeight: 700, letterSpacing: 0.4,
          }}
        >
          FORMAT DU DOCUMENT
        </Typography>
        <Divider sx={{ mb: 0.5 }} />

        {FORMATS.map((f) => {
          const disponible = Boolean(gestionnaires[f.type]);
          return (
            <MenuItem
              key={f.type}
              disabled={!disponible || Boolean(enCours)}
              onClick={() => disponible && gerer(f.type, gestionnaires[f.type])}
              sx={{ py: 0.75 }}
            >
              <ListItemIcon sx={{ color: COULEUR_FORMAT[f.type], minWidth: 36 }}>
                {f.icone}
              </ListItemIcon>
              <ListItemText
                slotProps={{
                  primary: { fontWeight: 600, fontSize: 13.5 },
                  secondary: { fontSize: 11.5 },
                }}
                primary={f.libelle}
                secondary={
                  disponible
                    ? f.description
                    : "Non disponible pour cette vue"
                }
              />
              {enCours === f.type && (
                <CircularProgress size={14} sx={{ ml: 1 }} />
              )}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
