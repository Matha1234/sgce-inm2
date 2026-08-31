import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Card, CardContent, Chip, CircularProgress, Divider, Grid, IconButton, Stack, Tooltip as TooltipMui, Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import BalanceIcon from "@mui/icons-material/Balance";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AssessmentIcon from "@mui/icons-material/Assessment";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useSelector } from "react-redux";

import { listerCommandes, listerDossiers, listerArticles } from "../api/commandesApi";
import { recupererTableauBordRentabilite } from "../api/controleApi";
import { COULEURS_STATUT_COMMANDE, LIBELLES_STATUT_COMMANDE } from "../constants/roles";
import PageHeader, { PastilleIcone } from "../components/common/PageHeader";

// Correspondance entre les noms de couleur MUI utilisés par
// COULEURS_STATUT_COMMANDE (déjà utilisé pour les Chips de statut ailleurs
// dans l'application) et leur code hexadécimal, pour le graphique Recharts
// qui a besoin d'une couleur littérale.
const HEX_PAR_NOM_COULEUR = {
  default: "#9e9e9e",
  info: "#0288d1",
  primary: "#1565c0",
  warning: "#ed6c02",
  success: "#2e7d32",
  error: "#d32f2f",
};

function normaliser(d) {
  return Array.isArray(d) ? d : d.results || [];
}

function CarteChiffre({ titre, valeur, icone, couleur = "primary.main" }) {
  return (
    <Card
      sx={{
        height: "100%",
        boxShadow: 1,
        borderLeft: "3px solid",
        borderLeftColor: couleur,
        transition: "box-shadow 0.15s, transform 0.15s",
        "&:hover": { boxShadow: 3, transform: "translateY(-1px)" },
      }}
    >
      <CardContent sx={{ display: "flex", alignItems: "center", gap: 1.25, py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <PastilleIcone icone={icone} couleur={couleur} taille={34} />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" color="text.secondary" noWrap sx={{ fontSize: 12.5 }}>
            {titre}
          </Typography>
          <Typography variant="h6" sx={{ color: couleur, fontWeight: 700, lineHeight: 1.25 }}>
            {valeur}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

function EnTeteSection({ icone, titre }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 2, justifyContent: "center" }}>
      {icone}
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        {titre}
      </Typography>
    </Stack>
  );
}

export default function DashboardHomePage() {
  const { utilisateur } = useSelector((state) => state.auth);
    const mode = useSelector((state) => state.theme.mode);
  const role = utilisateur?.role;

  const [chargement, setChargement] = useState(true);
  const [actualisation, setActualisation] = useState(false);
  const [erreur, setErreur] = useState("");
  const [commandes, setCommandes] = useState([]);
  const [dossiers, setDossiers] = useState([]);
  const [articles, setArticles] = useState([]);
  const [rentabilite, setRentabilite] = useState(null);
  const [derniereMiseAJour, setDerniereMiseAJour] = useState(null);

  const charger = useCallback(
    async (estActualisation = false) => {
      if (!role) return;
      if (estActualisation) setActualisation(true);
      else setChargement(true);
      setErreur("");
      try {
        const taches = [];
        if (role === "ADMIN" || role === "AGENT_SDO") {
          taches.push(listerCommandes().then((d) => setCommandes(normaliser(d))));
        }
        if (role === "ADMIN" || role === "CHEF_ATELIER") {
          taches.push(listerDossiers().then((d) => setDossiers(normaliser(d))));
        }
        if (role === "ADMIN" || role === "MAGASINIER") {
          taches.push(listerArticles().then((d) => setArticles(normaliser(d))));
        }
        if (role === "ADMIN") {
          taches.push(recupererTableauBordRentabilite().then(setRentabilite));
        }
        await Promise.all(taches);
        setDerniereMiseAJour(new Date());
      } catch {
        setErreur("Impossible de charger les données du tableau de bord.");
      } finally {
        setChargement(false);
        setActualisation(false);
      }
    },
    [role]
  );

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const donneesGraphique = useMemo(
    () =>
      Object.entries(LIBELLES_STATUT_COMMANDE).map(([code, libelle]) => ({
        code,
        statut: libelle,
        nombre: commandes.filter((c) => c.statut === code).length,
      })),
    [commandes]
  );

  const articlesEnAlerte = articles.filter(
    (a) => Number(a.quantite_stock) <= Number(a.seuil_securite)
  );

  const dossiersEnCours = dossiers.filter((d) => d.statut_production === "EN_COURS");
  const devisEnCours = commandes.filter((c) => c.statut === "DEVIS").length;

  // Avancement de la production par atelier (EF-7.1) : jusqu'ici calculé
  // par le backend (dossier.atelier_nom) mais jamais restitué à l'écran.
  const chargeParAtelier = useMemo(() => {
    const parAtelier = {};
    dossiers.forEach((d) => {
      const nom = d.atelier_nom || "Non affecté";
      if (!parAtelier[nom]) parAtelier[nom] = { atelier: nom, enCours: 0, total: 0 };
      parAtelier[nom].total += 1;
      if (d.statut_production === "EN_COURS") parAtelier[nom].enCours += 1;
    });
    return Object.values(parAtelier);
  }, [dossiers]);

  if (chargement) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, mt: 12 }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Chargement du tableau de bord…
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        icone={<DashboardIcon sx={{ fontSize: 18 }} />}
        titre="Tableau de bord"
        sousTitre="Vue d'ensemble adaptée à votre rôle sur le SGCFC-INM."
        centre
        action={
          <Stack direction="row" alignItems="center" spacing={1} sx={{ flexShrink: 0 }}>
            {derniereMiseAJour && (
              <Typography variant="caption" color="text.disabled">
                Actualisé à {derniereMiseAJour.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </Typography>
            )}
            <TooltipMui title="Actualiser">
              <span>
                <IconButton size="small" onClick={() => charger(true)} disabled={actualisation}>
                  {actualisation ? <CircularProgress size={16} /> : <RefreshIcon fontSize="small" />}
                </IconButton>
              </span>
            </TooltipMui>
          </Stack>
        }
      />

      {erreur && <Alert severity="warning" sx={{ mb: 3 }}>{erreur}</Alert>}

      {/* Devis et commandes (SDO / Direction) */}
      {(role === "ADMIN" || role === "AGENT_SDO") && (
        <Box sx={{ mb: 4 }}>
          <EnTeteSection icone={<AssignmentIcon color="primary" fontSize="small" />} titre="Devis et commandes" />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <CarteChiffre titre="Commandes au total" valeur={commandes.length} icone={<AssignmentIcon sx={{ fontSize: 20 }} />} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <CarteChiffre
                titre="Devis en cours"
                valeur={devisEnCours}
                icone={<PendingActionsIcon sx={{ fontSize: 20 }} />}
                couleur="warning.main"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <CarteChiffre
                titre="Commandes validées"
                valeur={commandes.filter((c) => c.statut === "VALIDEE").length}
                icone={<CheckCircleOutlinedIcon sx={{ fontSize: 20 }} />}
                couleur="success.main"
              />
            </Grid>
          </Grid>
        </Box>
      )}

      {(role === "ADMIN" || role === "AGENT_SDO") &&
        (role === "ADMIN" || role === "CHEF_ATELIER" || role === "MAGASINIER") && <Divider sx={{ mb: 4 }} />}

      {/* Production (Chef d'atelier / Direction) */}
      {(role === "ADMIN" || role === "CHEF_ATELIER") && (
        <Box sx={{ mb: 4 }}>
          <EnTeteSection icone={<PrecisionManufacturingIcon color="primary" fontSize="small" />} titre="Production" />
          <Grid container spacing={2} sx={{ mb: chargeParAtelier.length > 0 ? 2.5 : 0 }}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <CarteChiffre titre="Dossiers de fabrication" valeur={dossiers.length} icone={<AssignmentIcon sx={{ fontSize: 20 }} />} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <CarteChiffre
                titre="En cours de production"
                valeur={dossiersEnCours.length}
                icone={<PendingActionsIcon sx={{ fontSize: 20 }} />}
                couleur="warning.main"
              />
            </Grid>
          </Grid>

          {/* Avancement par atelier (SPA / SPB) — EF-7.1 : jusqu'ici absent de l'écran */}
          {chargeParAtelier.length > 0 && (
            <Card sx={{ boxShadow: 1 }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, textAlign: "center" }}>
                  Avancement par atelier
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  {chargeParAtelier.map((a) => (
                    <Box
                      key={a.atelier}
                      sx={{
                        flex: 1, p: 1.5, borderRadius: 1.5, border: "1px solid",
                        borderColor: "divider", bgcolor: "background.default",
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {a.atelier}
                        </Typography>
                        <Chip
                          label={`${a.enCours} en cours`}
                          size="small"
                          color={a.enCours > 0 ? "warning" : "default"}
                          variant={a.enCours > 0 ? "filled" : "outlined"}
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {a.total} dossier{a.total > 1 ? "s" : ""} au total
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {(role === "ADMIN" || role === "CHEF_ATELIER") && (role === "ADMIN" || role === "MAGASINIER") && (
        <Divider sx={{ mb: 4 }} />
      )}

      {/* Stock (Magasinier / Direction) */}
      {(role === "ADMIN" || role === "MAGASINIER") && (
        <Box sx={{ mb: 4 }}>
          <EnTeteSection icone={<Inventory2Icon color="primary" fontSize="small" />} titre="Stock" />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <CarteChiffre
                titre="Articles en alerte de stock"
                valeur={articlesEnAlerte.length}
                icone={<WarningAmberIcon sx={{ fontSize: 20 }} />}
                couleur={articlesEnAlerte.length > 0 ? "error.main" : "success.main"}
              />
            </Grid>
          </Grid>
        </Box>
      )}

      {(role === "ADMIN" || role === "MAGASINIER") && role === "ADMIN" && <Divider sx={{ mb: 4 }} />}

      {/* Rentabilité (Direction uniquement) — EF-7.1 : restitue tous les
          indicateurs déjà calculés par le backend (TableauBordRentabiliteView),
          y compris les écarts significatifs qui n'étaient pas affichés. */}
      {role === "ADMIN" && rentabilite && (
        <Box sx={{ mb: 4 }}>
          <EnTeteSection icone={<AssessmentIcon color="primary" fontSize="small" />} titre="Rentabilité de la fabrication" />
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <CarteChiffre
                titre="Fiches de contrôle"
                valeur={rentabilite.nombre_controles}
                icone={<FactCheckIcon sx={{ fontSize: 20 }} />}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <CarteChiffre
                titre="Dossiers bénéficiaires"
                valeur={rentabilite.nombre_beneficiaires}
                icone={<TrendingUpIcon sx={{ fontSize: 20 }} />}
                couleur="success.main"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <CarteChiffre
                titre="Dossiers déficitaires"
                valeur={rentabilite.nombre_deficitaires}
                icone={<TrendingDownIcon sx={{ fontSize: 20 }} />}
                couleur="error.main"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <CarteChiffre
                titre="À l'équilibre"
                valeur={rentabilite.nombre_a_l_equilibre}
                icone={<BalanceIcon sx={{ fontSize: 20 }} />}
                couleur="text.secondary"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <CarteChiffre
                titre="Marge moyenne"
                valeur={`${rentabilite.marge_moyenne_pourcentage}%`}
                icone={<AssessmentIcon sx={{ fontSize: 20 }} />}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <CarteChiffre
                titre="Écarts significatifs"
                valeur={rentabilite.nombre_ecarts_significatifs}
                icone={<WarningAmberIcon sx={{ fontSize: 20 }} />}
                couleur={rentabilite.nombre_ecarts_significatifs > 0 ? "error.main" : "success.main"}
              />
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Répartition des commandes par statut */}
      {(role === "ADMIN" || role === "AGENT_SDO") && commandes.length > 0 && (
        <Card sx={{ boxShadow: 1 }}>
          <CardContent>
            <EnTeteSection icone={<AssignmentIcon color="primary" fontSize="small" />} titre="Répartition des commandes par statut" />
            <Box sx={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={donneesGraphique} barCategoryGap="28%">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={mode === "sombre" ? alpha("#fff", 0.12) : alpha("#000", 0.06)}
                  />
                  <XAxis
                    dataKey="statut"
                    tick={{ fontSize: 12, fill: mode === "sombre" ? "#bdbdbd" : "#616161" }}
                    axisLine={{ stroke: mode === "sombre" ? "rgba(255,255,255,0.25)" : "#e0e0e0" }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: mode === "sombre" ? "#bdbdbd" : "#616161" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: alpha("#1565c0", mode === "sombre" ? 0.18 : 0.06) }}
                    contentStyle={{
                      borderRadius: 8,
                      border: `1px solid ${mode === "sombre" ? "rgba(255,255,255,0.2)" : "#e0e0e0"}`,
                      fontSize: 13,
                    }}
                  />
                  <Bar dataKey="nombre" radius={[4, 4, 0, 0]} maxBarSize={56}>
                    {donneesGraphique.map((entree) => (
                      <Cell
                        key={entree.code}
                        fill={HEX_PAR_NOM_COULEUR[COULEURS_STATUT_COMMANDE[entree.code]] || HEX_PAR_NOM_COULEUR.primary}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}