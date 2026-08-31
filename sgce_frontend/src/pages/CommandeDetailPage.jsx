import { Box } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import AssignmentIcon from "@mui/icons-material/Assignment";

import CommandeDetailContent from "../components/commandes/CommandeDetailContent";
import PageHeader from "../components/common/PageHeader";

export default function CommandeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <Box>
      <PageHeader
        icone={<AssignmentIcon />}
        titre={`Commande #${id}`}
        sousTitre="Détail de la commande, devis associé et dossier de fabrication."
        centre
        taillePastille={28}
        titreVariant="h6"
      />
      <CommandeDetailContent
        commandeId={id}
        onClose={() => navigate("/commandes")}
      />
    </Box>
  );
}