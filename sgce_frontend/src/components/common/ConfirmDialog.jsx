import { Button, CircularProgress, Dialog, DialogActions, DialogContent, Typography } from "@mui/material";
import { PastilleIcone } from "./PageHeader";

/**
 * Dialogue de confirmation réutilisable : demande à l'utilisateur de
 * confirmer ou d'annuler une action avant son exécution (suppression,
 * validation, changement de statut, mouvement de stock, etc.).
 *
 * Props :
 * - ouvert : booléen qui affiche/masque le dialogue
 * - titre : question courte (ex. « Supprimer ce produit ? »)
 * - message? : explication du contexte / de la conséquence
 * - icone : icône affichée dans la pastille centrale
 * - couleur? : "primary" | "error" | "success" | "warning" (défaut "primary")
 * - texteConfirmer? / texteAnnuler? : libellés des boutons
 * - enCours? : désactive les boutons pendant l'exécution
 * - onConfirmer() / onAnnuler() : rappels d'action
 */
export default function ConfirmDialog({
  ouvert,
  titre,
  message,
  icone,
  couleur = "primary",
  texteConfirmer = "Confirmer",
  texteAnnuler = "Annuler",
  enCours = false,
  onConfirmer,
  onAnnuler,
}) {
  return (
    <Dialog open={ouvert} onClose={enCours ? undefined : onAnnuler} maxWidth="xs" fullWidth>
      <DialogContent sx={{ textAlign: "center", py: 3 }}>
        <PastilleIcone icone={icone} couleur={`${couleur}.main`} taille={52} />
        <Typography variant="h6" sx={{ fontWeight: 700, mt: 2, mb: 0.5 }}>
          {titre}
        </Typography>
        {message && (
          <Typography variant="body2" color="text.secondary">
            {message}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: "center", pb: 3, gap: 1 }}>
        <Button onClick={onAnnuler} disabled={enCours}>
          {texteAnnuler}
        </Button>
        <Button
          variant="contained"
          color={couleur}
          onClick={onConfirmer}
          disabled={enCours}
          startIcon={enCours ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {enCours ? "Traitement…" : texteConfirmer}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
