import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, Menu, MenuItem, Paper,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import PeopleIcon from "@mui/icons-material/People";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useSelector } from "react-redux";

import { creerUtilisateur, listerUtilisateurs, modifierUtilisateur } from "../api/utilisateursApi";
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
  username: "", email: "", first_name: "", last_name: "", password: "", role: "AGENT_SDO",
};

function normaliser(donnees) {
  return Array.isArray(donnees) ? donnees : donnees.results || [];
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

  const [dialogueConfirmationActivation, setDialogueConfirmationActivation] = useState({ ouvert: false, utilisateur: null });
  const [ancrageRole, setAncrageRole] = useState(null);
  const [utilisateurRoleCible, setUtilisateurRoleCible] = useState(null);
  const [confirmationRole, setConfirmationRole] = useState(null);

  const charger = () => {
    setChargement(true);
    listerUtilisateurs()
      .then((d) => setUtilisateurs(normaliser(d)))
      .catch(() => setErreur("Impossible de charger les comptes utilisateurs."))
      .finally(() => setChargement(false));
  };

  useEffect(charger, []);

  const utilisateursFiltres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return utilisateurs;
    return utilisateurs.filter((u) =>
      [u.username, u.email, u.first_name, u.last_name, LIBELLES_ROLES[u.role]]
        .filter(Boolean).some((champ) => String(champ).toLowerCase().includes(q))
    );
  }, [utilisateurs, recherche]);

  // Nom complet calculé pour le tri de la colonne « Utilisateur »
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

  // Cadre mesuré : exactement l'en-tête + 5 lignes, sans barre de
  // défilement à 5 entrées ; elle apparaît dès qu'on augmente l'affichage.
  const refCadre = useRef(null);
  const hauteurCadre = useHauteurCinqLignes(refCadre, utilisateursPaginees.length);

  const gererRecherche = (valeur) => { setRecherche(valeur); setPage(0); };

  const ouvrirCreation = () => {
    setUtilisateurEnEdition(null);
    setFormulaire(COMPTE_VIDE);
    setDialogueOuvert(true);
  };

  const ouvrirModification = (utilisateur) => {
    setUtilisateurEnEdition(utilisateur);
    setFormulaire({
      username: utilisateur.username, email: utilisateur.email || "",
      first_name: utilisateur.first_name || "", last_name: utilisateur.last_name || "",
      password: "", role: utilisateur.role,
    });
    setDialogueOuvert(true);
  };

  const gererEnregistrement = async () => {
    setEnCours(true);
    setErreur("");
    try {
      if (utilisateurEnEdition) {
        const donnees = { email: formulaire.email, first_name: formulaire.first_name, last_name: formulaire.last_name, role: formulaire.role };
        if (formulaire.password) donnees.password = formulaire.password;
        await modifierUtilisateur(utilisateurEnEdition.id, donnees);
      } else {
        await creerUtilisateur(formulaire);
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
      setErreur(Array.isArray(premierMessage) ? premierMessage[0] : premierMessage || "Impossible d'enregistrer ce compte.");
    } finally { setEnCours(false); }
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

      {erreur && <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }} onClose={() => setErreur("")}>{erreur}</Alert>}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="center"
        sx={{ mb: 2, justifyContent: "space-between", flexShrink: 0 }}>
        <SearchField valeur={recherche} onChange={(e) => gererRecherche(e.target.value)}
          placeholder="Rechercher par identifiant, nom, email ou rôle…"
          largeur={400} sx={{ mb: 0, flexGrow: 1, maxWidth: 400 }} />
        <BoutonExport
          surPdf={async () => {
            const e = await import("../utils/exportateur");
            await e.exporterPDF({
              fichier: `Utilisateurs_${Date.now()}.pdf`,
              titre: "Liste des comptes utilisateurs",
              sousTitre: recherche ? `Filtr\u00e9 : ${recherche}` : "",
              meta: e.metaEdition(utilisateursEnrichis.length),
              colonnes: [
                e.colonnePerso("Utilisateur", (u) => `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username, "left"),
                e.colonnePerso("Identifiant", (u) => `@${u.username}`),
                e.colonne("Email", "email", "left"),
                e.colonnePerso("R\u00f4le", (u) => LIBELLES_ROLES[u.role] || u.role),
                e.colonnePerso("Statut", (u) => u.is_active ? "Actif" : "D\u00e9sactiv\u00e9"),
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
                nom: "Utilisateurs", titre: "Liste des comptes utilisateurs",
                sousTitre: recherche ? `Filtr\u00e9 : ${recherche}` : "",
                meta: e.metaEdition(utilisateursEnrichis.length),
                colonnes: [
                  e.colonnePerso("Utilisateur", (u) => `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username, "left"),
                  e.colonnePerso("Identifiant", (u) => `@${u.username}`),
                  e.colonne("Email", "email", "left"),
                  e.colonnePerso("R\u00f4le", (u) => LIBELLES_ROLES[u.role] || u.role),
                  e.colonnePerso("Statut", (u) => u.is_active ? "Actif" : "D\u00e9sactiv\u00e9"),
                  e.colonnePerso("Membre depuis", (u) => u.date_joined ? new Date(u.date_joined).toLocaleDateString("fr-FR") : ""),
                ],
                lignes: utilisateursEnrichis,
              }],
            });
          }}
          libelle="Exporter"
          taille="small"
        />
        <Button variant="contained" size="small" startIcon={<AddIcon />}
          onClick={ouvrirCreation} sx={{ flexShrink: 0, whiteSpace: "nowrap" }}>
          Nouveau compte
        </Button>
      </Stack>

      {chargement ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}><CircularProgress /></Box>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
          <TableContainer ref={refCadre} sx={{ maxHeight: hauteurCadre ?? 320, overflow: "auto" }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell align="left" sx={{ width: 48, ...STYLE_EN_TETE }}>#</TableCell>
                  <EnTeteTriable cle="_nomComplet" align="left" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Utilisateur</EnTeteTriable>
                  <EnTeteTriable cle="email" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Email</EnTeteTriable>
                  <EnTeteTriable cle="role" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Rôle</EnTeteTriable>
                  <EnTeteTriable cle="is_active" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Statut</EnTeteTriable>
                  <EnTeteTriable cle="date_joined" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Membre depuis</EnTeteTriable>
                  <TableCell align="center" sx={STYLE_EN_TETE}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {utilisateursPaginees.map((u, index) => {
                  const nomComplet = `${u.first_name || ""} ${u.last_name || ""}`.trim();
                  const estSoiMeme = u.id === utilisateurConnecte?.id;
                  return (
                    <TableRow key={u.id} hover sx={{
                      "&:last-child td": { borderBottom: 0 },
                      "&:nth-of-type(even)": { bgcolor: "background.default" },
                    }}>
                      <TableCell align="left">
                        <Typography variant="body2" sx={{ fontWeight: 500, color: "text.secondary" }}>
                          {page * surPage + index + 1}
                        </Typography>
                      </TableCell>
                      <TableCell align="left">
                        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ justifyContent: "flex-start" }}>
                          <Avatar src={u.photo || undefined}
                            sx={{ width: 30, height: 30, fontSize: 12, bgcolor: COULEURS_ROLES[u.role] || "#455A64" }}>
                            {(u.first_name?.[0] || u.username?.[0] || "?").toUpperCase()}
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{nomComplet || u.username}</Typography>
                              {estSoiMeme && <Chip label="Vous" size="small" variant="outlined" sx={{ height: 16, fontSize: 9 }} />}
                            </Stack>
                            <Typography variant="caption" color="text.secondary">@{u.username}</Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell align="center">{u.email || "—"}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={LIBELLES_ROLES[u.role] || u.role}
                          size="small"
                          disabled={estSoiMeme}
                          onClick={(e) => !estSoiMeme && ouvrirMenuRole(e, u)}
                          onDelete={!estSoiMeme ? (e) => ouvrirMenuRole(e, u) : undefined}
                          deleteIcon={<KeyboardArrowDownIcon sx={{ fontSize: 14 }} />}
                          sx={{
                            fontWeight: 600, cursor: estSoiMeme ? "default" : "pointer",
                            bgcolor: (theme) => estSoiMeme ? theme.palette.action.hover : alpha(theme.palette.primary.main, 0.08),
                            color: "text.primary",
                            minWidth: 132,
                            "&:hover": !estSoiMeme ? { bgcolor: (t) => alpha(t.palette.primary.main, 0.1) } : {},
                            "& .MuiChip-deleteIcon": { color: "text.secondary", fontSize: 14, mr: 0.25 },
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={u.is_active ? "Actif" : "Désactivé"}
                          color={u.is_active ? "success" : "default"} size="small" sx={{ fontWeight: 600 }} />
                      </TableCell>
                      <TableCell align="center">
                        {u.date_joined ? new Date(u.date_joined).toLocaleDateString("fr-FR") : "—"}
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          <Tooltip title="Modifier le compte">
                            <IconButton size="small" onClick={() => ouvrirModification(u)}>
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={u.is_active ? "Désactiver ce compte" : "Réactiver ce compte"}>
                            <span>
                              <IconButton size="small"
                                color={u.is_active ? "error" : "success"}
                                disabled={estSoiMeme}
                                onClick={() => demanderBasculeActivation(u)}>
                                {u.is_active ? <ToggleOffIcon fontSize="small" /> : <ToggleOnIcon fontSize="small" />}
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
                    <TableCell colSpan={7} align="center" sx={{ py: 5, color: "text.secondary" }}>
                      {recherche ? "Aucun compte ne correspond à votre recherche." : "Aucun compte utilisateur."}
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
          <MenuItem key={code} selected={utilisateurRoleCible?.role === code}
            onClick={() => gererChangementRoleMenu(code)}
            sx={{ fontSize: 13, fontWeight: 500, minWidth: 200 }}>
            {libelle}
          </MenuItem>
        ))}
      </Menu>

      {/* Modale : création / modification d'un compte */}
      <Dialog open={dialogueOuvert} onClose={() => setDialogueOuvert(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
            <PastilleIcone icone={<PeopleIcon sx={{ fontSize: 18 }} />} taille={32} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
              {utilisateurEnEdition ? `Modifier @${utilisateurEnEdition.username}` : "Nouveau compte"}
            </Typography>
          </Stack>
          <IconButton onClick={() => setDialogueOuvert(false)} size="small"><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {utilisateurEnEdition === null && (
              <TextField label="Identifiant" fullWidth required value={formulaire.username}
                onChange={(e) => setFormulaire((f) => ({ ...f, username: e.target.value }))} />
            )}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField label="Prénom" fullWidth value={formulaire.first_name}
                onChange={(e) => setFormulaire((f) => ({ ...f, first_name: e.target.value }))} />
              <TextField label="Nom" fullWidth value={formulaire.last_name}
                onChange={(e) => setFormulaire((f) => ({ ...f, last_name: e.target.value }))} />
            </Stack>
            <TextField label="Email" type="email" fullWidth value={formulaire.email}
              onChange={(e) => setFormulaire((f) => ({ ...f, email: e.target.value }))} />
            <TextField select label="Rôle" fullWidth value={formulaire.role}
              onChange={(e) => setFormulaire((f) => ({ ...f, role: e.target.value }))}
              helperText="Un compte porte un seul rôle à la fois (RG14).">
              {Object.entries(LIBELLES_ROLES).map(([code, libelle]) => (
                <MenuItem key={code} value={code}>{libelle}</MenuItem>
              ))}
            </TextField>
            <TextField label={utilisateurEnEdition ? "Nouveau mot de passe (laisser vide pour conserver)" : "Mot de passe"}
              type="password" fullWidth required={!utilisateurEnEdition} value={formulaire.password}
              onChange={(e) => setFormulaire((f) => ({ ...f, password: e.target.value }))}
              helperText="8 caractères minimum, avec majuscule, chiffre et symbole." />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogueOuvert(false)}>Annuler</Button>
          <Button variant="contained" onClick={gererEnregistrement}
            disabled={enCours || !formulaire.username || (!utilisateurEnEdition && !formulaire.password)}
            startIcon={enCours ? <CircularProgress size={16} color="inherit" /> : undefined}>
            {enCours ? "Enregistrement…" : utilisateurEnEdition ? "Modifier" : "Créer"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialogue de confirmation : activation / désactivation */}
      <Dialog open={dialogueConfirmationActivation.ouvert}
        onClose={() => setDialogueConfirmationActivation({ ouvert: false, utilisateur: null })} maxWidth="xs">
        <DialogContent sx={{ textAlign: "center", py: 3 }}>
          {dialogueConfirmationActivation.utilisateur && (
            <>
              <PastilleIcone
                icone={dialogueConfirmationActivation.utilisateur.is_active
                  ? <ToggleOffIcon sx={{ fontSize: 24 }} />
                  : <ToggleOnIcon sx={{ fontSize: 24 }} />}
                couleur={dialogueConfirmationActivation.utilisateur.is_active ? "error.main" : "success.main"}
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
          <Button variant="contained"
            color={dialogueConfirmationActivation.utilisateur?.is_active ? "error" : "success"}
            onClick={confirmerBasculeActivation}>
            {dialogueConfirmationActivation.utilisateur?.is_active ? "Désactiver" : "Réactiver"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialogue de confirmation : changement de rôle */}
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
    </Box>
  );
}