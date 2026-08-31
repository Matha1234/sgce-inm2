import { InputAdornment, TextField } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

/**
 * Barre de recherche standardisée des pages listes : même taille, même
 * largeur et même icône sur l'ensemble de l'application.
 */
export default function SearchField({ valeur, onChange, placeholder, largeur = 380, sx }) {
  return (
    <TextField
      placeholder={placeholder}
      value={valeur}
      onChange={onChange}
      sx={{ mb: 2, width: "100%", maxWidth: largeur, ...sx }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
