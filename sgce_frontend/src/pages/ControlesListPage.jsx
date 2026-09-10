import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, Box, Card, CardContent, Chip, CircularProgress, Grid,
  Paper, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography,
} from "@mui/material";
import AssessmentIcon from "@mui/icons-material/Assessment";
import FactCheckIcon from "@mui/icons-material/FactCheck";

import { listerControles, recupererTableauBordRentabilite } from "../api/controleApi";
import { COULEURS_RESULTAT_CONTROLE, LIBELLES_RESULTAT_CONTROLE } from "../constants/roles";
import PageHeader from "../components/common/PageHeader";
import EnTeteTriable, { STYLE_EN_TETE } from "../components/common/EnTeteTriable";
import PaginationBar from "../components/common/PaginationBar";
import BoutonExport from "../components/common/BoutonExport";
import { useTriTableau } from "../utils/tri";
import { useHauteurCinqLignes } from "../utils/tableau";
import { CarteAnneau, CarteDonutLegende } from "../components/common/CartesTableauBord";

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
        sousTitre="Contrôle du prix de revient à la clôture et analyse de rentabilité (UC-06, UC-09, RG23-RG24, RG28)."
        centre
        taillePastille={28}
        titreVariant="h6"
      />

      {erreur && <Alert severity="warning" sx={{ mb: 3 }}>{erreur}</Alert>}

      {/* Bouton d'export */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
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
                e.colonnePerso("Composant", (c) => c.composant_designation ? `C${c.composant_ordre} · ${c.composant_designation}` : "Global"),
                e.colonnePerso("Prix de revient estimé", (c) => c.prix_revient_estime != null ? `${Number(c.prix_revient_estime).toLocaleString("fr-FR")} Ar` : "", "right"),
                e.colonnePerso("Coût réel", (c) => `${Number(c.cout_reel_total).toLocaleString("fr-FR")} Ar`, "right"),
                e.colonnePerso("Écart", (c) => c.ecart_prix_revient != null ? `${Number(c.ecart_prix_revient).toLocaleString("fr-FR")} Ar` : "", "right"),
                e.colonnePerso("Marge", (c) => `${c.marge_reelle_pourcentage}%`, "right"),
                e.colonne("Résultat", "resultat"),
              ],
              lignes: controles,
            });
          }}
          surExcel={async () => {
            const e = await import("../utils/exportateur");
            await e.exporterExcel({
              fichier: `Rentabilite_${Date.now()}.xlsx`,
              feuilles: [{
                nom: "Contrôles", titre: "Rapport de rentabilité",
                meta: e.metaEdition(controles.length),
                colonnes: [
                  e.colonne("Dossier", "dossier_numero"),
                  e.colonne("Atelier", "atelier_nom"),
                  e.colonnePerso("Composant", (c) => c.composant_designation ? `C${c.composant_ordre} · ${c.composant_designation}` : "Global"),
                  e.colonnePerso("Prix de revient estimé", (c) => c.prix_revient_estime != null ? Number(c.prix_revient_estime).toLocaleString("fr-FR") : "", "right"),
                  e.colonnePerso("Coût réel", (c) => Number(c.cout_reel_total).toLocaleString("fr-FR"), "right"),
                  e.colonnePerso("Écart (Ar)", (c) => c.ecart_prix_revient != null ? Number(c.ecart_prix_revient).toLocaleString("fr-FR") : "", "right"),
                  e.colonnePerso("Marge", (c) => `${c.marge_reelle_pourcentage}%`, "right"),
                  e.colonne("Résultat", "resultat"),
                  e.colonnePerso("Écart significatif", (c) => c.ecart_significatif ? "Significatif" : ""),
                  e.colonnePerso("Date", (c) => new Date(c.date_controle).toLocaleDateString("fr-FR")),
                ],
                lignes: controles,
              }],
            });
          }}
          libelle="Exporter le rapport"
          taille="small"
        />
      </Box>

      {/* Indicateurs (partie non scrollable) — même style de cartes (anneaux,
          donut avec légende) que le tableau de bord, pour une identité
          visuelle cohérente entre les deux écrans qui montrent la
          rentabilité. */}
      {indicateurs && (
        <Grid container spacing={2} sx={{ mb: 3, flexShrink: 0 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <CarteDonutLegende
              titre="Résultats de contrôle"
              segments={[
                { label: "Sous-marge", value: indicateurs.nombre_sous_marge, couleur: "#d32f2f" },
                { label: "Dans la norme", value: indicateurs.nombre_dans_la_norme, couleur: "#2e7d32" },
                { label: "Sur-marge", value: indicateurs.nombre_sur_marge, couleur: "#ed6c02" },
              ].filter((s) => s.value > 0)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <CarteAnneau
              titre="Marge moyenne" libelleValeur={`${indicateurs.marge_moyenne_pourcentage}%`}
              pourcentage={indicateurs.marge_moyenne_pourcentage} couleur="#1565c0"
              sousTitre={`${indicateurs.nombre_controles} fiche(s) de contrôle`}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <CarteAnneau
              titre="Écarts significatifs" libelleValeur={indicateurs.nombre_ecarts_significatifs}
              pourcentage={indicateurs.nombre_controles > 0 ? (indicateurs.nombre_ecarts_significatifs / indicateurs.nombre_controles) * 100 : 0}
              couleur={indicateurs.nombre_ecarts_significatifs > 0 ? "#d32f2f" : "#2e7d32"}
              sousTitre={`sur ${indicateurs.nombre_controles} fiches`}
            />
          </Grid>
        </Grid>
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
                <EnTeteTriable cle="composant_ordre" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Composant</EnTeteTriable>
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
                  <TableCell align="center" sx={{ fontWeight: 600 }}>{controle.marge_reelle_pourcentage}%</TableCell>
                  <TableCell align="center">
                    <Chip size="small" label={LIBELLES_RESULTAT_CONTROLE[controle.resultat] || controle.resultat}
                      color={COULEURS_RESULTAT_CONTROLE[controle.resultat] || "default"} sx={{ fontWeight: 600 }} />
                  </TableCell>
                  <TableCell align="center">
                    {controle.ecart_prix_revient != null && (
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {Number(controle.ecart_prix_revient).toLocaleString("fr-FR")} Ar
                      </Typography>
                    )}
                    {controle.ecart_significatif && (
                      <Chip size="small" label="Significatif" color="warning" variant="outlined" sx={{ fontWeight: 600 }} />
                    )}
                  </TableCell>
                  <TableCell align="center">{new Date(controle.date_controle).toLocaleDateString("fr-FR")}</TableCell>
                </TableRow>
              ))}
              {controles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 5, color: "text.secondary" }}>
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