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
  creerEtape, modifierDossier, modifierEtape, recupererCommande, recupererDossier,
} from "../api/commandesApi";
import { creerControle, recupererControlesParDossier } from "../api/controleApi";
import BoutonExport from "../components/common/BoutonExport";
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

// Résultat d'une fiche de contrôle (RG24) — utilisable en comparaison globale
// (devis hors catalogue) ou composant par composant (RG28).
function ResultatControle({ controle, parComposant }) {
  return (
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
              {parComposant ? "Prévisionnel comparé (LigneDevis)" : "Prix de revient estimé au devis"}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {formaterMontant(controle.cout_estime_comparaison)}
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
  );
}

// Formulaire de saisie des consommations réelles (RG23, RG24, RG28) — clé =
// id du composant contrôlé, ou "global" pour un devis hors catalogue.
function FormulaireControle({ cle, valeurs, onChanger, onSoumettre, enCours, erreur }) {
  return (
    <Box component="form" onSubmit={(e) => onSoumettre(e, cle)}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        Saisissez les consommations réelles constatées à la clôture afin de générer
        automatiquement la fiche d'analyse de rentabilité (RG23, RG24).
      </Typography>
      {erreur && <Alert severity="error" sx={{ mb: 2.5 }}>{erreur}</Alert>}
      <Grid container spacing={2} sx={{ maxWidth: 760 }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Coût réel des matières (Ar)"
            type="number"
            size="small"
            fullWidth
            value={valeurs.cout_matieres_reel}
            onChange={(e) => onChanger(cle, { ...valeurs, cout_matieres_reel: e.target.value })}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Coût réel du temps machine (Ar)"
            type="number"
            size="small"
            fullWidth
            value={valeurs.cout_temps_machine_reel}
            onChange={(e) => onChanger(cle, { ...valeurs, cout_temps_machine_reel: e.target.value })}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            label="Marge cible (%)"
            type="number"
            size="small"
            fullWidth
            value={valeurs.marge_cible_pourcentage}
            onChange={(e) => onChanger(cle, { ...valeurs, marge_cible_pourcentage: e.target.value })}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            label="Commentaire (optionnel)"
            size="small"
            fullWidth
            multiline
            minRows={2}
            value={valeurs.commentaire}
            onChange={(e) => onChanger(cle, { ...valeurs, commentaire: e.target.value })}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Button type="submit" variant="contained" disabled={enCours}>
            Clôturer et calculer le prix de revient
          </Button>
        </Grid>
      </Grid>
    </Box>
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

  const [controles, setControles] = useState([]);
  const [chargementControle, setChargementControle] = useState(false);
  // RG28 : un formulaire de contrôle par composant (clé = id du composant),
  // ou "global" pour un devis hors catalogue.
  const [formulairesControle, setFormulairesControle] = useState({});
  const [erreursControle, setErreursControle] = useState({});
  const [commande, setCommande] = useState(null);

  const charger = () => {
    setChargement(true);
    recupererDossier(id)
      .then((d) => {
        setDossier(d);
        // RG28 : le devis du dossier porte les LigneDevis prévisionnelles qui
        // définissent les composants à contrôler à la clôture.
        if (d.commande) {
          recupererCommande(d.commande)
            .then(setCommande)
            .catch(() => setCommande(null));
        }
      })
      .catch(() => setErreur("Impossible de charger ce dossier."))
      .finally(() => setChargement(false));
  };

  const chargerControle = () => {
    setChargementControle(true);
    recupererControlesParDossier(id)
      .then(setControles)
      .catch(() => setControles([]))
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

  const changerFormulaireControle = (cle, valeurs) =>
    setFormulairesControle((s) => ({ ...s, [cle]: valeurs }));

  const gererSoumissionControle = async (evenement, cle) => {
    evenement.preventDefault();
    const composantId = cle === "global" ? null : Number(cle);
    const valeurs = formulairesControle[cle] || {};
    setEnCours(true);
    setErreursControle((s) => ({ ...s, [cle]: "" }));
    try {
      const donnees = await creerControle({
        dossier: dossier.id,
        composant: composantId,
        cout_matieres_reel: valeurs.cout_matieres_reel || 0,
        cout_temps_machine_reel: valeurs.cout_temps_machine_reel || 0,
        marge_cible_pourcentage: valeurs.marge_cible_pourcentage || 20,
        commentaire: valeurs.commentaire || "",
      });
      afficherSucces(
        composantId
          ? "Contrôle du composant enregistré avec succès."
          : "Contrôle du prix de revient enregistré avec succès."
      );
      setControles((s) => [...s, donnees]);
    } catch (error) {
      const detail =
        error?.response?.data?.composant?.[0] ||
        error?.response?.data?.dossier?.[0] ||
        error?.response?.data?.non_field_errors?.[0] ||
        "Impossible d'enregistrer le contrôle du prix de revient.";
      setErreursControle((s) => ({ ...s, [cle]: detail }));
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
  // RG28 : lignes de devis prévisionnelles (une par composant) issues du
  // devis du dossier — elles définissent les contrôles à établir.
  const lignesDevis = commande?.devis?.lignes_devis || [];

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
          <Stack direction="row" spacing={1} alignItems="center">
            <BoutonExport
              surPdf={async () => {
                const { exporterPDF, metaEdition, colonne, colonnePerso, DATE_FR } = await import("../utils/exportateur");
                const metas = [
                  { libelle: "Commande li\u00e9e", valeur: dossier.commande_numero },
                  { libelle: "Atelier", valeur: dossier.atelier_nom },
                  { libelle: "Cr\u00e9\u00e9 le", valeur: DATE_FR(dossier.date_creation) },
                  { libelle: "Avancement", valeur: `${etapesTerminees} / ${etapes.length} \u00e9tape${etapes.length > 1 ? "s" : ""}` },
                ];
                await exporterPDF({
                  fichier: `Dossier_${dossier.numero_dossier}_${Date.now()}.pdf`,
                  titre: `Dossier ${dossier.numero_dossier}`,
                  sousTitre: `Commande ${dossier.commande_numero} \u2014 ${dossier.atelier_nom}`,
                  meta: metaEdition(etapes.length, "\u00c9tapes de production"),
                  colonnes: etapes.length > 0 ? [
                    colonnePerso("#", (_, i) => String(i + 1)),
                    colonne("Libell\u00e9", "libelle", "left"),
                    colonnePerso("Statut", (e) => LIBELLES_STATUT_ETAPE[e.statut] || e.statut),
                    colonnePerso("D\u00e9but", (e) => e.date_debut ? DATE_FR(e.date_debut) : "\u2014"),
                    colonnePerso("Fin", (e) => e.date_fin ? DATE_FR(e.date_fin) : "\u2014"),
                  ] : [],
                  lignes: etapes,
                  note: controles.length > 0
                    ? `Contr\u00f4les de rentabilit\u00e9 : ${controles.length} fiche${controles.length > 1 ? "s" : ""} enregistr\u00e9e${controles.length > 1 ? "s" : ""}.`
                    : "",
                  signatures: [
                    { titre: "Chef d'atelier", nom: "" },
                    { titre: "Agent SDO", nom: "" },
                  ],
                });
              }}
              surExcel={async () => {
                const { exporterExcel, metaEdition, colonne, colonnePerso, DATE_FR, MAINTENANT_FR } = await import("../utils/exportateur");
                await exporterExcel({
                  fichier: `Dossier_${dossier.numero_dossier}_${Date.now()}.xlsx`,
                  feuilles: [
                    {
                      nom: "\u00c9tapes", titre: `Dossier ${dossier.numero_dossier}`,
                      sousTitre: "Avancement de la production",
                      meta: metaEdition(etapes.length, "\u00c9tapes"),
                      colonnes: [
                        colonnePerso("#", (_, i) => String(i + 1)),
                        colonne("Libell\u00e9", "libelle", "left"),
                        colonnePerso("Statut", (e) => LIBELLES_STATUT_ETAPE[e.statut] || e.statut),
                        colonnePerso("D\u00e9but", (e) => e.date_debut ? DATE_FR(e.date_debut) : "\u2014"),
                        colonnePerso("Fin", (e) => e.date_fin ? DATE_FR(e.date_fin) : "\u2014"),
                      ],
                      lignes: etapes,
                    },
                    {
                      nom: "Contr\u00f4les", titre: "Analyse de rentabilit\u00e9",
                      sousTitre: `Dossier ${dossier.numero_dossier}`,
                      meta: metaEdition(controles.length, "Fiches de contr\u00f4le"),
                      colonnes: controles.length > 0 ? [
                        colonnePerso("Composant", (c) => c.composant_designation || "Global", "left"),
                        colonnePerso("Co\u00fbt estim\u00e9", (c) => `${Number(c.cout_estime_comparaison).toLocaleString("fr-FR")} Ar`, "right"),
                        colonnePerso("Co\u00fbt r\u00e9el", (c) => `${Number(c.cout_reel_total).toLocaleString("fr-FR")} Ar`, "right"),
                        colonnePerso("Marge r\u00e9elle", (c) => `${c.marge_reelle_pourcentage}%`, "right"),
                        colonnePerso("Marge cible", (c) => `${c.marge_cible_pourcentage}%`, "right"),
                        colonnePerso("R\u00e9sultat", (c) => LIBELLES_RESULTAT_CONTROLE[c.resultat] || c.resultat),
                      ] : [],
                      lignes: controles,
                    },
                  ],
                });
              }}
              libelle="Exporter"
              taille="small"
            />
            <Chip
              label={LIBELLES_STATUT_PRODUCTION[dossier.statut_production] || dossier.statut_production}
              color={COULEURS_STATUT[dossier.statut_production] || "default"}
              size="small"
            />
          </Stack>
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

      {/* Contrôle du prix de revient (RG23, RG24, RG28) — uniquement après clôture */}
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
                  {lignesDevis.length > 0
                    ? "Analyse de rentabilité composant par composant, comparée aux LigneDevis prévisionnelles (RG28)."
                    : "Fiche d'analyse de rentabilité générée à la clôture du dossier (RG23, RG24)."}
                </Typography>
              </Box>
            </Stack>

            {chargementControle && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                <CircularProgress size={28} />
              </Box>
            )}

            {!chargementControle && lignesDevis.length > 0 && (
              <Stack spacing={2}>
                {lignesDevis.map((ligne) => {
                  const controle = controles.find((c) => c.composant === ligne.composant);
                  return (
                    <Box
                      key={ligne.id}
                      sx={{ p: 2, borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}
                    >
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        spacing={1.5}
                        flexWrap="wrap"
                        useFlexGap
                        sx={{ mb: 1.5 }}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                          Composant {ligne.composant_ordre} — {ligne.composant_designation}
                        </Typography>
                        {controle && (
                          <Chip
                            label={LIBELLES_RESULTAT_CONTROLE[controle.resultat] || controle.resultat}
                            color={COULEURS_RESULTAT_CONTROLE[controle.resultat] || "default"}
                            size="small"
                          />
                        )}
                      </Stack>
                      {ligne.remarque && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5, fontStyle: "italic" }}>
                          Remarque (RG30) : {ligne.remarque}
                        </Typography>
                      )}
                      {controle ? (
                        <ResultatControle controle={controle} parComposant />
                      ) : peutGererProduction ? (
                        <FormulaireControle
                          cle={String(ligne.composant)}
                          valeurs={formulairesControle[String(ligne.composant)] || {
                            cout_matieres_reel: "", cout_temps_machine_reel: "",
                            marge_cible_pourcentage: "20", commentaire: "",
                          }}
                          onChanger={changerFormulaireControle}
                          onSoumettre={gererSoumissionControle}
                          enCours={enCours}
                          erreur={erreursControle[String(ligne.composant)]}
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Le contrôle de ce composant n'a pas encore été établi.
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Stack>
            )}

            {!chargementControle && lignesDevis.length === 0 && (
              controles[0] ? (
                <ResultatControle controle={controles[0]} />
              ) : peutGererProduction ? (
                <FormulaireControle
                  cle="global"
                  valeurs={formulairesControle.global || {
                    cout_matieres_reel: "", cout_temps_machine_reel: "",
                    marge_cible_pourcentage: "20", commentaire: "",
                  }}
                  onChanger={changerFormulaireControle}
                  onSoumettre={gererSoumissionControle}
                  enCours={enCours}
                  erreur={erreursControle.global}
                />
              ) : (
                <Box sx={{ textAlign: "center", py: 3 }}>
                  <Typography color="text.secondary">
                    Le contrôle du prix de revient n'a pas encore été établi pour ce dossier.
                  </Typography>
                </Box>
              )
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
