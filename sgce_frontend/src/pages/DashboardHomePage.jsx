import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, Grid,
  IconButton, Paper, Stack, Tab, Tabs, Tooltip as TooltipMui, Typography
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AssessmentIcon from "@mui/icons-material/Assessment";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import RefreshIcon from "@mui/icons-material/Refresh";
import { alpha } from "@mui/material/styles";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  listerCommandes, listerDossiers, listerArticles, listerAteliers
} from "../api/commandesApi";
import { recupererTableauBordRentabilite } from "../api/controleApi";
import { listerComposantsAReviser } from "../api/catalogueApi";
import {
  COULEURS_STATUT_COMMANDE,
  LIBELLES_STATUT_COMMANDE,
  LIBELLES_STATUT_PRODUCTION
} from "../constants/roles";
import BoutonExport from "../components/common/BoutonExport";
import {
  CarteDonutLegende,
  CarteComparaisonBarres,
  CarteProgressionListe,
  CarteTendance,
  CarteEscalier
} from "../components/common/CartesTableauBord";
const HEX = {
  default: "#9e9e9e", info: "#0288d1", primary: "#1565c0",
  warning: "#ed6c02", success: "#2e7d32", error: "#d32f2f"
};
const PROD = { CREE: "#9e9e9e", EN_COURS: "#ed6c02", TERMINE: "#2e7d32" };
const MARGE = { SOUS_MARGE: "#d32f2f", DANS_LA_NORME: "#2e7d32", SUR_MARGE: "#ed6c02" };
const MOIS = ["janv.","fevr.","mars","avr.","mai","juin","juil.","aout","sept.","oct.","nov.","dec."];
const normaliser = d => Array.isArray(d) ? d : d?.results || [];
function CarteIndicateur({ titre, valeur, sousTitre, couleur, icone, onClick }) {
  return (
    <Card onClick={onClick} sx={{
      height: "100%", minHeight: 180, cursor: onClick ? "pointer" : "default",
      border: "1px solid", borderColor: "divider", borderRadius: 2.5,
      bgcolor: "background.paper", boxShadow: "0 2px 10px rgba(15,35,60,.06)",
      transition: ".15s",
      "&:hover": onClick ? {
        transform: "translateY(-2px)",
        boxShadow: "0 8px 24px rgba(15,35,60,.12)"
      } : {}
    }}>
      <CardContent sx={{ p: 2.2, height: "100%", "&:last-child": { pb: 2.2 } }}>
        <Stack height="100%" alignItems="center" justifyContent="center" spacing={.8} textAlign="center">
          <Box sx={{
            width: 46, height: 46, borderRadius: 2.5,
            display: "grid", placeItems: "center",
            bgcolor: alpha(couleur, .1), color: couleur
          }}>{icone}</Box>
          <Typography variant="caption" color="text.secondary" sx={{
            fontWeight: 700, textTransform: "uppercase", letterSpacing: .55
          }}>{titre}</Typography>
          <Typography sx={{ fontSize: 34, lineHeight: 1.05, fontWeight: 900, color: couleur }}>
            {valeur}
          </Typography>
          <Typography variant="caption" color="text.secondary">{sousTitre}</Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
function Panneau({ titre, sousTitre, children, action }) {
  return (
    <Card sx={{
      height: "100%", minHeight: 220,
      border: "1px solid", borderColor: "divider", borderRadius: 3,
      bgcolor: "background.paper", boxShadow: "0 3px 14px rgba(15,35,60,.07)"
    }}>
      <Box sx={{ px: 2, py: 1.4, bgcolor: "action.hover", borderBottom: "1px solid", borderColor: "divider" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{titre}</Typography>
            {sousTitre && <Typography variant="caption" color="text.secondary" noWrap>{sousTitre}</Typography>}
          </Box>
          {action}
        </Stack>
      </Box>
      <Box sx={{ p: 1.8, minHeight: 150, overflow: "visible", bgcolor: "background.paper" }}>{children}</Box>
    </Card>
  );
}
function MiniStatut({ label, value, couleur }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ py: .65 }}>
      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: couleur }} />
      <Typography variant="body2" sx={{ flex: 1 }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 800 }}>{value}</Typography>
    </Stack>
  );
}
function Col({ size, minHeight, children }) {
  return <Grid size={size} sx={{ minHeight }}>{children}</Grid>;
}
export default function DashboardHomePage() {
  const { utilisateur } = useSelector(s => s.auth);
  const mode = useSelector(s => s.theme.mode);
  const role = utilisateur?.role;
  const navigate = useNavigate();
  const [chargement, setChargement] = useState(true);
  const [actualisation, setActualisation] = useState(false);
  const [erreur, setErreur] = useState("");
  const [commandes, setCommandes] = useState([]);
  const [dossiers, setDossiers] = useState([]);
  const [articles, setArticles] = useState([]);
  const [ateliers, setAteliers] = useState([]);
  const [rentabilite, setRentabilite] = useState(null);
  const [composantsAReviser, setComposantsAReviser] = useState([]);
  const [derniereMiseAJour, setDerniereMiseAJour] = useState(null);
  const [onglet, setOnglet] = useState("synthese");
  // Aligné sur le tableau des acteurs (Chapitre 5) :
  // Agent SDO : commandes + consultation production/rentabilité
  // Chef atelier : production de son atelier
  // Magasinier : stock
  // Admin : tout
  const peutCommandes = role === "ADMIN" || role === "AGENT_SDO";
  const peutProduction = role === "ADMIN" || role === "CHEF_ATELIER" || role === "AGENT_SDO";
  const peutStock = role === "ADMIN" || role === "MAGASINIER";
  const peutRentabilite = role === "ADMIN" || role === "AGENT_SDO";
  const peutTableauBordAdmin = role === "ADMIN";
  const charger = useCallback(async (refresh = false) => {
    if (!role) return;
    refresh ? setActualisation(true) : setChargement(true);
    setErreur("");
    try {
      const taches = [];
      if (peutCommandes)
        taches.push(listerCommandes().then(d => setCommandes(normaliser(d))));
      if (peutProduction) {
        taches.push(listerDossiers().then(d => setDossiers(normaliser(d))));
        taches.push(listerAteliers().then(d => setAteliers(normaliser(d))));
      }
      if (peutStock)
        taches.push(listerArticles().then(d => setArticles(normaliser(d))));
      // Tableau de bord agrégé + composants à réviser : Admin uniquement (API IsAdmin).
      // Agent SDO consulte la rentabilité via la page /rentabilite (liste des contrôles).
      if (peutTableauBordAdmin) {
        taches.push(recupererTableauBordRentabilite().then(setRentabilite));
        taches.push(listerComposantsAReviser().then(setComposantsAReviser));
      }
      await Promise.all(taches);
      setDerniereMiseAJour(new Date());
    } catch {
      setErreur("Impossible de charger les données du tableau de bord.");
    } finally {
      setChargement(false);
      setActualisation(false);
    }
  }, [role, peutCommandes, peutProduction, peutStock, peutTableauBordAdmin]);
  useEffect(() => { charger(); }, [charger]);
  const commandesParStatut = useMemo(() =>
    Object.entries(LIBELLES_STATUT_COMMANDE).map(([code, statut]) => ({
      code, statut, nombre: commandes.filter(c => c.statut === code).length
    })), [commandes]);
  const statutCommandeSegments = useMemo(() =>
    commandesParStatut.filter(x => x.nombre > 0).map(x => ({
      label: x.statut,
      value: x.nombre,
      couleur: HEX[COULEURS_STATUT_COMMANDE[x.code]] || HEX.primary
    })), [commandesParStatut]);
  const tendanceCommandes = useMemo(() => {
    const map = new Map();
    commandes.forEach(c => {
      if (!c.date_commande) return;
      const d = new Date(c.date_commande);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      map.set(key, (map.get(key) || 0) + 1);
    });
    const now = new Date();
    return Array.from({ length: 6 }, (_, n) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + n, 1);
      return {
        periode: MOIS[d.getMonth()],
        nombre: map.get(`${d.getFullYear()}-${d.getMonth()}`) || 0
      };
    });
  }, [commandes]);
  const articlesEnAlerte = articles.filter(a =>
    a.est_en_alerte ?? (Number(a.quantite_stock) <= Number(a.seuil_securite))
  );
  const articlesProgression = useMemo(() =>
    articles
      .filter(a => Number(a.seuil_securite) > 0)
      .map(a => {
        const ratio = Math.round(Number(a.quantite_stock) / Number(a.seuil_securite) * 100);
        return {
          label: a.designation,
          pourcentage: Math.min(150, ratio),
          couleur: ratio <= 100 ? HEX.error : ratio <= 150 ? HEX.warning : HEX.success
        };
      })
      .sort((a, b) => a.pourcentage - b.pourcentage)
      .slice(0, 5), [articles]);
  const dossiersEnCours = dossiers.filter(d => d.statut_production === "EN_COURS");
  const devisEnCours = commandes.filter(c => c.statut === "DEVIS").length;
  const commandesValidees = commandes.filter(c => c.statut === "VALIDEE").length;
  const statutProductionSegments = useMemo(() =>
    Object.entries(LIBELLES_STATUT_PRODUCTION)
      .map(([code, label]) => ({
        label,
        value: dossiers.filter(d => d.statut_production === code).length,
        couleur: PROD[code]
      }))
      .filter(x => x.value > 0), [dossiers]);
  const chargeParAtelier = useMemo(() => {
    const map = {};
    ateliers.forEach(a => {
      map[a.nom] = {
        atelier: a.nom, enCours: 0, total: 0,
        chefAtelierNom: a.chef_atelier_nom, capacite: a.capacite
      };
    });
    dossiers.forEach(d => {
      const nom = d.atelier_nom || "Non affecté";
      map[nom] ||= { atelier: nom, enCours: 0, total: 0 };
      map[nom].total++;
      if (d.statut_production === "EN_COURS") map[nom].enCours++;
    });
    return Object.values(map);
  }, [dossiers, ateliers]);
  const ateliersComparaison = useMemo(() =>
    chargeParAtelier.map(a => ({
      label: a.atelier,
      valeurs: [
        {
          label: "Charge",
          pourcentage: a.total ? Math.round(a.enCours / a.total * 100) : 0,
          couleur: "#1565c0"
        },
        ...(a.capacite ? [{
          label: "Capacité",
          pourcentage: Math.min(150, Math.round(a.total / a.capacite * 100)),
          couleur: "#6a1b9a"
        }] : [])
      ]
    })), [chargeParAtelier]);
  const rentabiliteSegments = useMemo(() =>
    rentabilite ? [
      ["SOUS_MARGE", "Sous-marge", rentabilite.nombre_sous_marge],
      ["DANS_LA_NORME", "Dans la norme", rentabilite.nombre_dans_la_norme],
      ["SUR_MARGE", "Sur-marge", rentabilite.nombre_sur_marge]
    ].filter(x => x[2] > 0).map(([code, label, value]) => ({
      label, value, couleur: MARGE[code]
    })) : [], [rentabilite]);
  const composantsEscalier = useMemo(() =>
    [...composantsAReviser]
      .sort((a, b) => a.nombre_ecarts_significatifs - b.nombre_ecarts_significatifs)
      .map(c => ({
        label: c.composant,
        valeur: c.nombre_ecarts_significatifs,
        couleur: HEX.warning
      })), [composantsAReviser]);
  const palette = {
    primary: HEX.primary, info: HEX.info, success: HEX.success,
    warning: HEX.warning, error: HEX.error, violet: "#6a1b9a"
  };
  const indicateur = (titre, valeur, sousTitre, couleur, icone, onClick) => (
    <CarteIndicateur {...{ titre, valeur, sousTitre, couleur, icone, onClick }} />
  );
  const panneau = (titre, sousTitre, contenu) => (
    <Panneau {...{ titre, sousTitre }}>{contenu}</Panneau>
  );
  const ongletsDisponibles = [
    ["synthese", "Synthèse", <DashboardIcon fontSize="small" />, true],
    ["commandes", "Commandes", <AssignmentIcon fontSize="small" />, peutCommandes],
    ["production", "Production", <PrecisionManufacturingIcon fontSize="small" />, peutProduction],
    ["stock", "Stock", <Inventory2Icon fontSize="small" />, peutStock],
    ["rentabilite", "Rentabilité", <AssessmentIcon fontSize="small" />, peutRentabilite]
  ].filter(x => x[3]);
  useEffect(() => {
    if (!ongletsDisponibles.some(x => x[0] === onglet))
      setOnglet(ongletsDisponibles[0]?.[0] || "synthese");
  }, [role]);
  const action = (label, path, variant = "outlined") => (
    <Button
      fullWidth
      variant={variant}
      endIcon={<ArrowForwardIcon />}
      onClick={() => navigate(path)}
      sx={{ justifyContent: "space-between", borderRadius: 2, py: 1.2 }}
    >
      {label}
    </Button>
  );
  const resumeContenu = (
    <Stack spacing={1.5}>
      <Grid container spacing={1.5} alignItems="stretch">
        {peutCommandes && <Col size={{ xs: 12, sm: 6, lg: 3 }} minHeight={160}>
          {indicateur("Commandes", commandes.length, `${devisEnCours} devis en cours`,
            palette.primary, <AssignmentIcon fontSize="small" />, () => setOnglet("commandes"))}
        </Col>}
        {peutProduction && <Col size={{ xs: 12, sm: 6, lg: 3 }} minHeight={160}>
          {indicateur("Production", dossiersEnCours.length, `${dossiers.length} dossiers`,
            palette.warning, <PrecisionManufacturingIcon fontSize="small" />, () => setOnglet("production"))}
        </Col>}
        {peutStock && <Col size={{ xs: 12, sm: 6, lg: 3 }} minHeight={160}>
          {indicateur("Stock critique", articlesEnAlerte.length, `${articles.length} articles`,
            articlesEnAlerte.length ? palette.error : palette.success,
            <WarningAmberIcon fontSize="small" />, () => setOnglet("stock"))}
        </Col>}
        {peutRentabilite && rentabilite && <Col size={{ xs: 12, sm: 6, lg: 3 }} minHeight={160}>
          {indicateur("Marge moyenne", `${rentabilite.marge_moyenne_pourcentage}%`,
            `${rentabilite.nombre_controles} contrôles`, palette.primary,
            <TrendingUpIcon fontSize="small" />, () => setOnglet("rentabilite"))}
        </Col>}
      </Grid>
      <Grid container spacing={1.5} alignItems="stretch">
        {peutCommandes && <Col size={{ xs: 12, lg: 4 }} minHeight={360}>
          {panneau("Répartition", "Statut des commandes",
            <CarteDonutLegende titre="Commandes par statut" segments={statutCommandeSegments} />)}
        </Col>}
        {peutCommandes && <Col size={{ xs: 12, lg: 4 }} minHeight={360}>
          {panneau("Activité commerciale", "Commandes créées sur les 6 derniers mois",
            <Box sx={{ width: "100%", minHeight: 270 }}>
              <CarteTendance titre="" data={tendanceCommandes} mode={mode} />
            </Box>)}
        </Col>}
        {!peutCommandes && peutProduction && <Col size={{ xs: 12, lg: 4 }} minHeight={360}>
          {panneau("État de la production", "Répartition des dossiers",
            <CarteDonutLegende titre="Dossiers par statut" segments={statutProductionSegments} />)}
        </Col>}
        <Col size={{ xs: 12, lg: 4 }} minHeight={360}>
          {panneau("Accès rapides", "Navigation opérationnelle",
            <Stack spacing={1}>
              {peutCommandes && action("Gérer les commandes", "/commandes", "contained")}
              {peutProduction && action("Suivre la production", "/dossiers")}
              {peutStock && action("Contrôler le stock", "/stock")}
              {peutRentabilite && action("Analyser la rentabilité", "/rentabilite")}
              <Paper variant="outlined" sx={{ mt: 1, p: 1.5, borderRadius: 2.5, bgcolor: "action.hover" }}>
                <Typography variant="caption" color="text.secondary">État du système</Typography>
                <Stack spacing={.25} sx={{ mt: .7 }}>
                  <MiniStatut label="Commandes" value={peutCommandes ? "Disponible" : "—"} couleur={palette.success} />
                  <MiniStatut label="Production" value={peutProduction ? "Disponible" : "—"} couleur={palette.success} />
                  <MiniStatut
                    label="Stock"
                    value={peutStock ? articlesEnAlerte.length ? `${articlesEnAlerte.length} alerte(s)` : "Normal" : "—"}
                    couleur={peutStock && articlesEnAlerte.length ? palette.error : palette.success}
                  />
                  <MiniStatut label="Rentabilité" value={peutRentabilite ? "Disponible" : "—"} couleur={palette.success} />
                </Stack>
              </Paper>
            </Stack>)}
        </Col>
      </Grid>
    </Stack>
  );
  const commandesVue = (
    <Stack spacing={1.5}>
      <Grid container spacing={1.5} alignItems="stretch">
        <Col size={{ xs: 12, sm: 6, md: 4 }} minHeight={200}>
          {indicateur("Commandes", commandes.length, "commandes enregistrées",
            palette.primary, <AssignmentIcon fontSize="small" />)}
        </Col>
        <Col size={{ xs: 12, sm: 6, md: 4 }} minHeight={200}>
          {indicateur("Devis en cours", devisEnCours, `sur ${commandes.length} commandes`,
            palette.warning, <AssignmentIcon fontSize="small" />)}
        </Col>
        <Col size={{ xs: 12, md: 4 }} minHeight={200}>
          {indicateur("Commandes validées", commandesValidees, `sur ${commandes.length} commandes`,
            palette.success, <AssessmentIcon fontSize="small" />)}
        </Col>
      </Grid>
      <Grid container spacing={1.5} alignItems="stretch">
        <Col size={{ xs: 12, md: 4 }} minHeight={330}>
          {panneau("Commandes par statut", "Répartition actuelle",
            <CarteDonutLegende titre="Statuts" segments={statutCommandeSegments} />)}
        </Col>
        <Col size={{ xs: 12, md: 8 }} minHeight={330}>
          {panneau("Tendance des commandes", "Évolution sur les 6 derniers mois",
            <CarteTendance titre="" data={tendanceCommandes} mode={mode} />)}
        </Col>
      </Grid>
    </Stack>
  );
  const productionVue = (
    <Stack spacing={1.5}>
      <Grid container spacing={1.5} alignItems="stretch">
        <Col size={{ xs: 12, sm: 6, md: 4 }} minHeight={200}>
          {indicateur("En production", dossiersEnCours.length, `sur ${dossiers.length} dossiers`,
            palette.warning, <PrecisionManufacturingIcon fontSize="small" />)}
        </Col>
        <Col size={{ xs: 12, sm: 6, md: 4 }} minHeight={200}>
          {indicateur("Dossiers totaux", dossiers.length, "dossiers enregistrés",
            palette.primary, <AssignmentIcon fontSize="small" />)}
        </Col>
        <Col size={{ xs: 12, sm: 12, md: 4 }} minHeight={200}>
          {indicateur("Ateliers", ateliers.length, "ateliers suivis",
            palette.violet, <PrecisionManufacturingIcon fontSize="small" />)}
        </Col>
      </Grid>
      <Grid container spacing={1.5} alignItems="stretch">
        <Col size={{ xs: 12, md: 4 }} minHeight={330}>
          {panneau("Statuts", "Dossiers de fabrication",
            <CarteDonutLegende titre="Dossiers par statut" segments={statutProductionSegments} />)}
        </Col>
        <Col size={{ xs: 12, md: 8 }} minHeight={350}>
          {panneau("Charge par atelier", "En cours vs capacité",
            <CarteComparaisonBarres titre="Charge par atelier" groupes={ateliersComparaison} />)}
        </Col>
        <Col size={{ xs: 12 }} minHeight={200}>
          {panneau("Pilotage", "Accès direct",
            <Stack spacing={1.2} alignItems="center" textAlign="center">
              <Typography variant="body2" color="text.secondary">
                Suivez les dossiers affectés à votre atelier et faites évoluer chaque étape.
              </Typography>
              <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={() => navigate("/dossiers")}>
                Ouvrir la production
              </Button>
            </Stack>)}
        </Col>
      </Grid>
    </Stack>
  );
  const stockVue = (
    <Stack spacing={1.5}>
      <Grid container spacing={1.5} alignItems="stretch">
        <Col size={{ xs: 12, sm: 6, md: 4 }} minHeight={200}>
          {indicateur("Articles en alerte", articlesEnAlerte.length, `sur ${articles.length} articles`,
            articlesEnAlerte.length ? palette.error : palette.success,
            <WarningAmberIcon fontSize="small" />)}
        </Col>
        <Col size={{ xs: 12, sm: 6, md: 4 }} minHeight={200}>
          {indicateur("Articles suivis", articles.length, "articles en stock",
            palette.primary, <Inventory2Icon fontSize="small" />)}
        </Col>
        <Col size={{ xs: 12, sm: 12, md: 4 }} minHeight={200}>
          {indicateur("Au-dessus du seuil", Math.max(0, articles.length - articlesEnAlerte.length),
            "niveau de stock normal", palette.success, <AssessmentIcon fontSize="small" />)}
        </Col>
      </Grid>
      <Grid container spacing={1.5} alignItems="stretch">
        <Col size={{ xs: 12, md: 8 }} minHeight={330}>
          {panneau("Niveaux de stock", "Articles les plus critiques",
            <CarteProgressionListe titre="" lignes={articlesProgression} />)}
        </Col>
        <Col size={{ xs: 12, md: 4 }} minHeight={330}>
          {panneau("Alerte opérationnelle", "Décision rapide",
            <Stack spacing={1.2} alignItems="center" textAlign="center">
              <Typography variant="body2">
                {articlesEnAlerte.length
                  ? `${articlesEnAlerte.length} article(s) nécessitent une vérification ou un réapprovisionnement.`
                  : "Aucune alerte de stock actuellement."}
              </Typography>
              <Button
                variant={articlesEnAlerte.length ? "contained" : "outlined"}
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate("/stock")}
              >
                Ouvrir le stock
              </Button>
            </Stack>)}
        </Col>
      </Grid>
    </Stack>
  );
  const rentabiliteVue = (
    <Stack spacing={1.5}>
      <Grid container spacing={1.5} alignItems="stretch">
        <Col size={{ xs: 12, sm: 6, md: 4 }} minHeight={200}>
          {indicateur("Marge moyenne",
            `${rentabilite?.marge_moyenne_pourcentage ?? 0}%`,
            `${rentabilite?.nombre_controles ?? 0} contrôles`,
            palette.primary, <TrendingUpIcon fontSize="small" />)}
        </Col>
        <Col size={{ xs: 12, sm: 6, md: 4 }} minHeight={200}>
          {indicateur("Écarts significatifs",
            rentabilite?.nombre_ecarts_significatifs ?? 0,
            `sur ${rentabilite?.nombre_controles ?? 0} fiches`,
            rentabilite?.nombre_ecarts_significatifs ? palette.error : palette.success,
            <WarningAmberIcon fontSize="small" />)}
        </Col>
        <Col size={{ xs: 12, md: 4 }} minHeight={200}>
          {indicateur("Contrôles réalisés", rentabilite?.nombre_controles ?? 0,
            "fiches analysées", palette.violet, <AssessmentIcon fontSize="small" />)}
        </Col>
      </Grid>
      <Grid container spacing={1.5} alignItems="stretch">
        <Col size={{ xs: 12, md: 4 }} minHeight={330}>
          {panneau("Résultats de contrôle", "Répartition des marges",
            <CarteDonutLegende titre="Résultats" segments={rentabiliteSegments} />)}
        </Col>
        <Col size={{ xs: 12, md: 8 }} minHeight={330}>
          {panneau("Composants à réviser", "RG37 · écarts significatifs cumulés",
            <CarteEscalier titre="" sousTitre="" data={composantsEscalier} />)}
        </Col>
        <Col size={{ xs: 12 }} minHeight={230}>
          {panneau("Pilotage rentabilité", "Actions",
            <Stack spacing={1.2} alignItems="center" textAlign="center">
              <Typography variant="body2" color="text.secondary">
                Consultez les contrôles et révisez les valeurs standards du catalogue lorsque les écarts sont récurrents.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
                <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={() => navigate("/rentabilite")}>
                  Ouvrir la rentabilité
                </Button>
                <Button variant="outlined" onClick={() => navigate("/catalogue")}>
                  Réviser le catalogue
                </Button>
              </Stack>
            </Stack>)}
        </Col>
      </Grid>
    </Stack>
  );
  const vues = {
    synthese: resumeContenu,
    commandes: commandesVue,
    production: productionVue,
    stock: stockVue,
    rentabilite: rentabiliteVue
  };
  if (chargement) {
    return (
      <Box sx={{ minHeight: "calc(100vh - 112px)", display: "grid", placeItems: "center", py: 4 }}>
        <Stack alignItems="center" spacing={1.5}>
          <CircularProgress size={34} />
          <Typography variant="body2" color="text.secondary">
            Chargement du tableau de bord…
          </Typography>
        </Stack>
      </Box>
    );
  }
  return (
    <Box sx={{
      width: "100%",
      minHeight: "calc(100vh - 112px)",
      height: "auto",
      overflow: "visible",
      pb: 3
    }}>
      <Card sx={{
        borderRadius: 3, border: "1px solid", borderColor: "divider",
        boxShadow: "0 5px 22px rgba(15,35,60,.08)", mb: 1.5
      }}>
        <CardContent sx={{ p: "12px 16px !important" }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            alignItems={{ xs: "stretch", md: "center" }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1.2} alignItems="center">
              <Box sx={{
                width: 42, height: 42, borderRadius: 2.5,
                display: "grid", placeItems: "center",
                bgcolor: alpha(palette.primary, .1), color: palette.primary
              }}>
                <DashboardIcon />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.15 }}>
                  Tableau de bord
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Pilotage SGCFC-INM · espace {utilisateur?.role || "utilisateur"}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={.8} alignItems="center" justifyContent="flex-end">
              {derniereMiseAJour && (
                <Typography variant="caption" color="text.disabled">
                  Mis à jour à {derniereMiseAJour.toLocaleTimeString("fr-FR", {
                    hour: "2-digit", minute: "2-digit"
                  })}
                </Typography>
              )}
              <TooltipMui title="Actualiser les données">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => charger(true)}
                    disabled={actualisation}
                  >
                    {actualisation
                      ? <CircularProgress size={17} />
                      : <RefreshIcon fontSize="small" />}
                  </IconButton>
                </span>
              </TooltipMui>
              <BoutonExport
                libelle="Exporter"
                compact
                surPdf={async () => {
                  const e = await import("../utils/exportateur");
                  const meta = [
                    { libelle: "Rôle", valeur: utilisateur?.role || "—" },
                    { libelle: "Commandes", valeur: String(commandes.length) },
                    { libelle: "Dossiers", valeur: String(dossiers.length) },
                    { libelle: "Articles en alerte", valeur: String(articlesEnAlerte.length) }
                  ];
                  if (rentabilite)
                    meta.push({
                      libelle: "Marge moyenne",
                      valeur: `${rentabilite.marge_moyenne_pourcentage}%`
                    });
                  await e.exporterPDF({
                    fichier: `Tableau_de_bord_${Date.now()}.pdf`,
                    titre: "Tableau de bord SGCFC-INM",
                    sousTitre: "Rapport de pilotage",
                    meta,
                    colonnes: [],
                    lignes: []
                  });
                }}
              />
            </Stack>
          </Stack>
          {erreur && (
            <Alert severity="warning" sx={{ mt: 1.2, py: 0 }}>
              {erreur}
            </Alert>
          )}
          <Tabs
            value={onglet}
            onChange={(_, v) => setOnglet(v)}
            variant="scrollable"
            allowScrollButtonsMobile
            sx={{
              mt: .8,
              minHeight: 38,
              "& .MuiTab-root": {
                minHeight: 38, py: .5,
                textTransform: "none",
                fontWeight: 700,
                fontSize: 12.5
              }
            }}
          >
            {ongletsDisponibles.map(([id, label, icon]) => (
              <Tab key={id} value={id} icon={icon} iconPosition="start" label={label} />
            ))}
          </Tabs>
        </CardContent>
      </Card>
      <Box sx={{ width: "100%", height: "auto", minHeight: 0, overflow: "visible" }}>
        {vues[onglet]}
      </Box>
    </Box>
  );
}
