import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogContent,
  DialogTitle, IconButton, MenuItem, Paper, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { alpha } from "@mui/material/styles";

import { listerCommandes } from "../api/commandesApi";
import { useNotifier } from "../components/common/Notifier";
import {
  COULEURS_STATUT_COMMANDE, LIBELLES_NATURE_COMMANDE, LIBELLES_STATUT_COMMANDE,
} from "../constants/roles";
import {
  exporterPDF, exporterExcel, metaEdition,
  colonne, colonnePerso, DATE_FR,
} from "../utils/exportateur";
import PageHeader from "../components/common/PageHeader";
import SearchField from "../components/common/SearchField";
import EnTeteTriable, { STYLE_EN_TETE } from "../components/common/EnTeteTriable";
import PaginationBar from "../components/common/PaginationBar";
import BoutonExport from "../components/common/BoutonExport";
import { useTriTableau } from "../utils/tri";
import { useHauteurCinqLignes } from "../utils/tableau";
import NouvelleCommandeForm from "../components/commandes/NouvelleCommandeForm";
import CommandeDetailContent from "../components/commandes/CommandeDetailContent";

// Options du filtre de statut — liste déroulante professionnelle avec compteurs
const OPTIONS_STATUT = [
  { code: "", libelle: "Tous" },
  ...Object.entries(LIBELLES_STATUT_COMMANDE).map(([code, libelle]) => ({ code, libelle })),
];

export default function CommandesListPage() {
  const { afficherSucces } = useNotifier();
  const [commandes, setCommandes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("");
  const [page, setPage] = useState(0);
  const [surPage, setSurPage] = useState(5);

  const [modaleCreationOuverte, setModaleCreationOuverte] = useState(false);
  const [commandeSelectionneeId, setCommandeSelectionneeId] = useState(null);

  const charger = () => {
    setChargement(true);
    setPage(0);
    listerCommandes()
      .then((d) => setCommandes(Array.isArray(d) ? d : d.results || []))
      .catch(() => setErreur("Impossible de charger les commandes."))
      .finally(() => setChargement(false));
  };

  useEffect(() => {
    charger();
  }, []);

  const commandesFiltrees = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return commandes.filter((c) => {
      const correspondRecherche =
        !q ||
        [c.numero, c.organisme_nom, c.atelier]
          .filter(Boolean)
          .some((champ) => String(champ).toLowerCase().includes(q));
      const correspondStatut = !filtreStatut || c.statut === filtreStatut;
      return correspondRecherche && correspondStatut;
    });
  }, [commandes, recherche, filtreStatut]);

  // Compteurs par statut pour le filtre déroulant (ex. « Validée (3) »)
  const comptesStatut = useMemo(() => {
    const c = { "": commandes.length };
    OPTIONS_STATUT.forEach((o) => { if (o.code) c[o.code] = 0; });
    commandes.forEach((cmd) => { if (c[cmd.statut] !== undefined) c[cmd.statut] += 1; });
    return c;
  }, [commandes]);

  // Tri par colonne puis page courante tronquée à « surPage » lignes
  const { cleTri, directionTri, gererTri, donneesTriees } = useTriTableau(commandesFiltrees);
  const commandesPaginees = useMemo(
    () => donneesTriees.slice(page * surPage, page * surPage + surPage),
    [donneesTriees, page, surPage]
  );

  // Cadre mesuré : exactement l'en-tête + 5 lignes, sans barre de
  // défilement à 5 entrées ; elle apparaît dès qu'on augmente l'affichage.
  const refCadre = useRef(null);
  const hauteurCadre = useHauteurCinqLignes(refCadre, commandesPaginees.length);

  const gererRecherche = (valeur) => {
    setRecherche(valeur);
    setPage(0);
  };

  const gererCommandeCreee = (commande) => {
    setModaleCreationOuverte(false);
    charger();
    setCommandeSelectionneeId(commande.id);
    afficherSucces(`Commande ${commande.numero} créée avec succès.`);
  };

  return (
    <Box>
      {/* En-tête de page centré avec pastille + titre */}
      <PageHeader
        icone={<AssignmentIcon />}
        titre="Commandes"
        sousTitre={`${commandes.length} commande${commandes.length > 1 ? "s" : ""} enregistrée${commandes.length > 1 ? "s" : ""} — devis, validation et dossier de fabrication (UC-02, UC-03).`}
        centre
        taillePastille={28}
        titreVariant="h6"
      />

      {erreur && <Alert severity="error" sx={{ mb: 2 }}>{erreur}</Alert>}

      {/* Barre de recherche + bouton « Nouvelle commande » — bouton au mur droit */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems="center"
        sx={{ mb: 2, justifyContent: "space-between" }}
      >
        <SearchField
          valeur={recherche}
          onChange={(e) => gererRecherche(e.target.value)}
          placeholder="Rechercher par numéro, organisme, atelier…"
          largeur={400}
          sx={{ mb: 0, flexGrow: 1, maxWidth: 400 }}
        />
        <TextField
          select
          size="small"
          label="Statut"
          value={filtreStatut}
          onChange={(e) => { setFiltreStatut(e.target.value); setPage(0); }}
          sx={{ minWidth: 200, flexShrink: 0, "& .MuiInputBase-root": { fontSize: 13 } }}
          slotProps={{
            select: {
              renderValue: (v) => (
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {filtreStatut ? LIBELLES_STATUT_COMMANDE[filtreStatut] || filtreStatut : "Tous"}
                </Typography>
              ),
            },
          }}
        >
          {OPTIONS_STATUT.map((o) => (
            <MenuItem key={o.code} value={o.code} sx={{ fontSize: 13 }}>
              <Typography variant="body2" sx={{ flexGrow: 1 }}>{o.libelle}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 3 }}>
                {comptesStatut[o.code] ?? 0}
              </Typography>
            </MenuItem>
          ))}
        </TextField>
        <BoutonExport
          surPdf={async () => {
            await exporterPDF({
              fichier: `Commandes_${Date.now()}.pdf`,
              titre: "Liste des commandes",
              sousTitre: recherche
                ? `Filtré : ${recherche}`
                : filtreStatut
                  ? `Statut : ${LIBELLES_STATUT_COMMANDE[filtreStatut] || filtreStatut}`
                  : "",
              meta: metaEdition(commandesFiltrees.length),
              colonnes: [
                colonne("Numéro", "numero"),
                colonne("Organisme", "organisme_nom"),
                colonnePerso("Nature", (c) => LIBELLES_NATURE_COMMANDE[c.nature] || c.nature),
                colonne("Atelier", "atelier"),
                colonne("Délai", "delai_contractuel"),
                colonnePerso("Statut", (c) => LIBELLES_STATUT_COMMANDE[c.statut] || c.statut),
              ],
              lignes: commandesFiltrees,
            });
          }}
          surExcel={async () => {
            await exporterExcel({
              fichier: `Commandes_${Date.now()}.xlsx`,
              feuilles: [{
                nom: "Commandes", titre: "Liste des commandes",
                sousTitre: recherche
                  ? `Filtré : ${recherche}`
                  : filtreStatut
                    ? `Statut : ${LIBELLES_STATUT_COMMANDE[filtreStatut] || filtreStatut}`
                    : "",
                meta: metaEdition(commandesFiltrees.length),
                colonnes: [
                  colonne("Numéro", "numero"),
                  colonne("Organisme", "organisme_nom"),
                  colonnePerso("Nature", (c) => LIBELLES_NATURE_COMMANDE[c.nature] || c.nature),
                  colonne("Atelier", "atelier"),
                  colonne("Délai", "delai_contractuel"),
                  colonnePerso("Statut", (c) => LIBELLES_STATUT_COMMANDE[c.statut] || c.statut),
                  colonnePerso("Quantité", (c) => String(c.quantite)),
                ],
                lignes: commandesFiltrees,
              }],
            });
          }}
          libelle="Exporter"
          taille="small"
        />
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setModaleCreationOuverte(true)}
          sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
        >
          Nouvelle commande
        </Button>
      </Stack>

      {chargement ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
          <TableContainer ref={refCadre} sx={{ maxHeight: hauteurCadre ?? 320, overflow: "auto" }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell align="center" sx={{ width: 48, ...STYLE_EN_TETE }}>#</TableCell>
                  <EnTeteTriable cle="numero" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Numéro</EnTeteTriable>
                  <EnTeteTriable cle="organisme_nom" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Organisme</EnTeteTriable>
                  <EnTeteTriable cle="nature" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Nature</EnTeteTriable>
                  <EnTeteTriable cle="atelier" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Atelier</EnTeteTriable>
                  <EnTeteTriable cle="delai_contractuel" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Délai contractuel</EnTeteTriable>
                  <EnTeteTriable cle="statut" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Statut</EnTeteTriable>
                  <TableCell align="center" sx={STYLE_EN_TETE}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {commandesPaginees.map((commande, index) => (
                  <TableRow
                    key={commande.id}
                    hover
                    sx={{
                      "&:last-child td": { borderBottom: 0 },
                      "&:nth-of-type(even)": { bgcolor: "background.default" },
                    }}
                  >
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontWeight: 500, color: "text.secondary" }}>
                        {page * surPage + index + 1}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {commande.numero}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">{commande.organisme_nom}</TableCell>
                    <TableCell align="center">{LIBELLES_NATURE_COMMANDE[commande.nature] || commande.nature}</TableCell>
                    <TableCell align="center">{commande.atelier}</TableCell>
                    <TableCell align="center">{commande.delai_contractuel || "—"}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={LIBELLES_STATUT_COMMANDE[commande.statut] || commande.statut}
                        color={COULEURS_STATUT_COMMANDE[commande.statut] || "default"}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Voir la commande">
                        <IconButton
                          size="small"
                          onClick={() => setCommandeSelectionneeId(commande.id)}
                          sx={{
                            color: "primary.main",
                            "&:hover": { bgcolor: (t) => alpha(t.palette.primary.main, 0.1) },
                          }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {commandesPaginees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 5, color: "text.secondary" }}>
                      {recherche || filtreStatut
                        ? "Aucune commande ne correspond à vos filtres."
                        : "Aucune commande enregistrée pour le moment."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination : entrées par page + affichage des résultats */}
          {commandesFiltrees.length > 0 && (
            <PaginationBar
              compte={commandesFiltrees.length}
              page={page}
              surPage={surPage}
              onPageChange={setPage}
              onSurPageChange={(nouvelleValeur) => { setSurPage(nouvelleValeur); setPage(0); }}
            />
          )}
        </Paper>
      )}

      {/* Modale : nouvelle commande */}
      <Dialog
        open={modaleCreationOuverte}
        onClose={() => setModaleCreationOuverte(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          Nouvelle commande
          <IconButton onClick={() => setModaleCreationOuverte(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <NouvelleCommandeForm
            onSuccess={gererCommandeCreee}
            onCancel={() => setModaleCreationOuverte(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Modale : détail commande + devis */}
      <Dialog
        open={Boolean(commandeSelectionneeId)}
        onClose={() => setCommandeSelectionneeId(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          Détail de la commande
          <IconButton onClick={() => setCommandeSelectionneeId(null)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {commandeSelectionneeId && (
            <CommandeDetailContent
              commandeId={commandeSelectionneeId}
              onClose={() => setCommandeSelectionneeId(null)}
              onDossierCreated={charger}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}