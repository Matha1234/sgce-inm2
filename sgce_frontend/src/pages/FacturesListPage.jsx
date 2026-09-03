import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, MenuItem, Paper,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import { useSelector } from "react-redux";

import {
  creerFacture, listerDossiers, listerFactures, recupererCommande,
} from "../api/commandesApi";
import PageHeader from "../components/common/PageHeader";
import SearchField from "../components/common/SearchField";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { useNotifier } from "../components/common/Notifier";
import EnTeteTriable, { STYLE_EN_TETE } from "../components/common/EnTeteTriable";
import PaginationBar from "../components/common/PaginationBar";
import { useTriTableau } from "../utils/tri";
import { useHauteurCinqLignes } from "../utils/tableau";
import BoutonExport from "../components/common/BoutonExport";

const LIBELLES_TYPE = { PROFORMA: "Proforma", DEFINITIVE: "Définitive" };
const COULEURS_TYPE = { PROFORMA: "info", DEFINITIVE: "success" };

function normaliser(donnees) {
  return Array.isArray(donnees) ? donnees : donnees.results || [];
}

export default function FacturesListPage() {
  const { utilisateur } = useSelector((state) => state.auth);
  const { afficherSucces } = useNotifier();
  const peutEmettre = utilisateur?.role === "ADMIN" || utilisateur?.role === "AGENT_SDO";

  const [factures, setFactures] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(0);
  const [surPage, setSurPage] = useState(5);

  const [dialogueOuvert, setDialogueOuvert] = useState(false);
  const [dossiers, setDossiers] = useState([]);
  const [dossierId, setDossierId] = useState("");
  const [typeFacture, setTypeFacture] = useState("PROFORMA");
  const [montant, setMontant] = useState("");
  const [chargementDevis, setChargementDevis] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreurEnvoi, setErreurEnvoi] = useState("");
  const [confirmationEmission, setConfirmationEmission] = useState(false);

  const charger = () => {
    setChargement(true);
    listerFactures()
      .then((d) => setFactures(normaliser(d)))
      .catch(() => setErreur("Impossible de charger les factures."))
      .finally(() => setChargement(false));
  };

  useEffect(() => {
    charger();
  }, []);

  const facturesFiltrees = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return factures;
    return factures.filter((f) =>
      [f.numero_facture, f.dossier_numero, f.commande_numero]
        .filter(Boolean)
        .some((champ) => String(champ).toLowerCase().includes(q))
    );
  }, [factures, recherche]);

  // Tri par colonne puis page courante tronquée à « surPage » lignes
  const { cleTri, directionTri, gererTri, donneesTriees } = useTriTableau(facturesFiltrees);
  const facturesPaginees = useMemo(
    () => donneesTriees.slice(page * surPage, page * surPage + surPage),
    [donneesTriees, page, surPage]
  );

  // Cadre mesuré : exactement l'en-tête + 5 lignes, sans barre de
  // défilement à 5 entrées ; elle apparaît dès qu'on augmente l'affichage.
  const refCadre = useRef(null);
  const hauteurCadre = useHauteurCinqLignes(refCadre, facturesPaginees.length);

  const gererRecherche = (valeur) => {
    setRecherche(valeur);
    setPage(0);
  };

  const dossierSelectionne = dossiers.find((d) => d.id === dossierId) || null;

  const ouvrirDialogue = async () => {
    setDialogueOuvert(true);
    setErreurEnvoi("");
    setDossierId("");
    setTypeFacture("PROFORMA");
    setMontant("");
    try {
      setDossiers(normaliser(await listerDossiers()));
    } catch {
      setErreurEnvoi("Impossible de charger les dossiers de fabrication.");
    }
  };

  const gererChoixDossier = async (id) => {
    setDossierId(id);
    setMontant("");
    if (!id) return;
    setChargementDevis(true);
    try {
      const dossier = dossiers.find((d) => d.id === id);
      if (dossier?.commande) {
        const commande = await recupererCommande(dossier.commande);
        if (commande?.devis?.prix_vente) setMontant(String(commande.devis.prix_vente));
      }
    } catch {
      // pas bloquant
    } finally {
      setChargementDevis(false);
    }
  };

  const gererEmission = async () => {
    setConfirmationEmission(false);
    setErreurEnvoi("");
    if (!dossierId) { setErreurEnvoi("Sélectionnez le dossier de fabrication concerné."); return; }
    if (!montant || Number(montant) <= 0) { setErreurEnvoi("Saisissez un montant strictement positif."); return; }
    setEnCours(true);
    try {
      const facture = await creerFacture({ dossier: dossierId, type_facture: typeFacture, montant: Number(montant) });
      afficherSucces(
        typeFacture === "DEFINITIVE"
          ? `Facture définitive ${facture.numero_facture} émise. La commande est maintenant livrée.`
          : `Facture proforma ${facture.numero_facture} émise avec succès.`
      );
      setDialogueOuvert(false);
      charger();
    } catch (err) {
      const donnees = err.response?.data;
      if (donnees?.type_facture) {
        setErreurEnvoi(Array.isArray(donnees.type_facture) ? donnees.type_facture[0] : donnees.type_facture);
      } else if (donnees?.dossier) {
        setErreurEnvoi(Array.isArray(donnees.dossier) ? donnees.dossier[0] : donnees.dossier);
      } else {
        setErreurEnvoi("Impossible d'émettre cette facture.");
      }
    } finally {
      setEnCours(false);
    }
  };

  return (
    <Box>
      {/* En-tête de page centré avec pastille + titre */}
      <PageHeader
        icone={<ReceiptLongIcon />}
        titre="Facturation"
        sousTitre="Factures proforma puis définitives, rattachées aux dossiers de fabrication (RG12, RG13)."
        centre
        taillePastille={28}
        titreVariant="h6"
      />

      {erreur && <Alert severity="error" sx={{ mb: 2 }}>{erreur}</Alert>}

      {/* Barre de recherche + bouton « Émettre une facture » — bouton au mur droit */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems="center"
        sx={{ mb: 2, justifyContent: "space-between" }}
      >
        <SearchField
          valeur={recherche}
          onChange={(e) => gererRecherche(e.target.value)}
          placeholder="Rechercher par numéro de facture, dossier ou commande…"
          largeur={400}
          sx={{ mb: 0, flexGrow: 1, maxWidth: 400 }}
        />
        <BoutonExport
          surPdf={async () => {
            const e = await import("../utils/exportateur");
            await e.exporterPDF({
              fichier: `Factures_${Date.now()}.pdf`,
              titre: "Liste des factures",
              sousTitre: recherche ? `Filtr\u00e9 : ${recherche}` : "",
              meta: e.metaEdition(facturesFiltres.length),
              colonnes: [
                e.colonne("N\u00b0 Facture", "numero_facture"),
                e.colonnePerso("Type", (f) => LIBELLES_TYPE[f.type_facture] || f.type_facture),
                e.colonne("Dossier", "dossier_numero"),
                e.colonne("Commande", "commande_numero"),
                e.colonnePerso("Montant", (f) => `${Number(f.montant).toLocaleString("fr-FR")} Ar`, "right"),
                e.colonnePerso("Date d'\u00e9mission", (f) => new Date(f.date_facture).toLocaleDateString("fr-FR")),
              ],
              lignes: facturesFiltres,
            });
          }}
          surExcel={async () => {
            const e = await import("../utils/exportateur");
            await e.exporterExcel({
              fichier: `Factures_${Date.now()}.xlsx`,
              feuilles: [{
                nom: "Factures", titre: "Liste des factures",
                sousTitre: recherche ? `Filtr\u00e9 : ${recherche}` : "",
                meta: e.metaEdition(facturesFiltres.length),
                colonnes: [
                  e.colonne("N\u00b0 Facture", "numero_facture"),
                  e.colonnePerso("Type", (f) => LIBELLES_TYPE[f.type_facture] || f.type_facture),
                  e.colonne("Dossier", "dossier_numero"),
                  e.colonne("Commande", "commande_numero"),
                  e.colonnePerso("Montant", (f) => `${Number(f.montant).toLocaleString("fr-FR")} Ar`, "right"),
                  e.colonnePerso("Date d'\u00e9mission", (f) => new Date(f.date_facture).toLocaleDateString("fr-FR")),
                ],
                lignes: facturesFiltres,
              }],
            });
          }}
          libelle="Exporter"
          taille="small"
        />
        {peutEmettre && (
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={ouvrirDialogue}
            sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
          >
            Émettre une facture
          </Button>
        )}
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
                  <EnTeteTriable cle="numero_facture" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>N° Facture</EnTeteTriable>
                  <EnTeteTriable cle="type_facture" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Type</EnTeteTriable>
                  <EnTeteTriable cle="dossier_numero" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Dossier</EnTeteTriable>
                  <EnTeteTriable cle="commande_numero" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Commande</EnTeteTriable>
                  <EnTeteTriable cle="montant" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Montant</EnTeteTriable>
                  <EnTeteTriable cle="date_facture" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Date d'émission</EnTeteTriable>
                </TableRow>
              </TableHead>
              <TableBody>
                {facturesPaginees.map((facture, index) => (
                  <TableRow
                    key={facture.id}
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
                        {facture.numero_facture}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={LIBELLES_TYPE[facture.type_facture] || facture.type_facture}
                        color={COULEURS_TYPE[facture.type_facture] || "default"}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell align="center">{facture.dossier_numero}</TableCell>
                    <TableCell align="center">{facture.commande_numero}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>
                      {Number(facture.montant).toLocaleString("fr-FR")} Ar
                    </TableCell>
                    <TableCell align="center">
                      {new Date(facture.date_facture).toLocaleDateString("fr-FR")}
                    </TableCell>
                  </TableRow>
                ))}
                {facturesPaginees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 5, color: "text.secondary" }}>
                      {recherche
                        ? "Aucune facture ne correspond à votre recherche."
                        : "Aucune facture émise pour le moment."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {facturesFiltrees.length > 0 && (
            <PaginationBar
              compte={facturesFiltrees.length}
              page={page}
              surPage={surPage}
              onPageChange={setPage}
              onSurPageChange={(nouvelleValeur) => { setSurPage(nouvelleValeur); setPage(0); }}
            />
          )}
        </Paper>
      )}

      {/* Modale : émission d'une facture */}
      <Dialog open={dialogueOuvert} onClose={() => setDialogueOuvert(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          Émettre une facture
          <IconButton onClick={() => setDialogueOuvert(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {erreurEnvoi && <Alert severity="error" sx={{ mb: 2 }}>{erreurEnvoi}</Alert>}
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField
              select label="Dossier de fabrication" value={dossierId}
              onChange={(e) => gererChoixDossier(e.target.value)} fullWidth
            >
              {dossiers.map((d) => (
                <MenuItem key={d.id} value={d.id}>
                  {d.numero_dossier} — {d.commande_numero} ({d.atelier_nom})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select label="Type de facture" value={typeFacture}
              onChange={(e) => setTypeFacture(e.target.value)} fullWidth
              helperText={
                typeFacture === "DEFINITIVE" && dossierSelectionne?.statut_production !== "TERMINE"
                  ? "La définitive exige une production terminée (RG13)."
                  : "La proforma précède la facture définitive (RG12)."
              }
            >
              <MenuItem value="PROFORMA">Facture proforma</MenuItem>
              <MenuItem value="DEFINITIVE" disabled={dossierSelectionne?.statut_production !== "TERMINE"}>
                Facture définitive
              </MenuItem>
            </TextField>
            <TextField
              label="Montant (Ar)" type="number" value={montant}
              onChange={(e) => setMontant(e.target.value)} fullWidth
              disabled={chargementDevis}
              slotProps={{ htmlInput: { min: 0 } }}
              helperText={chargementDevis ? "Récupération du prix de vente du devis…" : undefined}
            />
            {dossierSelectionne && (
              <Alert severity="info">
                Dossier <strong>{dossierSelectionne.numero_dossier}</strong> — statut de
                production : <strong>{dossierSelectionne.statut_production}</strong>.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogueOuvert(false)}>Annuler</Button>
          <Button variant="contained" onClick={() => setConfirmationEmission(true)}
            disabled={enCours || !dossierId || !montant}
            startIcon={enCours ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}>
            {enCours ? "Émission…" : "Émettre"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialogue : confirmation de l'émission */}
      <ConfirmDialog
        ouvert={confirmationEmission}
        titre="Émettre cette facture ?"
        icone={<ReceiptLongIcon sx={{ fontSize: 24 }} />}
        couleur={typeFacture === "DEFINITIVE" ? "success" : "primary"}
        texteConfirmer="Émettre"
        enCours={enCours}
        onConfirmer={gererEmission}
        onAnnuler={() => setConfirmationEmission(false)}
        message={
          typeFacture === "DEFINITIVE"
            ? "La facture définitive clôture le dossier : la commande passera au statut « Livrée » (RG13). Cette action est définitive."
            : "La facture proforma sera enregistrée et rattachée au dossier de fabrication sélectionné."
        }
      />
    </Box>
  );
}