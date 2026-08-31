import { Box, Button, IconButton, MenuItem, Select, Stack, Typography } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

// Fenêtre de pages affichées : au plus 5 numéros avec « … » de part et
// d'autre, pour ne jamais élargir la barre même avec beaucoup de pages.
function pagesVisibles(pageActuelle, nombrePages) {
  const ensemble = new Set([1, nombrePages, pageActuelle - 1, pageActuelle, pageActuelle + 1]);
  const pages = [...ensemble].filter((p) => p >= 1 && p <= nombrePages).sort((a, b) => a - b);
  const resultat = [];
  let precedente = 0;
  pages.forEach((p) => {
    if (p - precedente > 1) resultat.push("…");
    resultat.push(p);
    precedente = p;
  });
  return resultat;
}

// Barre de pagination professionnelle : sélecteur « Entrées par page »
// (étiquette centrée sur la bordure du sélecteur) à gauche, numéros de
// page 1..n au centre (entre les flèches précédent/suivant) et
// « Affichage des résultats X à Y sur Z » à droite.
export default function PaginationBar({
  compte, page, surPage, onPageChange, onSurPageChange,
  surPageOptions = [5, 10, 15, 20, 25],
}) {
  const nombrePages = Math.max(1, Math.ceil(compte / surPage));
  const debut = compte === 0 ? 0 : page * surPage + 1;
  const fin = Math.min((page + 1) * surPage, compte);
  const pages = pagesVisibles(page + 1, nombrePages);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1.5,
        flexWrap: "wrap",
        px: 2,
        py: 1,
        borderTop: "1px solid",
        borderTopColor: "divider",
        bgcolor: "background.default",
      }}
    >
      <Box sx={{ position: "relative", display: "inline-flex" }}>
        <Select
          size="small"
          value={surPage}
          onChange={(evenement) => onSurPageChange(Number(evenement.target.value))}
          sx={{ fontSize: 13, minWidth: 140, "& .MuiSelect-select": { py: 0.75, px: 1.25 } }}
        >
          {surPageOptions.map((option) => (
            <MenuItem key={option} value={option}>{option}</MenuItem>
          ))}
        </Select>
        <Typography
          component="span"
          sx={{
            position: "absolute",
            top: -6,
            left: "50%",
            transform: "translateX(-50%)",
            px: 0.5,
            bgcolor: "background.default",
            fontSize: 11,
            fontWeight: 600,
            color: "text.secondary",
            lineHeight: 1,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          Entrées par page
        </Typography>
      </Box>

      <Stack direction="row" alignItems="center" spacing={0.5}>
        <IconButton
          size="small"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
          sx={{ "&.Mui-disabled": { color: "text.disabled" } }}
        >
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
        {pages.map((numero, index) =>
          numero === "…" ? (
            <Typography
              key={`ellipse-${index}`}
              sx={{ px: 0.25, color: "text.disabled", fontSize: 13, fontWeight: 600, userSelect: "none" }}
            >
              …
            </Typography>
          ) : (
            <Button
              key={numero}
              size="small"
              variant={numero - 1 === page ? "contained" : "text"}
              onClick={() => onPageChange(numero - 1)}
              sx={{
                minWidth: 30,
                height: 30,
                px: 0.5,
                borderRadius: 1.5,
                fontSize: 13,
                fontWeight: 600,
                lineHeight: 1,
                color: numero - 1 === page ? undefined : "text.primary",
              }}
            >
              {numero}
            </Button>
          )
        )}
        <IconButton
          size="small"
          disabled={page >= nombrePages - 1}
          onClick={() => onPageChange(page + 1)}
          sx={{ "&.Mui-disabled": { color: "text.disabled" } }}
        >
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12.5 }}>
        Affichage des résultats {debut} à {fin} sur {compte}
      </Typography>
    </Box>
  );
}
