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

/* -------------------------------------------------------------------------- */
/* Style commun des cadres                                                    */
/* -------------------------------------------------------------------------- */
const CARD_BASE = {
  height: "100%",
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 2,
  bgcolor: "background.paper",
  boxShadow: "0 1px 4px rgba(15,35,60,.06)",
  transition: "box-shadow .15s, transform .15s",
};

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
    <Card
      onClick={onClick}
      sx={{
        ...CARD_BASE,
        minHeight: 150,
        display: "flex",
        flexDirection: "column",
        cursor: onClick ? "pointer" : "default",
        "&:hover": onClick ? {
          transform: "translateY(-2px)",
          boxShadow: "0 4px 12px rgba(15,35,60,.10)"
        } : {}
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
          "&:last-child": { pb: 2 }
        }}
      >
        <Box sx={{
          width: 42,
          height: 42,
          borderRadius: 2,
          display: "grid",
          placeItems: "center",
          bgcolor: alpha(couleur, 0.1),
          color: couleur,
          mb: 0.7
        }}>
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
            textAlign: "center"
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
            my: 0.3
          }}
        >
          {valeur}
        </Typography>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            fontSize: 11.5,
            width: "100%",
            textAlign: "center"
          }}
        >
          {sousTitre}
        </Typography>
      </CardContent>
    </Card>
  );
}

function Panneau({ titre, sousTitre, children, action }) {
  return (
    <Card sx={{ ...CARD_BASE, minHeight: 200, display: "flex", flexDirection: "column" }}>
      <Box sx={{
        px: 1.75, py: 1.15,
        bgcolor: "action.hover",
        borderBottom: "1px solid",
        borderColor: "divider",
        flexShrink: 0
      }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 750, fontSize: 13.5, lineHeight: 1.3 }}>
              {titre}
            </Typography>
            {sousTitre && (
              <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: 11.5 }}>
                {sousTitre}
              </Typography>
            )}
          </Box>
          {action}
        </Stack>
      </Box>

      {/* Contenu centré au milieu du cadre */}
      <Box
        sx={{
          p: 1.5,
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "visible",
          bgcolor: "background.paper"
        }}
      >
        <Box sx={{ width: "100%" }}>
          {children}
        </Box>
      </Box>
    </Card>
  );
}

function MiniStatut({ label, value, couleur }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ py: 0.5 }}>
      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: couleur, flexShrink: 0 }} />
      <Typography variant="body2" sx={{ flex: 1, fontSize: 13 }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 750, fontSize: 13 }}>{value}</Typography>
    </Stack>
  );
}

function Col({ size, minHeight, children }) {
  return (
    <Grid size={size} sx={{ minHeight, display: "flex" }}>
      <Box sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
        {children}
      </Box>
    </Grid>
  );
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
      sx={{ justifyContent: "space-between", borderRadius: 2, py: 1.1 }}
    >
      {label}
    </Button>
  );

  const resumeContenu = (
    <Stack spacing={1.5}>
      <Grid container spacing={1.5} alignItems="stretch">
        {peutCommandes && (
          <Col size={{ xs: 12, sm: 6, lg: 3 }} minHeight={150}>
            {indicateur("Commandes", commandes.length, `${devisEnCours} devis en cours`,
              palette.primary, <AssignmentIcon fontSize="small" />, () => setOnglet("commandes"))}
          </Col>
        )}
        {peutProduction && (
          <Col size={{ xs: 12, sm: 6, lg: 3 }} minHeight={150}>
            {indicateur("Production", dossiersEnCours.length, `${dossiers.length} dossiers`,
              palette.warning, <PrecisionManufacturingIcon fontSize="small" />, () => setOnglet("production"))}
          </Col>
        )}
        {peutStock && (
          <Col size={{ xs: 12, sm: 6, lg: 3 }} minHeight={150}>
            {indicateur("Stock critique", articlesEnAlerte.length, `${articles.length} articles`,
              articlesEnAlerte.length ? palette.error : palette.success,
              <WarningAmberIcon fontSize="small" />, () => setOnglet("stock"))}
          </Col>
        )}
        {peutRentabilite && rentabilite && (
          <Col size={{ xs: 12, sm: 6, lg: 3 }} minHeight={150}>
            {indicateur("Marge moyenne", `${rentabilite.marge_moyenne_pourcentage}%`,
              `${rentabilite.nombre_controles} contrôles`, palette.primary,
              <TrendingUpIcon fontSize="small" />, () => setOnglet("rentabilite"))}
          </Col>
        )}
      </Grid>

      <Grid container spacing={1.5} alignItems="stretch">
        {peutCommandes && (
          <Col size={{ xs: 12, lg: 4 }} minHeight={320}>
            {panneau("Répartition", "Statut des commandes",
              <CarteDonutLegende titre="Commandes par statut" segments={statutCommandeSegments} />)}
          </Col>
        )}
        {peutCommandes && (
          <Col size={{ xs: 12, lg: 4 }} minHeight={320}>
            {panneau("Activité commerciale", "Commandes créées sur les 6 derniers mois",
              <Box sx={{ width: "100%", minHeight: 250 }}>
                <CarteTendance titre="" data={tendanceCommandes} mode={mode} />
              </Box>)}
          </Col>
        )}
        {!peutCommandes && peutProduction && (
          <Col size={{ xs: 12, lg: 4 }} minHeight={320}>
            {panneau("État de la production", "Répartition des dossiers",
              <CarteDonutLegende titre="Dossiers par statut" segments={statutProductionSegments} />)}
          </Col>
        )}
        <Col size={{ xs: 12, lg: 4 }} minHeight={320}>
          {panneau("Accès rapides", "Navigation opérationnelle",
            <Stack spacing={1} sx={{ width: "100%" }}>
              {peutCommandes && action("Gérer les commandes", "/commandes", "contained")}
              {peutProduction && action("Suivre la production", "/dossiers")}
              {peutStock && action("Contrôler le stock", "/stock")}
              {peutRentabilite && action("Analyser la rentabilité", "/rentabilite")}
              <Paper variant="outlined" sx={{ mt: 1, p: 1.5, borderRadius: 2, bgcolor: "action.hover", width: "100%" }}>
                <Typography variant="caption" color="text.secondary">État du système</Typography>
                <Stack spacing={0.25} sx={{ mt: 0.7 }}>
                  <MiniStatut label="Commandes" value={peutCommandes ? "Disponible" : "—"} couleur={palette.success} />
                  <MiniStatut label="Production" value={peutProduction ? "Disponible" : "—"} couleur={palette.success} />
                  <MiniStatut
                    label="Stock"
                    value={peutStock ? (articlesEnAlerte.length ? `${articlesEnAlerte.length} alerte(s)` : "Normal") : "—"}
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
        <Col size={{ xs: 12, sm: 6, md: 4 }} minHeight={150}>
          {indicateur("Commandes", commandes.length, "commandes enregistrées",
            palette.primary, <AssignmentIcon fontSize="small" />)}
        </Col>
        <Col size={{ xs: 12, sm: 6, md: 4 }} minHeight={150}>
          {indicateur("Devis en cours", devisEnCours, `sur ${commandes.length} commandes`,
            palette.warning, <AssignmentIcon fontSize="small" />)}
        </Col>
        <Col size={{ xs: 12, md: 4 }} minHeight={150}>
          {indicateur("Commandes validées", commandesValidees, `sur ${commandes.length} commandes`,
            palette.success, <AssessmentIcon fontSize="small" />)}
        </Col>
      </Grid>
      <Grid container spacing={1.5} alignItems="stretch">
        <Col size={{ xs: 12, md: 4 }} minHeight={320}>
          {panneau("Commandes par statut", "Répartition actuelle",
            <CarteDonutLegende titre="Statuts" segments={statutCommandeSegments} />)}
        </Col>
        <Col size={{ xs: 12, md: 8 }} minHeight={320}>
          {panneau("Tendance des commandes", "Évolution sur les 6 derniers mois",
            <CarteTendance titre="" data={tendanceCommandes} mode={mode} />)}
        </Col>
      </Grid>
    </Stack>
  );

  const productionVue = (
    <Stack spacing={1.5}>
      <Grid container spacing={1.5} alignItems="stretch">
        <Col size={{ xs: 12, sm: 6, md: 4 }} minHeight={150}>
          {indicateur("En production", dossiersEnCours.length, `sur ${dossiers.length} dossiers`,
            palette.warning, <PrecisionManufacturingIcon fontSize="small" />)}
        </Col>
        <Col size={{ xs: 12, sm: 6, md: 4 }} minHeight={150}>
          {indicateur("Dossiers totaux", dossiers.length, "dossiers enregistrés",
            palette.primary, <AssignmentIcon fontSize="small" />)}
        </Col>
        <Col size={{ xs: 12, sm: 12, md: 4 }} minHeight={150}>
          {indicateur("Ateliers", ateliers.length, "ateliers suivis",
            palette.violet, <PrecisionManufacturingIcon fontSize="small" />)}
        </Col>
      </Grid>
      <Grid container spacing={1.5} alignItems="stretch">
        <Col size={{ xs: 12, md: 4 }} minHeight={320}>
          {panneau("Statuts", "Dossiers de fabrication",
            <CarteDonutLegende titre="Dossiers par statut" segments={statutProductionSegments} />)}
        </Col>
        <Col size={{ xs: 12, md: 8 }} minHeight={320}>
          {panneau("Charge par atelier", "En cours vs capacité",
            <CarteComparaisonBarres titre="Charge par atelier" groupes={ateliersComparaison} />)}
        </Col>
        <Col size={{ xs: 12 }} minHeight={180}>
          {panneau("Pilotage", "Accès direct",
            <Stack spacing={1.2} alignItems="center" textAlign="center" sx={{ width: "100%" }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                Suivez les dossiers affectés à votre atelier et faites évoluer chaque étape.
              </Typography>
              <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={() => navigate("/dossiers")} sx={{ borderRadius: 2 }}>
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
        <Col size={{ xs: 12, sm: 6, md: 4 }} minHeight={150}>
          {indicateur("Articles en alerte", articlesEnAlerte.length, `sur ${articles.length} articles`,
            articlesEnAlerte.length ? palette.error : palette.success,
            <WarningAmberIcon fontSize="small" />)}
        </Col>
        <Col size={{ xs: 12, sm: 6, md: 4 }} minHeight={150}>
          {indicateur("Articles suivis", articles.length, "articles en stock",
            palette.primary, <Inventory2Icon fontSize="small" />)}
        </Col>
        <Col size={{ xs: 12, sm: 12, md: 4 }} minHeight={150}>
          {indicateur("Au-dessus du seuil", Math.max(0, articles.length - articlesEnAlerte.length),
            "niveau de stock normal", palette.success, <AssessmentIcon fontSize="small" />)}
        </Col>
      </Grid>
      <Grid container spacing={1.5} alignItems="stretch">
        <Col size={{ xs: 12, md: 8 }} minHeight={320}>
          {panneau("Niveaux de stock", "Articles les plus critiques",
            <CarteProgressionListe titre="" lignes={articlesProgression} />)}
        </Col>
        <Col size={{ xs: 12, md: 4 }} minHeight={320}>
          {panneau("Alerte opérationnelle", "Décision rapide",
            <Stack spacing={1.2} alignItems="center" textAlign="center" sx={{ width: "100%" }}>
              <Typography variant="body2" sx={{ fontSize: 13 }}>
                {articlesEnAlerte.length
                  ? `${articlesEnAlerte.length} article(s) nécessitent une vérification ou un réapprovisionnement.`
                  : "Aucune alerte de stock actuellement."}
              </Typography>
              <Button
                variant={articlesEnAlerte.length ? "contained" : "outlined"}
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate("/stock")}
                sx={{ borderRadius: 2 }}
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
        <Col size={{ xs: 12, sm: 6, md: 4 }} minHeight={150}>
          {indicateur("Marge moyenne",
            `${rentabilite?.marge_moyenne_pourcentage ?? 0}%`,
            `${rentabilite?.nombre_controles ?? 0} contrôles`,
            palette.primary, <TrendingUpIcon fontSize="small" />)}
        </Col>
        <Col size={{ xs: 12, sm: 6, md: 4 }} minHeight={150}>
          {indicateur("Écarts significatifs",
            rentabilite?.nombre_ecarts_significatifs ?? 0,
            `sur ${rentabilite?.nombre_controles ?? 0} fiches`,
            rentabilite?.nombre_ecarts_significatifs ? palette.error : palette.success,
            <WarningAmberIcon fontSize="small" />)}
        </Col>
        <Col size={{ xs: 12, md: 4 }} minHeight={150}>
          {indicateur("Contrôles réalisés", rentabilite?.nombre_controles ?? 0,
            "fiches analysées", palette.violet, <AssessmentIcon fontSize="small" />)}
        </Col>
      </Grid>
      <Grid container spacing={1.5} alignItems="stretch">
        <Col size={{ xs: 12, md: 4 }} minHeight={320}>
          {panneau("Résultats de contrôle", "Répartition des marges",
            <CarteDonutLegende titre="Résultats" segments={rentabiliteSegments} />)}
        </Col>
        <Col size={{ xs: 12, md: 8 }} minHeight={320}>
          {panneau("Composants à réviser", "RG37 · écarts significatifs cumulés",
            <CarteEscalier titre="" sousTitre="" data={composantsEscalier} />)}
        </Col>
        <Col size={{ xs: 12 }} minHeight={180}>
          {panneau("Pilotage rentabilité", "Actions",
            <Stack spacing={1.2} alignItems="center" textAlign="center" sx={{ width: "100%" }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                Consultez les contrôles et révisez les valeurs standards du catalogue lorsque les écarts sont récurrents.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
                <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={() => navigate("/rentabilite")} sx={{ borderRadius: 2 }}>
                  Ouvrir la rentabilité
                </Button>
                <Button variant="outlined" onClick={() => navigate("/catalogue")} sx={{ borderRadius: 2 }}>
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
        ...CARD_BASE,
        borderRadius: 2,
        mb: 1.5,
        boxShadow: "0 1px 6px rgba(15,35,60,.07)"
      }}>
        <CardContent sx={{ p: "12px 16px !important", "&:last-child": { pb: "12px !important" } }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              gap: 2
            }}
          >
            {/* Gauche */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, minWidth: 0 }}>
              <Box sx={{
                width: 42, height: 42, borderRadius: 2,
                display: "grid", placeItems: "center",
                bgcolor: alpha(palette.primary, 0.1), color: palette.primary,
                flexShrink: 0
              }}>
                <DashboardIcon />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.15 }}>
                  Tableau de bord
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  Pilotage SGCFC-INM · espace {utilisateur?.role || "utilisateur"}
                </Typography>
              </Box>
            </Box>

            {/* Droite */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                marginLeft: "auto",
                flexShrink: 0
              }}
            >
              {derniereMiseAJour && (
                <Typography variant="caption" color="text.disabled" sx={{ whiteSpace: "nowrap" }}>
                  Mis à jour à {derniereMiseAJour.toLocaleTimeString("fr-FR", {
                    hour: "2-digit", minute: "2-digit"
                  })}
                </Typography>
              )}
              <TooltipMui title="Actualiser les données">
                <span>
                  <IconButton size="small" onClick={() => charger(true)} disabled={actualisation}>
                    {actualisation ? <CircularProgress size={17} /> : <RefreshIcon fontSize="small" />}
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
            </Box>
          </Box>

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
              mt: 0.8,
              minHeight: 38,
              "& .MuiTab-root": {
                minHeight: 38, py: 0.5,
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