// import { useEffect, useState } from "react";
// import {
//   Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
//   DialogTitle, Divider, IconButton, InputAdornment, Paper, Snackbar, Stack,
//   TextField, Typography,
// } from "@mui/material";
// import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
// import PersonOutlineIcon from "@mui/icons-material/PersonOutlined";
// import Visibility from "@mui/icons-material/Visibility";
// import VisibilityOff from "@mui/icons-material/VisibilityOff";
// import CloseIcon from "@mui/icons-material/Close";
// import LockResetIcon from "@mui/icons-material/LockReset";
// import MailOutlinedIcon from "@mui/icons-material/MailOutlined";
// import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
// import { useDispatch, useSelector } from "react-redux";
// import { Navigate, useLocation, useNavigate } from "react-router-dom";

// import { demanderReinitialisationMotDePasse, recupererProfil, seConnecter } from "../api/authApi";
// import { setTokens, setUtilisateur } from "../store/authSlice";
// import { PastilleIcone } from "../components/common/PageHeader";
// import logoInm from "../assets/logo-inm.png";

// const CLE_EVENEMENT_AUTH = "sgcfc_evenement_auth";

// export default function LoginPage() {
//   const dispatch = useDispatch();
//   const navigate = useNavigate();
//   const location = useLocation();
//   const { estAuthentifie } = useSelector((state) => state.auth);

//   const [username, setUsername] = useState("");
//   const [password, setPassword] = useState("");
//   const [motDePasseVisible, setMotDePasseVisible] = useState(false);
//   const [erreur, setErreur] = useState("");
//   const [enCours, setEnCours] = useState(false);
//   const [messageDeconnexion, setMessageDeconnexion] = useState(false);

//   const [dialogueMotDePasseOublie, setDialogueMotDePasseOublie] = useState(false);
//   const [emailReinitialisation, setEmailReinitialisation] = useState("");
//   const [envoiReinitialisation, setEnvoiReinitialisation] = useState(false);
//   const [reinitialisationEnvoyee, setReinitialisationEnvoyee] = useState(false);
//   const [erreurReinitialisation, setErreurReinitialisation] = useState("");

//   useEffect(() => {
//     const brut = sessionStorage.getItem(CLE_EVENEMENT_AUTH);
//     if (brut) {
//       try {
//         const evenement = JSON.parse(brut);
//         if (evenement?.type === "deconnexion") {
//           setMessageDeconnexion(true);
//           sessionStorage.removeItem(CLE_EVENEMENT_AUTH);
//         }
//       } catch {
//         sessionStorage.removeItem(CLE_EVENEMENT_AUTH);
//       }
//     }
//   }, []);

//   if (estAuthentifie) {
//     const destination = location.state?.from?.pathname || "/";
//     return <Navigate to={destination} replace />;
//   }

//   const gererSoumission = async (evenement) => {
//     evenement.preventDefault();
//     setErreur("");
//     setEnCours(true);
//     try {
//       const { access, refresh } = await seConnecter(username, password);
//       dispatch(setTokens({ access, refresh }));
//       const profil = await recupererProfil();
//       dispatch(setUtilisateur(profil));
//       sessionStorage.setItem(
//         CLE_EVENEMENT_AUTH,
//         JSON.stringify({ type: "connexion", nom: profil?.first_name || profil?.username || "" })
//       );
//       navigate("/", { replace: true });
//     } catch (err) {
//       if (err.response && err.response.status === 401) {
//         setErreur("Identifiant ou mot de passe incorrect.");
//       } else {
//         setErreur("Impossible de contacter le serveur. Vérifiez que le backend est démarré.");
//       }
//     } finally {
//       setEnCours(false);
//     }
//   };

//   const gererDemandeReinitialisation = async (evenement) => {
//     evenement.preventDefault();
//     setErreurReinitialisation("");
//     setEnvoiReinitialisation(true);
//     try {
//       await demanderReinitialisationMotDePasse(emailReinitialisation);
//       setReinitialisationEnvoyee(true);
//     } catch (err) {
//       if (err.response && err.response.status === 404) {
//         setErreurReinitialisation("Aucun compte actif n'est associé à cette adresse email.");
//       } else {
//         setErreurReinitialisation("Impossible d'envoyer l'email. Veuillez réessayer plus tard.");
//       }
//     } finally {
//       setEnvoiReinitialisation(false);
//     }
//   };

//   const fermerDialogueMotDePasseOublie = () => {
//     setDialogueMotDePasseOublie(false);
//     setEmailReinitialisation("");
//     setReinitialisationEnvoyee(false);
//     setErreurReinitialisation("");
//   };

//   return (
//     <Box
//       sx={{
//         minHeight: "100vh",
//         display: "flex",
//         alignItems: "stretch",
//         justifyContent: "center",
//         bgcolor: "background.default",
//       }}
//     >
//       <Box
//         sx={{
//           display: "flex",
//           width: "100%",
//           maxWidth: 860,
//           my: { xs: 0, md: 3 },
//           borderRadius: { xs: 0, md: 3 },
//           overflow: "hidden",
//           boxShadow: { xs: "none", md: "0 20px 60px rgba(15, 40, 80, 0.18)" },
//         }}
//       >
//         {/* Panneau de marque, masqué sur petit ecran */}
//         <Box
//           sx={{
//             flex: "1 1 45%",
//             display: { xs: "none", md: "flex" },
//             flexDirection: "column",
//             justifyContent: "space-between",
//             p: 3.5,
//             background:
//               "linear-gradient(160deg, #0d3c73 0%, #123a63 45%, #7a1f2b 130%)",
//             color: "#fff",
//           }}
//         >
//           <Box sx={{ textAlign: "center" }}>
//             <Box
//               sx={{
//                 bgcolor: "rgba(255,255,255,0.95)",
//                 display: "inline-block",
//                 borderRadius: 2,
//                 px: 2,
//                 py: 1.25,
//                 mb: 3.5,
//                 mx: "auto",
//               }}
//             >
//               <Box component="img" src={logoInm} alt="Imprimerie Nationale de Madagascar" sx={{ width: 130, height: 44, objectFit: "contain" }} />
//             </Box>

//             <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.3, mb: 4.5, textAlign: "center" }}>
//               Système de Gestion des Coûts,
//               <br />
//               de la Fabrication et du Contrôle du Prix de Revient
//             </Typography>
//             <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.85)", textAlign: "center" }}>
//               Estimation intelligente des coûts, suivi de la fabrication en temps réel
//               et contrôle systématique du prix de revient — Imprimerie
//               Nationale de Madagascar.
//             </Typography>
//           </Box>

//           <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
//             © {new Date().getFullYear()} Imprimerie Nationale de Madagascar — Tous droits réservés.
//           </Typography>
//         </Box>

//         {/* Panneau du formulaire */}
//         <Paper
//           elevation={0}
//           square
//           sx={{
//             flex: "1 1 55%",
//             display: "flex",
//             flexDirection: "column",
//             justifyContent: "center",
//             px: { xs: 3, sm: 5, md: 5.5 },
//             py: { xs: 4, md: 0 },
//             bgcolor: "background.paper",
//           }}
//         >
//           <Box sx={{ display: { xs: "flex", md: "none" }, justifyContent: "center", mb: 3 }}>
//             <Box component="img" src={logoInm} alt="Imprimerie Nationale de Madagascar" sx={{ width: 100, height: 34, objectFit: "contain" }} />
//           </Box>

//           <Box sx={{ textAlign: "center", mb: 2.5 }}>
//             <Box sx={{ display: "flex", justifyContent: "center", mb: 1.5 }}>
//               <PastilleIcone icone={<LockOutlinedIcon sx={{ fontSize: 22 }} />} taille={52} />
//             </Box>
//             <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.25 }}>
//               Connexion
//             </Typography>
//             <Typography variant="body2" color="text.secondary">
//               Accédez à votre espace SGCFC-INM avec vos identifiants professionnels.
//             </Typography>
//           </Box>

//           {erreur && (
//             <Alert severity="error" sx={{ mb: 2 }}>
//               {erreur}
//             </Alert>
//           )}

//           <Box component="form" onSubmit={gererSoumission} noValidate>
//             <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 500 }}>
//               Identifiant
//             </Typography>
//             <TextField
//               placeholder="Votre nom d'utilisateur"
//               size="medium"
//               fullWidth
//               value={username}
//               onChange={(e) => setUsername(e.target.value)}
//               autoFocus
//               required
//               slotProps={{
//                 input: {
//                   startAdornment: (
//                     <InputAdornment position="start">
//                       <PersonOutlineIcon color="action" />
//                     </InputAdornment>
//                   ),
//                 },
//               }}
//             />

//             <Typography variant="body2" sx={{ mt: 2, mb: 0.5, fontWeight: 500 }}>
//               Mot de passe
//             </Typography>
//             <TextField
//               placeholder="Votre mot de passe"
//               type={motDePasseVisible ? "text" : "password"}
//               size="medium"
//               fullWidth
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               required
//               slotProps={{
//                 input: {
//                   startAdornment: (
//                     <InputAdornment position="start">
//                       <LockOutlinedIcon color="action" />
//                     </InputAdornment>
//                   ),
//                   endAdornment: (
//                     <InputAdornment position="end">
//                       <IconButton
//                         aria-label={motDePasseVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
//                         onClick={() => setMotDePasseVisible((v) => !v)}
//                         edge="end"
//                         tabIndex={-1}
//                       >
//                         {motDePasseVisible ? <VisibilityOff /> : <Visibility />}
//                       </IconButton>
//                     </InputAdornment>
//                   ),
//                 },
//               }}
//             />

//             <Button
//               type="submit"
//               variant="contained"
//               fullWidth
//               size="large"
//               sx={{
//                 mt: 3,
//                 py: 1.1,
//                 fontWeight: 600,
//                 textTransform: "none",
//                 fontSize: "0.95rem",
//                 boxShadow: "none",
//               }}
//               disabled={enCours}
//             >
//               {enCours ? "Connexion en cours..." : "Se connecter"}
//             </Button>

//             <Button
//               type="button"
//               size="small"
//               fullWidth
//               onClick={() => setDialogueMotDePasseOublie(true)}
//               startIcon={<LockResetIcon sx={{ fontSize: 17 }} />}
//               sx={{
//                 mt: 1.25,
//                 textTransform: "none",
//                 fontSize: "0.82rem",
//                 fontWeight: 500,
//                 color: "text.secondary",
//                 "&:hover": { color: "primary.main", bgcolor: "transparent" },
//               }}
//             >
//               Mot de passe oublié ?
//             </Button>
//           </Box>

//           <Divider sx={{ my: 3 }} />
//           <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
//             Accès réservé au personnel autorisé de l'Imprimerie Nationale de Madagascar.
//             <br />
//             En cas de difficulté de connexion, contactez l'Administrateur du système.
//           </Typography>
//         </Paper>
//       </Box>

//       <Dialog
//         open={dialogueMotDePasseOublie}
//         onClose={fermerDialogueMotDePasseOublie}
//         maxWidth="xs"
//         fullWidth
//       >
//         <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
//           <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
//             <PastilleIcone icone={<LockResetIcon sx={{ fontSize: 18 }} />} taille={32} />
//             <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
//               Mot de passe oublié
//             </Typography>
//           </Stack>
//           <IconButton onClick={fermerDialogueMotDePasseOublie} size="small"><CloseIcon fontSize="small" /></IconButton>
//         </DialogTitle>
//         <DialogContent dividers>
//           {reinitialisationEnvoyee ? (
//             <Box sx={{ textAlign: "center", py: 2 }}>
//               <MarkEmailReadIcon sx={{ fontSize: 44, color: "success.main", mb: 1.5 }} />
//               <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
//                 Instructions envoyées
//               </Typography>
//               <Typography variant="body2" color="text.secondary">
//                 Un email contenant un bouton « Choisir un nouveau mot de passe » vient
//                 d'être envoyé à {emailReinitialisation}.
//                 <br />
//                 <br />
//                 Le lien expire dans 30 minutes. Pensez à vérifier vos courriers indésirables.
//               </Typography>
//             </Box>
//           ) : (
//             <Box component="form" onSubmit={gererDemandeReinitialisation} noValidate>
//               <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
//                 Saisissez l'adresse email associée à votre compte : vous recevrez un email
//                 avec un bouton pour choisir un nouveau mot de passe.
//               </Typography>
//               <TextField
//                 placeholder="Votre adresse email"
//                 type="email"
//                 size="small"
//                 fullWidth
//                 autoFocus
//                 required
//                 value={emailReinitialisation}
//                 onChange={(e) => setEmailReinitialisation(e.target.value)}
//                 slotProps={{
//                   input: {
//                     startAdornment: (
//                       <InputAdornment position="start">
//                         <MailOutlinedIcon color="action" />
//                       </InputAdornment>
//                     ),
//                   },
//                 }}
//               />
//               {erreurReinitialisation && (
//                 <Alert severity="error" sx={{ mt: 1.5 }}>{erreurReinitialisation}</Alert>
//               )}
//               <Button
//                 type="submit"
//                 variant="contained"
//                 fullWidth
//                 size="medium"
//                 disabled={envoiReinitialisation}
//                 sx={{ mt: 2, py: 0.9, fontWeight: 600, textTransform: "none", boxShadow: "none" }}
//               >
//                 {envoiReinitialisation ? (
//                   <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />
//                 ) : null}
//                 {envoiReinitialisation ? "Envoi en cours..." : "Envoyer les instructions"}
//               </Button>
//             </Box>
//           )}
//         </DialogContent>
//         <DialogActions sx={{ px: 3, pb: 2, justifyContent: "center" }}>
//           <Button onClick={fermerDialogueMotDePasseOublie} variant={reinitialisationEnvoyee ? "contained" : "text"} sx={{ textTransform: "none" }}>
//             {reinitialisationEnvoyee ? "Retour à la connexion" : "Annuler"}
//           </Button>
//         </DialogActions>
//       </Dialog>

//       <Snackbar
//         open={messageDeconnexion}
//         autoHideDuration={4000}
//         onClose={() => setMessageDeconnexion(false)}
//         anchorOrigin={{ vertical: "top", horizontal: "center" }}
//       >
//         <Alert severity="success" variant="filled" onClose={() => setMessageDeconnexion(false)}>
//           Vous avez été déconnecté avec succès.
//         </Alert>
//       </Snackbar>
//     </Box>
//   );
// }

import { useEffect, useState } from "react";
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, InputAdornment, keyframes, Paper, Snackbar, Stack,
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
        alignItems: "center",
        justifyContent: "center",
        px: { xs: 1.5, sm: 2 },
        py: 2.5,
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(145deg, #f0f4fa 0%, #dce6f2 45%, #c5d4e8 100%)",
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
          background: "linear-gradient(135deg, rgba(21,101,192,0.18), rgba(123,31,162,0.12))",
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
          background: "linear-gradient(135deg, rgba(183,28,28,0.12), rgba(21,101,192,0.1))",
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
          boxShadow: "0 20px 50px rgba(15, 40, 80, 0.14)",
          border: "1px solid rgba(255,255,255,0.7)",
          bgcolor: "rgba(255,255,255,0.55)",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* ——— Thème ——— */}
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
            background:
              "linear-gradient(165deg, #0d3a6e 0%, #1565c0 55%, #8e2434 130%)",
            color: "#fff",
            position: "relative",
            boxShadow: "inset -12px 0 18px -14px rgba(0,0,0,0.28)",
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
              boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            }}
          >
            <Box
              component="img"
              src={logoInm}
              alt="Imprimerie Nationale de Madagascar"
              sx={{ width: 112, height: 38, objectFit: "contain", display: "block" }}
            />
          </Box>

          <Typography sx={{ fontWeight: 800, fontSize: 18, letterSpacing: 0.3, mb: 0.75 }}>
            SGCFC-INM
          </Typography>
          <Typography
            sx={{
              fontSize: 12.5,
              lineHeight: 1.55,
              color: "rgba(255,255,255,0.9)",
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
              border: "1px solid rgba(255,255,255,0.35)",
              bgcolor: "rgba(255,255,255,0.1)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 0.4,
            }}
          >
            Espace sécurisé
          </Box>
        </Box>

        {/* ——— Formulaire ——— */}
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
            bgcolor: "rgba(255,255,255,0.92)",
          }}
        >
          <Box sx={{ display: { xs: "flex", md: "none" }, justifyContent: "center", mb: 2 }}>
            <Box
              component="img"
              src={logoInm}
              alt="INM"
              sx={{ width: 100, height: 34, objectFit: "contain" }}
            />
          </Box>

          {/* Icône centrée au-dessus de Bienvenue */}
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
                background: "linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)",
                color: "#fff",
                boxShadow: "0 6px 16px rgba(21,101,192,0.32)",
                mb: 1,
              }}
            >
              <LockOutlinedIcon sx={{ fontSize: 24 }} />
            </Box>
            <Typography sx={{ fontWeight: 800, fontSize: 18, mb: 0.3, textAlign: "center" }}>
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
              sx={{
                mb: 1.5,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: "#f7f9fc",
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
              sx={{
                mb: 0.5,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: "#f7f9fc",
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
                sx={{ textTransform: "none", fontSize: 12, fontWeight: 600, px: 0.5 }}
              >
                Mot de passe oublié ?
              </Button>
            </Box>

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={enCours || !username.trim() || !password}
              sx={{
                py: 1.05,
                borderRadius: 2,
                fontWeight: 750,
                fontSize: 13.5,
                textTransform: "none",
                letterSpacing: 0.2,
                boxShadow: "0 6px 16px rgba(21,101,192,0.28)",
                background: "linear-gradient(90deg, #1565c0, #0d47a1)",
                "&:hover": {
                  background: "linear-gradient(90deg, #1976d2, #1565c0)",
                  boxShadow: "0 8px 20px rgba(21,101,192,0.35)",
                },
              }}
            >
              {enCours && <CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />}
              {enCours ? "Connexion…" : "Se connecter"}
            </Button>
          </Box>

          {/* Copyright centré sous le formulaire */}
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
        PaperProps={{ sx: { borderRadius: 2.5 } }}
      >
        <DialogTitle
          sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1.5, px: 2 }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <LockResetIcon color="primary" sx={{ fontSize: 22 }} />
            <Typography sx={{ fontWeight: 700, fontSize: 15 }}>
              Réinitialiser le mot de passe
            </Typography>
          </Stack>
          <IconButton onClick={fermerDialogueMotDePasseOublie} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ px: 2, py: 2 }}>
          {reinitialisationEnvoyee ? (
            <Stack alignItems="center" spacing={1.25} sx={{ py: 1 }}>
              <MarkEmailReadIcon color="success" sx={{ fontSize: 42 }} />
              <Typography variant="body2" textAlign="center" sx={{ fontWeight: 600 }}>
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
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.5 } }}
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