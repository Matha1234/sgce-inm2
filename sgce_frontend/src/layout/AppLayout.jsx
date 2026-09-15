import { useEffect, useMemo, useRef, useState } from "react";
import {
  AppBar, Avatar, Badge, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, Divider, Drawer, IconButton, keyframes, List, ListItemButton, ListItemIcon,
  ListItemText, Menu, MenuItem, Stack, Toolbar, Tooltip, Typography,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PeopleIcon from "@mui/icons-material/People";
import AssessmentIcon from "@mui/icons-material/Assessment";
import SettingsIcon from "@mui/icons-material/Settings";
import PlaylistAddCheckIcon from "@mui/icons-material/PlaylistAddCheck";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import MailOutlineIcon from "@mui/icons-material/MailOutlined";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import CloseIcon from "@mui/icons-material/Close";
import LogoutIcon from "@mui/icons-material/Logout";
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import BadgeIcon from "@mui/icons-material/Badge";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WavingHandIcon from "@mui/icons-material/WavingHand";
import CategoryIcon from "@mui/icons-material/Category";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { alpha } from "@mui/material/styles";
import { useDispatch, useSelector } from "react-redux";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { logout, setUtilisateur } from "../store/authSlice";
import { basculerMode } from "../store/themeSlice";
import {
  marquerLue, marquerToutesLues, setNotifications, supprimerNotification, viderNotifications,
} from "../store/notificationsSlice";
import {
  listerNotifications, marquerNotificationLue, marquerToutesNotificationsLues,
  mettreAJourPhotoProfil,
  supprimerNotification as apiSupprimerNotification,
  supprimerToutesNotifications as apiSupprimerToutesNotifications,
} from "../api/utilisateursApi";
import { listerMessagesRecus } from "../api/messagerieApi";
import { COULEURS_ROLES, LIBELLES_ROLES } from "../constants/roles";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { useNotifier } from "../components/common/Notifier";
import logoInm from "../assets/logo-inm.png";

const LARGEUR_SIDEBAR_OUVERTE = 180;
const LARGEUR_SIDEBAR_REDUITE = 52;
const CLE_SIDEBAR = "sgcfc_sidebar_ouverte";
const CLE_EVENEMENT_AUTH = "sgcfc_evenement_auth";

const navFadeIn = keyframes`
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const navShimmer = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const sideItemIn = keyframes`
  from { opacity: 0; transform: translateX(-6px); }
  to   { opacity: 1; transform: translateX(0); }
`;

const HAUTEUR_NAV = { xs: 44, sm: 46 };


const ELEMENTS_MENU = [
  { label: "Tableau de bord", to: "/", icon: <DashboardIcon />, roles: null },
  { label: "Commandes", to: "/commandes", icon: <AssignmentIcon />, roles: ["ADMIN", "AGENT_SDO"] },
  { label: "Production", to: "/dossiers", icon: <PrecisionManufacturingIcon />, roles: ["ADMIN", "CHEF_ATELIER", "AGENT_SDO"] },
  { label: "Stock", to: "/stock", icon: <Inventory2Icon />, roles: ["ADMIN", "MAGASINIER"] },
  { label: "Facturation", to: "/factures", icon: <ReceiptLongIcon />, roles: ["ADMIN", "AGENT_SDO"] },
  { label: "Rentabilité", to: "/rentabilite", icon: <AssessmentIcon />, roles: ["ADMIN", "AGENT_SDO"] },
  { label: "Utilisateurs", to: "/utilisateurs", icon: <PeopleIcon />, roles: ["ADMIN"] },
  { label: "Catalogue", to: "/catalogue", icon: <CategoryIcon />, roles: ["ADMIN"] },
  { label: "Paramètres", to: "/parametres", icon: <SettingsIcon />, roles: null },
];

const ICONES_CATEGORIE_NOTIF = {
  COMMANDE: <AssignmentIcon fontSize="small" />,
  DOSSIER: <PrecisionManufacturingIcon fontSize="small" />,
  ETAPE: <PlaylistAddCheckIcon fontSize="small" />,
  STOCK: <Inventory2Icon fontSize="small" />,
  CONTROLE: <AssessmentIcon fontSize="small" />,
};

function initialesUtilisateur(utilisateur) {
  if (!utilisateur) return "?";
  const prenom = utilisateur.first_name || "";
  const nom = utilisateur.last_name || "";
  if (prenom || nom) {
    return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase() || "?";
  }
  return (utilisateur.username || "?").charAt(0).toUpperCase();
}

function nomComplet(utilisateur) {
  if (!utilisateur) return "";
  const prenom = utilisateur.first_name || "";
  const nom = utilisateur.last_name || "";
  const complet = `${prenom} ${nom}`.trim();
  return complet || utilisateur.username;
}

function formaterDate(valeur) {
  if (!valeur) return "—";
  return new Date(valeur).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function AppLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { afficherSucces } = useNotifier();
  const { utilisateur } = useSelector((state) => state.auth);
  const { liste: notifications, nonLues } = useSelector((state) => state.notifications);
  const mode = useSelector((state) => state.theme.mode);

  const [sidebarOuverte, setSidebarOuverte] = useState(() => {
    const enregistre = localStorage.getItem(CLE_SIDEBAR);
    return enregistre === null ? true : enregistre === "true";
  });
  const [ancrageNotifs, setAncrageNotifs] = useState(null);
  const [ancrageMessages, setAncrageMessages] = useState(null);
  const [ancrageProfil, setAncrageProfil] = useState(null);
  const [televersementPhoto, setTeleversementPhoto] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messagesNonLus, setMessagesNonLus] = useState(0);
  const [evenementAuth, setEvenementAuth] = useState(null);
  const [dialogueDeconnexionOuvert, setDialogueDeconnexionOuvert] = useState(false);
  const [confirmationViderNotifs, setConfirmationViderNotifs] = useState(false);
  const inputPhotoRef = useRef(null);

  const largeurSidebar = sidebarOuverte ? LARGEUR_SIDEBAR_OUVERTE : LARGEUR_SIDEBAR_REDUITE;

  const basculerSidebar = () => {
    setSidebarOuverte((valeur) => {
      localStorage.setItem(CLE_SIDEBAR, String(!valeur));
      return !valeur;
    });
  };

  const chargerNotifications = async () => {
    try {
      const data = await listerNotifications();
      dispatch(setNotifications(Array.isArray(data) ? data : data.results || []));
    } catch {
      // silencieux : l'absence de notifications ne doit pas bloquer l'UI
    }
  };

  const chargerMessages = async () => {
    try {
      const data = await listerMessagesRecus();
      const liste = Array.isArray(data) ? data : data.results || [];
      setMessages(liste);
      setMessagesNonLus(liste.filter((m) => !m.lu).length);
    } catch {
      // silencieux
    }
  };

  useEffect(() => {
    chargerNotifications();
    chargerMessages();
    const intervalle = setInterval(() => {
      chargerNotifications();
      chargerMessages();
    }, 30000);
    return () => clearInterval(intervalle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const brut = sessionStorage.getItem(CLE_EVENEMENT_AUTH);
    if (brut) {
      try {
        setEvenementAuth(JSON.parse(brut));
      } catch {
        setEvenementAuth(null);
      }
      sessionStorage.removeItem(CLE_EVENEMENT_AUTH);
    }
  }, []);

  const gererClicNotification = async (notification) => {
    if (!notification.lue) {
      dispatch(marquerLue(notification.id));
      try {
        await marquerNotificationLue(notification.id);
      } catch {
        // pas bloquant
      }
    }
  };

  const gererToutMarquerLu = async () => {
    dispatch(marquerToutesLues());
    try {
      await marquerToutesNotificationsLues();
    } catch {
      // pas bloquant
    }
  };

  const gererSupprimerNotification = async (evenement, id) => {
    evenement.stopPropagation();
    dispatch(supprimerNotification(id));
    try {
      await apiSupprimerNotification(id);
    } catch {
      // pas bloquant : la notification reste supprimée côté interface
    }
  };

  const demanderViderNotifications = () => {
    setAncrageNotifs(null);
    setConfirmationViderNotifs(true);
  };

  const gererViderNotifications = async () => {
    setConfirmationViderNotifs(false);
    dispatch(viderNotifications());
    try {
      await apiSupprimerToutesNotifications();
      afficherSucces("Toutes les notifications ont été supprimées.");
    } catch {
      // pas bloquant : la liste est déjà vidée côté interface
    }
  };

  const demanderDeconnexion = () => {
    setAncrageProfil(null);
    setDialogueDeconnexionOuvert(true);
  };

  const annulerDeconnexion = () => {
    setDialogueDeconnexionOuvert(false);
  };

  const confirmerDeconnexion = () => {
    setDialogueDeconnexionOuvert(false);
    dispatch(logout());
    navigate("/login", { replace: true });
  };

  const gererChoixPhoto = () => {
    inputPhotoRef.current?.click();
  };

  const gererChangementPhoto = async (evenement) => {
    const fichier = evenement.target.files?.[0];
    evenement.target.value = "";
    if (!fichier) return;
    setTeleversementPhoto(true);
    try {
      const utilisateurMisAJour = await mettreAJourPhotoProfil(fichier);
      dispatch(setUtilisateur(utilisateurMisAJour));
      afficherSucces("Photo de profil mise à jour avec succès.");
    } catch {
      // pas bloquant : la photo precedente (ou les initiales) reste affichee
    } finally {
      setTeleversementPhoto(false);
    }
  };

  const menuVisible = useMemo(
    () =>
      ELEMENTS_MENU.filter(
        (item) => !item.roles || utilisateur?.role === "ADMIN" || item.roles.includes(utilisateur?.role)
      ),
    [utilisateur?.role]
  );

  const couleurAvatar = COULEURS_ROLES[utilisateur?.role] || "#455A64";

  return (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden", bgcolor: "background.default" }}>
      {/* ===== Barre supérieure ===== */}
      {/* Navbar 2 — bleu nuit + liseré animé */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: (theme) =>
            theme.palette.mode === "dark"
              ? `linear-gradient(90deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.dark, 0.55)} 100%)`
              : "linear-gradient(90deg, #0b2d4d 0%, #134a7a 40%, #1a5f96 100%)",
          backgroundSize: "200% 100%",
          animation: `${navFadeIn} 0.4s ease-out, ${navShimmer} 14s ease infinite`,
          borderBottom: "none",
          boxShadow: (theme) =>
            theme.palette.mode === "dark"
              ? "0 4px 20px rgba(0,0,0,0.45)"
              : "0 4px 18px rgba(11, 45, 77, 0.28)",
          "&::after": {
            content: '""',
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 2,
            background: (theme) =>
              `linear-gradient(90deg, transparent, ${theme.palette.primary.light}, ${alpha("#fff", 0.7)}, ${theme.palette.primary.light}, transparent)`,
            backgroundSize: "200% 100%",
            animation: `${navShimmer} 5s linear infinite`,
            opacity: 0.85,
          },
        }}
      >
        <Toolbar
          variant="dense"
          sx={{
            minHeight: HAUTEUR_NAV,
            height: HAUTEUR_NAV,
            px: { xs: 1, sm: 1.75 },
            display: "flex",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
            <Box
              component="img"
              src={logoInm}
              alt="Logo Imprimerie Nationale de Madagascar"
              sx={{
                height: 26,
                borderRadius: 1,
                bgcolor: "#fff",
                p: 0.3,
                boxShadow: "0 0 0 1px rgba(255,255,255,0.5), 0 2px 8px rgba(0,0,0,0.2)",
                objectFit: "contain",
                transition: "transform 0.2s ease",
                "&:hover": { transform: "scale(1.05)" },
              }}
            />
            <Box sx={{ display: { xs: "none", sm: "block" }, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 13, lineHeight: 1.1, color: "#fff", letterSpacing: 0.6 }}>
                SGCFC-INM
              </Typography>
              <Typography sx={{ fontSize: 9, lineHeight: 1.15, color: "rgba(255,255,255,0.7)", letterSpacing: 0.2 }} noWrap>
                Imprimerie Nationale de Madagascar
              </Typography>
            </Box>
          </Stack>

          <Stack
            direction="row"
            alignItems="center"
            spacing={0.2}
            sx={{
              ml: "auto",
              "& .MuiIconButton-root": {
                color: "rgba(255,255,255,0.92)",
                width: 32,
                height: 32,
                transition: "background-color 0.2s, transform 0.15s",
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.12)",
                  transform: "translateY(-1px)",
                },
              },
            }}
          >
            <Tooltip title="Notifications">
              <IconButton color="inherit" size="small" onClick={(e) => setAncrageNotifs(e.currentTarget)}>
                <Badge badgeContent={nonLues} color="error">
                  {nonLues > 0 ? <NotificationsIcon fontSize="small" /> : <NotificationsNoneIcon fontSize="small" />}
                </Badge>
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={ancrageNotifs}
              open={Boolean(ancrageNotifs)}
              onClose={() => setAncrageNotifs(null)}
              PaperProps={{ sx: { width: 320, maxHeight: 420, overflow: "hidden" } }}
            >
              <Box
                sx={{
                  px: 1.5, py: 1, display: "flex", justifyContent: "space-between", alignItems: "center",
                  bgcolor: "action.hover",
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <NotificationsIcon fontSize="small" color="action" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Notifications
                  </Typography>
                  {nonLues > 0 && (
                    <Chip label={`${nonLues} non lue${nonLues > 1 ? "s" : ""}`} size="small" color="error" />
                  )}
                </Stack>
                <Stack direction="row" spacing={0.5}>
                  {nonLues > 0 && (
                    <Tooltip title="Tout marquer comme lu">
                      <IconButton size="small" onClick={gererToutMarquerLu}>
                        <DoneAllIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {notifications.length > 0 && (
                    <Tooltip title="Supprimer toutes les notifications">
                      <IconButton size="small" color="error" onClick={demanderViderNotifications}>
                        <DeleteSweepIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </Box>
              <Divider />
              {notifications.length === 0 && (
                <Box sx={{ px: 2, py: 3, textAlign: "center" }}>
                  <NotificationsNoneIcon sx={{ fontSize: 36, color: "text.disabled", mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Aucune notification
                  </Typography>
                </Box>
              )}
              <Box sx={{ maxHeight: 300, overflowY: "auto" }}>
                {notifications.slice(0, 15).map((notification, index) => (
                  <Box key={notification.id}>
                    <MenuItem
                      onClick={() => gererClicNotification(notification)}
                      sx={{
                        whiteSpace: "normal",
                        alignItems: "flex-start",
                        gap: 1,
                        py: 0.9,
                        px: 1.5,
                        borderLeft: "3px solid",
                        borderLeftColor: notification.lue ? "transparent" : "primary.main",
                        bgcolor: notification.lue ? "transparent" : (t) => alpha(t.palette.primary.main, 0.14),
                        "&:hover .bouton-supprimer-notif": { opacity: 1 },
                      }}
                    >
                      <Box
                        sx={{
                          mt: 0.4,
                          color: notification.lue ? "text.disabled" : "primary.main",
                          display: "flex",
                        }}
                      >
                        {ICONES_CATEGORIE_NOTIF[notification.categorie] || <NotificationsNoneIcon fontSize="small" />}
                      </Box>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Stack direction="row" alignItems="center" spacing={0.75}>
                          {!notification.lue && (
                            <FiberManualRecordIcon sx={{ fontSize: 8, color: "primary.main" }} />
                          )}
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: notification.lue ? 400 : 600,
                              color: notification.lue ? "text.secondary" : "text.primary",
                              fontSize: 13,
                            }}
                          >
                            {notification.message}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.4 }}>
                          <Chip
                            label={notification.categorie_libelle}
                            size="small"
                            variant="outlined"
                            sx={{ height: 18, fontSize: 10 }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10.5 }}>
                            {new Date(notification.date_envoi).toLocaleString("fr-FR")}
                          </Typography>
                        </Stack>
                      </Box>
                      <Tooltip title="Supprimer">
                        <IconButton
                          size="small"
                          className="bouton-supprimer-notif"
                          onClick={(e) => gererSupprimerNotification(e, notification.id)}
                          sx={{ opacity: { xs: 1, sm: 0 }, transition: "opacity 0.15s" }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </MenuItem>
                    {index < notifications.slice(0, 15).length - 1 && <Divider component="li" />}
                  </Box>
                ))}
              </Box>
            </Menu>

            <Tooltip title="Messagerie">
              <IconButton color="inherit" size="small" onClick={(e) => setAncrageMessages(e.currentTarget)}>
                <Badge badgeContent={messagesNonLus} color="error">
                  <MailOutlineIcon fontSize="small" />
                </Badge>
              </IconButton>
            </Tooltip>
            <Tooltip title={mode === "clair" ? "Passer en mode sombre" : "Passer en mode clair"}>
              <IconButton color="inherit" size="small" onClick={() => dispatch(basculerMode())}>
                {mode === "clair" ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={ancrageMessages}
              open={Boolean(ancrageMessages)}
              onClose={() => setAncrageMessages(null)}
              PaperProps={{ sx: { width: 340, maxHeight: 440, overflow: "hidden" } }}
            >
              <Box
                sx={{
                  px: 1.5, py: 1, display: "flex", justifyContent: "space-between", alignItems: "center",
                  bgcolor: "action.hover",
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <MailOutlineIcon fontSize="small" color="action" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Messagerie
                  </Typography>
                  {messagesNonLus > 0 && (
                    <Chip label={`${messagesNonLus} non lu${messagesNonLus > 1 ? "s" : ""}`} size="small" color="error" />
                  )}
                </Stack>
              </Box>
              <Divider />
              {messages.length === 0 && (
                <Box sx={{ px: 2, py: 3, textAlign: "center" }}>
                  <MailOutlineIcon sx={{ fontSize: 36, color: "text.disabled", mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Aucun message
                  </Typography>
                </Box>
              )}
              <Box sx={{ maxHeight: 300, overflowY: "auto" }}>
                {messages.slice(0, 15).map((message, index) => (
                  <Box key={message.id}>
                    <MenuItem
                      onClick={() => setAncrageMessages(null)}
                      sx={{
                        whiteSpace: "normal",
                        alignItems: "flex-start",
                        gap: 1,
                        py: 0.9,
                        px: 1.5,
                        borderLeft: "3px solid",
                        borderLeftColor: message.lu ? "transparent" : "primary.main",
                        bgcolor: message.lu ? "transparent" : (t) => alpha(t.palette.primary.main, 0.14),
                      }}
                    >
                      <Box sx={{ mt: 0.4, color: message.lu ? "text.disabled" : "primary.main", display: "flex" }}>
                        <MailOutlineIcon fontSize="small" />
                      </Box>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Stack direction="row" alignItems="center" spacing={0.75}>
                          {!message.lu && <FiberManualRecordIcon sx={{ fontSize: 8, color: "primary.main" }} />}
                          <Typography
                            variant="body2"
                            noWrap
                            sx={{
                              fontWeight: message.lu ? 400 : 600,
                              color: message.lu ? "text.secondary" : "text.primary",
                              fontSize: 13,
                            }}
                          >
                            {message.expediteur_nom || message.expediteur || "Expéditeur inconnu"}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" noWrap sx={{ fontSize: 12.5, color: "text.secondary" }}>
                          {message.sujet || message.titre || "(Sans objet)"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10.5 }}>
                          {message.date_envoi ? new Date(message.date_envoi).toLocaleString("fr-FR") : ""}
                        </Typography>
                      </Box>
                    </MenuItem>
                    {index < messages.slice(0, 15).length - 1 && <Divider component="li" />}
                  </Box>
                ))}
              </Box>
              <Divider />
              <MenuItem
                onClick={() => {
                  setAncrageMessages(null);
                  navigate("/messagerie");
                }}
                sx={{ justifyContent: "center", py: 1, color: "primary.main", fontWeight: 600, fontSize: 13 }}
              >
                Voir tous les messages
              </MenuItem>
            </Menu>

            <Box
              sx={{
                width: 1,
                height: 22,
                mx: 0.5,
                background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.4), transparent)",
              }}
            />
            <Box
              onClick={(e) => setAncrageProfil(e.currentTarget)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.7,
                px: 0.7,
                py: 0.25,
                borderRadius: 5,
                cursor: "pointer",
                border: "1px solid rgba(255,255,255,0.18)",
                bgcolor: "rgba(255,255,255,0.06)",
                transition: "background-color 0.2s, border-color 0.2s, transform 0.15s",
                "&:hover": {
                  bgcolor: "rgba(255,255,255,0.14)",
                  borderColor: "rgba(255,255,255,0.35)",
                  transform: "translateY(-1px)",
                },
              }}
            >
              <Avatar
                src={utilisateur?.photo || undefined}
                sx={{
                  width: 26,
                  height: 26,
                  bgcolor: couleurAvatar,
                  fontSize: 11,
                  border: "1.5px solid #fff",
                }}
              >
                {initialesUtilisateur(utilisateur)}
              </Avatar>
              <Box sx={{ display: { xs: "none", md: "block" }, minWidth: 0, maxWidth: 120 }}>
                <Typography sx={{ color: "#fff", fontWeight: 700, fontSize: 11.5, lineHeight: 1.15 }} noWrap>
                  {nomComplet(utilisateur)}
                </Typography>
                <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: 9, lineHeight: 1.1 }} noWrap>
                  {LIBELLES_ROLES[utilisateur?.role] || utilisateur?.role}
                </Typography>
              </Box>
              <KeyboardArrowDownIcon sx={{ display: { xs: "none", md: "block" }, fontSize: 14, color: "rgba(255,255,255,0.75)" }} />
            </Box>
            <Menu
              anchorEl={ancrageProfil}
              open={Boolean(ancrageProfil)}
              onClose={() => setAncrageProfil(null)}
              PaperProps={{ sx: { width: 300, overflow: "hidden" } }}
            >
              <Box
                sx={{
                  px: 2.5, py: 2.5, display: "flex", flexDirection: "column", alignItems: "center",
                  textAlign: "center", bgcolor: "action.hover",
                }}
              >
                <Box sx={{ position: "relative", mb: 1 }}>
                  <Avatar
                    src={utilisateur?.photo || undefined}
                    sx={{ width: 60, height: 60, bgcolor: couleurAvatar, fontSize: 22 }}
                  >
                    {initialesUtilisateur(utilisateur)}
                  </Avatar>
                  <Tooltip title="Changer la photo de profil">
                    <IconButton
                      size="small"
                      onClick={gererChoixPhoto}
                      disabled={televersementPhoto}
                      sx={{
                        position: "absolute", bottom: -2, right: -2, width: 24, height: 24,
                        bgcolor: "primary.main", color: "#fff",
                        "&:hover": { bgcolor: "primary.dark" },
                      }}
                    >
                      {televersementPhoto ? (
                        <CircularProgress size={13} sx={{ color: "#fff" }} />
                      ) : (
                        <PhotoCameraIcon sx={{ fontSize: 13 }} />
                      )}
                    </IconButton>
                  </Tooltip>
                  <input
                    ref={inputPhotoRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={gererChangementPhoto}
                  />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
                  {nomComplet(utilisateur)}
                </Typography>
                <Chip
                  label={LIBELLES_ROLES[utilisateur?.role] || utilisateur?.role}
                  size="small"
                  sx={{ bgcolor: couleurAvatar, color: "#fff", fontWeight: 500, mt: 0.75 }}
                />
              </Box>
              <Divider />
              <Box sx={{ px: 2.5, py: 1.5 }}>
                <Stack spacing={1.1}>
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <AccountCircleIcon fontSize="small" color="action" />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.2 }}>
                        Identifiant
                      </Typography>
                      <Typography variant="body2" noWrap>{utilisateur?.username || "—"}</Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <AlternateEmailIcon fontSize="small" color="action" />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.2 }}>
                        Email
                      </Typography>
                      <Typography variant="body2" noWrap>{utilisateur?.email || "—"}</Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <BadgeIcon fontSize="small" color="action" />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.2 }}>
                        Rôle
                      </Typography>
                      <Typography variant="body2" noWrap>
                        {LIBELLES_ROLES[utilisateur?.role] || utilisateur?.role || "—"}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <EventAvailableIcon fontSize="small" color="action" />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.2 }}>
                        Membre depuis
                      </Typography>
                      <Typography variant="body2" noWrap>{formaterDate(utilisateur?.date_joined)}</Typography>
                    </Box>
                  </Stack>
                </Stack>
              </Box>
              <Divider />
              <MenuItem onClick={demanderDeconnexion} sx={{ py: 1.25, color: "error.main" }}>
                <ListItemIcon sx={{ color: "error.main" }}>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                Déconnexion
              </MenuItem>
            </Menu>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* ===== Sidebar v1 — claire, barre + point éloigné du libellé ===== */}
      <Drawer
        variant="permanent"
        sx={{
          width: largeurSidebar,
          flexShrink: 0,
          whiteSpace: "nowrap",
          transition: (theme) =>
            theme.transitions.create("width", {
              easing: theme.transitions.easing.easeInOut,
              duration: 180,
            }),
          [`& .MuiDrawer-paper`]: {
            width: largeurSidebar,
            boxSizing: "border-box",
            overflowX: "hidden",
            display: "flex",
            flexDirection: "column",
            borderRight: (theme) =>
              `1px solid ${theme.palette.mode === "dark" ? alpha("#fff", 0.08) : alpha("#0d3c73", 0.1)}`,
            background: (theme) =>
              theme.palette.mode === "dark"
                ? `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${alpha(theme.palette.primary.dark, 0.15)} 100%)`
                : `linear-gradient(180deg, #ffffff 0%, ${alpha("#1565c0", 0.04)} 100%)`,
            transition: (theme) =>
              theme.transitions.create("width", {
                easing: theme.transitions.easing.easeInOut,
                duration: 180,
              }),
          },
        }}
      >
        <Toolbar variant="dense" sx={{ minHeight: HAUTEUR_NAV }} />

        <Box
          sx={{
            display: "flex",
            justifyContent: sidebarOuverte ? "flex-end" : "center",
            px: sidebarOuverte ? 1 : 0.5,
            pt: 0.5,
            pb: 0.75,
          }}
        >
          <Box
            onClick={basculerSidebar}
            sx={{
              width: 26,
              height: 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 1.25,
              cursor: "pointer",
              color: "text.secondary",
              border: "1px solid",
              borderColor: "divider",
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
              transition: "background-color 0.2s, color 0.2s, transform 0.15s",
              "&:hover": {
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                color: "primary.main",
                transform: "scale(1.05)",
              },
            }}
          >
            {sidebarOuverte ? <ChevronLeftIcon sx={{ fontSize: 18 }} /> : <MenuIcon sx={{ fontSize: 18 }} />}
          </Box>
        </Box>

        <List sx={{ px: sidebarOuverte ? 0.75 : 0.5, py: 0.5, flex: 1, gap: 0 }}>
          {menuVisible.map((item, index) => {
            const bouton = (
              <ListItemButton
                key={item.to}
                component={NavLink}
                to={item.to}
                end={item.to === "/"}
                sx={{
                  /* hauteur + espacement entre boutons */
                  minHeight: 44,
                  py: 1,
                  mb: 1.1,
                  borderRadius: 1.5,
                  justifyContent: sidebarOuverte ? "flex-start" : "center",
                  px: sidebarOuverte ? 1 : 0.5,
                  /* large marge droite : texte et point bien séparés */
                  pr: sidebarOuverte ? 3 : 0.5,
                  gap: 0.85,
                  color: "text.secondary",
                  position: "relative",
                  overflow: "hidden",
                  animation: `${sideItemIn} 0.3s ease-out ${Math.min(index, 8) * 0.04}s both`,
                  transition: "background-color 0.2s, color 0.2s, transform 0.15s, box-shadow 0.2s",
                  "&:hover": {
                    bgcolor: (th) => alpha(th.palette.primary.main, 0.08),
                    color: "primary.main",
                    transform: "translateX(2px)",
                  },
                  "&.active": {
                    bgcolor: (th) => alpha(th.palette.primary.main, 0.14),
                    color: "primary.main",
                    fontWeight: 700,
                    boxShadow: (th) => `inset 3px 0 0 ${th.palette.primary.main}`,
                    "& .MuiListItemIcon-root": { color: "primary.main" },
                    /* point collé au bord droit de la sidebar */
                    "&::after": sidebarOuverte
                      ? {
                          content: '""',
                          position: "absolute",
                          right: 8,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          bgcolor: "primary.main",
                          boxShadow: (th) => `0 0 0 3px ${alpha(th.palette.primary.main, 0.2)}`,
                        }
                      : {},
                  },
                  "& .MuiListItemText-root": {
                    margin: 0,
                    /* espace réservé entre le libellé et le point */
                    pr: sidebarOuverte ? 2 : 0,
                    maxWidth: sidebarOuverte ? "calc(100% - 12px)" : "100%",
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    justifyContent: "center",
                    color: "inherit",
                    "& .MuiSvgIcon-root": { fontSize: 18 },
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {sidebarOuverte && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      noWrap: true,
                      lineHeight: 1.25,
                    }}
                  />
                )}
              </ListItemButton>
            );
            return sidebarOuverte ? (
              bouton
            ) : (
              <Tooltip key={item.to} title={item.label} placement="right">
                {bouton}
              </Tooltip>
            );
          })}
        </List>

        <Box
          sx={{
            mx: sidebarOuverte ? 0.75 : 0.5,
            mb: 1,
            mt: 0.5,
            p: sidebarOuverte ? 0.85 : 0.55,
            borderRadius: 2,
            bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.12 : 0.06),
            border: "1px solid",
            borderColor: (theme) => alpha(theme.palette.primary.main, 0.14),
          }}
        >
          {sidebarOuverte ? (
            <Stack direction="row" alignItems="center" spacing={0.85}>
              <Avatar
                src={utilisateur?.photo || undefined}
                sx={{ width: 28, height: 28, bgcolor: couleurAvatar, fontSize: 11.5 }}
              >
                {initialesUtilisateur(utilisateur)}
              </Avatar>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 12, lineHeight: 1.2 }} noWrap>
                  {nomComplet(utilisateur)}
                </Typography>
                <Typography sx={{ fontSize: 10, color: "text.secondary", lineHeight: 1.2 }} noWrap>
                  {LIBELLES_ROLES[utilisateur?.role] || utilisateur?.role}
                </Typography>
              </Box>
              <Tooltip title="Déconnexion">
                <IconButton size="small" onClick={demanderDeconnexion} sx={{ color: "error.main", p: 0.4 }}>
                  <LogoutIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          ) : (
            <Stack alignItems="center" spacing={0.5}>
              <Tooltip title={nomComplet(utilisateur)} placement="right">
                <Avatar
                  src={utilisateur?.photo || undefined}
                  sx={{ width: 28, height: 28, bgcolor: couleurAvatar, fontSize: 11.5 }}
                >
                  {initialesUtilisateur(utilisateur)}
                </Avatar>
              </Tooltip>
              <Tooltip title="Déconnexion" placement="right">
                <IconButton size="small" onClick={demanderDeconnexion} sx={{ color: "error.main", p: 0.35 }}>
                  <LogoutIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Stack>
          )}
        </Box>
      </Drawer>

      {/* ===== Contenu principal ===== */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          minWidth: 0,
          overflow: "auto",
          transition: (theme) =>
            theme.transitions.create("margin", {
              easing: theme.transitions.easing.easeInOut,
              duration: 100,
            }),
        }}
      >
        <Toolbar variant="dense" sx={{ minHeight: HAUTEUR_NAV }} />
        <Outlet />
      </Box>

      <Dialog open={Boolean(evenementAuth)} onClose={() => setEvenementAuth(null)} maxWidth="xs">
        <DialogContent sx={{ textAlign: "center", py: 4 }}>
          {evenementAuth?.type === "connexion" ? (
            <>
              <WavingHandIcon sx={{ fontSize: 48, color: "primary.main", mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Bienvenue{evenementAuth?.nom ? `, ${evenementAuth.nom}` : ""} !
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Vous êtes connecté avec succès au SGCFC-INM.
              </Typography>
            </>
          ) : (
            <>
              <CheckCircleIcon sx={{ fontSize: 48, color: "success.main", mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Déconnexion réussie
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                À bientôt sur le SGCFC-INM.
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", pb: 3 }}>
          <Button variant="contained" onClick={() => setEvenementAuth(null)}>
            OK
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        ouvert={confirmationViderNotifs}
        titre="Effacer toutes les notifications ?"
        message={`${notifications.length} notification${notifications.length > 1 ? "s" : ""} seront définitivement supprimées. Cette action est irréversible.`}
        icone={<DeleteSweepIcon />}
        couleur="error"
        texteConfirmer="Tout effacer"
        onConfirmer={gererViderNotifications}
        onAnnuler={() => setConfirmationViderNotifs(false)}
      />

      <Dialog
        open={dialogueDeconnexionOuvert}
        onClose={annulerDeconnexion}
        maxWidth="xs"
      >
        <DialogContent sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Confirmer la déconnexion
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Voulez-vous vraiment vous déconnecter de votre session, {nomComplet(utilisateur)} ?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", pb: 3, gap: 1 }}>
          <Button onClick={annulerDeconnexion}>Annuler</Button>
          <Button onClick={confirmerDeconnexion} variant="contained" color="error" startIcon={<LogoutIcon />}>
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}