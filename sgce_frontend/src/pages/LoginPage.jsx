import { useEffect, useState } from "react";
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, InputAdornment, keyframes, Paper, Snackbar, Stack,
  TextField, Typography, useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
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
import logoInm from "../assets/logo-inm.png";

const CLE_EVENEMENT_AUTH = "sgcfc_evenement_auth";

const fadeScale = keyframes`
  from { opacity: 0; transform: scale(0.97); }
  to   { opacity: 1; transform: scale(1); }
`;

const drift = keyframes`
  0%   { transform: translate(0, 0); }
  50%  { transform: translate(12px, -10px); }
  100% { transform: translate(0, 0); }
`;

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const sombre = theme.palette.mode === "dark";
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

  // Couleurs dérivées du thème MUI (clair / sombre)
  const primary = theme.palette.primary.main;
  const primaryDark = theme.palette.primary.dark;
  const fondPage = sombre
    ? `linear-gradient(145deg, ${theme.palette.background.default} 0%, ${theme.palette.background.paper} 45%, ${alpha(primary, 0.18)} 100%)`
    : `linear-gradient(145deg, #f0f4fa 0%, #dce6f2 45%, #c5d4e8 100%)`;

  const orbe1 = sombre
    ? `linear-gradient(135deg, ${alpha(primary, 0.28)}, ${alpha("#7b1fa2", 0.16)})`
    : `linear-gradient(135deg, rgba(21,101,192,0.18), rgba(123,31,162,0.12))`;

  const orbe2 = sombre
    ? `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.18)}, ${alpha(primary, 0.14)})`
    : `linear-gradient(135deg, rgba(183,28,28,0.12), rgba(21,101,192,0.1))`;

  const carteBg = sombre
    ? alpha(theme.palette.background.paper, 0.82)
    : "rgba(255,255,255,0.55)";

  const carteBorder = sombre
    ? alpha(theme.palette.common.white, 0.1)
    : "rgba(255,255,255,0.7)";

  const carteOmbre = sombre
    ? "0 24px 56px rgba(0, 0, 0, 0.55)"
    : "0 20px 50px rgba(15, 40, 80, 0.14)";

  const formulaireBg = sombre
    ? alpha(theme.palette.background.paper, 0.95)
    : "rgba(255,255,255,0.92)";

  const champBg = sombre
    ? alpha(theme.palette.common.white, 0.04)
    : "#f7f9fc";

  const gradientMarque = sombre
    ? `linear-gradient(165deg, ${primaryDark} 0%, ${primary} 55%, #5c1822 130%)`
    : "linear-gradient(165deg, #0d3a6e 0%, #1565c0 55%, #8e2434 130%)";

  const gradientBouton = `linear-gradient(90deg, ${primary}, ${primaryDark})`;
  const gradientBoutonHover = sombre
    ? `linear-gradient(90deg, ${theme.palette.primary.light}, ${primary})`
    : "linear-gradient(90deg, #1976d2, #1565c0)";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: { xs: 1.5, sm: 2 },
        py: 2.5,
        position: "relative",
        overflow: "hidden",
        background: fondPage,
        color: "text.primary",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          width: 320,
          height: 320,
          borderRadius: "40% 60% 55% 45%",
          top: -80,
          left: -60,
          background: orbe1,
          animation: `${drift} 12s ease-in-out infinite`,
          pointerEvents: "none",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          width: 260,
          height: 260,
          borderRadius: "55% 45% 40% 60%",
          bottom: -70,
          right: -40,
          background: orbe2,
          animation: `${drift} 15s ease-in-out infinite reverse`,
          pointerEvents: "none",
        }}
      />

      <Box
        sx={{
          display: "flex",
          width: "100%",
          maxWidth: 700,
          minHeight: { md: 400 },
          borderRadius: 3.5,
          overflow: "hidden",
          position: "relative",
          zIndex: 1,
          animation: `${fadeScale} 0.45s ease-out`,
          boxShadow: carteOmbre,
          border: "1px solid",
          borderColor: carteBorder,
          bgcolor: carteBg,
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Panneau marque */}
        <Box
          sx={{
            flex: "1 1 44%",
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            px: 3,
            py: 3,
            background: gradientMarque,
            color: theme.palette.primary.contrastText,
            position: "relative",
            boxShadow: sombre
              ? "inset -12px 0 18px -14px rgba(0,0,0,0.45)"
              : "inset -12px 0 18px -14px rgba(0,0,0,0.28)",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.12), transparent 55%)",
              pointerEvents: "none",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              top: "12%",
              bottom: "12%",
              right: 0,
              width: 1,
              background:
                "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.28) 35%, rgba(255,255,255,0.28) 65%, transparent 100%)",
              pointerEvents: "none",
            }}
          />

          <Box
            sx={{
              bgcolor: "#fff",
              borderRadius: 2,
              px: 1.75,
              py: 1,
              mb: 2.5,
              boxShadow: sombre
                ? "0 8px 24px rgba(0,0,0,0.35)"
                : "0 8px 24px rgba(0,0,0,0.15)",
            }}
          >
            <Box
              component="img"
              src={logoInm}
              alt="Imprimerie Nationale de Madagascar"
              sx={{ width: 112, height: 38, objectFit: "contain", display: "block" }}
            />
          </Box>

          <Typography sx={{ fontWeight: 800, fontSize: 18, letterSpacing: 0.3, mb: 0.75, color: "inherit" }}>
            SGCFC-INM
          </Typography>
          <Typography
            sx={{
              fontSize: 12.5,
              lineHeight: 1.55,
              color: alpha("#fff", 0.9),
              maxWidth: 250,
            }}
          >
            Gestion des coûts, de la fabrication et du contrôle du prix de
            revient pour l&apos;Imprimerie Nationale.
          </Typography>

          <Box
            sx={{
              mt: 2.5,
              px: 1.5,
              py: 0.6,
              borderRadius: 10,
              border: "1px solid",
              borderColor: alpha("#fff", 0.35),
              bgcolor: alpha("#fff", 0.1),
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.4,
              color: "inherit",
            }}
          >
            Espace sécurisé
          </Box>
        </Box>

        {/* Formulaire */}
        <Paper
          elevation={0}
          square
          sx={{
            flex: "1 1 56%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            px: { xs: 2.5, sm: 3.25 },
            py: 3,
            bgcolor: formulaireBg,
            color: "text.primary",
            backgroundImage: "none",
          }}
        >
          <Box sx={{ display: { xs: "flex", md: "none" }, justifyContent: "center", mb: 2 }}>
            <Box
              component="img"
              src={logoInm}
              alt="INM"
              sx={{
                width: 100,
                height: 34,
                objectFit: "contain",
                filter: sombre ? "brightness(1.08)" : "none",
              }}
            />
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              mb: 2,
              textAlign: "center",
            }}
          >
            <Box
              sx={{
                width: 46,
                height: 46,
                borderRadius: 2,
                display: "grid",
                placeItems: "center",
                background: `linear-gradient(135deg, ${primary} 0%, ${primaryDark} 100%)`,
                color: theme.palette.primary.contrastText,
                boxShadow: `0 6px 16px ${alpha(primary, sombre ? 0.45 : 0.32)}`,
                mb: 1,
              }}
            >
              <LockOutlinedIcon sx={{ fontSize: 24 }} />
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: 18, mb: 0.3, textAlign: "center", color: "text.primary" }}>
              Bienvenue
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: 12.5, textAlign: "center", display: "block" }}
            >
              Connectez-vous pour accéder au système.
            </Typography>
          </Box>

          {erreur && (
            <Alert severity="error" sx={{ mb: 1.5, py: 0.2, fontSize: 12.5, borderRadius: 1.5 }}>
              {erreur}
            </Alert>
          )}

          <Box component="form" onSubmit={gererSoumission} noValidate sx={{ width: "100%" }}>
            <TextField
              label="Identifiant"
              size="small"
              fullWidth
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
              autoComplete="username"
              sx={{
                mb: 1.5,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: champBg,
                },
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutlineIcon sx={{ fontSize: 18, color: "primary.main" }} />
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              label="Mot de passe"
              type={motDePasseVisible ? "text" : "password"}
              size="small"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              sx={{
                mb: 0.5,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: champBg,
                },
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ fontSize: 18, color: "primary.main" }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setMotDePasseVisible((v) => !v)}
                        edge="end"
                        tabIndex={-1}
                        size="small"
                        sx={{ color: "text.secondary" }}
                      >
                        {motDePasseVisible ? (
                          <VisibilityOff sx={{ fontSize: 18 }} />
                        ) : (
                          <Visibility sx={{ fontSize: 18 }} />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <Box sx={{ textAlign: "right", mb: 2 }}>
              <Button
                size="small"
                onClick={() => setDialogueMotDePasseOublie(true)}
                sx={{
                  textTransform: "none",
                  fontSize: 12,
                  fontWeight: 600,
                  px: 0.5,
                  color: "primary.main",
                }}
              >
                Mot de passe oublié ?
              </Button>
            </Box>

            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={enCours || !username.trim() || !password}
              sx={{
                py: 1.05,
                borderRadius: 2,
                fontWeight: 750,
                fontSize: 13.5,
                textTransform: "none",
                letterSpacing: 0.2,
                boxShadow: `0 6px 16px ${alpha(primary, sombre ? 0.4 : 0.28)}`,
                background: gradientBouton,
                color: theme.palette.primary.contrastText,
                "&:hover": {
                  background: gradientBoutonHover,
                  boxShadow: `0 8px 20px ${alpha(primary, sombre ? 0.5 : 0.35)}`,
                },
                "&.Mui-disabled": {
                  background: sombre
                    ? alpha(theme.palette.common.white, 0.12)
                    : undefined,
                  color: sombre
                    ? alpha(theme.palette.common.white, 0.35)
                    : undefined,
                },
              }}
            >
              {enCours && <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />}
              {enCours ? "Connexion…" : "Se connecter"}
            </Button>
          </Box>

          <Typography
            variant="caption"
            color="text.disabled"
            sx={{
              mt: 2.25,
              fontSize: 10,
              width: "100%",
              textAlign: "center",
              display: "block",
            }}
          >
            © {new Date().getFullYear()} Imprimerie Nationale de Madagascar
          </Typography>
        </Paper>
      </Box>

      <Dialog
        open={dialogueMotDePasseOublie}
        onClose={fermerDialogueMotDePasseOublie}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: 2.5,
            bgcolor: "background.paper",
            backgroundImage: "none",
            border: "1px solid",
            borderColor: "divider",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            py: 1.5,
            px: 2,
            color: "text.primary",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <LockResetIcon color="primary" sx={{ fontSize: 22 }} />
            <Typography sx={{ fontWeight: 700, fontSize: 15 }}>
              Réinitialiser le mot de passe
            </Typography>
          </Stack>
          <IconButton onClick={fermerDialogueMotDePasseOublie} size="small" sx={{ color: "text.secondary" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ px: 2, py: 2, borderColor: "divider" }}>
          {reinitialisationEnvoyee ? (
            <Stack alignItems="center" spacing={1.25} sx={{ py: 1 }}>
              <MarkEmailReadIcon color="success" sx={{ fontSize: 42 }} />
              <Typography variant="body2" textAlign="center" sx={{ fontWeight: 600, color: "text.primary" }}>
                Instructions envoyées
              </Typography>
              <Typography variant="caption" color="text.secondary" textAlign="center">
                Si un compte est associé à cette adresse, un email de réinitialisation
                vient d&apos;être envoyé.
              </Typography>
            </Stack>
          ) : (
            <Box component="form" onSubmit={gererDemandeReinitialisation} noValidate>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: 13 }}>
                Indiquez l&apos;email de votre compte pour recevoir un lien de
                réinitialisation.
              </Typography>
              <TextField
                placeholder="Adresse email"
                type="email"
                size="small"
                fullWidth
                autoFocus
                required
                value={emailReinitialisation}
                onChange={(e) => setEmailReinitialisation(e.target.value)}
                autoComplete="email"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1.5,
                    bgcolor: champBg,
                  },
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <MailOutlinedIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              {erreurReinitialisation && (
                <Alert severity="error" sx={{ mt: 1.25, py: 0.25, fontSize: 12.5 }}>
                  {erreurReinitialisation}
                </Alert>
              )}
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                size="small"
                disabled={envoiReinitialisation}
                sx={{ mt: 1.75, py: 0.9, borderRadius: 1.5, fontWeight: 700, textTransform: "none" }}
              >
                {envoiReinitialisation && (
                  <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />
                )}
                {envoiReinitialisation ? "Envoi…" : "Envoyer les instructions"}
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 1.5, justifyContent: "center" }}>
          <Button
            onClick={fermerDialogueMotDePasseOublie}
            variant={reinitialisationEnvoyee ? "contained" : "text"}
            color="primary"
            size="small"
            sx={{ textTransform: "none", borderRadius: 1.5 }}
          >
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
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setMessageDeconnexion(false)}
          sx={{ borderRadius: 2 }}
        >
          Vous avez été déconnecté avec succès.
        </Alert>
      </Snackbar>
    </Box>
  );
}