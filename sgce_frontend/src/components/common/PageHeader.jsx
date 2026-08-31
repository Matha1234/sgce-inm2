import { Box, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

const COULEURS_CATEGORIELLES = ["primary", "secondary", "success", "error", "warning", "info"];

/**
 * Pastille carrée arrondie (fond teinté + icône pleine couleur) : identité
 * visuelle commune à toutes les pages du SGCFC-INM. La teinte de fond est
 * dérivée de la clé de couleur passée en prop ("primary.main", "success.main"…).
 */
export function PastilleIcone({ icone, couleur = "primary.main", taille = 34 }) {
  return (
    <Box
      sx={{
        width: taille,
        height: taille,
        borderRadius: 1.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        bgcolor: (theme) => {
          const [famille] = couleur.split(".");
          if (COULEURS_CATEGORIELLES.includes(famille)) {
            return alpha(theme.palette[famille].main, 0.12);
          }
          return theme.palette.grey[200];
        },
        color: couleur,
      }}
    >
      {icone}
    </Box>
  );
}

/**
 * En-tête de page standardisé : pastille + titre + sous-titre à gauche,
 * zone d'action (boutons) à droite. Utilisé par toutes les pages pour
 * garantir le même gabarit vertical et la même hiérarchie visuelle.
 */
export default function PageHeader({ icone, titre, sousTitre, action, couleur = "primary.main", centre = false, taillePastille = 34, titreVariant = "h5", pastille = true }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent={centre ? "center" : "space-between"}
      spacing={2}
      sx={{ mb: 3, flexWrap: "wrap", gap: 2, position: "relative" }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
        {pastille ? (
          <PastilleIcone icone={icone} couleur={couleur} taille={taillePastille} />
        ) : (
          <Box sx={{ color: couleur, display: "flex", alignItems: "center" }}>{icone}</Box>
        )}
        <Box sx={{ minWidth: 0, textAlign: centre ? "center" : "left" }}>
          <Typography variant={titreVariant} sx={{ fontWeight: 700, lineHeight: 1.2 }}>
            {titre}
          </Typography>
          {sousTitre && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              {sousTitre}
            </Typography>
          )}
        </Box>
      </Stack>
      {action && (
        <Box
          sx={
            centre
              ? {
                  position: { xs: "static", sm: "absolute" },
                  right: 0,
                  top: "50%",
                  transform: { xs: "none", sm: "translateY(-50%)" },
                }
              : undefined
          }
        >
          {action}
        </Box>
      )}
    </Stack>
  );
}
