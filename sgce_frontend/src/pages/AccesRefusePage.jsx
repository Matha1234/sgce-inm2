import { Box, Button, Paper, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import { PastilleIcone } from "../components/common/PageHeader";

export default function AccesRefusePage() {
  return (
    <Box sx={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
      <Paper variant="outlined" sx={{ p: { xs: 4, sm: 6 }, borderRadius: 3, textAlign: "center", maxWidth: 480 }}>
        <PastilleIcone icone={<LockOutlinedIcon sx={{ fontSize: 26 }} />} couleur="error.main" taille={64} />
        <Typography variant="h5" sx={{ fontWeight: 700, mt: 2.5, mb: 0.75 }}>
          Accès refusé
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3.5 }}>
          Votre rôle ne vous permet pas d'accéder à cette page. Si vous pensez qu'il s'agit
          d'une erreur, contactez l'administrateur du système.
        </Typography>
        <Button component={Link} to="/" variant="contained" startIcon={<ArrowBackIcon />}>
          Retour au tableau de bord
        </Button>
      </Paper>
    </Box>
  );
}
