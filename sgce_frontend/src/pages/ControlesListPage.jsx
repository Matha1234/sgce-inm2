import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import {
  Alert, Box, Card, CardContent, Chip, CircularProgress, Grid,
  Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography,
} from "@mui/material";
import AssessmentIcon from "@mui/icons-material/Assessment";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { alpha } from "@mui/material/styles";

import { listerControles, recupererTableauBordRentabilite } from "../api/controleApi";
import { LIBELLES_RESULTAT_CONTROLE } from "../constants/roles";
import PageHeader from "../components/common/PageHeader";
import EnTeteTriable, { STYLE_EN_TETE } from "../components/common/EnTeteTriable";
import PaginationBar from "../components/common/PaginationBar";
import BoutonExport from "../components/common/BoutonExport";
import { useTriTableau } from "../utils/tri";
import { useHauteurCinqLignes } from "../utils/tableau";
import { CarteDonutLegende } from "../components/common/CartesTableauBord";

const COULEUR_TEXTE_RESULTAT = {
  SOUS_MARGE: "error.main",
  DANS_LA_NORME: "success.main",
  SUR_MARGE: "warning.main",
};

const MARGE_HEX = {
  SOUS_MARGE: "#d32f2f",
  DANS_LA_NORME: "#2e7d32",
  SUR_MARGE: "#ed6c02",
};

const CARD_BASE = {
  height: "100%",
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 2,
  bgcolor: "background.paper",
  boxShadow: "0 1px 4px rgba(15,35,60,.06)",
  transition: "box-shadow .15s, transform .15s",
};

/** Carte indicateur — même modèle que le tableau de bord */
function CarteIndicateur({ titre, valeur, sousTitre, couleur, icone }) {
  return (
    <Card
      sx={{
        ...CARD_BASE,
        minHeight: 150,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CardContent
        sx={{
          p: 2,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          width: "100%",
          boxSizing: "border-box",
          "&:last-child": { pb: 2 },
        }}
      >
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: 2,
            display: "grid",
            placeItems: "center",
            bgcolor: alpha(couleur, 0.1),
            color: couleur,
            mb: 0.7,
          }}
        >
          {icone}
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            fontSize: 11,
            width: "100%",
            textAlign: "center",
          }}
        >
          {titre}
        </Typography>
        <Typography
          sx={{
            fontSize: 30,
            lineHeight: 1.1,
            fontWeight: 800,
            color: couleur,
            width: "100%",
            textAlign: "center",
            my: 0.3,
          }}
        >
          {valeur}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontSize: 11.5, width: "100%", textAlign: "center" }}
        >
          {sousTitre}
        </Typography>
      </CardContent>
    </Card>
  );
}

/** Panneau avec en-tête — même modèle que le tableau de bord */
function Panneau({ titre, sousTitre, children }) {
  return (
    <Card sx={{ ...CARD_BASE, minHeight: 200, display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          px: 1.75,
          py: 1.15,
          bgcolor: "action.hover",
          borderBottom: "1px solid",
          borderColor: "divider",
          flexShrink: 0,
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 750, fontSize: 13.5, lineHeight: 1.3 }}>
          {titre}
        </Typography>
        {sousTitre && (
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11.5 }}>
            {sousTitre}
          </Typography>
        )}
      </Box>
      <Box
        sx={{
          p: 1.5,
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.paper",
        }}
      >
        <Box sx={{ width: "100%" }}>{children}</Box>
      </Box>
    </Card>
  );
}

export default function ControlesListPage() {
  const { utilisateur } = useSelector((state) => state.auth);
  const estAdmin = utilisateur?.role === "ADMIN";

  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [controles, setControles] = useState([]);
  const [indicateurs, setIndicateurs] = useState(null);

  useEffect(() => {
    async function charger() {
      setChargement(true);
      setErreur("");
      try {
        const listeControles = await listerControles();
        setControles(Array.isArray(listeControles) ? listeControles : listeControles.results || []);
        if (estAdmin) {
          try {
            const tableauBord = await recupererTableauBordRentabilite();
            setIndicateurs(tableauBord);
          } catch {
            setIndicateurs(null);
          }
        } else {
          setIndicateurs(null);
        }
      } catch {
        setErreur("Impossible de charger les données de rentabilité.");
      } finally {
        setChargement(false);
      }
    }
    charger();
  }, [estAdmin]);

  const { cleTri, directionTri, gererTri, donneesTriees: controlesTries } = useTriTableau(controles);

  const [page, setPage] = useState(0);
  const [surPage, setSurPage] = useState(5);
  const controlesPaginees = useMemo(
    () => controlesTries.slice(page * surPage, page * surPage + surPage),
    [controlesTries, page, surPage]
  );

  const refCadre = useRef(null);
  const hauteurCadre = useHauteurCinqLignes(refCadre, controlesPaginees.length);

  const rentabiliteSegments = useMemo(() => {
    if (!indicateurs) return [];
    return [
      ["SOUS_MARGE", "Sous-marge", indicateurs.nombre_sous_marge],
      ["DANS_LA_NORME", "Dans la norme", indicateurs.nombre_dans_la_norme],
      ["SUR_MARGE", "Sur-marge", indicateurs.nombre_sur_marge],
    ]
      .filter((x) => x[2] > 0)
      .map(([code, label, value]) => ({
        label,
        value,
        couleur: MARGE_HEX[code],
      }));
  }, [indicateurs]);

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
      <PageHeader
        icone={<AssessmentIcon />}
        titre="Rentabilité"
        sousTitre="Contrôle du prix de revient à la clôture et analyse de rentabilité (UC-06, UC-09, RG23-RG24, RG28)."
        centre
        taillePastille={28}
        titreVariant="h6"
      />

      {erreur && <Alert severity="warning" sx={{ mb: 3 }}>{erreur}</Alert>}

      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1.5 }}>
        <BoutonExport
          surPdf={async () => {
            const e = await import("../utils/exportateur");
            await e.exporterPDF({
              fichier: `Rentabilite_${Date.now()}.pdf`,
              titre: "Rapport de rentabilité",
              sousTitre: "Contrôle du prix de revient à la clôture (UC-06, RG23-RG24, RG28)",
              meta: e.metaEdition(controles.length),
              colonnes: [
                e.colonne("Dossier", "dossier_numero"),
                e.colonne("Atelier", "atelier_nom"),
                e.colonnePerso("Composant", (c) =>
                  c.composant_designation ? `C${c.composant_ordre} · ${c.composant_designation}` : "Global"
                ),
                e.colonnePerso("Coût réel", (c) =>
                  `${Number(c.cout_reel_total).toLocaleString("fr-FR")} Ar`, "right"
                ),
                e.colonnePerso("Écart", (c) =>
                  c.ecart_prix_revient != null
                    ? `${Number(c.ecart_prix_revient).toLocaleString("fr-FR")} Ar`
                    : "",
                  "right"
                ),
                e.colonnePerso("Marge %", (c) => `${c.marge_reelle_pourcentage}%`, "right"),
                e.colonnePerso("Résultat", (c) => LIBELLES_RESULTAT_CONTROLE[c.resultat] || c.resultat),
                e.colonnePerso("Écart significatif", (c) => (c.ecart_significatif ? "Significatif" : "")),
                e.colonnePerso("Date", (c) => new Date(c.date_controle).toLocaleDateString("fr-FR")),
              ],
              lignes: controles,
            });
          }}
          surExcel={async () => {
            const e = await import("../utils/exportateur");
            await e.exporterExcel({
              fichier: `Rentabilite_${Date.now()}.xlsx`,
              feuilles: [{
                nom: "Contrôles",
                titre: "Fiches de contrôle du prix de revient",
                meta: e.metaEdition(controles.length),
                colonnes: [
                  e.colonne("Dossier", "dossier_numero"),
                  e.colonne("Atelier", "atelier_nom"),
                  e.colonnePerso("Composant", (c) =>
                    c.composant_designation ? `C${c.composant_ordre} · ${c.composant_designation}` : "Global"
                  ),
                  e.colonnePerso("Coût réel (Ar)", (c) => Number(c.cout_reel_total).toLocaleString("fr-FR"), "right"),
                  e.colonnePerso("Écart (Ar)", (c) =>
                    c.ecart_prix_revient != null
                      ? Number(c.ecart_prix_revient).toLocaleString("fr-FR")
                      : "",
                    "right"
                  ),
                  e.colonnePerso("Marge %", (c) => String(c.marge_reelle_pourcentage), "right"),
                  e.colonnePerso("Résultat", (c) => LIBELLES_RESULTAT_CONTROLE[c.resultat] || c.resultat),
                  e.colonnePerso("Écart significatif", (c) => (c.ecart_significatif ? "Significatif" : "")),
                  e.colonnePerso("Date", (c) => new Date(c.date_controle).toLocaleDateString("fr-FR")),
                ],
                lignes: controles,
              }],
            });
          }}
          libelle="Exporter"
          taille="small"
        />
      </Box>

      {/* Indicateurs — même présentation que le tableau de bord */}
      {estAdmin && indicateurs && (
        <Stack spacing={1.5} sx={{ mb: 3 }}>
          <Grid container spacing={1.5} alignItems="stretch">
            <Grid size={{ xs: 12, sm: 6, md: 4 }} sx={{ display: "flex" }}>
              <Box sx={{ width: "100%" }}>
                <CarteIndicateur
                  titre="Marge moyenne"
                  valeur={`${indicateurs.marge_moyenne_pourcentage ?? 0}%`}
                  sousTitre={`${indicateurs.nombre_controles ?? 0} contrôles`}
                  couleur="#1565c0"
                  icone={<TrendingUpIcon fontSize="small" />}
                />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }} sx={{ display: "flex" }}>
              <Box sx={{ width: "100%" }}>
                <CarteIndicateur
                  titre="Écarts significatifs"
                  valeur={indicateurs.nombre_ecarts_significatifs ?? 0}
                  sousTitre={`sur ${indicateurs.nombre_controles ?? 0} fiches`}
                  couleur={
                    indicateurs.nombre_ecarts_significatifs ? "#d32f2f" : "#2e7d32"
                  }
                  icone={<WarningAmberIcon fontSize="small" />}
                />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }} sx={{ display: "flex" }}>
              <Box sx={{ width: "100%" }}>
                <CarteIndicateur
                  titre="Contrôles réalisés"
                  valeur={indicateurs.nombre_controles ?? 0}
                  sousTitre="fiches analysées"
                  couleur="#6a1b9a"
                  icone={<AssessmentIcon fontSize="small" />}
                />
              </Box>
            </Grid>
          </Grid>

          {rentabiliteSegments.length > 0 && (
            <Grid container spacing={1.5} alignItems="stretch">
              <Grid size={{ xs: 12, md: 6 }} sx={{ display: "flex" }}>
                <Box sx={{ width: "100%" }}>
                  <Panneau titre="Résultats de contrôle" sousTitre="Répartition des marges">
                    <CarteDonutLegende titre="Résultats" segments={rentabiliteSegments} />
                  </Panneau>
                </Box>
              </Grid>
            </Grid>
          )}
        </Stack>
      )}

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.25}
          sx={{
            px: 2,
            py: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "background.default",
            flexShrink: 0,
          }}
        >
          <FactCheckIcon color="primary" fontSize="small" />
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 15 }}>
            Fiches de contrôle
          </Typography>
          <Chip label={`${controles.length} fiche(s)`} size="small" variant="outlined" />
        </Stack>

        <TableContainer ref={refCadre} sx={{ maxHeight: hauteurCadre ?? 320, overflow: "auto" }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <EnTeteTriable cle="dossier_numero" align="center" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                  Dossier
                </EnTeteTriable>
                <EnTeteTriable cle="atelier_nom" align="center" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                  Atelier
                </EnTeteTriable>
                <EnTeteTriable cle="composant_ordre" align="center" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                  Composant
                </EnTeteTriable>
                <EnTeteTriable cle="cout_reel_total" align="center" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                  Coût réel
                </EnTeteTriable>
                <EnTeteTriable cle="marge_reelle_pourcentage" align="center" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                  Marge réelle
                </EnTeteTriable>
                <EnTeteTriable cle="resultat" align="center" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                  Résultat
                </EnTeteTriable>
                <EnTeteTriable cle="ecart_significatif" align="center" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                  Écart
                </EnTeteTriable>
                <EnTeteTriable cle="date_controle" align="center" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                  Date
                </EnTeteTriable>
              </TableRow>
            </TableHead>
            <TableBody>
              {controlesPaginees.map((controle) => (
                <TableRow
                  key={controle.id}
                  hover
                  sx={{ "&:last-child td": { borderBottom: 0 } }}
                >
                  <TableCell align="center" sx={{ fontWeight: 600 }}>
                    {controle.dossier_numero}
                  </TableCell>
                  <TableCell align="center">{controle.atelier_nom}</TableCell>
                  <TableCell align="center">
                    {controle.composant_designation
                      ? `C${controle.composant_ordre} · ${controle.composant_designation}`
                      : "Global"}
                  </TableCell>
                  <TableCell align="center">
                    {Number(controle.cout_reel_total).toLocaleString("fr-FR")} Ar
                    {controle.prix_revient_estime != null && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        Estimé : {Number(controle.prix_revient_estime).toLocaleString("fr-FR")} Ar
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>
                    {controle.marge_reelle_pourcentage}%
                  </TableCell>

                  {/* Résultat : texte coloré */}
                  <TableCell align="center">
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color: COULEUR_TEXTE_RESULTAT[controle.resultat] || "text.primary",
                      }}
                    >
                      {LIBELLES_RESULTAT_CONTROLE[controle.resultat] || controle.resultat}
                    </Typography>
                  </TableCell>

                  {/* Écart : montant normal ; seul « Significatif » en couleur */}
                  <TableCell align="center">
                    {controle.ecart_prix_revient != null && (
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {Number(controle.ecart_prix_revient).toLocaleString("fr-FR")} Ar
                      </Typography>
                    )}
                    {controle.ecart_significatif && (
                      <Typography
                        variant="caption"
                        sx={{
                          display: "block",
                          fontWeight: 700,
                          color: "warning.main",
                          mt: 0.25,
                        }}
                      >
                        Significatif
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell align="center">
                    {new Date(controle.date_controle).toLocaleDateString("fr-FR")}
                  </TableCell>
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