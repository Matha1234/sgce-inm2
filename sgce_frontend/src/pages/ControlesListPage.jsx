import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, Box, Card, CardContent, Chip, CircularProgress,
  Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography,
} from "@mui/material";
import AssessmentIcon from "@mui/icons-material/Assessment";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import BalanceIcon from "@mui/icons-material/Balance";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import FactCheckIcon from "@mui/icons-material/FactCheck";

import { listerControles, recupererTableauBordRentabilite } from "../api/controleApi";
import { COULEURS_RESULTAT_CONTROLE, LIBELLES_RESULTAT_CONTROLE } from "../constants/roles";
import PageHeader, { PastilleIcone } from "../components/common/PageHeader";
import EnTeteTriable, { STYLE_EN_TETE } from "../components/common/EnTeteTriable";
import PaginationBar from "../components/common/PaginationBar";
import { useTriTableau } from "../utils/tri";
import { useHauteurCinqLignes } from "../utils/tableau";

function CarteChiffre({ titre, valeur, icone, couleur = "primary.main" }) {
  return (
    <Card
      sx={{
        height: "100%",
        borderLeft: "4px solid",
        borderLeftColor: couleur,
        transition: "box-shadow 0.15s, transform 0.15s",
        "&:hover": { boxShadow: 4, transform: "translateY(-2px)" },
      }}
    >
      <CardContent sx={{ display: "flex", alignItems: "center", gap: 1.75, py: 2.25, "&:last-child": { pb: 2.25 } }}>
        <PastilleIcone icone={icone} couleur={couleur} taille={42} />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary" noWrap>{titre}</Typography>
          <Typography variant="h5" sx={{ color: couleur, fontWeight: 700, lineHeight: 1.25 }}>{valeur}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function ControlesListPage() {
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [controles, setControles] = useState([]);
  const [indicateurs, setIndicateurs] = useState(null);

  useEffect(() => {
    async function charger() {
      setChargement(true);
      setErreur("");
      try {
        const [listeControles, tableauBord] = await Promise.all([
          listerControles(),
          recupererTableauBordRentabilite(),
        ]);
        setControles(Array.isArray(listeControles) ? listeControles : listeControles.results || []);
        setIndicateurs(tableauBord);
      } catch {
        setErreur("Impossible de charger les données de rentabilité.");
      } finally {
        setChargement(false);
      }
    }
    charger();
  }, []);

  // Tri des fiches de contrôle par colonne (croissant puis décroissant)
  const { cleTri, directionTri, gererTri, donneesTriees: controlesTries } = useTriTableau(controles);

  const [page, setPage] = useState(0);
  const [surPage, setSurPage] = useState(5);
  const controlesPaginees = useMemo(
    () => controlesTries.slice(page * surPage, page * surPage + surPage),
    [controlesTries, page, surPage]
  );

  // Cadre mesuré : exactement l'en-tête + 5 lignes, sans barre de
  // défilement à 5 entrées ; elle apparaît dès qu'on augmente l'affichage.
  const refCadre = useRef(null);
  const hauteurCadre = useHauteurCinqLignes(refCadre, controlesPaginees.length);

  if (chargement) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, mt: 12 }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Chargement des contrôles de prix de revient…
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* En-tête de page centré avec pastille + titre */}
      <PageHeader
        icone={<AssessmentIcon />}
        titre="Rentabilité"
        sousTitre="Contrôle du prix de revient à la clôture et analyse de rentabilité (UC-06, UC-09, RG23-RG24)."
        centre
        taillePastille={28}
        titreVariant="h6"
      />

      {erreur && <Alert severity="warning" sx={{ mb: 3 }}>{erreur}</Alert>}

      {/* Indicateurs (partie non scrollable) */}
      {indicateurs && (
        <Box sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
          gap: 2, mb: 3, flexShrink: 0,
        }}>
          <CarteChiffre titre="Dossiers contrôlés" valeur={indicateurs.nombre_controles} icone={<FactCheckIcon sx={{ fontSize: 20 }} />} />
          <CarteChiffre titre="Bénéficiaires" valeur={indicateurs.nombre_beneficiaires} icone={<TrendingUpIcon sx={{ fontSize: 20 }} />} couleur="success.main" />
          <CarteChiffre titre="Déficitaires" valeur={indicateurs.nombre_deficitaires} icone={<TrendingDownIcon sx={{ fontSize: 20 }} />} couleur="error.main" />
          <CarteChiffre titre="À l'équilibre" valeur={indicateurs.nombre_a_l_equilibre} icone={<BalanceIcon sx={{ fontSize: 20 }} />} couleur="text.secondary" />
          <CarteChiffre titre="Écarts significatifs" valeur={indicateurs.nombre_ecarts_significatifs} icone={<WarningAmberIcon sx={{ fontSize: 20 }} />} couleur="warning.main" />
          <CarteChiffre titre="Marge moyenne" valeur={`${indicateurs.marge_moyenne_pourcentage}%`} icone={<AssessmentIcon sx={{ fontSize: 20 }} />} />
        </Box>
      )}

      {/* Tableau des fiches de contrôle (scrollable) */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ px: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.default", flexShrink: 0 }}>
          <FactCheckIcon color="primary" fontSize="small" />
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 15 }}>Fiches de contrôle</Typography>
          <Chip label={`${controles.length} fiche(s)`} size="small" variant="outlined" />
        </Stack>
        <TableContainer ref={refCadre} sx={{ maxHeight: hauteurCadre ?? 320, overflow: "auto" }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell align="center" sx={{ width: 48, ...STYLE_EN_TETE }}>#</TableCell>
                <EnTeteTriable cle="dossier_numero" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Dossier</EnTeteTriable>
                <EnTeteTriable cle="atelier_nom" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Atelier</EnTeteTriable>
                <EnTeteTriable cle="cout_reel_total" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Coût réel</EnTeteTriable>
                <EnTeteTriable cle="marge_reelle_pourcentage" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Marge réelle</EnTeteTriable>
                <EnTeteTriable cle="resultat" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Résultat</EnTeteTriable>
                <EnTeteTriable cle="ecart_significatif" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Écart</EnTeteTriable>
                <EnTeteTriable cle="date_controle" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Date</EnTeteTriable>
              </TableRow>
            </TableHead>
            <TableBody>
              {controlesPaginees.map((controle, index) => (
                <TableRow key={controle.id} hover sx={{
                  "&:last-child td": { borderBottom: 0 },
                  "&:nth-of-type(even)": { bgcolor: "background.default" },
                }}>
                  <TableCell align="center">
                    <Typography variant="body2" sx={{ fontWeight: 500, color: "text.secondary" }}>
                      {page * surPage + index + 1}
                    </Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>{controle.dossier_numero}</TableCell>
                  <TableCell align="center">{controle.atelier_nom}</TableCell>
                  <TableCell align="center">{Number(controle.cout_reel_total).toLocaleString("fr-FR")} Ar</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>{controle.marge_reelle_pourcentage}%</TableCell>
                  <TableCell align="center">
                    <Chip size="small" label={LIBELLES_RESULTAT_CONTROLE[controle.resultat] || controle.resultat}
                      color={COULEURS_RESULTAT_CONTROLE[controle.resultat] || "default"} sx={{ fontWeight: 600 }} />
                  </TableCell>
                  <TableCell align="center">
                    {controle.ecart_significatif && (
                      <Chip size="small" label="Significatif" color="warning" variant="outlined" sx={{ fontWeight: 600 }} />
                    )}
                  </TableCell>
                  <TableCell align="center">{new Date(controle.date_controle).toLocaleDateString("fr-FR")}</TableCell>
                </TableRow>
              ))}
              {controles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 5, color: "text.secondary" }}>
                    Aucun contrôle de prix de revient enregistré pour le moment.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <PaginationBar
          compte={controles.length}
          page={page}
          surPage={surPage}
          onPageChange={setPage}
          onSurPageChange={(nouvelleValeur) => { setSurPage(nouvelleValeur); setPage(0); }}
        />
      </Paper>
    </Box>
  );
}