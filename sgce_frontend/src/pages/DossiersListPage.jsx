import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, Box, Chip, CircularProgress, IconButton, Paper,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Tooltip, Typography,
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

const COULEURS_STATUT_PRODUCTION = {
  CREE: "default",
  EN_COURS: "warning",
  TERMINE: "success",
};

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

  // Tri par colonne puis page courante tronquée à « surPage » lignes
  const { cleTri, directionTri, gererTri, donneesTriees } = useTriTableau(dossiersFiltres);
  const dossiersPaginees = useMemo(
    () => donneesTriees.slice(page * surPage, page * surPage + surPage),
    [donneesTriees, page, surPage]
  );

  // Cadre mesuré : exactement l'en-tête + 5 lignes, sans barre de
  // défilement à 5 entrées ; elle apparaît dès qu'on augmente l'affichage.
  const refCadre = useRef(null);
  const hauteurCadre = useHauteurCinqLignes(refCadre, dossiersPaginees.length);

  const gererRecherche = (valeur) => {
    setRecherche(valeur);
    setPage(0);
  };

  return (
    <Box>
      {/* En-tête de page centré avec pastille + titre */}
      <PageHeader
        icone={<PrecisionManufacturingIcon />}
        titre="Production"
        sousTitre="Dossiers de fabrication affectés aux ateliers SPA et SPB (RG5, RG6)."
        centre
        taillePastille={28}
        titreVariant="h6"
      />

      {erreur && <Alert severity="error" sx={{ mb: 2 }}>{erreur}</Alert>}

      {/* Filtres + recherche — boutons de statut et barre sur la même ligne */}
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
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {["", "CREE", "EN_COURS", "TERMINE"].map((statut) => (
            <Chip
              key={statut}
              label={statut === "" ? "Tous" : LIBELLES_STATUT_PRODUCTION[statut]}
              size="small"
              color={filtreStatut === statut ? "primary" : "default"}
              variant={filtreStatut === statut ? "filled" : "outlined"}
              onClick={() => { setFiltreStatut(statut); setPage(0); }}
              sx={{ fontWeight: 600 }}
            />
          ))}
        </Stack>
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
                  <EnTeteTriable cle="numero_dossier" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>N° Dossier</EnTeteTriable>
                  <EnTeteTriable cle="commande_numero" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Commande</EnTeteTriable>
                  <EnTeteTriable cle="atelier_nom" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Atelier</EnTeteTriable>
                  <EnTeteTriable cle="statut_production" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Statut</EnTeteTriable>
                  <EnTeteTriable cle="date_creation" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Créé le</EnTeteTriable>
                  <TableCell align="center" sx={STYLE_EN_TETE}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dossiersPaginees.map((dossier, index) => (
                  <TableRow
                    key={dossier.id}
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
                        {dossier.numero_dossier}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">{dossier.commande_numero}</TableCell>
                    <TableCell align="center">{dossier.atelier_nom}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={LIBELLES_STATUT_PRODUCTION[dossier.statut_production] || dossier.statut_production}
                        color={COULEURS_STATUT_PRODUCTION[dossier.statut_production] || "default"}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
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
                          sx={{ color: "primary.main", "&:hover": { bgcolor: (t) => alpha(t.palette.primary.main, 0.1) } }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {dossiersPaginees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 5, color: "text.secondary" }}>
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