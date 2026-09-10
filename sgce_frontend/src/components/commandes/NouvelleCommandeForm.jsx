import { useEffect, useState } from "react";
import {
  Alert, Box, Button, Divider, MenuItem, Stack, TextField, Typography,
} from "@mui/material";
import AddCircleOutlinedIcon from "@mui/icons-material/AddCircleOutlined";

import { creerCommande, creerOrganisme, listerOrganismes } from "../../api/commandesApi";
import { useNotifier } from "../common/Notifier";
import { LIBELLES_NATURE_COMMANDE } from "../../constants/roles";

const TYPES_DOCUMENT = [
  { value: "JOURNAL_OFFICIEL", label: "Journal officiel" },
  { value: "BULLETIN_ANNONCES", label: "Bulletin d'annonces légales" },
  { value: "FORMULAIRE_ADMINISTRATIF", label: "Formulaire administratif" },
  { value: "CACHET_ADMINISTRATIF", label: "Cachet administratif" },
  { value: "DOCUMENT_FIDUCIAIRE", label: "Document fiduciaire" },
  { value: "AUTRE", label: "Autre" },
];

const TYPES_ORGANISME = [
  { value: "MINISTERE", label: "Ministère" },
  { value: "COLLECTIVITE", label: "Collectivité territoriale" },
  { value: "ETABLISSEMENT_PUBLIC", label: "Établissement public" },
  { value: "PARTICULIER", label: "Particulier" },
];

/**
 * Contenu du formulaire de création de commande, pensé pour être affiché
 * dans une modale (CommandesListPage) mais réutilisable ailleurs.
 *
 * Props :
 * - onSuccess(commande) : appelé après création réussie
 * - onCancel() : appelé quand l'utilisateur annule / ferme
 */
export default function NouvelleCommandeForm({ onSuccess, onCancel }) {
  const { afficherSucces } = useNotifier();
  const [organismes, setOrganismes] = useState([]);
  const [organismeId, setOrganismeId] = useState("");
  const [nouvelOrganisme, setNouvelOrganisme] = useState({
    nom: "", type: "MINISTERE", adresse: "", nif_stat: "", telephone: "", email: "", contact_principal: "",
  });
  const [afficherNouvelOrganisme, setAfficherNouvelOrganisme] = useState(false);

  const [nature, setNature] = useState("STANDARDISEE");
  const [typeDocument, setTypeDocument] = useState("AUTRE");
  const [quantite, setQuantite] = useState(1);
  const [atelier, setAtelier] = useState("SPA");
  const [delaiContractuel, setDelaiContractuel] = useState("");

  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    listerOrganismes()
      .then((d) => setOrganismes(Array.isArray(d) ? d : d.results || []))
      .catch(() => setErreur("Impossible de charger la liste des organismes."));
  }, []);

  const gererCreationOrganisme = async () => {
    if (!nouvelOrganisme.nom.trim()) return;
    try {
      const organisme = await creerOrganisme(nouvelOrganisme);
      setOrganismes((liste) => [...liste, organisme]);
      setOrganismeId(organisme.id);
      setAfficherNouvelOrganisme(false);
      setNouvelOrganisme({
        nom: "", type: "MINISTERE", adresse: "", nif_stat: "", telephone: "", email: "", contact_principal: "",
      });
      afficherSucces(`Organisme « ${organisme.nom} » créé avec succès.`);
    } catch {
      setErreur("Impossible de créer cet organisme.");
    }
  };

  const gererSoumission = async (evenement) => {
    evenement.preventDefault();
    setErreur("");

    if (!organismeId) {
      setErreur("Veuillez sélectionner un organisme client.");
      return;
    }

    setEnCours(true);
    try {
      const commande = await creerCommande({
        organisme: organismeId,
        nature,
        type_document: typeDocument,
        quantite: Number(quantite),
        atelier,
        delai_contractuel: delaiContractuel || null,
      });
      onSuccess?.(commande);
    } catch (err) {
      const donnees = err.response?.data;
      if (donnees) {
        const premierMessage = Object.values(donnees)[0];
        setErreur(Array.isArray(premierMessage) ? premierMessage[0] : String(premierMessage));
      } else {
        setErreur("Impossible de créer la commande.");
      }
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Box component="form" onSubmit={gererSoumission} noValidate>
      {erreur && <Alert severity="error" sx={{ mb: 2 }}>{erreur}</Alert>}

      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
        Client
      </Typography>
      <TextField
        select
        label="Organisme client"
        fullWidth
        margin="dense"
        value={organismeId}
        onChange={(e) => setOrganismeId(e.target.value)}
        required
      >
        {organismes.map((org) => (
          <MenuItem key={org.id} value={org.id}>
            {org.nom}
          </MenuItem>
        ))}
      </TextField>

      <Button
        size="small"
        onClick={() => setAfficherNouvelOrganisme((v) => !v)}
        startIcon={<AddCircleOutlinedIcon fontSize="small" />}
        sx={{ mb: 1, mt: 0.5 }}
      >
        {afficherNouvelOrganisme ? "Annuler" : "Créer un nouvel organisme"}
      </Button>

      {afficherNouvelOrganisme && (
        <Box
          sx={{
            display: "flex", flexWrap: "wrap", gap: 1, mb: 2, p: 1.5, alignItems: "flex-start",
            bgcolor: "action.hover", borderRadius: 1.5,
          }}
        >
          <TextField
            label="Nom de l'organisme"
            size="small"
            sx={{ flex: "1 1 200px" }}
            value={nouvelOrganisme.nom}
            onChange={(e) => setNouvelOrganisme((v) => ({ ...v, nom: e.target.value }))}
          />
          <TextField
            select
            label="Type"
            size="small"
            value={nouvelOrganisme.type}
            onChange={(e) => setNouvelOrganisme((v) => ({ ...v, type: e.target.value }))}
            sx={{ minWidth: 180 }}
          >
            {TYPES_ORGANISME.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Adresse"
            size="small"
            sx={{ flex: "1 1 200px" }}
            value={nouvelOrganisme.adresse}
            onChange={(e) => setNouvelOrganisme((v) => ({ ...v, adresse: e.target.value }))}
          />
          <TextField
            label="NIF / STAT"
            size="small"
            sx={{ flex: "1 1 140px" }}
            value={nouvelOrganisme.nif_stat}
            onChange={(e) => setNouvelOrganisme((v) => ({ ...v, nif_stat: e.target.value }))}
          />
          <TextField
            label="Téléphone"
            size="small"
            sx={{ flex: "1 1 140px" }}
            value={nouvelOrganisme.telephone}
            onChange={(e) => setNouvelOrganisme((v) => ({ ...v, telephone: e.target.value }))}
          />
          <TextField
            label="Email"
            size="small"
            type="email"
            sx={{ flex: "1 1 180px" }}
            value={nouvelOrganisme.email}
            onChange={(e) => setNouvelOrganisme((v) => ({ ...v, email: e.target.value }))}
          />
          <TextField
            label="Contact principal"
            size="small"
            sx={{ flex: "1 1 180px" }}
            value={nouvelOrganisme.contact_principal}
            onChange={(e) => setNouvelOrganisme((v) => ({ ...v, contact_principal: e.target.value }))}
          />
          <Button variant="outlined" onClick={gererCreationOrganisme} sx={{ whiteSpace: "nowrap" }}>
            Ajouter
          </Button>
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
        Détails de la commande
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          select
          label="Nature de la commande"
          fullWidth
          margin="dense"
          value={nature}
          onChange={(e) => setNature(e.target.value)}
          helperText="Détermine le circuit de devis appliqué (RG21)."
        >
          {Object.entries(LIBELLES_NATURE_COMMANDE).map(([code, libelle]) => (
            <MenuItem key={code} value={code}>
              {libelle}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Type de document"
          fullWidth
          margin="dense"
          value={typeDocument}
          onChange={(e) => setTypeDocument(e.target.value)}
        >
          {TYPES_DOCUMENT.map((t) => (
            <MenuItem key={t.value} value={t.value}>
              {t.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        <TextField
          label="Quantité"
          type="number"
          fullWidth
          margin="dense"
          value={quantite}
          onChange={(e) => setQuantite(e.target.value)}
          slotProps={{ htmlInput: { min: 1 } }}
        />

        <TextField
          select
          label="Atelier prévisionnel"
          fullWidth
          margin="dense"
          value={atelier}
          onChange={(e) => setAtelier(e.target.value)}
        >
          <MenuItem value="SPA">SPA — Service de Production A</MenuItem>
          <MenuItem value="SPB">SPB — Service de Production B</MenuItem>
        </TextField>
      </Stack>

      <TextField
        label="Délai contractuel"
        type="date"
        fullWidth
        margin="dense"
        value={delaiContractuel}
        onChange={(e) => setDelaiContractuel(e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
        helperText="Obligatoire sauf pour un particulier (RG19)."
      />

      <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ mt: 3 }}>
        <Button onClick={onCancel} disabled={enCours} color="inherit">
          Annuler
        </Button>
        <Button type="submit" variant="contained" disabled={enCours}>
          {enCours ? "Création..." : "Créer la commande"}
        </Button>
      </Stack>
    </Box>
  );
}
