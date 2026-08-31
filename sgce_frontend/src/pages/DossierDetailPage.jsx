import { useEffect, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Divider,
  Grid, LinearProgress, MenuItem, Stack, TextField, Typography,
} from "@mui/material";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import AssignmentIcon from "@mui/icons-material/Assignment";
import BusinessIcon from "@mui/icons-material/Business";
import EventIcon from "@mui/icons-material/Event";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import AddIcon from "@mui/icons-material/Add";
import { useParams } from "react-router-dom";
import { alpha } from "@mui/material/styles";
import { useSelector } from "react-redux";

import {
  creerEtape, modifierDossier, modifierEtape, recupererDossier,
} from "../api/commandesApi";
import { creerControle, recupererControleParDossier } from "../api/controleApi";
import {
  COULEURS_RESULTAT_CONTROLE, LIBELLES_RESULTAT_CONTROLE,
  LIBELLES_STATUT_ETAPE, LIBELLES_STATUT_PRODUCTION,
} from "../constants/roles";
import PageHeader, { PastilleIcone } from "../components/common/PageHeader";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { useNotifier } from "../components/common/Notifier";

const COULEURS_STATUT = {
  CREE: "default", A_FAIRE: "default",
  EN_COURS: "warning",
  TERMINE: "success", TERMINEE: "success",
};

function formaterDate(valeur) {
  if (!valeur) return "—";
  return new Date(valeur).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function formaterMontant(valeur) {
  return `${Number(valeur || 0).toLocaleString("fr-FR")} Ar`;
}

// Traitement visuel d'une étape selon son statut : point de couleur sur la
// frise, fond teinté du libellé et couleur du chip.
const COULEURS_ETAPE = {
  A_FAIRE: { principale: "#9e9e9e", chip: "default" },
  EN_COURS: { principale: "#ed6c02", chip: "warning" },
  TERMINEE: { principale: "#2e7d32", chip: "success" },
};

// Pastille d'information (icône + libellé + valeur) pour la carte de synthèse.
function ElementInfo({ icone, libelle, valeur }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <PastilleIcone icone={icone} taille={36} />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.2 }}>
          {libelle}
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 600 }} noWrap>
          {valeur}
        </Typography>
      </Box>
    </Stack>
  );
}

export default function DossierDetailPage() {
  const { id } = useParams();
  const { utilisateur } = useSelector((state) => state.auth);
  const { afficherSucces } = useNotifier();
  const peutGererProduction = utilisateur?.role === "ADMIN" || utilisateur?.role === "CHEF_ATELIER";

  const [dossier, setDossier] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [nouvelleEtape, setNouvelleEtape] = useState("");
  const [confirmationStatutDossier, setConfirmationStatutDossier] = useState(null);

  const [controle, setControle] = useState(null);
  const [chargementControle, setChargementControle] = useState(false);
  const [formulaireControle, setFormulaireControle] = useState({
    cout_matieres_reel: "", cout_temps_machine_reel: "", marge_cible_pourcentage: "20", commentaire: "",
  });
  const [erreurControle, setErreurControle] = useState("");

  const charger = () => {
    setChargement(true);
    recupererDossier(id)
      .then(setDossier)
      .catch(() => setErreur("Impossible de charger ce dossier."))
      .finally(() => setChargement(false));
  };

  const chargerControle = () => {
    setChargementControle(true);
    recupererControleParDossier(id)
      .then(setControle)
      .catch(() => setControle(null))
      .finally(() => setChargementControle(false));
  };

  useEffect(() => {
    charger();
    chargerControle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const gererChangementStatutDossier = async (nouveauStatut) => {
    setConfirmationStatutDossier(null);
    setEnCours(true);
    setErreur("");
    try {
      await modifierDossier(dossier.id, { statut_production: nouveauStatut });
      afficherSucces(
        `Statut du dossier mis à jour : ${LIBELLES_STATUT_PRODUCTION[nouveauStatut] || nouveauStatut}.`
      );
      charger();
    } catch {
      setErreur("Impossible de mettre à jour le statut du dossier.");
    } finally {
      setEnCours(false);
    }
  };

  const gererAjoutEtape = async (evenement) => {
    evenement.preventDefault();
    if (!nouvelleEtape.trim()) return;
    setEnCours(true);
    setErreur("");
    try {
      await creerEtape({ dossier: dossier.id, libelle: nouvelleEtape });
      afficherSucces("Étape ajoutée au dossier avec succès.");
      setNouvelleEtape("");
      charger();
    } catch {
      setErreur("Impossible d'ajouter cette étape.");
    } finally {
      setEnCours(false);
    }
  };

  const gererChangementStatutEtape = async (etapeId, nouveauStatut) => {
    setEnCours(true);
    setErreur("");
    try {
      await modifierEtape(etapeId, { statut: nouveauStatut });
      afficherSucces("Statut de l'étape mis à jour avec succès.");
      charger();
    } catch {
      setErreur("Impossible de mettre à jour le statut de cette étape.");
    } finally {
      setEnCours(false);
    }
  };

  const gererSoumissionControle = async (evenement) => {
    evenement.preventDefault();
    setEnCours(true);
    setErreurControle("");
    try {
      const donnees = await creerControle({
        dossier: dossier.id,
        cout_matieres_reel: formulaireControle.cout_matieres_reel || 0,
        cout_temps_machine_reel: formulaireControle.cout_temps_machine_reel || 0,
        marge_cible_pourcentage: formulaireControle.marge_cible_pourcentage || 20,
        commentaire: formulaireControle.commentaire,
      });
      afficherSucces("Contrôle du prix de revient enregistré avec succès.");
      setControle(donnees);
    } catch (error) {
      const detail =
        error?.response?.data?.dossier?.[0] ||
        error?.response?.data?.non_field_errors?.[0] ||
        "Impossible d'enregistrer le contrôle du prix de revient.";
      setErreurControle(detail);
    } finally {
      setEnCours(false);
    }
  };

  if (chargement) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, mt: 12 }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Chargement du dossier…
        </Typography>
      </Box>
    );
  }

  if (!dossier) {
    return <Alert severity="error">{erreur || "Dossier introuvable."}</Alert>;
  }

  const etapes = dossier.etapes || [];
  const etapesTerminees = etapes.filter((e) => e.statut === "TERMINEE").length;
  const progression = etapes.length > 0 ? Math.round((etapesTerminees / etapes.length) * 100) : 0;

  return (
    <Box>
      {/* En-tête de page : pastille + titre + sous-titre, statut en action */}
      <PageHeader
        icone={<FolderOpenIcon />}
        titre={`Dossier ${dossier.numero_dossier}`}
        sousTitre={`Suivi de fabrication de la commande ${dossier.commande_numero} — atelier ${dossier.atelier_nom}.`}
        centre
        taillePastille={28}
        titreVariant="h6"
        action={
          <Chip
            label={LIBELLES_STATUT_PRODUCTION[dossier.statut_production] || dossier.statut_production}
            color={COULEURS_STATUT[dossier.statut_production] || "default"}
            size="small"
          />
        }
      />

      {erreur && <Alert severity="error" sx={{ mb: 3 }}>{erreur}</Alert>}

      {/* Synthèse du dossier */}
      <Card sx={{ mb: 3, boxShadow: 1 }}>
        <CardContent>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <ElementInfo
                icone={<AssignmentIcon sx={{ fontSize: 18 }} />}
                libelle="Commande liée"
                valeur={dossier.commande_numero}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <ElementInfo
                icone={<BusinessIcon sx={{ fontSize: 18 }} />}
                libelle="Atelier"
                valeur={dossier.atelier_nom}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <ElementInfo
                icone={<EventIcon sx={{ fontSize: 18 }} />}
                libelle="Créé le"
                valeur={formaterDate(dossier.date_creation)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <ElementInfo
                icone={<FactCheckIcon sx={{ fontSize: 18 }} />}
                libelle="Avancement"
                valeur={`${etapesTerminees} / ${etapes.length} étape${etapes.length > 1 ? "s" : ""}`}
              />
            </Grid>
          </Grid>

          {peutGererProduction && (
            <>
              <Divider sx={{ my: 2.5 }} />
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography variant="subtitle2" color="text.secondary">
                  Faire évoluer le dossier :
                </Typography>
                {["CREE", "EN_COURS", "TERMINE"].map((statut) => (
                  <Button
                    key={statut}
                    size="small"
                    variant={dossier.statut_production === statut ? "contained" : "outlined"}
                    disabled={enCours}
                    onClick={() => setConfirmationStatutDossier(statut)}
                  >
                    {LIBELLES_STATUT_PRODUCTION[statut]}
                  </Button>
                ))}
              </Stack>
            </>
          )}
        </CardContent>
      </Card>

      {/* Avancement de la production : frise des étapes */}
      <Card sx={{ boxShadow: 1, mb: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Avancement de la production
            </Typography>
            {etapes.length > 0 && (
              <Chip
                label={`${progression} %`}
                size="small"
                color={progression === 100 ? "success" : progression > 0 ? "warning" : "default"}
                variant="outlined"
              />
            )}
          </Stack>

          {etapes.length > 0 && (
            <LinearProgress
              variant="determinate"
              value={progression}
              sx={{ height: 8, borderRadius: 4, mb: 3 }}
              color={progression === 100 ? "success" : "primary"}
            />
          )}

          {etapes.map((etape, index) => {
            const traitement = COULEURS_ETAPE[etape.statut] || COULEURS_ETAPE.A_FAIRE;
            return (
              <Box key={etape.id} sx={{ display: "flex", gap: 2 }}>
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <Box
                    sx={{
                      width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                      bgcolor: (theme) => alpha(traitement.principale, theme.palette.mode === "dark" ? 0.22 : 0.1), border: "2px solid", borderColor: traitement.principale,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: traitement.principale, fontSize: 13, fontWeight: 700,
                    }}
                  >
                    {index + 1}
                  </Box>
                  {index < etapes.length - 1 && (
                    <Box sx={{ width: 2, flexGrow: 1, bgcolor: "divider", my: 0.5, minHeight: 26 }} />
                  )}
                </Box>
                <Box sx={{ pb: 3, flexGrow: 1, minWidth: 0 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    spacing={1.5}
                    sx={{ px: 1.5, py: 0.75, borderRadius: 1.5, bgcolor: (theme) => alpha(traitement.principale, theme.palette.mode === "dark" ? 0.22 : 0.1) }}
                  >
                    <Typography variant="body1" sx={{ fontWeight: 600 }} noWrap>
                      {etape.libelle}
                    </Typography>
                    {peutGererProduction ? (
                      <TextField
                        select
                        size="small"
                        value={etape.statut}
                        onChange={(e) => gererChangementStatutEtape(etape.id, e.target.value)}
                        sx={{ minWidth: 140, flexShrink: 0 }}
                      >
                        {Object.entries(LIBELLES_STATUT_ETAPE).map(([code, libelle]) => (
                          <MenuItem key={code} value={code}>
                            {libelle}
                          </MenuItem>
                        ))}
                      </TextField>
                    ) : (
                      <Chip
                        label={LIBELLES_STATUT_ETAPE[etape.statut] || etape.statut}
                        size="small"
                        color={traitement.chip}
                      />
                    )}
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ px: 1.5, mt: 0.5, display: "block" }}>
                    Début : {formaterDate(etape.date_debut)} · Fin : {formaterDate(etape.date_fin)}
                  </Typography>
                </Box>
              </Box>
            );
          })}

          {etapes.length === 0 && (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography color="text.secondary">
                Aucune étape enregistrée pour ce dossier.
              </Typography>
            </Box>
          )}

          {peutGererProduction && (
            <>
              <Divider sx={{ my: 2.5 }} />
              <Box component="form" onSubmit={gererAjoutEtape} sx={{ display: "flex", gap: 1 }}>
                <TextField
                  label="Nouvelle étape (ex : impression, numérotation...)"
                  size="small"
                  fullWidth
                  value={nouvelleEtape}
                  onChange={(e) => setNouvelleEtape(e.target.value)}
                />
                <Button type="submit" variant="contained" startIcon={<AddIcon />} disabled={enCours}>
                  Ajouter
                </Button>
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Contrôle du prix de revient (RG23, RG24) — uniquement après clôture */}
      {dossier.statut_production === "TERMINE" && (
        <Card sx={{ boxShadow: 1 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 2 }}>
              <PastilleIcone icone={<FactCheckIcon sx={{ fontSize: 18 }} />} taille={32} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  Contrôle du prix de revient
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Fiche d'analyse de rentabilité générée à la clôture du dossier (RG23, RG24).
                </Typography>
              </Box>
            </Stack>

            {chargementControle && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress size={28} />
              </Box>
            )}

            {!chargementControle && controle && (
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2.5 }}>
                  <Chip
                    label={LIBELLES_RESULTAT_CONTROLE[controle.resultat] || controle.resultat}
                    color={COULEURS_RESULTAT_CONTROLE[controle.resultat] || "default"}
                  />
                  {controle.ecart_significatif && (
                    <Chip label="Écart significatif" color="warning" variant="outlined" />
                  )}
                </Stack>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: "background.default", border: "1px solid", borderColor: "divider" }}>
                      <Typography variant="caption" color="text.secondary">
                        Prix de revient estimé au devis
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {formaterMontant(controle.prix_revient_estime)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: "background.default", border: "1px solid", borderColor: "divider" }}>
                      <Typography variant="caption" color="text.secondary">
                        Coût réel constaté (matières + temps machine)
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {formaterMontant(controle.cout_reel_total)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: "background.default", border: "1px solid", borderColor: "divider" }}>
                      <Typography variant="caption" color="text.secondary">
                        Marge réelle
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {controle.marge_reelle_pourcentage}%
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Box sx={{ p: 2, borderRadius: 1.5, bgcolor: "background.default", border: "1px solid", borderColor: "divider" }}>
                      <Typography variant="caption" color="text.secondary">
                        Marge cible
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {controle.marge_cible_pourcentage}%
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                {controle.commentaire && (
                  <>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2.5 }}>
                      Commentaire
                    </Typography>
                    <Typography variant="body2">{controle.commentaire}</Typography>
                  </>
                )}
              </Box>
            )}

            {!chargementControle && !controle && !peutGererProduction && (
              <Box sx={{ textAlign: "center", py: 3 }}>
                <Typography color="text.secondary">
                  Le contrôle du prix de revient n'a pas encore été établi pour ce dossier.
                </Typography>
              </Box>
            )}

            {!chargementControle && !controle && peutGererProduction && (
              <Box component="form" onSubmit={gererSoumissionControle}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                  Saisissez les consommations réelles constatées à la clôture afin de générer
                  automatiquement la fiche d'analyse de rentabilité (RG23, RG24).
                </Typography>
                {erreurControle && <Alert severity="error" sx={{ mb: 2.5 }}>{erreurControle}</Alert>}
                <Grid container spacing={2} sx={{ maxWidth: 760 }}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Coût réel des matières (Ar)"
                      type="number"
                      size="small"
                      fullWidth
                      value={formulaireControle.cout_matieres_reel}
                      onChange={(e) =>
                        setFormulaireControle({ ...formulaireControle, cout_matieres_reel: e.target.value })
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Coût réel du temps machine (Ar)"
                      type="number"
                      size="small"
                      fullWidth
                      value={formulaireControle.cout_temps_machine_reel}
                      onChange={(e) =>
                        setFormulaireControle({ ...formulaireControle, cout_temps_machine_reel: e.target.value })
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      label="Marge cible (%)"
                      type="number"
                      size="small"
                      fullWidth
                      value={formulaireControle.marge_cible_pourcentage}
                      onChange={(e) =>
                        setFormulaireControle({ ...formulaireControle, marge_cible_pourcentage: e.target.value })
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      label="Commentaire (optionnel)"
                      size="small"
                      fullWidth
                      multiline
                      minRows={2}
                      value={formulaireControle.commentaire}
                      onChange={(e) =>
                        setFormulaireControle({ ...formulaireControle, commentaire: e.target.value })
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Button type="submit" variant="contained" disabled={enCours}>
                      Clôturer et calculer le prix de revient
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialogue : changement de statut du dossier */}
      <ConfirmDialog
        ouvert={Boolean(confirmationStatutDossier)}
        titre="Faire évoluer le dossier ?"
        icone={<FolderOpenIcon sx={{ fontSize: 24 }} />}
        couleur={confirmationStatutDossier === "TERMINE" ? "success" : confirmationStatutDossier === "EN_COURS" ? "warning" : "primary"}
        texteConfirmer={confirmationStatutDossier ? LIBELLES_STATUT_PRODUCTION[confirmationStatutDossier] || "Confirmer" : "Confirmer"}
        enCours={enCours}
        onConfirmer={() => gererChangementStatutDossier(confirmationStatutDossier)}
        onAnnuler={() => setConfirmationStatutDossier(null)}
        message={
          confirmationStatutDossier === "EN_COURS"
            ? "Le dossier passera « En cours » et la commande associée passera au statut « En production »."
            : confirmationStatutDossier === "TERMINE"
              ? "Le dossier sera marqué « Terminé », ce qui autorisera l'émission de la facture définitive (RG13)."
              : "Le dossier repassera « Créé » et la commande associée reviendra au statut « Validée »."
        }
      />
    </Box>
  );
}
