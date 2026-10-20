import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, MenuItem, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Tooltip, Typography,
} from "@mui/material";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { useNavigate } from "react-router-dom";

import { listerDevis } from "../api/commandesApi";
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
  return new Date(v).toLocaleDateString("fr-FR");
}

export default function DevisListPage() {
  const navigate = useNavigate();
  const [devis, setDevis] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [recherche, setRecherche] = useState("");
  const [filtreValide, setFiltreValide] = useState("");
  const [page, setPage] = useState(0);
  const [surPage, setSurPage] = useState(5);

  const charger = () => {
    setChargement(true);
    setErreur("");
    const params = {};
    if (filtreValide === "true" || filtreValide === "false") {
      params.valide = filtreValide;
    }
    listerDevis(params)
      .then((d) => setDevis(normaliser(d)))
      .catch(() => setErreur("Impossible de charger les devis."))
      .finally(() => setChargement(false));
  };

  useEffect(() => {
    charger();
  }, [filtreValide]);

  const devisFiltres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return devis;
    return devis.filter((d) => {
      const champs = [
        String(d.id),
        String(d.commande ?? ""),
        d.estimation_ia?.version_modele,
        d.valide ? "validé" : "brouillon",
      ];
      return champs.some((c) => c && String(c).toLowerCase().includes(q));
    });
  }, [devis, recherche]);

  const { cleTri, directionTri, gererTri, donneesTriees } = useTriTableau(devisFiltres);
  const devisPaginees = useMemo(
    () => donneesTriees.slice(page * surPage, page * surPage + surPage),
    [donneesTriees, page, surPage]
  );

  const refCadre = useRef(null);
  const hauteurCadre = useHauteurCinqLignes(refCadre, devisPaginees.length);

  return (
    <Box>
      <PageHeader
        icone={<RequestQuoteIcon />}
        titre="Devis"
        sousTitre="Liste de tous les devis — consultation, validation et estimation IA (RG4, RG16)."
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
          placeholder="Rechercher (n° devis, commande, statut…)"
          largeur={360}
          sx={{ mb: 0, flexGrow: 1, maxWidth: 400 }}
        />
        <TextField
          select
          size="small"
          label="Statut"
          value={filtreValide}
          onChange={(e) => {
            setFiltreValide(e.target.value);
            setPage(0);
          }}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">Tous</MenuItem>
          <MenuItem value="false">Non validés</MenuItem>
          <MenuItem value="true">Validés</MenuItem>
        </TextField>
        <BoutonExport
          libelle="Exporter"
          taille="small"
          surPdf={async () => {
            const e = await import("../utils/exportateur");
            await e.exporterPDF({
              fichier: `Devis_${Date.now()}.pdf`,
              titre: "Liste des devis",
              sousTitre: filtreValide
                ? `Filtre : ${filtreValide === "true" ? "Validés" : "Non validés"}`
                : "",
              meta: e.metaEdition(devisFiltres.length),
              colonnes: [
                e.colonnePerso("ID", (d) => d.id),
                e.colonnePerso("Commande", (d) => d.commande),
                e.colonnePerso("Prix revient", (d) => formaterMontant(d.prix_revient), "right"),
                e.colonnePerso("Prix vente", (d) => formaterMontant(d.prix_vente), "right"),
                e.colonnePerso("Validé", (d) => (d.valide ? "Oui" : "Non")),
                e.colonnePerso("Date", (d) => formaterDate(d.date_devis)),
              ],
              lignes: devisFiltres,
            });
          }}
          surExcel={async () => {
            const e = await import("../utils/exportateur");
            await e.exporterExcel({
              fichier: `Devis_${Date.now()}.xlsx`,
              feuilles: [{
                nom: "Devis",
                titre: "Liste des devis",
                meta: e.metaEdition(devisFiltres.length),
                colonnes: [
                  e.colonnePerso("ID", (d) => d.id),
                  e.colonnePerso("Commande", (d) => d.commande),
                  e.colonnePerso("Prix revient", (d) => formaterMontant(d.prix_revient), "right"),
                  e.colonnePerso("Prix vente", (d) => formaterMontant(d.prix_vente), "right"),
                  e.colonnePerso("Validé", (d) => (d.valide ? "Oui" : "Non")),
                  e.colonnePerso("Date", (d) => formaterDate(d.date_devis)),
                ],
                lignes: devisFiltres,
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
                    N° Devis
                  </EnTeteTriable>
                  <EnTeteTriable cle="commande" align="center" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    Commande
                  </EnTeteTriable>
                  <EnTeteTriable cle="prix_revient" align="center" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    Prix de revient
                  </EnTeteTriable>
                  <EnTeteTriable cle="prix_vente" align="center" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    Prix de vente
                  </EnTeteTriable>
                  <TableCell align="center" sx={STYLE_EN_TETE}>Estimation IA</TableCell>
                  <EnTeteTriable cle="valide" align="center" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    Statut
                  </EnTeteTriable>
                  <EnTeteTriable cle="date_devis" align="center" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    Date
                  </EnTeteTriable>
                  <TableCell align="center" sx={{ ...STYLE_EN_TETE, width: 80 }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {devisPaginees.map((d) => (
                  <TableRow key={d.id} hover sx={{ "&:last-child td": { borderBottom: 0 } }}>
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        #{d.id}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        sx={{ textTransform: "none", fontWeight: 600 }}
                        onClick={() => navigate(`/commandes/${d.commande}`)}
                      >
                        CMD #{d.commande}
                      </Button>
                    </TableCell>
                    <TableCell align="center">{formaterMontant(d.prix_revient)}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>
                      {formaterMontant(d.prix_vente)}
                    </TableCell>
                    <TableCell align="center">
                      {d.estimation_ia ? (
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            textTransform: "lowercase",
                            color:
                              String(d.estimation_ia.methode || "").toUpperCase() === "XGBOOST"
                                ? "primary.main"
                                : String(d.estimation_ia.methode || "").toUpperCase() === "HEURISTIQUE"
                                  ? "secondary.main"
                                  : "text.secondary",
                          }}
                        >
                          {(
                            d.estimation_ia.methode ||
                            d.estimation_ia.version_modele ||
                            "ia"
                          )
                            .toString()
                            .toLowerCase()}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: d.valide ? "success.main" : "warning.main",
                          textTransform: "none",
                        }}
                      >
                        {d.valide ? "Validé" : "Brouillon"}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">{formaterDate(d.date_devis)}</TableCell>
                    <TableCell align="center">
                      <Tooltip title="Voir le détail">
                        <Button
                          size="small"
                          startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 16 }} />}
                          onClick={() => navigate(`/devis/${d.id}`)}
                          sx={{ textTransform: "none" }}
                        >
                          Détail
                        </Button>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {devisPaginees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 5, color: "text.secondary" }}>
                      {recherche || filtreValide
                        ? "Aucun devis ne correspond aux critères."
                        : "Aucun devis enregistré pour le moment."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {devisFiltres.length > 0 && (
            <PaginationBar
              compte={devisFiltres.length}
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