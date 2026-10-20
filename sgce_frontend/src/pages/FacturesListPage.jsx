import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, Autocomplete, Box, Button, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, IconButton, MenuItem, Paper,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import TableChartIcon from "@mui/icons-material/TableChart";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
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
const COULEUR_TEXTE_TYPE = {
  PROFORMA: "info.main",
  DEFINITIVE: "success.main",
};

function normaliser(donnees) {
  return Array.isArray(donnees) ? donnees : donnees.results || [];
}

/** Colonnes pour l'export de la LISTE (plusieurs factures). */
function colonnesExportListe(e) {
  return [
    e.colonne("N° Facture", "numero_facture"),
    e.colonnePerso("Type", (f) => LIBELLES_TYPE[f.type_facture] || f.type_facture),
    e.colonne("Dossier", "dossier_numero"),
    e.colonne("Commande", "commande_numero"),
    e.colonnePerso("Montant", (f) => `${Number(f.montant).toLocaleString("fr-FR")} Ar`, "right"),
    e.colonnePerso("Date d'émission", (f) => new Date(f.date_facture).toLocaleDateString("fr-FR")),
  ];
}

/**
 * Lignes verticales pour l'export d'UNE facture :
 * colonne gauche = libellé, colonne droite = valeur.
 */
function lignesDetailFacture(facture) {
  return [
    { libelle: "N° Facture", valeur: facture.numero_facture || "—" },
    {
      libelle: "Type",
      valeur: LIBELLES_TYPE[facture.type_facture] || facture.type_facture || "—",
    },
    { libelle: "Dossier", valeur: facture.dossier_numero || "—" },
    { libelle: "Commande", valeur: facture.commande_numero || "—" },
    {
      libelle: "Montant",
      valeur: `${Number(facture.montant).toLocaleString("fr-FR")} Ar`,
    },
    {
      libelle: "Date d'émission",
      valeur: facture.date_facture
        ? new Date(facture.date_facture).toLocaleDateString("fr-FR")
        : "—",
    },
  ];
}

function colonnesExportDetail(e) {
  return [
    e.colonnePerso("Champ", (r) => r.libelle, "left"),
    e.colonnePerso("Valeur", (r) => r.valeur, "left"),
  ];
}

function libelleDossier(d) {
  if (!d) return "";
  const statut = d.statut_production || "";
  const cmd = d.commande_numero || "";
  return [d.numero_dossier, cmd, statut].filter(Boolean).join(" — ");
}

export default function FacturesListPage() {
  const { utilisateur } = useSelector((state) => state.auth);
  const { afficherSucces, afficherErreur } = useNotifier();
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
  const [exportEnCoursId, setExportEnCoursId] = useState(null);
  const [factureDetail, setFactureDetail] = useState(null);

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

  const { cleTri, directionTri, gererTri, donneesTriees } = useTriTableau(facturesFiltrees);
  const facturesPaginees = useMemo(
    () => donneesTriees.slice(page * surPage, page * surPage + surPage),
    [donneesTriees, page, surPage]
  );

  const refCadre = useRef(null);
  const hauteurCadre = useHauteurCinqLignes(refCadre, facturesPaginees.length);

  const gererRecherche = (valeur) => {
    setRecherche(valeur);
    setPage(0);
  };

  const dossierSelectionne = useMemo(
    () => dossiers.find((d) => d.id === dossierId) || null,
    [dossiers, dossierId]
  );

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
    setDossierId(id || "");
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
    if (!dossierId) {
      setErreurEnvoi("Sélectionnez le dossier de fabrication concerné.");
      return;
    }
    if (!montant || Number(montant) <= 0) {
      setErreurEnvoi("Saisissez un montant strictement positif.");
      return;
    }
    setEnCours(true);
    try {
      const facture = await creerFacture({
        dossier: dossierId,
        type_facture: typeFacture,
        montant: Number(montant),
      });
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
        setErreurEnvoi(
          Array.isArray(donnees.type_facture) ? donnees.type_facture[0] : donnees.type_facture
        );
      } else if (donnees?.dossier) {
        setErreurEnvoi(Array.isArray(donnees.dossier) ? donnees.dossier[0] : donnees.dossier);
      } else {
        setErreurEnvoi("Impossible d'émettre cette facture.");
      }
    } finally {
      setEnCours(false);
    }
  };

  /** Export PDF d'une seule facture — tableau vertical (sans horodatage en bas) */
  const exporterFacturePdf = async (facture) => {
    setExportEnCoursId(`${facture.id}-pdf`);
    try {
      const e = await import("../utils/exportateur");
      const numero = facture.numero_facture || facture.id;
      await e.exporterPDF({
        fichier: `Facture_${numero}_${Date.now()}.pdf`,
        titre: `Facture ${numero}`,
        sousTitre: `${LIBELLES_TYPE[facture.type_facture] || facture.type_facture}`,
        meta: e.metaEdition(1, `Facture ${numero}`),
        colonnes: colonnesExportDetail(e),
        lignes: lignesDetailFacture(facture),
      });
      afficherSucces(`Facture ${numero} exportée en PDF.`);
    } catch {
      afficherErreur("Impossible d'exporter cette facture en PDF.");
    } finally {
      setExportEnCoursId(null);
    }
  };

  /** Export Excel d'une seule facture — tableau vertical */
  const exporterFactureExcel = async (facture) => {
    setExportEnCoursId(`${facture.id}-xlsx`);
    try {
      const e = await import("../utils/exportateur");
      const numero = facture.numero_facture || facture.id;
      await e.exporterExcel({
        fichier: `Facture_${numero}_${Date.now()}.xlsx`,
        feuilles: [{
          nom: "Facture",
          titre: `Facture ${numero}`,
          sousTitre: `${LIBELLES_TYPE[facture.type_facture] || facture.type_facture}`,
          meta: e.metaEdition(1, `Facture ${numero}`),
          colonnes: colonnesExportDetail(e),
          lignes: lignesDetailFacture(facture),
        }],
      });
      afficherSucces(`Facture ${numero} exportée en Excel.`);
    } catch {
      afficherErreur("Impossible d'exporter cette facture en Excel.");
    } finally {
      setExportEnCoursId(null);
    }
  };

  return (
    <Box>
      <PageHeader
        icone={<ReceiptLongIcon />}
        titre="Facturation"
        sousTitre="Factures proforma puis définitives, rattachées aux dossiers de fabrication (RG12, RG13)."
        centre
        taillePastille={28}
        titreVariant="h6"
      />

      {erreur && <Alert severity="error" sx={{ mb: 2 }}>{erreur}</Alert>}

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
              sousTitre: recherche ? `Filtré : ${recherche}` : "",
              meta: e.metaEdition(facturesFiltrees.length),
              colonnes: colonnesExportListe(e),
              lignes: facturesFiltrees,
            });
          }}
          surExcel={async () => {
            const e = await import("../utils/exportateur");
            await e.exporterExcel({
              fichier: `Factures_${Date.now()}.xlsx`,
              feuilles: [{
                nom: "Factures",
                titre: "Liste des factures",
                sousTitre: recherche ? `Filtré : ${recherche}` : "",
                meta: e.metaEdition(facturesFiltrees.length),
                colonnes: colonnesExportListe(e),
                lignes: facturesFiltrees,
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
                  <EnTeteTriable cle="numero_facture" align="center" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    N° Facture
                  </EnTeteTriable>
                  <EnTeteTriable cle="type_facture" align="center" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    Type
                  </EnTeteTriable>
                  <EnTeteTriable cle="dossier_numero" align="center" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    Dossier
                  </EnTeteTriable>
                  <EnTeteTriable cle="commande_numero" align="center" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    Commande
                  </EnTeteTriable>
                  <EnTeteTriable cle="montant" align="center" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    Montant
                  </EnTeteTriable>
                  <EnTeteTriable cle="date_facture" align="center" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    Date d&apos;émission
                  </EnTeteTriable>
                  <TableCell align="center" sx={{ ...STYLE_EN_TETE, width: 130 }}>
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {facturesPaginees.map((facture) => (
                  <TableRow
                    key={facture.id}
                    hover
                    sx={{ "&:last-child td": { borderBottom: 0 } }}
                  >
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {facture.numero_facture}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          color: COULEUR_TEXTE_TYPE[facture.type_facture] || "text.primary",
                        }}
                      >
                        {LIBELLES_TYPE[facture.type_facture] || facture.type_facture}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">{facture.dossier_numero}</TableCell>
                    <TableCell align="center">{facture.commande_numero}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>
                      {Number(facture.montant).toLocaleString("fr-FR")} Ar
                    </TableCell>
                    <TableCell align="center">
                      {new Date(facture.date_facture).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.25} justifyContent="center" alignItems="center">
                        <Tooltip title="Voir le détail">
                          <IconButton
                            size="small"
                            onClick={() => setFactureDetail(facture)}
                            sx={{ color: "primary.main" }}
                            aria-label={`Voir le détail de ${facture.numero_facture}`}
                          >
                            <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Exporter en PDF">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => exporterFacturePdf(facture)}
                              disabled={Boolean(exportEnCoursId)}
                              sx={{ color: "#d93025" }}
                              aria-label={`Exporter ${facture.numero_facture} en PDF`}
                            >
                              {exportEnCoursId === `${facture.id}-pdf` ? (
                                <CircularProgress size={16} color="inherit" />
                              ) : (
                                <PictureAsPdfIcon sx={{ fontSize: 18 }} />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Exporter en Excel">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => exporterFactureExcel(facture)}
                              disabled={Boolean(exportEnCoursId)}
                              sx={{ color: "#107c41" }}
                              aria-label={`Exporter ${facture.numero_facture} en Excel`}
                            >
                              {exportEnCoursId === `${facture.id}-xlsx` ? (
                                <CircularProgress size={16} color="inherit" />
                              ) : (
                                <TableChartIcon sx={{ fontSize: 18 }} />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
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

      {/* Dialogue : détail d'une facture */}
      <Dialog
        open={Boolean(factureDetail)}
        onClose={() => setFactureDetail(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          Détail de la facture
          <IconButton onClick={() => setFactureDetail(null)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {factureDetail && (
            <Stack spacing={1.5}>
              {[
                ["N° Facture", factureDetail.numero_facture],
                ["Type", LIBELLES_TYPE[factureDetail.type_facture] || factureDetail.type_facture],
                ["Dossier", factureDetail.dossier_numero],
                ["Commande", factureDetail.commande_numero],
                ["Montant", `${Number(factureDetail.montant).toLocaleString("fr-FR")} Ar`],
                [
                  "Date d'émission",
                  factureDetail.date_facture
                    ? new Date(factureDetail.date_facture).toLocaleDateString("fr-FR")
                    : "—",
                ],
              ].map(([libelle, valeur]) => (
                <Box
                  key={libelle}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 2,
                    py: 0.5,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    {libelle}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, textAlign: "right" }}>
                    {valeur || "—"}
                  </Typography>
                </Box>
              ))}
              <Divider sx={{ my: 0.5 }} />
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button
                  size="small"
                  startIcon={<PictureAsPdfIcon />}
                  onClick={() => exporterFacturePdf(factureDetail)}
                  sx={{ color: "#d93025" }}
                >
                  PDF
                </Button>
                <Button
                  size="small"
                  startIcon={<TableChartIcon />}
                  onClick={() => exporterFactureExcel(factureDetail)}
                  sx={{ color: "#107c41" }}
                >
                  Excel
                </Button>
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFactureDetail(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Dialogue : émission — dossier avec recherche */}
      <Dialog open={dialogueOuvert} onClose={() => setDialogueOuvert(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          Émettre une facture
          <IconButton onClick={() => setDialogueOuvert(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {erreurEnvoi && (
              <Alert severity="error" onClose={() => setErreurEnvoi("")}>{erreurEnvoi}</Alert>
            )}

            <Autocomplete
              options={dossiers}
              value={dossierSelectionne}
              onChange={(_, nouveau) => gererChoixDossier(nouveau?.id ?? "")}
              getOptionLabel={(option) => libelleDossier(option)}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              filterOptions={(options, state) => {
                const q = state.inputValue.trim().toLowerCase();
                if (!q) return options;
                return options.filter((d) =>
                  [
                    d.numero_dossier,
                    d.commande_numero,
                    d.statut_production,
                  ]
                    .filter(Boolean)
                    .some((c) => String(c).toLowerCase().includes(q))
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Dossier de fabrication"
                  required
                  placeholder="Rechercher un dossier…"
                  helperText="Tapez pour filtrer par n° dossier, commande ou statut"
                />
              )}
              noOptionsText="Aucun dossier trouvé"
              fullWidth
            />

            <TextField
              select
              label="Type de facture"
              value={typeFacture}
              onChange={(e) => setTypeFacture(e.target.value)}
              fullWidth
              helperText={
                typeFacture === "DEFINITIVE" && dossierSelectionne?.statut_production !== "TERMINE"
                  ? "La définitive exige une production terminée (RG13)."
                  : "La proforma précède la facture définitive (RG12)."
              }
            >
              <MenuItem value="PROFORMA">Facture proforma</MenuItem>
              <MenuItem
                value="DEFINITIVE"
                disabled={dossierSelectionne?.statut_production !== "TERMINE"}
              >
                Facture définitive
              </MenuItem>
            </TextField>
            <TextField
              label="Montant (Ar)"
              type="number"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              fullWidth
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
          <Button
            variant="contained"
            onClick={() => setConfirmationEmission(true)}
            disabled={enCours || !dossierId || !montant}
            startIcon={enCours ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
          >
            {enCours ? "Émission…" : "Émettre"}
          </Button>
        </DialogActions>
      </Dialog>

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