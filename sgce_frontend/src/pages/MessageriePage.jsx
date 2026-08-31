import { useEffect, useMemo, useState } from "react";
import {
  Alert, Autocomplete, Avatar, Badge, Box, Button, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, Divider, IconButton, InputAdornment,
  List, ListItemButton, ListItemText, Stack, Tab, Tabs, TextField, Tooltip, Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import InboxIcon from "@mui/icons-material/Inbox";
import SendIcon from "@mui/icons-material/Send";
import SearchIcon from "@mui/icons-material/Search";
import ReplyIcon from "@mui/icons-material/Reply";
import MailOutlineIcon from "@mui/icons-material/MailOutlined";
import { useSelector } from "react-redux";
import { alpha } from "@mui/material/styles";

import {
  envoyerMessage, listerMessagesEnvoyes, listerMessagesRecus, marquerMessageLu, supprimerMessage,
} from "../api/messagerieApi";
import { listerAnnuaire } from "../api/utilisateursApi";
import { COULEURS_ROLES, LIBELLES_ROLES } from "../constants/roles";
import PageHeader, { PastilleIcone } from "../components/common/PageHeader";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { useNotifier } from "../components/common/Notifier";

function normaliser(donnees) {
  return Array.isArray(donnees) ? donnees : donnees.results || [];
}

// Palette stable dérivée du nom, pour donner à chaque correspondant un avatar
// reconnaissable au premier coup d'œil dans la liste (aucune donnée de rôle
// n'étant disponible sur un message reçu/envoyé).
const PALETTE_AVATARS = ["#1565C0", "#2E7D32", "#EF6C00", "#6A1B9A", "#AD1457", "#00838F", "#5D4037"];
function couleurDepuisNom(nom) {
  const chaine = nom || "?";
  let hachage = 0;
  for (let i = 0; i < chaine.length; i += 1) hachage = chaine.charCodeAt(i) + ((hachage << 5) - hachage);
  return PALETTE_AVATARS[Math.abs(hachage) % PALETTE_AVATARS.length];
}

function formaterDateRelative(valeur) {
  if (!valeur) return "";
  const date = new Date(valeur);
  const maintenant = new Date();
  const memeJour = date.toDateString() === maintenant.toDateString();
  const hier = new Date(maintenant);
  hier.setDate(hier.getDate() - 1);
  const heure = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (memeJour) return `Aujourd'hui à ${heure}`;
  if (date.toDateString() === hier.toDateString()) return `Hier à ${heure}`;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) + ` à ${heure}`;
}

export default function MessageriePage() {
  const { utilisateur } = useSelector((state) => state.auth);
  const { afficherSucces } = useNotifier();

  const [onglet, setOnglet] = useState(0);
  const [recus, setRecus] = useState([]);
  const [envoyes, setEnvoyes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [recherche, setRecherche] = useState("");

  const [messageOuvert, setMessageOuvert] = useState(null);
  const [dialogueOuvert, setDialogueOuvert] = useState(false);
  const [annuaire, setAnnuaire] = useState([]);
  const [destinataire, setDestinataire] = useState(null);
  const [objet, setObjet] = useState("");
  const [contenu, setContenu] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [erreurEnvoi, setErreurEnvoi] = useState("");
  const [messageASupprimer, setMessageASupprimer] = useState(null);

  const charger = async () => {
    setChargement(true);
    setErreur("");
    try {
      const [r, e] = await Promise.all([listerMessagesRecus(), listerMessagesEnvoyes()]);
      setRecus(normaliser(r));
      setEnvoyes(normaliser(e));
    } catch {
      setErreur("Impossible de charger la messagerie. Réessayez dans un instant.");
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    charger();
  }, []);

  const assurerAnnuaireCharge = async () => {
    if (annuaire.length > 0) return annuaire;
    try {
      const donnees = await listerAnnuaire();
      const liste = normaliser(donnees).filter((u) => u.id !== utilisateur?.id);
      setAnnuaire(liste);
      return liste;
    } catch {
      setErreurEnvoi("Impossible de charger l'annuaire des utilisateurs.");
      return [];
    }
  };

  const ouvrirDialogueNouveauMessage = async () => {
    setDialogueOuvert(true);
    setErreurEnvoi("");
    setDestinataire(null);
    setObjet("");
    setContenu("");
    assurerAnnuaireCharge();
  };

  const gererRepondre = async (message) => {
    setErreurEnvoi("");
    setObjet(message.objet ? `Re : ${message.objet}` : "");
    setContenu("");
    const liste = await assurerAnnuaireCharge();
    const correspondant = liste.find((u) => u.id === message.expediteur);
    setDestinataire(
      correspondant || { id: message.expediteur, nom_complet: message.expediteur_nom, role: null }
    );
    setDialogueOuvert(true);
  };

  const gererEnvoi = async () => {
    if (!destinataire || !contenu.trim()) {
      setErreurEnvoi("Choisissez un destinataire et saisissez un message.");
      return;
    }
    setEnvoiEnCours(true);
    setErreurEnvoi("");
    try {
      await envoyerMessage({ destinataire: destinataire.id, objet, contenu });
      afficherSucces("Message envoyé avec succès.");
      setDialogueOuvert(false);
      setDestinataire(null);
      setObjet("");
      setContenu("");
      charger();
      setOnglet(1);
    } catch {
      setErreurEnvoi("Impossible d'envoyer ce message. Vérifiez votre connexion et réessayez.");
    } finally {
      setEnvoiEnCours(false);
    }
  };

  const gererOuvrirMessage = async (message, estRecu) => {
    setMessageOuvert(message);
    if (estRecu && !message.lu) {
      try {
        await marquerMessageLu(message.id);
        setRecus((liste) => liste.map((m) => (m.id === message.id ? { ...m, lu: true } : m)));
      } catch {
        // pas bloquant
      }
    }
  };

  const gererSuppression = async (evenement, id) => {
    evenement.stopPropagation();
    setMessageASupprimer(id);
  };

  const confirmerSuppression = async () => {
    const id = messageASupprimer;
    if (!id) return;
    setMessageASupprimer(null);
    try {
      await supprimerMessage(id);
      afficherSucces("Message supprimé avec succès.");
      setRecus((liste) => liste.filter((m) => m.id !== id));
      setEnvoyes((liste) => liste.filter((m) => m.id !== id));
      if (messageOuvert?.id === id) setMessageOuvert(null);
    } catch {
      setErreur("Impossible de supprimer ce message.");
    }
  };

  const nombreNonLus = recus.filter((m) => !m.lu).length;

  const listeAffichee = useMemo(() => {
    const base = onglet === 0 ? recus : envoyes;
    const termes = recherche.trim().toLowerCase();
    if (!termes) return base;
    return base.filter((m) => {
      const correspondant = onglet === 0 ? m.expediteur_nom : m.destinataire_nom;
      return (
        (correspondant || "").toLowerCase().includes(termes) ||
        (m.objet || "").toLowerCase().includes(termes) ||
        (m.contenu || "").toLowerCase().includes(termes)
      );
    });
  }, [onglet, recus, envoyes, recherche]);

  if (chargement) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, mt: 12 }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Chargement de la messagerie…
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* En-tête de page : pastille + titre + sous-titre + action principale */}
      <PageHeader
        icone={
          <Badge badgeContent={nombreNonLus} color="error" overlap="circular">
            <MailOutlineIcon />
          </Badge>
        }
        titre="Messagerie"
        sousTitre="Échangez directement avec les autres utilisateurs du SGCFC-INM."
        centre
        taillePastille={28}
        titreVariant="h6"
        action={
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={ouvrirDialogueNouveauMessage}>
            Nouveau message
          </Button>
        }
      />

      {erreur && <Alert severity="warning" sx={{ mb: 3 }}>{erreur}</Alert>}

      <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems="flex-start">
        {/* Colonne gauche : onglets, recherche et liste des messages */}
        <Box sx={{ width: { xs: "100%", md: 380 }, bgcolor: "background.paper", borderRadius: 2, boxShadow: 1, overflow: "hidden" }}>
          <Tabs
            value={onglet}
            onChange={(e, v) => {
              setOnglet(v);
              setRecherche("");
            }}
            variant="fullWidth"
          >
            <Tab icon={<InboxIcon fontSize="small" />} iconPosition="start" label={`Reçus${nombreNonLus > 0 ? ` (${nombreNonLus})` : ""}`} />
            <Tab icon={<SendIcon fontSize="small" />} iconPosition="start" label="Envoyés" />
          </Tabs>
          <Box sx={{ px: 2, py: 1.5, bgcolor: "background.default" }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Rechercher un message…"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              sx={{ bgcolor: "background.paper" }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="disabled" />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>
          <Divider />
          <List sx={{ maxHeight: 520, overflowY: "auto", p: 0 }}>
            {listeAffichee.length === 0 && (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <InboxIcon sx={{ fontSize: 34, color: "text.disabled", mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  {recherche
                    ? "Aucun message ne correspond à votre recherche."
                    : `Aucun message ${onglet === 0 ? "reçu" : "envoyé"} pour le moment.`}
                </Typography>
              </Box>
            )}
            {listeAffichee.map((message) => {
              const correspondant = onglet === 0 ? message.expediteur_nom : message.destinataire_nom;
              const nonLu = onglet === 0 && !message.lu;
              return (
                <ListItemButton
                  key={message.id}
                  selected={messageOuvert?.id === message.id}
                  onClick={() => gererOuvrirMessage(message, onglet === 0)}
                  sx={{
                    alignItems: "flex-start",
                    gap: 1.25,
                    py: 1.4,
                    px: 2,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    borderLeft: "3px solid",
                    borderLeftColor: nonLu ? "primary.main" : "transparent",
                    bgcolor: nonLu ? (t) => alpha(t.palette.primary.main, 0.14) : "transparent",
                    "&:hover .bouton-supprimer-message": { opacity: 1 },
                  }}
                >
                  <Avatar sx={{ width: 36, height: 36, mt: 0.25, fontSize: 14, bgcolor: couleurDepuisNom(correspondant) }}>
                    {(correspondant || "?").charAt(0).toUpperCase()}
                  </Avatar>
                  <ListItemText
                    sx={{ my: 0 }}
                    primary={
                      <Typography variant="body2" sx={{ fontWeight: nonLu ? 700 : 500 }} noWrap>
                        {correspondant}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography
                          variant="body2"
                          component="span"
                          color={nonLu ? "text.primary" : "text.secondary"}
                          noWrap
                          sx={{ display: "block", fontWeight: nonLu ? 600 : 400 }}
                        >
                          {message.objet || message.contenu}
                        </Typography>
                        <Typography variant="caption" component="span" color="text.disabled" sx={{ display: "block", mt: 0.25 }}>
                          {formaterDateRelative(message.date_envoi)}
                        </Typography>
                      </>
                    }
                  />
                  <Tooltip title="Supprimer">
                    <IconButton
                      size="small"
                      className="bouton-supprimer-message"
                      onClick={(e) => gererSuppression(e, message.id)}
                      sx={{ opacity: { xs: 1, sm: 0 }, transition: "opacity 0.15s", mt: 0.25 }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </ListItemButton>
              );
            })}
          </List>
        </Box>

        {/* Colonne droite : lecture du message sélectionné */}
        <Box sx={{ flexGrow: 1, width: "100%", bgcolor: "background.paper", borderRadius: 2, boxShadow: 1, p: { xs: 2.5, sm: 3.5 }, minHeight: 440 }}>
          {!messageOuvert && (
            <Stack alignItems="center" justifyContent="center" sx={{ height: 380 }} spacing={1.5}>
              <PastilleIcone icone={<InboxIcon sx={{ fontSize: 24 }} />} taille={56} />
              <Typography color="text.secondary">Sélectionnez un message pour l'afficher</Typography>
            </Stack>
          )}
          {messageOuvert && (
            <Box>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "flex-start" }}
                spacing={2}
              >
                <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ minWidth: 0 }}>
                  <Avatar
                    sx={{
                      width: 48, height: 48, fontSize: 18, flexShrink: 0,
                      bgcolor: couleurDepuisNom(messageOuvert.expediteur_nom),
                    }}
                  >
                    {(messageOuvert.expediteur_nom || "?").charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                      {messageOuvert.objet || "(Sans objet)"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                      De <strong>{messageOuvert.expediteur_nom}</strong> à{" "}
                      <strong>{messageOuvert.destinataire_nom}</strong>
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.75 }}>
                      <Typography variant="caption" color="text.disabled">
                        {formaterDateRelative(messageOuvert.date_envoi)}
                      </Typography>
                      {messageOuvert.lu && (
                        <Chip icon={<MarkEmailReadIcon />} label="Lu" size="small" variant="outlined" />
                      )}
                    </Stack>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                  {messageOuvert.expediteur !== utilisateur?.id && (
                    <Button size="small" variant="outlined" startIcon={<ReplyIcon />} onClick={() => gererRepondre(messageOuvert)}>
                      Répondre
                    </Button>
                  )}
                  <Tooltip title="Supprimer ce message">
                    <IconButton size="small" onClick={(e) => gererSuppression(e, messageOuvert.id)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
              <Divider sx={{ my: 3 }} />
              <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.75 }}>
                {messageOuvert.contenu}
              </Typography>
            </Box>
          )}
        </Box>
      </Stack>

      <Dialog open={dialogueOuvert} onClose={() => setDialogueOuvert(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <MailOutlineIcon color="primary" fontSize="small" />
          Nouveau message
        </DialogTitle>
        <DialogContent>
          {erreurEnvoi && <Alert severity="error" sx={{ mb: 2 }}>{erreurEnvoi}</Alert>}
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Autocomplete
              options={annuaire}
              value={destinataire}
              onChange={(e, valeur) => setDestinataire(valeur)}
              getOptionLabel={(option) =>
                option.nom_complet
                  ? `${option.nom_complet}${option.role ? ` — ${LIBELLES_ROLES[option.role] || option.role}` : ""}`
                  : ""
              }
              isOptionEqualToValue={(option, valeur) => option.id === valeur.id}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option.id}>
                  <Avatar sx={{ width: 28, height: 28, fontSize: 12, mr: 1.5, bgcolor: COULEURS_ROLES[option.role] || couleurDepuisNom(option.nom_complet) }}>
                    {(option.nom_complet || "?").charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" noWrap>{option.nom_complet}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {LIBELLES_ROLES[option.role] || option.role}
                    </Typography>
                  </Box>
                </Box>
              )}
              renderInput={(params) => <TextField {...params} label="Destinataire" placeholder="Rechercher un utilisateur" />}
            />
            <TextField
              label="Objet (optionnel)"
              value={objet}
              onChange={(e) => setObjet(e.target.value)}
              fullWidth
            />
            <TextField
              label="Message"
              value={contenu}
              onChange={(e) => setContenu(e.target.value)}
              multiline
              minRows={4}
              fullWidth
              helperText={`${contenu.length} caractère${contenu.length > 1 ? "s" : ""}`}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogueOuvert(false)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={gererEnvoi}
            disabled={envoiEnCours || !destinataire || !contenu.trim()}
            startIcon={envoiEnCours ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
          >
            {envoiEnCours ? "Envoi…" : "Envoyer"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialogue de confirmation : suppression d'un message */}
      <ConfirmDialog
        ouvert={Boolean(messageASupprimer)}
        titre="Supprimer ce message ?"
        message="Le message sera définitivement supprimé de votre messagerie. Cette action est irréversible."
        icone={<DeleteOutlineIcon sx={{ fontSize: 24 }} />}
        couleur="error"
        texteConfirmer="Supprimer"
        onConfirmer={confirmerSuppression}
        onAnnuler={() => setMessageASupprimer(null)}
      />
    </Box>
  );
}