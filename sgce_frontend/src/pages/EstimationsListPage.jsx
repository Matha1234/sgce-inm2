import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, Box, Button, CircularProgress, MenuItem, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Tooltip, Typography,
} from "@mui/material";
import PsychologyIcon from "@mui/icons-material/Psychology";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { useNavigate } from "react-router-dom";

import { listerEstimations } from "../api/iaApi";
import PageHeader from "../components/common/PageHeader";
import SearchField from "../components/common/SearchField";
import EnTeteTriable, { STYLE_EN_TETE } from "../components/common/EnTeteTriable";
import PaginationBar from "../components/common/PaginationBar";
import BoutonExport from "../components/common/BoutonExport";
import { useTriTableau } from "../utils/tri";
import { useHauteurCinqLignes } from "../utils/tableau";

function normaliser(donnees) {
  return Array.isArray(donnees) ? donnees : donnees?.results || [];
}

function formaterMontant(v) {
  if (v == null || v === "") return "—";
  return `${Number(v).toLocaleString("fr-FR")} Ar`;
}

function formaterDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const LIBELLES_METHODE = {
  XGBOOST: "XGBoost",
  HEURISTIQUE: "Heuristique",
};

export default function EstimationsListPage() {
  const navigate = useNavigate();
  const [estimations, setEstimations] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [recherche, setRecherche] = useState("");
  const [filtreMethode, setFiltreMethode] = useState("");
  const [page, setPage] = useState(0);
  const [surPage, setSurPage] = useState(5);

  const charger = () => {
    setChargement(true);
    setErreur("");
    const params = {};
    if (filtreMethode) params.methode = filtreMethode;
    listerEstimations(params)
      .then((d) => setEstimations(normaliser(d)))
      .catch(() => setErreur("Impossible de charger les estimations IA."))
      .finally(() => setChargement(false));
  };

  useEffect(() => {
    charger();
  }, [filtreMethode]);

  const estimationsFiltrees = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return estimations;
    return estimations.filter((e) =>
      [
        String(e.id),
        String(e.devis_id ?? e.devis ?? ""),
        e.commande_numero,
        String(e.commande_id ?? ""),
        e.organisme_nom,
        e.methode,
        e.version_modele,
        e.type_document,
      ]
        .filter(Boolean)
        .some((c) => String(c).toLowerCase().includes(q))
    );
  }, [estimations, recherche]);

  const { cleTri, directionTri, gererTri, donneesTriees } = useTriTableau(estimationsFiltrees);
  const pageData = useMemo(
    () => donneesTriees.slice(page * surPage, page * surPage + surPage),
    [donneesTriees, page, surPage]
  );

  const refCadre = useRef(null);
  const hauteurCadre = useHauteurCinqLignes(refCadre, pageData.length);

  return (
    <Box>
      <PageHeader
        icone={<PsychologyIcon />}
        titre="Estimation IA"
        sousTitre="Estimations intelligentes des coûts liées aux devis (RG4, RG20)."
        centre
        taillePastille={28}
        titreVariant="h6"
      />

      {erreur && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {erreur}
        </Alert>
      )}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems="center"
        sx={{ mb: 2, justifyContent: "space-between" }}
      >
        <SearchField
          valeur={recherche}
          onChange={(e) => {
            setRecherche(e.target.value);
            setPage(0);
          }}
          placeholder="Rechercher (commande, organisme, méthode…)"
          largeur={360}
          sx={{ mb: 0, flexGrow: 1, maxWidth: 400 }}
        />
        <TextField
          select
          size="small"
          label="Méthode"
          value={filtreMethode}
          onChange={(e) => {
            setFiltreMethode(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="">Toutes</MenuItem>
          <MenuItem value="XGBOOST">XGBoost</MenuItem>
          <MenuItem value="HEURISTIQUE">Heuristique</MenuItem>
        </TextField>
        <BoutonExport
          libelle="Exporter"
          taille="small"
          surPdf={async () => {
            const e = await import("../utils/exportateur");
            await e.exporterPDF({
              fichier: `Estimations_IA_${Date.now()}.pdf`,
              titre: "Liste des estimations IA",
              sousTitre: filtreMethode
                ? `Méthode : ${LIBELLES_METHODE[filtreMethode] || filtreMethode}`
                : "",
              meta: e.metaEdition(estimationsFiltrees.length),
              colonnes: [
                e.colonnePerso("ID", (r) => r.id),
                e.colonnePerso("Commande", (r) => r.commande_numero || r.commande_id),
                e.colonnePerso("Devis", (r) => r.devis_id || r.devis),
                e.colonnePerso("Prix prédit", (r) => formaterMontant(r.prix_predit), "right"),
                e.colonnePerso("Durée (j)", (r) => r.duree_predite),
                e.colonnePerso("Méthode", (r) => r.methode || r.version_modele),
                e.colonnePerso("Score %", (r) => r.score_confiance ?? "—"),
                e.colonnePerso("Date", (r) => formaterDate(r.date_estimation)),
              ],
              lignes: estimationsFiltrees,
            });
          }}
          surExcel={async () => {
            const e = await import("../utils/exportateur");
            await e.exporterExcel({
              fichier: `Estimations_IA_${Date.now()}.xlsx`,
              feuilles: [{
                nom: "Estimations",
                titre: "Liste des estimations IA",
                meta: e.metaEdition(estimationsFiltrees.length),
                colonnes: [
                  e.colonnePerso("ID", (r) => r.id),
                  e.colonnePerso("Commande", (r) => r.commande_numero || r.commande_id),
                  e.colonnePerso("Devis", (r) => r.devis_id || r.devis),
                  e.colonnePerso("Prix prédit", (r) => formaterMontant(r.prix_predit), "right"),
                  e.colonnePerso("Durée (j)", (r) => r.duree_predite),
                  e.colonnePerso("Méthode", (r) => r.methode || r.version_modele),
                  e.colonnePerso("Score %", (r) => r.score_confiance ?? "—"),
                  e.colonnePerso("Date", (r) => formaterDate(r.date_estimation)),
                ],
                lignes: estimationsFiltrees,
              }],
            });
          }}
        />
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
                  <EnTeteTriable cle="id" align="center" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    ID
                  </EnTeteTriable>
                  <EnTeteTriable cle="commande_numero" align="center" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    Commande
                  </EnTeteTriable>
                  <EnTeteTriable cle="devis_id" align="center" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    Devis
                  </EnTeteTriable>
                  <EnTeteTriable cle="prix_predit" align="center" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    Prix prédit
                  </EnTeteTriable>
                  <EnTeteTriable cle="duree_predite" align="center" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    Durée
                  </EnTeteTriable>
                  <EnTeteTriable cle="methode" align="center" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    Méthode
                  </EnTeteTriable>
                  <EnTeteTriable cle="score_confiance" align="center" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    Score
                  </EnTeteTriable>
                  <EnTeteTriable cle="date_estimation" align="center" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    Date
                  </EnTeteTriable>
                  <TableCell align="center" sx={{ ...STYLE_EN_TETE, width: 90 }}>
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pageData.map((est) => (
                  <TableRow key={est.id} hover sx={{ "&:last-child td": { borderBottom: 0 } }}>
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        #{est.id}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {est.commande_id ? (
                        <Button
                          size="small"
                          sx={{ textTransform: "none", fontWeight: 600 }}
                          onClick={() => navigate(`/commandes/${est.commande_id}`)}
                        >
                          {est.commande_numero || `CMD #${est.commande_id}`}
                        </Button>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        sx={{ textTransform: "none" }}
                        onClick={() => navigate(`/devis/${est.devis_id || est.devis}`)}
                      >
                        #{est.devis_id || est.devis}
                      </Button>
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>
                      {formaterMontant(est.prix_predit)}
                    </TableCell>
                    <TableCell align="center">
                      {est.duree_predite != null ? `${est.duree_predite} j` : "—"}
                    </TableCell>
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          textTransform: "lowercase",
                          color:
                            String(est.methode || "").toUpperCase() === "XGBOOST"
                              ? "primary.main"
                              : String(est.methode || "").toUpperCase() === "HEURISTIQUE"
                                ? "secondary.main"
                                : "text.secondary",
                        }}
                      >
                        {(
                          LIBELLES_METHODE[est.methode] ||
                          est.methode ||
                          est.version_modele ||
                          "—"
                        )
                          .toString()
                          .toLowerCase()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {est.score_confiance != null ? `${est.score_confiance} %` : "—"}
                    </TableCell>
                    <TableCell align="center">{formaterDate(est.date_estimation)}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Voir le détail">
                        <Button
                          size="small"
                          startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 16 }} />}
                          onClick={() => navigate(`/estimations/${est.id}`)}
                          sx={{ textTransform: "none" }}
                        >
                          Détail
                        </Button>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {pageData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 5, color: "text.secondary" }}>
                      {recherche || filtreMethode
                        ? "Aucune estimation ne correspond aux critères."
                        : "Aucune estimation IA enregistrée (créées avec les devis hors catalogue)."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {estimationsFiltrees.length > 0 && (
            <PaginationBar
              compte={estimationsFiltrees.length}
              page={page}
              surPage={surPage}
              onPageChange={setPage}
              onSurPageChange={(v) => {
                setSurPage(v);
                setPage(0);
              }}
            />
          )}
        </Paper>
      )}
    </Box>
  );
}