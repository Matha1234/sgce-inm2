import { useCallback, useEffect, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Grid, Stack, Typography,
} from "@mui/material";
import PsychologyIcon from "@mui/icons-material/Psychology";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import { useNavigate, useParams } from "react-router-dom";

import { recupererEstimation } from "../api/iaApi";
import PageHeader from "../components/common/PageHeader";
import BoutonExport from "../components/common/BoutonExport";

function formaterMontant(v) {
  if (v == null || v === "") return "—";
  return `${Number(v).toLocaleString("fr-FR")} Ar`;
}

function formaterDate(v) {
  if (!v) return "—";
  return new Date(v).toLocaleString("fr-FR");
}

function LigneInfo({ libelle, valeur }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        gap: 2,
        py: 0.75,
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
        {libelle}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, textAlign: "right" }}>
        {valeur ?? "—"}
      </Typography>
    </Box>
  );
}

const LIBELLES_METHODE = {
  XGBOOST: "XGBoost",
  HEURISTIQUE: "Heuristique",
};

export default function EstimationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [estimation, setEstimation] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur("");
    try {
      const data = await recupererEstimation(id);
      setEstimation(data);
    } catch {
      setErreur("Impossible de charger cette estimation.");
      setEstimation(null);
    } finally {
      setChargement(false);
    }
  }, [id]);

  useEffect(() => {
    charger();
  }, [charger]);

  if (chargement) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: 280 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (erreur || !estimation) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {erreur || "Estimation introuvable."}
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/estimations")}>
          Retour à la liste
        </Button>
      </Box>
    );
  }

  const devisId = estimation.devis_id || estimation.devis;
  const commandeId = estimation.commande_id;

  return (
    <Box>
      <Button
        size="small"
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate("/estimations")}
        sx={{ textTransform: "none", mb: 1 }}
      >
        Liste des estimations
      </Button>

      <PageHeader
        icone={<PsychologyIcon />}
        titre={`Estimation IA #${estimation.id}`}
        sousTitre={
          estimation.commande_numero
            ? `Commande ${estimation.commande_numero}`
            : commandeId
              ? `Commande #${commandeId}`
              : "Estimation enregistrée"
        }
        centre
        taillePastille={28}
        titreVariant="h6"
      />

      <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Chip
          size="small"
          label={LIBELLES_METHODE[estimation.methode] || estimation.methode || estimation.version_modele}
          color={estimation.methode === "XGBOOST" ? "primary" : "default"}
        />
        {estimation.devis_valide != null && (
          <Chip
            size="small"
            label={estimation.devis_valide ? "Devis validé" : "Devis brouillon"}
            color={estimation.devis_valide ? "success" : "warning"}
            variant="outlined"
          />
        )}
        {commandeId && (
          <Button
            size="small"
            startIcon={<OpenInNewIcon />}
            onClick={() => navigate(`/commandes/${commandeId}`)}
            sx={{ textTransform: "none" }}
          >
            Ouvrir la commande
          </Button>
        )}
        {devisId && (
          <Button
            size="small"
            startIcon={<RequestQuoteIcon />}
            onClick={() => navigate(`/devis/${devisId}`)}
            sx={{ textTransform: "none" }}
          >
            Ouvrir le devis
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <BoutonExport
          libelle="Exporter"
          taille="small"
          surPdf={async () => {
            const e = await import("../utils/exportateur");
            await e.exporterPDF({
              fichier: `Estimation_IA_${estimation.id}_${Date.now()}.pdf`,
              titre: `Estimation IA #${estimation.id}`,
              meta: e.metaEdition(1),
              colonnes: [
                e.colonnePerso("Champ", (r) => r.libelle, "left"),
                e.colonnePerso("Valeur", (r) => r.valeur, "left"),
              ],
              lignes: [
                { libelle: "Prix prédit", valeur: formaterMontant(estimation.prix_predit) },
                {
                  libelle: "Durée prédite",
                  valeur:
                    estimation.duree_predite != null
                      ? `${estimation.duree_predite} jour(s)`
                      : "—",
                },
                {
                  libelle: "Méthode",
                  valeur: LIBELLES_METHODE[estimation.methode] || estimation.methode || "—",
                },
                {
                  libelle: "Score de confiance",
                  valeur:
                    estimation.score_confiance != null
                      ? `${estimation.score_confiance} %`
                      : "—",
                },
                { libelle: "Date", valeur: formaterDate(estimation.date_estimation) },
                { libelle: "Commande", valeur: estimation.commande_numero || String(commandeId || "—") },
                { libelle: "Devis", valeur: String(devisId || "—") },
              ],
            });
          }}
        />
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: "100%" }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Prédiction
              </Typography>
              <LigneInfo libelle="Prix prédit" valeur={formaterMontant(estimation.prix_predit)} />
              <LigneInfo
                libelle="Durée prédite"
                valeur={
                  estimation.duree_predite != null
                    ? `${estimation.duree_predite} jour(s)`
                    : "—"
                }
              />
              <LigneInfo
                libelle="Méthode"
                valeur={LIBELLES_METHODE[estimation.methode] || estimation.methode || "—"}
              />
              <LigneInfo libelle="Version modèle" valeur={estimation.version_modele || "—"} />
              <LigneInfo
                libelle="Score de confiance"
                valeur={
                  estimation.score_confiance != null
                    ? `${estimation.score_confiance} %`
                    : "—"
                }
              />
              <LigneInfo
                libelle="Date de l'estimation"
                valeur={formaterDate(estimation.date_estimation)}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: "100%" }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Contexte commande / devis
              </Typography>
              <LigneInfo
                libelle="Commande"
                valeur={estimation.commande_numero || (commandeId ? `#${commandeId}` : "—")}
              />
              <LigneInfo libelle="Organisme" valeur={estimation.organisme_nom || "—"} />
              <LigneInfo libelle="Type de document" valeur={estimation.type_document || "—"} />
              <LigneInfo
                libelle="Quantité"
                valeur={estimation.quantite != null ? String(estimation.quantite) : "—"}
              />
              <LigneInfo libelle="Atelier" valeur={estimation.atelier || "—"} />
              <LigneInfo libelle="Devis" valeur={devisId ? `#${devisId}` : "—"} />
              <LigneInfo
                libelle="Prix de revient (devis)"
                valeur={formaterMontant(estimation.prix_revient_devis)}
              />
              <LigneInfo
                libelle="Prix de vente (devis)"
                valeur={formaterMontant(estimation.prix_vente_devis)}
              />
              <LigneInfo
                libelle="Devis validé"
                valeur={
                  estimation.devis_valide == null
                    ? "—"
                    : estimation.devis_valide
                      ? "Oui"
                      : "Non"
                }
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}