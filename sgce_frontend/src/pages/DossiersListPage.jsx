import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, Box, CircularProgress, IconButton, MenuItem, Paper,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import { Link } from "react-router-dom";
import { alpha } from "@mui/material/styles";

import { listerDossiers } from "../api/commandesApi";
import { LIBELLES_STATUT_PRODUCTION } from "../constants/roles";
import PageHeader from "../components/common/PageHeader";
import SearchField from "../components/common/SearchField";
import EnTeteTriable, { STYLE_EN_TETE } from "../components/common/EnTeteTriable";
import PaginationBar from "../components/common/PaginationBar";
import { useTriTableau } from "../utils/tri";
import { useHauteurCinqLignes } from "../utils/tableau";
import BoutonExport from "../components/common/BoutonExport";

const COULEUR_TEXTE_STATUT_PRODUCTION = {
  CREE: "text.secondary",
  EN_COURS: "warning.main",
  TERMINE: "success.main",
};

const OPTIONS_STATUT = [
  { code: "", libelle: "Tous" },
  { code: "CREE", libelle: "Créé" },
  { code: "EN_COURS", libelle: "En cours" },
  { code: "TERMINE", libelle: "Terminé" },
];
const LIBELLE_STATUT = Object.fromEntries(OPTIONS_STATUT.map((o) => [o.code, o.libelle]));

function normaliser(donnees) {
  return Array.isArray(donnees) ? donnees : donnees.results || [];
}

export default function DossiersListPage() {
  const [dossiers, setDossiers] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("");
  const [page, setPage] = useState(0);
  const [surPage, setSurPage] = useState(5);

  useEffect(() => {
    listerDossiers()
      .then((d) => setDossiers(normaliser(d)))
      .catch(() => setErreur("Impossible de charger les dossiers de fabrication."))
      .finally(() => setChargement(false));
  }, []);

  const dossiersFiltres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return dossiers.filter((dossier) => {
      const correspondRecherche =
        !q ||
        [dossier.numero_dossier, dossier.commande_numero, dossier.atelier_nom]
          .filter(Boolean)
          .some((champ) => String(champ).toLowerCase().includes(q));
      const correspondStatut = !filtreStatut || dossier.statut_production === filtreStatut;
      return correspondRecherche && correspondStatut;
    });
  }, [dossiers, recherche, filtreStatut]);

  const comptesStatut = useMemo(() => {
    const c = { "": dossiers.length };
    OPTIONS_STATUT.forEach((o) => { if (o.code) c[o.code] = 0; });
    dossiers.forEach((d) => { if (c[d.statut_production] !== undefined) c[d.statut_production] += 1; });
    return c;
  }, [dossiers]);

  const { cleTri, directionTri, gererTri, donneesTriees } = useTriTableau(dossiersFiltres);
  const dossiersPaginees = useMemo(
    () => donneesTriees.slice(page * surPage, page * surPage + surPage),
    [donneesTriees, page, surPage]
  );

  const refCadre = useRef(null);
  const hauteurCadre = useHauteurCinqLignes(refCadre, dossiersPaginees.length);

  const gererRecherche = (valeur) => {
    setRecherche(valeur);
    setPage(0);
  };

  return (
    <Box>
      <PageHeader
        icone={<PrecisionManufacturingIcon />}
        titre="Production"
        sousTitre="Dossiers de fabrication affectés aux ateliers SPA et SPB (RG5, RG6)."
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
          placeholder="Rechercher par n° de dossier, commande ou atelier…"
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
                  {LIBELLE_STATUT[v] || "Tous"}
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
            const e = await import("../utils/exportateur");
            await e.exporterPDF({
              fichier: `Dossiers_${Date.now()}.pdf`,
              titre: "Liste des dossiers de fabrication",
              sousTitre: recherche
                ? `Filtré : ${recherche}`
                : filtreStatut
                  ? `Statut : ${LIBELLES_STATUT_PRODUCTION[filtreStatut]}`
                  : "",
              meta: e.metaEdition(dossiersFiltres.length),
              colonnes: [
                e.colonne("N° Dossier", "numero_dossier"),
                e.colonne("Commande", "commande_numero"),
                e.colonne("Atelier", "atelier_nom", "left"),
                e.colonnePerso("Statut", (d) => LIBELLES_STATUT_PRODUCTION[d.statut_production] || d.statut_production),
                e.colonnePerso("Créé le", (d) => new Date(d.date_creation).toLocaleDateString("fr-FR")),
              ],
              lignes: dossiersFiltres,
            });
          }}
          surExcel={async () => {
            const e = await import("../utils/exportateur");
            await e.exporterExcel({
              fichier: `Dossiers_${Date.now()}.xlsx`,
              feuilles: [{
                nom: "Dossiers",
                titre: "Liste des dossiers de fabrication",
                sousTitre: recherche
                  ? `Filtré : ${recherche}`
                  : filtreStatut
                    ? `Statut : ${LIBELLES_STATUT_PRODUCTION[filtreStatut]}`
                    : "",
                meta: e.metaEdition(dossiersFiltres.length),
                colonnes: [
                  e.colonne("N° Dossier", "numero_dossier"),
                  e.colonne("Commande", "commande_numero"),
                  e.colonne("Atelier", "atelier_nom", "left"),
                  e.colonnePerso("Statut", (d) => LIBELLES_STATUT_PRODUCTION[d.statut_production] || d.statut_production),
                  e.colonnePerso("Créé le", (d) => new Date(d.date_creation).toLocaleDateString("fr-FR")),
                ],
                lignes: dossiersFiltres,
              }],
            });
          }}
          libelle="Exporter"
          taille="small"
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
                  <EnTeteTriable cle="numero_dossier" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    N° Dossier
                  </EnTeteTriable>
                  <EnTeteTriable cle="commande_numero" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    Commande
                  </EnTeteTriable>
                  <EnTeteTriable cle="atelier_nom" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    Atelier
                  </EnTeteTriable>
                  <EnTeteTriable cle="statut_production" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    Statut
                  </EnTeteTriable>
                  <EnTeteTriable cle="date_creation" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    Créé le
                  </EnTeteTriable>
                  <TableCell align="center" sx={STYLE_EN_TETE}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dossiersPaginees.map((dossier) => (
                  <TableRow
                    key={dossier.id}
                    hover
                    sx={{ "&:last-child td": { borderBottom: 0 } }}
                  >
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {dossier.numero_dossier}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">{dossier.commande_numero}</TableCell>
                    <TableCell align="center">{dossier.atelier_nom}</TableCell>
                    <TableCell align="center">
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          color: COULEUR_TEXTE_STATUT_PRODUCTION[dossier.statut_production] || "text.primary",
                        }}
                      >
                        {LIBELLES_STATUT_PRODUCTION[dossier.statut_production] || dossier.statut_production}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {new Date(dossier.date_creation).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Voir le dossier">
                        <IconButton
                          size="small"
                          component={Link}
                          to={`/dossiers/${dossier.id}`}
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
                {dossiersPaginees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 5, color: "text.secondary" }}>
                      {recherche || filtreStatut
                        ? "Aucun dossier ne correspond à vos filtres."
                        : "Aucun dossier de fabrication pour le moment."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {dossiersFiltres.length > 0 && (
            <PaginationBar
              compte={dossiersFiltres.length}
              page={page}
              surPage={surPage}
              onPageChange={setPage}
              onSurPageChange={(nouvelleValeur) => { setSurPage(nouvelleValeur); setPage(0); }}
            />
          )}
        </Paper>
      )}
    </Box>
  );
}