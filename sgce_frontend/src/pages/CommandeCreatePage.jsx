import { Box, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";

import NouvelleCommandeForm from "../components/commandes/NouvelleCommandeForm";
import PageHeader from "../components/common/PageHeader";

export default function CommandeCreatePage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ maxWidth: 640 }}>
      <PageHeader
        icone={<AddIcon />}
        titre="Nouvelle commande"
        sousTitre="Enregistrement d'une demande client, puis estimation du devis (UC-01, UC-02)."
        centre
        taillePastille={28}
        titreVariant="h6"
      />

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <NouvelleCommandeForm
          onSuccess={(commande) => navigate(`/commandes/${commande.id}`)}
          onCancel={() => navigate("/commandes")}
        />
      </Paper>
    </Box>
  );
}
