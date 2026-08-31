import { useState } from "react";
import {
  Alert, Box, Button, CircularProgress, IconButton, InputAdornment, Paper,
  TextField, Typography,
} from "@mui/material";
import LockResetIcon from "@mui/icons-material/LockReset";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import ErrorOutlinedIcon from "@mui/icons-material/ErrorOutlined";
import { useNavigate, useSearchParams } from "react-router-dom";

import { reinitialiserMotDePasse } from "../api/authApi";
import { PastilleIcone } from "../components/common/PageHeader";
import logoInm from "../assets/logo-inm.png";

export default function ReinitialiserMotDePassePage() {
  const navigate = useNavigate();
  const [parametres] = useSearchParams();
  const uid = parametres.get("uid") || "";
  const token = parametres.get("token") || "";

  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [motDePasseVisible, setMotDePasseVisible] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const [reinitialisationReussie, setReinitialisationReussie] = useState(false);

  const lienInvalide = !uid || !token;

  const gererSoumission = async (evenement) => {
    evenement.preventDefault();
    setErreur("");

    if (nouveauMotDePasse !== confirmation) {
      setErreur("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setEnCours(true);
    try {
      await reinitialiserMotDePasse(uid, token, nouveauMotDePasse);
      setReinitialisationReussie(true);
    } catch (err) {
      if (err.response && err.response.data) {
        const donnees = err.response.data;
        if (donnees.nouveau_mot_de_passe) {
          setErreur(donnees.nouveau_mot_de_passe.join(" "));
        } else if (donnees.token) {
          setErreur(donnees.token);
        } else if (donnees.detail) {
          setErreur(donnees.detail);
        } else {
          setErreur("La réinitialisation a échoué. Veuillez réessayer.");
        }
      } else {
        setErreur("Impossible de contacter le serveur. Vérifiez que le backend est démarré.");
      }
    } finally {
      setEnCours(false);
    }
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
        {/* Panneau de marque, masqué sur petit écran */}
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

          {reinitialisationReussie ? (
            <Box sx={{ textAlign: "center" }}>
              <Box sx={{ display: "flex", justifyContent: "center", mb: 1.5 }}>
                <PastilleIcone icone={<CheckCircleOutlinedIcon sx={{ fontSize: 22 }} />} taille={52} couleur="success.main" />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                Mot de passe réinitialisé
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Votre mot de passe a été modifié avec succès. Vous pouvez maintenant
                vous connecter avec votre nouveau mot de passe.
              </Typography>
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={() => navigate("/login")}
                sx={{ py: 1.1, fontWeight: 600, textTransform: "none", boxShadow: "none" }}
              >
                Retour à la connexion
              </Button>
            </Box>
          ) : lienInvalide ? (
            <Box sx={{ textAlign: "center" }}>
              <Box sx={{ display: "flex", justifyContent: "center", mb: 1.5 }}>
                <PastilleIcone icone={<ErrorOutlinedIcon sx={{ fontSize: 22 }} />} taille={52} couleur="error.main" />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                Lien invalide
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Ce lien de réinitialisation est incomplet ou a expiré. Veuillez relancer
                une demande de réinitialisation depuis la page de connexion.
              </Typography>
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={() => navigate("/login")}
                sx={{ py: 1.1, fontWeight: 600, textTransform: "none", boxShadow: "none" }}
              >
                Retour à la connexion
              </Button>
            </Box>
          ) : (
            <>
              <Box sx={{ textAlign: "center", mb: 2.5 }}>
                <Box sx={{ display: "flex", justifyContent: "center", mb: 1.5 }}>
                  <PastilleIcone icone={<LockResetIcon sx={{ fontSize: 22 }} />} taille={52} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.25 }}>
                  Nouveau mot de passe
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Choisissez un nouveau mot de passe pour votre compte SGCFC-INM.
                </Typography>
              </Box>

              {erreur && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {erreur}
                </Alert>
              )}

              <Box component="form" onSubmit={gererSoumission} noValidate>
                <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
                  Nouveau mot de passe
                </Typography>
                <TextField
                  placeholder="Votre nouveau mot de passe"
                  type={motDePasseVisible ? "text" : "password"}
                  size="medium"
                  fullWidth
                  value={nouveauMotDePasse}
                  onChange={(e) => setNouveauMotDePasse(e.target.value)}
                  autoFocus
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

                <Typography variant="body2" sx={{ mt: 2, mb: 0.5, fontWeight: 500 }}>
                  Confirmer le mot de passe
                </Typography>
                <TextField
                  placeholder="Confirmez votre nouveau mot de passe"
                  type={motDePasseVisible ? "text" : "password"}
                  size="medium"
                  fullWidth
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  required
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockOutlinedIcon color="action" />
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
                  disabled={enCours}
                  sx={{
                    mt: 3,
                    py: 1.1,
                    fontWeight: 600,
                    textTransform: "none",
                    fontSize: "0.95rem",
                    boxShadow: "none",
                  }}
                >
                  {enCours ? (
                    <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />
                  ) : null}
                  {enCours ? "Réinitialisation en cours..." : "Réinitialiser le mot de passe"}
                </Button>
              </Box>
            </>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
