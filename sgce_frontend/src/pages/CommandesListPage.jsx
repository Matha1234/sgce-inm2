import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogContent,
  DialogTitle, IconButton, MenuItem, Paper, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import CloseIcon from "@mui/icons-material/Close";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { alpha } from "@mui/material/styles";
import { useSelector } from "react-redux";

import { listerCommandes } from "../api/commandesApi";
import { useNotifier } from "../components/common/Notifier";
import {
  LIBELLES_NATURE_COMMANDE, LIBELLES_STATUT_COMMANDE,
} from "../constants/roles";
import {
  exporterPDF, exporterExcel, metaEdition,
  colonne, colonnePerso,
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

const COULEUR_TEXTE_STATUT = {
  EN_ATTENTE: "text.secondary",
  DEVIS: "info.main",
  VALIDEE: "primary.main",
  EN_PRODUCTION: "warning.main",
  LIVREE: "success.main",
  ANNULEE: "error.main",
};

const OPTIONS_STATUT = [
  { code: "", libelle: "Tous" },
  ...Object.entries(LIBELLES_STATUT_COMMANDE).map(([code, libelle]) => ({ code, libelle })),
];

export default function CommandesListPage() {
  const { utilisateur } = useSelector((s) => s.auth);
  const role = utilisateur?.role;
  const peutCreer = role === "ADMIN" || role === "AGENT_SDO";
  const peutVoir = Boolean(role);

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

  const comptesStatut = useMemo(() => {
    const c = { "": commandes.length };
    OPTIONS_STATUT.forEach((o) => { if (o.code) c[o.code] = 0; });
    commandes.forEach((cmd) => { if (c[cmd.statut] !== undefined) c[cmd.statut] += 1; });
    return c;
  }, [commandes]);

  const { cleTri, directionTri, gererTri, donneesTriees } = useTriTableau(commandesFiltrees);
  const commandesPaginees = useMemo(
    () => donneesTriees.slice(page * surPage, page * surPage + surPage),
    [donneesTriees, page, surPage]
  );

  const refCadre = useRef(null);
  const hauteurCadre = useHauteurCinqLignes(refCadre, commandesPaginees.length);

  // N'appliquer une hauteur max que s'il y a assez de lignes (évite le vide coloré en bas)
  const cadrePlein = commandesPaginees.length >= 5;

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
    <Box sx={{ pb: 4 }}>
      <PageHeader
        icone={<AssignmentIcon />}
        titre="Commandes"
        sousTitre={`${commandes.length} commande${commandes.length > 1 ? "s" : ""} enregistrée${commandes.length > 1 ? "s" : ""} — devis, validation et dossier de fabrication (UC-02, UC-03).`}
        centre
        taillePastille={28}
        titreVariant="h6"
      />

      {erreur && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErreur("")}>
          {erreur}
        </Alert>
      )}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems="center"
        sx={{ mb: 2, justifyContent: "space-between", flexShrink: 0 }}
      >
        <SearchField
          valeur={recherche}
          onChange={(e) => gererRecherche(e.target.value)}
          placeholder="Rechercher par numéro, organisme ou atelier…"
          largeur={320}
          sx={{ mb: 0, flexGrow: 1, maxWidth: 360 }}
        />

        <TextField
          select
          size="small"
          label="Statut"
          value={filtreStatut}
          onChange={(e) => { setFiltreStatut(e.target.value); setPage(0); }}
          sx={{ minWidth: 160, "& .MuiInputBase-root": { fontSize: 13 } }}
          slotProps={{
            select: {
              renderValue: () => (
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
                nom: "Commandes",
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
                  colonnePerso("Quantité", (c) => String(c.quantite)),
                ],
                lignes: commandesFiltrees,
              }],
            });
          }}
          libelle="Exporter"
          taille="small"
        />

        {peutCreer && (
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setModaleCreationOuverte(true)}
            sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
          >
            Nouvelle commande
          </Button>
        )}
      </Stack>

      {chargement ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : !peutVoir ? (
        <Alert severity="warning">Vous n'avez pas l'autorisation de consulter les commandes.</Alert>
      ) : (
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 2,
            overflow: "hidden",
            bgcolor: "background.paper",
            mb: 3,
          }}
        >
          <TableContainer
            ref={refCadre}
            sx={{
              // Hauteur limitée seulement si ≥ 5 lignes → plus de zone vide colorée
              maxHeight: cadrePlein ? (hauteurCadre ?? 320) : "none",
              overflow: cadrePlein ? "auto" : "visible",
              bgcolor: "background.paper",
            }}
          >
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <EnTeteTriable cle="numero" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    Numéro
                  </EnTeteTriable>
                  <EnTeteTriable cle="organisme_nom" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    Organisme
                  </EnTeteTriable>
                  <EnTeteTriable cle="nature" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    Nature
                  </EnTeteTriable>
                  <EnTeteTriable cle="atelier" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    Atelier
                  </EnTeteTriable>
                  <EnTeteTriable cle="delai_contractuel" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    Délai contractuel
                  </EnTeteTriable>
                  <EnTeteTriable cle="statut" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    Statut
                  </EnTeteTriable>
                  <TableCell align="center" sx={STYLE_EN_TETE}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {commandesPaginees.map((commande) => (
                  <TableRow
                    key={commande.id}
                    hover
                    sx={{
                      "&:last-child td": { borderBottom: 0 },
                      bgcolor: "background.paper",
                    }}
                  >
                    <TableCell align="center">{commande.numero}</TableCell>
                    <TableCell align="center">{commande.organisme_nom}</TableCell>
                    <TableCell align="center">
                      {LIBELLES_NATURE_COMMANDE[commande.nature] || commande.nature}
                    </TableCell>
                    <TableCell align="center">{commande.atelier}</TableCell>
                    <TableCell align="center">{commande.delai_contractuel || "—"}</TableCell>
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          color: COULEUR_TEXTE_STATUT[commande.statut] || "text.primary",
                        }}
                      >
                        {LIBELLES_STATUT_COMMANDE[commande.statut] || commande.statut}
                      </Typography>
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
                    <TableCell colSpan={7} align="center" sx={{ py: 5, color: "text.secondary" }}>
                      {recherche || filtreStatut
                        ? "Aucune commande ne correspond à vos filtres."
                        : "Aucune commande enregistrée pour le moment."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {commandesFiltrees.length > 0 && (
            <Box
              sx={{
                borderTop: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                px: 1,
                py: 0.5,
              }}
            >
              <PaginationBar
                compte={commandesFiltrees.length}
                page={page}
                surPage={surPage}
                onPageChange={setPage}
                onSurPageChange={(nouvelleValeur) => { setSurPage(nouvelleValeur); setPage(0); }}
              />
            </Box>
          )}
        </Paper>
      )}

      <Dialog
        open={modaleCreationOuverte && peutCreer}
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