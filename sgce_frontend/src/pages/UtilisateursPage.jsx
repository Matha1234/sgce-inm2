import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, IconButton, InputAdornment, Menu, MenuItem, Paper,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import PeopleIcon from "@mui/icons-material/People";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useSelector } from "react-redux";

import {
  creerUtilisateur,
  listerUtilisateurs,
  modifierUtilisateur,
  supprimerUtilisateur,
} from "../api/utilisateursApi";
import { COULEURS_ROLES, LIBELLES_ROLES } from "../constants/roles";
import PageHeader, { PastilleIcone } from "../components/common/PageHeader";
import SearchField from "../components/common/SearchField";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { useNotifier } from "../components/common/Notifier";
import EnTeteTriable, { STYLE_EN_TETE } from "../components/common/EnTeteTriable";
import PaginationBar from "../components/common/PaginationBar";
import { useTriTableau } from "../utils/tri";
import { useHauteurCinqLignes } from "../utils/tableau";
import BoutonExport from "../components/common/BoutonExport";

const COMPTE_VIDE = {
  username: "",
  email: "",
  first_name: "",
  last_name: "",
  password: "",
  password_confirm: "",
  role: "AGENT_SDO",
};

function normaliser(donnees) {
  return Array.isArray(donnees) ? donnees : donnees.results || [];
}

function LigneInfo({ label, valeur }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, minWidth: 100 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, textAlign: "right" }}>
        {valeur}
      </Typography>
    </Stack>
  );
}

export default function UtilisateursPage() {
  const { utilisateur: utilisateurConnecte } = useSelector((state) => state.auth);
  const { afficherSucces } = useNotifier();

  const [utilisateurs, setUtilisateurs] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(0);
  const [surPage, setSurPage] = useState(5);

  const [dialogueOuvert, setDialogueOuvert] = useState(false);
  const [utilisateurEnEdition, setUtilisateurEnEdition] = useState(null);
  const [formulaire, setFormulaire] = useState(COMPTE_VIDE);
  const [enCours, setEnCours] = useState(false);
  const [voirMotDePasse, setVoirMotDePasse] = useState(false);
  const [voirConfirmation, setVoirConfirmation] = useState(false);
  const [erreurFormulaire, setErreurFormulaire] = useState("");

  const [dialogueConfirmationActivation, setDialogueConfirmationActivation] = useState({
    ouvert: false, utilisateur: null,
  });
  const [ancrageRole, setAncrageRole] = useState(null);
  const [utilisateurRoleCible, setUtilisateurRoleCible] = useState(null);
  const [confirmationRole, setConfirmationRole] = useState(null);

  const [utilisateurAVoir, setUtilisateurAVoir] = useState(null);
  const [confirmationSuppression, setConfirmationSuppression] = useState(null);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);

  const charger = async () => {
    setChargement(true);
    setErreur("");
    try {
      const data = await listerUtilisateurs();
      setUtilisateurs(normaliser(data));
    } catch {
      setErreur("Impossible de charger la liste des utilisateurs.");
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => { charger(); }, []);

  const utilisateursFiltres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return utilisateurs;
    return utilisateurs.filter((u) =>
      [u.username, u.email, u.first_name, u.last_name, LIBELLES_ROLES[u.role]]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [utilisateurs, recherche]);

  const utilisateursEnrichis = useMemo(
    () => utilisateursFiltres.map((u) => ({
      ...u,
      _nomComplet: `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username,
    })),
    [utilisateursFiltres]
  );

  const { cleTri, directionTri, gererTri, donneesTriees } = useTriTableau(utilisateursEnrichis);
  const utilisateursPaginees = useMemo(
    () => donneesTriees.slice(page * surPage, page * surPage + surPage),
    [donneesTriees, page, surPage]
  );

  const refCadre = useRef(null);
  const hauteurCadre = useHauteurCinqLignes(refCadre, utilisateursPaginees.length);

  const gererRecherche = (valeur) => { setRecherche(valeur); setPage(0); };

  const ouvrirCreation = () => {
    setUtilisateurEnEdition(null);
    setFormulaire(COMPTE_VIDE);
    setVoirMotDePasse(false);
    setVoirConfirmation(false);
    setErreurFormulaire("");
    setDialogueOuvert(true);
  };

  const ouvrirModification = (utilisateur) => {
    setUtilisateurEnEdition(utilisateur);
    setFormulaire({
      username: utilisateur.username,
      email: utilisateur.email || "",
      first_name: utilisateur.first_name || "",
      last_name: utilisateur.last_name || "",
      password: "",
      password_confirm: "",
      role: utilisateur.role,
    });
    setVoirMotDePasse(false);
    setVoirConfirmation(false);
    setErreurFormulaire("");
    setDialogueOuvert(true);
  };

  const validerMotsDePasse = () => {
    const { password, password_confirm } = formulaire;
    if (!utilisateurEnEdition) {
      if (!password) {
        setErreurFormulaire("Le mot de passe est obligatoire.");
        return false;
      }
      if (password !== password_confirm) {
        setErreurFormulaire("Les mots de passe ne correspondent pas.");
        return false;
      }
      return true;
    }
    if (password || password_confirm) {
      if (!password) {
        setErreurFormulaire("Saisissez le nouveau mot de passe.");
        return false;
      }
      if (password !== password_confirm) {
        setErreurFormulaire("Les mots de passe ne correspondent pas.");
        return false;
      }
    }
    return true;
  };

  const gererEnregistrement = async () => {
    setErreurFormulaire("");
    if (!validerMotsDePasse()) return;

    setEnCours(true);
    setErreur("");
    try {
      if (utilisateurEnEdition) {
        const donnees = {
          email: formulaire.email,
          first_name: formulaire.first_name,
          last_name: formulaire.last_name,
          role: formulaire.role,
        };
        if (formulaire.password) donnees.password = formulaire.password;
        await modifierUtilisateur(utilisateurEnEdition.id, donnees);
      } else {
        const { password_confirm, ...payload } = formulaire;
        await creerUtilisateur(payload);
      }
      setDialogueOuvert(false);
      setFormulaire(COMPTE_VIDE);
      afficherSucces(
        utilisateurEnEdition ? "Compte modifié avec succès." : "Compte créé avec succès."
      );
      charger();
    } catch (err) {
      const donnees = err.response?.data;
      const premierMessage = donnees ? Object.values(donnees)[0] : null;
      setErreurFormulaire(
        Array.isArray(premierMessage)
          ? premierMessage[0]
          : premierMessage || "Impossible d'enregistrer ce compte."
      );
    } finally {
      setEnCours(false);
    }
  };

  const gererBasculeActivation = async (utilisateur) => {
    setErreur("");
    try {
      await modifierUtilisateur(utilisateur.id, { is_active: !utilisateur.is_active });
      afficherSucces(
        utilisateur.is_active
          ? `Le compte @${utilisateur.username} a été désactivé.`
          : `Le compte @${utilisateur.username} a été réactivé.`
      );
      charger();
    } catch {
      setErreur("Impossible de modifier ce compte.");
    }
  };

  const demanderBasculeActivation = (utilisateur) => {
    setDialogueConfirmationActivation({ ouvert: true, utilisateur });
  };

  const confirmerBasculeActivation = async () => {
    const u = dialogueConfirmationActivation.utilisateur;
    if (!u) return;
    setDialogueConfirmationActivation({ ouvert: false, utilisateur: null });
    await gererBasculeActivation(u);
  };

  const ouvrirMenuRole = (evenement, utilisateur) => {
    setAncrageRole(evenement.currentTarget);
    setUtilisateurRoleCible(utilisateur);
  };

  const gererChangementRoleMenu = async (nouveauRole) => {
    if (!utilisateurRoleCible) return;
    const u = utilisateurRoleCible;
    setAncrageRole(null);
    setUtilisateurRoleCible(null);
    if (nouveauRole === u.role) return;
    setConfirmationRole({ utilisateur: u, nouveauRole });
  };

  const confirmerChangementRole = async () => {
    const { utilisateur: u, nouveauRole } = confirmationRole || {};
    if (!u) return;
    setConfirmationRole(null);
    setErreur("");
    try {
      await modifierUtilisateur(u.id, { role: nouveauRole });
      afficherSucces(
        `Le rôle de @${u.username} est désormais « ${LIBELLES_ROLES[nouveauRole] || nouveauRole} ».`
      );
      charger();
    } catch {
      setErreur("Impossible de modifier le rôle de ce compte.");
    }
  };

  const ouvrirVoirInfo = (utilisateur) => setUtilisateurAVoir(utilisateur);
  const demanderSuppression = (utilisateur) => setConfirmationSuppression(utilisateur);

  const confirmerSuppression = async () => {
    const cible = confirmationSuppression;
    if (!cible) return;
    setSuppressionEnCours(true);
    setErreur("");
    try {
      await supprimerUtilisateur(cible.id);
      setConfirmationSuppression(null);
      afficherSucces(`Le compte @${cible.username} a été supprimé avec succès.`);
      charger();
    } catch (err) {
      const msg =
        err.response?.data?.detail
        || (typeof err.response?.data === "string" ? err.response.data : null)
        || "Impossible de supprimer ce compte.";
      setErreur(msg);
      setConfirmationSuppression(null);
    } finally {
      setSuppressionEnCours(false);
    }
  };

  const estCompteConnecte = (u) => u?.id === utilisateurConnecte?.id;

  return (
    <Box>
      <PageHeader
        icone={<PeopleIcon />}
        titre="Utilisateurs et rôles"
        sousTitre="Comptes du SGCFC-INM, rôles et statuts d'accès (UC-10, RG14-RG15)."
        centre
        taillePastille={28}
        titreVariant="h6"
      />

      {erreur && (
        <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }} onClose={() => setErreur("")}>
          {erreur}
        </Alert>
      )}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems="center"
        sx={{ mb: 2, justifyContent: "space-between", flexShrink: 0 }}
      >
        <SearchField
          valeur={recherche}
          onChange={(e) => gererRecherche(e.target.value)}
          placeholder="Rechercher par identifiant, nom, email ou rôle…"
          largeur={400}
          sx={{ mb: 0, flexGrow: 1, maxWidth: 400 }}
        />
        <BoutonExport
          surPdf={async () => {
            const e = await import("../utils/exportateur");
            await e.exporterPDF({
              fichier: `Utilisateurs_${Date.now()}.pdf`,
              titre: "Liste des comptes utilisateurs",
              sousTitre: recherche ? `Filtré : ${recherche}` : "",
              meta: e.metaEdition(utilisateursEnrichis.length),
              colonnes: [
                e.colonnePerso("Utilisateur", (u) => `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username, "left"),
                e.colonnePerso("Identifiant", (u) => `@${u.username}`),
                e.colonne("Email", "email", "left"),
                e.colonnePerso("Rôle", (u) => LIBELLES_ROLES[u.role] || u.role),
                e.colonnePerso("Statut", (u) => u.is_active ? "Actif" : "Désactivé"),
                e.colonnePerso("Membre depuis", (u) => u.date_joined ? new Date(u.date_joined).toLocaleDateString("fr-FR") : ""),
              ],
              lignes: utilisateursEnrichis,
            });
          }}
          surExcel={async () => {
            const e = await import("../utils/exportateur");
            await e.exporterExcel({
              fichier: `Utilisateurs_${Date.now()}.xlsx`,
              feuilles: [{
                nom: "Utilisateurs",
                titre: "Liste des comptes utilisateurs",
                sousTitre: recherche ? `Filtré : ${recherche}` : "",
                meta: e.metaEdition(utilisateursEnrichis.length),
                colonnes: [
                  e.colonnePerso("Utilisateur", (u) => `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username, "left"),
                  e.colonnePerso("Identifiant", (u) => `@${u.username}`),
                  e.colonne("Email", "email", "left"),
                  e.colonnePerso("Rôle", (u) => LIBELLES_ROLES[u.role] || u.role),
                  e.colonnePerso("Statut", (u) => u.is_active ? "Actif" : "Désactivé"),
                  e.colonnePerso("Membre depuis", (u) => u.date_joined ? new Date(u.date_joined).toLocaleDateString("fr-FR") : ""),
                ],
                lignes: utilisateursEnrichis,
              }],
            });
          }}
          libelle="Exporter"
          taille="small"
        />
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={ouvrirCreation}
          sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
        >
          Nouveau compte
        </Button>
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
                  <EnTeteTriable cle="_nomComplet" align="left" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    Utilisateur
                  </EnTeteTriable>
                  <EnTeteTriable cle="role" align="center" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    Rôle
                  </EnTeteTriable>
                  <EnTeteTriable cle="email" align="center" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    Email
                  </EnTeteTriable>
                  <EnTeteTriable cle="is_active" align="center" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    Statut
                  </EnTeteTriable>
                  <EnTeteTriable cle="date_joined" align="center" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>
                    Membre depuis
                  </EnTeteTriable>
                  <TableCell align="center" sx={STYLE_EN_TETE}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {utilisateursPaginees.map((u) => {
                  const nomComplet = `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username;
                  return (
                    <TableRow key={u.id} hover>
                      <TableCell align="left">
                        <Stack direction="row" spacing={1.2} alignItems="center">
                          <Avatar
                            src={u.photo || undefined}
                            sx={{
                              width: 30, height: 30, fontSize: 12,
                              bgcolor: COULEURS_ROLES[u.role] || "#455A64",
                            }}
                          >
                            {(u.first_name || u.username || "?").charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                              {nomComplet}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              @{u.username}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>

                      <TableCell align="center">
                        <Chip
                          label={LIBELLES_ROLES[u.role] || u.role}
                          size="small"
                          onClick={(e) => ouvrirMenuRole(e, u)}
                          onDelete={(e) => ouvrirMenuRole(e, u)}
                          deleteIcon={<KeyboardArrowDownIcon />}
                          variant="outlined"
                          sx={{ fontWeight: 600, fontSize: 11.5, cursor: "pointer" }}
                        />
                      </TableCell>

                      <TableCell align="center">{u.email || "—"}</TableCell>

                      {/* Statut : texte coloré, sans cadre */}
                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            color: u.is_active ? "success.main" : "error.main",
                          }}
                        >
                          {u.is_active ? "Actif" : "Désactivé"}
                        </Typography>
                      </TableCell>

                      <TableCell align="center">
                        {u.date_joined
                          ? new Date(u.date_joined).toLocaleDateString("fr-FR")
                          : "—"}
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.3} justifyContent="center">
                          <Tooltip title="Voir les informations">
                            <IconButton size="small" color="info" onClick={() => ouvrirVoirInfo(u)}>
                              <VisibilityOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Modifier le compte">
                            <IconButton size="small" onClick={() => ouvrirModification(u)}>
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={u.is_active ? "Désactiver ce compte" : "Réactiver ce compte"}>
                            <span>
                              <IconButton
                                size="small"
                                color={u.is_active ? "success" : "error"}
                                disabled={estCompteConnecte(u)}
                                onClick={() => demanderBasculeActivation(u)}
                              >
                                {u.is_active
                                  ? <ToggleOnIcon fontSize="small" />
                                  : <ToggleOffIcon fontSize="small" />}
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={estCompteConnecte(u) ? "Vous ne pouvez pas supprimer votre propre compte" : "Supprimer ce compte"}>
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                disabled={estCompteConnecte(u)}
                                onClick={() => demanderSuppression(u)}
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {utilisateursPaginees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 5, color: "text.secondary" }}>
                      {recherche
                        ? "Aucun compte ne correspond à votre recherche."
                        : "Aucun compte utilisateur."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {utilisateursFiltres.length > 0 && (
            <PaginationBar
              compte={utilisateursFiltres.length}
              page={page}
              surPage={surPage}
              onPageChange={setPage}
              onSurPageChange={(nouvelleValeur) => { setSurPage(nouvelleValeur); setPage(0); }}
            />
          )}
        </Paper>
      )}

      <Menu
        anchorEl={ancrageRole}
        open={Boolean(ancrageRole)}
        onClose={() => { setAncrageRole(null); setUtilisateurRoleCible(null); }}
        slotProps={{ paper: { sx: { minWidth: 200 } } }}
      >
        {Object.entries(LIBELLES_ROLES).map(([code, libelle]) => (
          <MenuItem
            key={code}
            selected={utilisateurRoleCible?.role === code}
            onClick={() => gererChangementRoleMenu(code)}
            sx={{ fontSize: 13, fontWeight: 500, minWidth: 200 }}
          >
            {libelle}
          </MenuItem>
        ))}
      </Menu>

      <Dialog open={dialogueOuvert} onClose={() => setDialogueOuvert(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
            <PastilleIcone icone={<PeopleIcon sx={{ fontSize: 18 }} />} taille={32} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
              {utilisateurEnEdition ? `Modifier @${utilisateurEnEdition.username}` : "Nouveau compte"}
            </Typography>
          </Stack>
          <IconButton onClick={() => setDialogueOuvert(false)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            {erreurFormulaire && (
              <Alert severity="error" onClose={() => setErreurFormulaire("")}>
                {erreurFormulaire}
              </Alert>
            )}

            {!utilisateurEnEdition && (
              <TextField
                label="Identifiant"
                fullWidth
                value={formulaire.username}
                onChange={(e) => setFormulaire((f) => ({ ...f, username: e.target.value }))}
                required
              />
            )}
            <TextField
              label="Prénom"
              fullWidth
              value={formulaire.first_name}
              onChange={(e) => setFormulaire((f) => ({ ...f, first_name: e.target.value }))}
            />
            <TextField
              label="Nom"
              fullWidth
              value={formulaire.last_name}
              onChange={(e) => setFormulaire((f) => ({ ...f, last_name: e.target.value }))}
            />
            <TextField
              label="Email"
              type="email"
              fullWidth
              value={formulaire.email}
              onChange={(e) => setFormulaire((f) => ({ ...f, email: e.target.value }))}
            />
            <TextField
              select
              label="Rôle"
              fullWidth
              value={formulaire.role}
              onChange={(e) => setFormulaire((f) => ({ ...f, role: e.target.value }))}
            >
              {Object.entries(LIBELLES_ROLES).map(([code, libelle]) => (
                <MenuItem key={code} value={code}>{libelle}</MenuItem>
              ))}
            </TextField>

            <TextField
              label={utilisateurEnEdition
                ? "Nouveau mot de passe (laisser vide pour conserver)"
                : "Mot de passe"}
              type={voirMotDePasse ? "text" : "password"}
              fullWidth
              value={formulaire.password}
              onChange={(e) => setFormulaire((f) => ({ ...f, password: e.target.value }))}
              required={!utilisateurEnEdition}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setVoirMotDePasse((v) => !v)}
                      onMouseDown={(e) => e.preventDefault()}
                      edge="end"
                      size="small"
                      tabIndex={-1}
                    >
                      {voirMotDePasse ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Confirmer le mot de passe"
              type={voirConfirmation ? "text" : "password"}
              fullWidth
              value={formulaire.password_confirm}
              onChange={(e) => setFormulaire((f) => ({ ...f, password_confirm: e.target.value }))}
              required={!utilisateurEnEdition}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setVoirConfirmation((v) => !v)}
                      onMouseDown={(e) => e.preventDefault()}
                      edge="end"
                      size="small"
                      tabIndex={-1}
                    >
                      {voirConfirmation ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogueOuvert(false)}>Annuler</Button>
          <Button variant="contained" onClick={gererEnregistrement} disabled={enCours}>
            {enCours ? <CircularProgress size={18} /> : (utilisateurEnEdition ? "Enregistrer" : "Créer")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(utilisateurAVoir)}
        onClose={() => setUtilisateurAVoir(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <PastilleIcone
              icone={<VisibilityOutlinedIcon sx={{ fontSize: 18 }} />}
              couleur="info.main"
              taille={32}
            />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Informations du compte
            </Typography>
          </Stack>
          <IconButton onClick={() => setUtilisateurAVoir(null)} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {utilisateurAVoir && (
            <Stack spacing={2} alignItems="center" sx={{ py: 1 }}>
              <Avatar
                src={utilisateurAVoir.photo || undefined}
                sx={{
                  width: 72, height: 72, fontSize: 28,
                  bgcolor: COULEURS_ROLES[utilisateurAVoir.role] || "#455A64",
                }}
              >
                {(utilisateurAVoir.first_name || utilisateurAVoir.username || "?").charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {`${utilisateurAVoir.first_name || ""} ${utilisateurAVoir.last_name || ""}`.trim()
                    || utilisateurAVoir.username}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  @{utilisateurAVoir.username}
                </Typography>
              </Box>
              <Divider sx={{ width: "100%" }} />
              <Stack spacing={1.2} sx={{ width: "100%" }}>
                <LigneInfo label="Email" valeur={utilisateurAVoir.email || "—"} />
                <LigneInfo
                  label="Rôle"
                  valeur={LIBELLES_ROLES[utilisateurAVoir.role] || utilisateurAVoir.role}
                />
                <LigneInfo
                  label="Statut"
                  valeur={utilisateurAVoir.is_active ? "Actif" : "Désactivé"}
                />
                <LigneInfo
                  label="Membre depuis"
                  valeur={
                    utilisateurAVoir.date_joined
                      ? new Date(utilisateurAVoir.date_joined).toLocaleDateString("fr-FR", {
                          day: "2-digit", month: "long", year: "numeric",
                        })
                      : "—"
                  }
                />
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUtilisateurAVoir(null)}>Fermer</Button>
          {utilisateurAVoir && (
            <Button
              variant="outlined"
              startIcon={<EditOutlinedIcon />}
              onClick={() => {
                const u = utilisateurAVoir;
                setUtilisateurAVoir(null);
                ouvrirModification(u);
              }}
            >
              Modifier
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={dialogueConfirmationActivation.ouvert}
        onClose={() => setDialogueConfirmationActivation({ ouvert: false, utilisateur: null })}
        maxWidth="xs"
        fullWidth
      >
        <DialogContent sx={{ textAlign: "center", py: 3 }}>
          {dialogueConfirmationActivation.utilisateur && (
            <>
              <PastilleIcone
                icone={dialogueConfirmationActivation.utilisateur.is_active
                  ? <ToggleOnIcon sx={{ fontSize: 24 }} />
                  : <ToggleOffIcon sx={{ fontSize: 24 }} />}
                couleur={dialogueConfirmationActivation.utilisateur.is_active ? "success.main" : "error.main"}
                taille={52}
              />
              <Typography variant="h6" sx={{ fontWeight: 700, mt: 2, mb: 0.5 }}>
                {dialogueConfirmationActivation.utilisateur.is_active
                  ? "Désactiver ce compte ?"
                  : "Réactiver ce compte ?"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {dialogueConfirmationActivation.utilisateur.is_active
                  ? `Le compte @${dialogueConfirmationActivation.utilisateur.username} ne pourra plus se connecter au SGCFC-INM.`
                  : `Le compte @${dialogueConfirmationActivation.utilisateur.username} pourra à nouveau se connecter.`}
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: "center", pb: 3, gap: 1 }}>
          <Button onClick={() => setDialogueConfirmationActivation({ ouvert: false, utilisateur: null })}>
            Annuler
          </Button>
          <Button
            variant="contained"
            color={dialogueConfirmationActivation.utilisateur?.is_active ? "error" : "success"}
            onClick={confirmerBasculeActivation}
          >
            {dialogueConfirmationActivation.utilisateur?.is_active ? "Désactiver" : "Réactiver"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        ouvert={Boolean(confirmationRole)}
        titre="Modifier le rôle de ce compte ?"
        icone={<PeopleIcon sx={{ fontSize: 24 }} />}
        couleur="warning"
        texteConfirmer="Changer le rôle"
        onConfirmer={confirmerChangementRole}
        onAnnuler={() => setConfirmationRole(null)}
        message={
          confirmationRole
            ? `Le compte @${confirmationRole.utilisateur.username} passera de « ${LIBELLES_ROLES[confirmationRole.utilisateur.role]} » à « ${LIBELLES_ROLES[confirmationRole.nouveauRole] || confirmationRole.nouveauRole} » (RG14).`
            : undefined
        }
      />

      <ConfirmDialog
        ouvert={Boolean(confirmationSuppression)}
        titre="Supprimer ce compte ?"
        message={
          confirmationSuppression
            ? `Le compte @${confirmationSuppression.username} (${LIBELLES_ROLES[confirmationSuppression.role] || confirmationSuppression.role}) sera définitivement supprimé. Cette action est irréversible.`
            : undefined
        }
        icone={<DeleteOutlineIcon sx={{ fontSize: 24 }} />}
        couleur="error"
        texteConfirmer="Supprimer"
        enCours={suppressionEnCours}
        onConfirmer={confirmerSuppression}
        onAnnuler={() => !suppressionEnCours && setConfirmationSuppression(null)}
      />
    </Box>
  );
}