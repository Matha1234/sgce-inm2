import { useEffect, useState } from "react";
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, IconButton, InputAdornment, Paper, Snackbar, Stack,
  TextField, Typography,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutlined";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import CloseIcon from "@mui/icons-material/Close";
import LockResetIcon from "@mui/icons-material/LockReset";
import MailOutlinedIcon from "@mui/icons-material/MailOutlined";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { demanderReinitialisationMotDePasse, recupererProfil, seConnecter } from "../api/authApi";
import { setTokens, setUtilisateur } from "../store/authSlice";
import { PastilleIcone } from "../components/common/PageHeader";
import logoInm from "../assets/logo-inm.png";

const CLE_EVENEMENT_AUTH = "sgcfc_evenement_auth";

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { estAuthentifie } = useSelector((state) => state.auth);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [messageDeconnexion, setMessageDeconnexion] = useState(false);

  const [dialogueMotDePasseOublie, setDialogueMotDePasseOublie] = useState(false);
  const [emailReinitialisation, setEmailReinitialisation] = useState("");
  const [envoiReinitialisation, setEnvoiReinitialisation] = useState(false);
  const [reinitialisationEnvoyee, setReinitialisationEnvoyee] = useState(false);
  const [erreurReinitialisation, setErreurReinitialisation] = useState("");

  useEffect(() => {
    const brut = sessionStorage.getItem(CLE_EVENEMENT_AUTH);
    if (brut) {
      try {
        const evenement = JSON.parse(brut);
        if (evenement?.type === "deconnexion") {
          setMessageDeconnexion(true);
          sessionStorage.removeItem(CLE_EVENEMENT_AUTH);
        }
      } catch {
        sessionStorage.removeItem(CLE_EVENEMENT_AUTH);
      }
    }
  }, []);

  if (estAuthentifie) {
    const destination = location.state?.from?.pathname || "/";
    return <Navigate to={destination} replace />;
  }

  const gererSoumission = async (evenement) => {
    evenement.preventDefault();
    setErreur("");
    setEnCours(true);
    try {
      const { access, refresh } = await seConnecter(username, password);
      dispatch(setTokens({ access, refresh }));
      const profil = await recupererProfil();
      dispatch(setUtilisateur(profil));
      sessionStorage.setItem(
        CLE_EVENEMENT_AUTH,
        JSON.stringify({ type: "connexion", nom: profil?.first_name || profil?.username || "" })
      );
      navigate("/", { replace: true });
    } catch (err) {
      if (err.response && err.response.status === 401) {
        setErreur("Identifiant ou mot de passe incorrect.");
      } else {
        setErreur("Impossible de contacter le serveur. Vérifiez que le backend est démarré.");
      }
    } finally {
      setEnCours(false);
    }
  };

  const gererDemandeReinitialisation = async (evenement) => {
    evenement.preventDefault();
    setErreurReinitialisation("");
    setEnvoiReinitialisation(true);
    try {
      await demanderReinitialisationMotDePasse(emailReinitialisation);
      setReinitialisationEnvoyee(true);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setErreurReinitialisation("Aucun compte actif n'est associé à cette adresse email.");
      } else {
        setErreurReinitialisation("Impossible d'envoyer l'email. Veuillez réessayer plus tard.");
      }
    } finally {
      setEnvoiReinitialisation(false);
    }
  };

  const fermerDialogueMotDePasseOublie = () => {
    setDialogueMotDePasseOublie(false);
    setEmailReinitialisation("");
    setReinitialisationEnvoyee(false);
    setErreurReinitialisation("");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "center",
        bgcolor: "background.default",
      }}
    >
      <Box
        sx={{
          display: "flex",
          width: "100%",
          maxWidth: 860,
          my: { xs: 0, md: 3 },
          borderRadius: { xs: 0, md: 3 },
          overflow: "hidden",
          boxShadow: { xs: "none", md: "0 20px 60px rgba(15, 40, 80, 0.18)" },
        }}
      >
        {/* Panneau de marque, masqué sur petit ecran */}
        <Box
          sx={{
            flex: "1 1 45%",
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
            justifyContent: "space-between",
            p: 3.5,
            background:
              "linear-gradient(160deg, #0d3c73 0%, #123a63 45%, #7a1f2b 130%)",
            color: "#fff",
          }}
        >
          <Box sx={{ textAlign: "center" }}>
            <Box
              sx={{
                bgcolor: "rgba(255,255,255,0.95)",
                display: "inline-block",
                borderRadius: 2,
                px: 2,
                py: 1.25,
                mb: 3.5,
                mx: "auto",
              }}
            >
              <Box component="img" src={logoInm} alt="Imprimerie Nationale de Madagascar" sx={{ width: 130, height: 44, objectFit: "contain" }} />
            </Box>

            <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.3, mb: 4.5, textAlign: "center" }}>
              Système de Gestion des Coûts,
              <br />
              de la Fabrication et du Contrôle du Prix de Revient
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)", textAlign: "center" }}>
              Estimation intelligente des coûts, suivi de la fabrication en temps réel
              et contrôle systématique du prix de revient — Imprimerie
              Nationale de Madagascar.
            </Typography>
          </Box>

          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
            © {new Date().getFullYear()} Imprimerie Nationale de Madagascar — Tous droits réservés.
          </Typography>
        </Box>

        {/* Panneau du formulaire */}
        <Paper
          elevation={0}
          square
          sx={{
            flex: "1 1 55%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            px: { xs: 3, sm: 5, md: 5.5 },
            py: { xs: 4, md: 0 },
            bgcolor: "background.paper",
          }}
        >
          <Box sx={{ display: { xs: "flex", md: "none" }, justifyContent: "center", mb: 3 }}>
            <Box component="img" src={logoInm} alt="Imprimerie Nationale de Madagascar" sx={{ width: 100, height: 34, objectFit: "contain" }} />
          </Box>

          <Box sx={{ textAlign: "center", mb: 2.5 }}>
            <Box sx={{ display: "flex", justifyContent: "center", mb: 1.5 }}>
              <PastilleIcone icone={<LockOutlinedIcon sx={{ fontSize: 22 }} />} taille={52} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.25 }}>
              Connexion
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Accédez à votre espace SGCFC-INM avec vos identifiants professionnels.
            </Typography>
          </Box>

          {erreur && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {erreur}
            </Alert>
          )}

          <Box component="form" onSubmit={gererSoumission} noValidate>
            <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
              Identifiant
            </Typography>
            <TextField
              placeholder="Votre nom d'utilisateur"
              size="medium"
              fullWidth
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutlineIcon color="action" />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Typography variant="body2" sx={{ mt: 2, mb: 0.5, fontWeight: 500 }}>
              Mot de passe
            </Typography>
            <TextField
              placeholder="Votre mot de passe"
              type={motDePasseVisible ? "text" : "password"}
              size="medium"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label={motDePasseVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                        onClick={() => setMotDePasseVisible((v) => !v)}
                        edge="end"
                        tabIndex={-1}
                      >
                        {motDePasseVisible ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              sx={{
                mt: 3,
                py: 1.1,
                fontWeight: 600,
                textTransform: "none",
                fontSize: "0.95rem",
                boxShadow: "none",
              }}
              disabled={enCours}
            >
              {enCours ? "Connexion en cours..." : "Se connecter"}
            </Button>

            <Button
              type="button"
              size="small"
              fullWidth
              onClick={() => setDialogueMotDePasseOublie(true)}
              startIcon={<LockResetIcon sx={{ fontSize: 17 }} />}
              sx={{
                mt: 1.25,
                textTransform: "none",
                fontSize: "0.82rem",
                fontWeight: 500,
                color: "text.secondary",
                "&:hover": { color: "primary.main", bgcolor: "transparent" },
              }}
            >
              Mot de passe oublié ?
            </Button>
          </Box>

          <Divider sx={{ my: 3 }} />
          <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
            Accès réservé au personnel autorisé de l'Imprimerie Nationale de Madagascar.
            <br />
            En cas de difficulté de connexion, contactez l'Administrateur du système.
          </Typography>
        </Paper>
      </Box>

      <Dialog
        open={dialogueMotDePasseOublie}
        onClose={fermerDialogueMotDePasseOublie}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
            <PastilleIcone icone={<LockResetIcon sx={{ fontSize: 18 }} />} taille={32} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
              Mot de passe oublié
            </Typography>
          </Stack>
          <IconButton onClick={fermerDialogueMotDePasseOublie} size="small"><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {reinitialisationEnvoyee ? (
            <Box sx={{ textAlign: "center", py: 2 }}>
              <MarkEmailReadIcon sx={{ fontSize: 44, color: "success.main", mb: 1.5 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                Instructions envoyées
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Un email contenant un bouton « Choisir un nouveau mot de passe » vient
                d'être envoyé à {emailReinitialisation}.
                <br />
                <br />
                Le lien expire dans 30 minutes. Pensez à vérifier vos courriers indésirables.
              </Typography>
            </Box>
          ) : (
            <Box component="form" onSubmit={gererDemandeReinitialisation} noValidate>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Saisissez l'adresse email associée à votre compte : vous recevrez un email
                avec un bouton pour choisir un nouveau mot de passe.
              </Typography>
              <TextField
                placeholder="Votre adresse email"
                type="email"
                size="small"
                fullWidth
                autoFocus
                required
                value={emailReinitialisation}
                onChange={(e) => setEmailReinitialisation(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <MailOutlinedIcon color="action" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              {erreurReinitialisation && (
                <Alert severity="error" sx={{ mt: 1.5 }}>{erreurReinitialisation}</Alert>
              )}
              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="medium"
                disabled={envoiReinitialisation}
                sx={{ mt: 2, py: 0.9, fontWeight: 600, textTransform: "none", boxShadow: "none" }}
              >
                {envoiReinitialisation ? (
                  <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />
                ) : null}
                {envoiReinitialisation ? "Envoi en cours..." : "Envoyer les instructions"}
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: "center" }}>
          <Button onClick={fermerDialogueMotDePasseOublie} variant={reinitialisationEnvoyee ? "contained" : "text"} sx={{ textTransform: "none" }}>
            {reinitialisationEnvoyee ? "Retour à la connexion" : "Annuler"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={messageDeconnexion}
        autoHideDuration={4000}
        onClose={() => setMessageDeconnexion(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" onClose={() => setMessageDeconnexion(false)}>
          Vous avez été déconnecté avec succès.
        </Alert>
      </Snackbar>
    </Box>
  );
}
