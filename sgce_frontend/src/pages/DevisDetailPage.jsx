import { useCallback, useEffect, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Divider,
  Grid, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from "@mui/material";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PsychologyIcon from "@mui/icons-material/Psychology";
import { useNavigate, useParams } from "react-router-dom";

import { modifierDevis, recupererDevis, recupererCommande } from "../api/commandesApi";
import PageHeader from "../components/common/PageHeader";
import ConfirmDialog from "../components/common/ConfirmDialog";
import BoutonExport from "../components/common/BoutonExport";
import { useNotifier } from "../components/common/Notifier";

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

export default function DevisDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { afficherSucces, afficherErreur } = useNotifier();

  const [devis, setDevis] = useState(null);
  const [commande, setCommande] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [confirmationValidation, setConfirmationValidation] = useState(false);
  const [enCours, setEnCours] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur("");
    try {
      const d = await recupererDevis(id);
      setDevis(d);
      if (d.commande) {
        try {
          const c = await recupererCommande(d.commande);
          setCommande(c);
        } catch {
          setCommande(null);
        }
      }
    } catch {
      setErreur("Impossible de charger ce devis.");
      setDevis(null);
    } finally {
      setChargement(false);
    }
  }, [id]);

  useEffect(() => {
    charger();
  }, [charger]);

  const gererValidation = async () => {
    setEnCours(true);
    try {
      await modifierDevis(id, { valide: true });
      afficherSucces(
        "Devis validé. La commande passe au statut « Validée » et un dossier de fabrication est généré (RG4, RG5, RG8, RG34)."
      );
      setConfirmationValidation(false);
      await charger();
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.dossier_fabrication?.[0] ||
        "Impossible de valider ce devis.";
      afficherErreur(typeof msg === "string" ? msg : "Impossible de valider ce devis.");
    } finally {
      setEnCours(false);
    }
  };

  if (chargement) {
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: 280 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (erreur || !devis) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {erreur || "Devis introuvable."}
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/devis")}>
          Retour à la liste
        </Button>
      </Box>
    );
  }

  const estimation = devis.estimation_ia;
  const options = devis.options || [];
  const lignes = devis.lignes_devis || [];

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Button
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/devis")}
          sx={{ textTransform: "none" }}
        >
          Liste des devis
        </Button>
      </Stack>

      <PageHeader
        icone={<RequestQuoteIcon />}
        titre={`Devis #${devis.id}`}
        sousTitre={
          commande
            ? `Commande ${commande.numero || `#${devis.commande}`} — ${commande.organisme_nom || ""}`
            : `Commande #${devis.commande}`
        }
        centre
        taillePastille={28}
        titreVariant="h6"
      />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
        <Chip
          label={devis.valide ? "Validé" : "Brouillon"}
          color={devis.valide ? "success" : "warning"}
          size="small"
        />
        {devis.pluriannuel && (
          <Chip label={`Pluriannuel (${devis.duree_contrat_annees || "?"} ans)`} size="small" variant="outlined" />
        )}
        <Button
          size="small"
          startIcon={<OpenInNewIcon />}
          onClick={() => navigate(`/commandes/${devis.commande}`)}
          sx={{ textTransform: "none" }}
        >
          Ouvrir la commande
        </Button>
        {estimation && (
          <Button
            size="small"
            startIcon={<PsychologyIcon />}
            onClick={() => navigate(`/estimations/${estimation.id}`)}
            sx={{ textTransform: "none" }}
            disabled={!estimation.id}
          >
            Voir l&apos;estimation IA
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <BoutonExport
          libelle="Exporter"
          taille="small"
          surPdf={async () => {
            const e = await import("../utils/exportateur");
            await e.exporterPDF({
              fichier: `Devis_${devis.id}_${Date.now()}.pdf`,
              titre: `Devis #${devis.id}`,
              sousTitre: commande?.numero ? `Commande ${commande.numero}` : "",
              meta: e.metaEdition(1, `Devis #${devis.id}`),
              colonnes: [
                e.colonnePerso("Champ", (r) => r.libelle, "left"),
                e.colonnePerso("Valeur", (r) => r.valeur, "left"),
              ],
              lignes: [
                { libelle: "N° devis", valeur: String(devis.id) },
                { libelle: "Commande", valeur: String(commande?.numero || devis.commande) },
                { libelle: "Prix de revient", valeur: formaterMontant(devis.prix_revient) },
                { libelle: "Prix de vente", valeur: formaterMontant(devis.prix_vente) },
                { libelle: "Durée production", valeur: `${devis.duree_production ?? "—"} j` },
                { libelle: "Statut", valeur: devis.valide ? "Validé" : "Brouillon" },
                { libelle: "Date", valeur: formaterDate(devis.date_devis) },
              ],
            });
          }}
          surWord={async () => {
            const e = await import("../utils/exportateur");
            await e.exporterWord({
              fichier: `Devis_${devis.id}_${Date.now()}.docx`,
              titre: `Devis #${devis.id}`,
              sousTitre: commande?.numero ? `Commande ${commande.numero}` : "",
              meta: e.metaEdition(1),
              colonnes: [
                e.colonnePerso("Champ", (r) => r.libelle, "left"),
                e.colonnePerso("Valeur", (r) => r.valeur, "left"),
              ],
              lignes: [
                { libelle: "Prix de revient", valeur: formaterMontant(devis.prix_revient) },
                { libelle: "Prix de vente", valeur: formaterMontant(devis.prix_vente) },
                { libelle: "Statut", valeur: devis.valide ? "Validé" : "Brouillon" },
              ],
            });
          }}
        />
        {!devis.valide && (
          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<FactCheckIcon />}
            onClick={() => setConfirmationValidation(true)}
          >
            Valider le devis
          </Button>
        )}
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: "100%" }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Informations générales
              </Typography>
              <LigneInfo libelle="N° devis" valeur={`#${devis.id}`} />
              <LigneInfo
                libelle="Commande"
                valeur={commande?.numero || `#${devis.commande}`}
              />
              <LigneInfo libelle="Organisme" valeur={commande?.organisme_nom || "—"} />
              <LigneInfo libelle="Prix de revient" valeur={formaterMontant(devis.prix_revient)} />
              <LigneInfo libelle="Prix de vente" valeur={formaterMontant(devis.prix_vente)} />
              <LigneInfo
                libelle="Durée de production"
                valeur={devis.duree_production != null ? `${devis.duree_production} jour(s)` : "—"}
              />
              <LigneInfo libelle="Date du devis" valeur={formaterDate(devis.date_devis)} />
              <LigneInfo libelle="Statut" valeur={devis.valide ? "Validé" : "Brouillon"} />
              {devis.produit_catalogue && (
                <LigneInfo libelle="Produit catalogue" valeur={`#${devis.produit_catalogue}`} />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ borderRadius: 2, height: "100%" }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Estimation intelligente (IA)
              </Typography>
              {estimation ? (
                <>
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
                    valeur={estimation.methode || estimation.version_modele || "—"}
                  />
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
                </>
              ) : (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Aucune estimation IA pour ce devis (souvent le cas avec un produit
                  catalogue — calcul déterministe RG27).
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {options.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                  Options de personnalisation (RG33)
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Libellé</TableCell>
                      <TableCell align="right">Surcoût</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {options.map((opt) => (
                      <TableRow key={opt.id}>
                        <TableCell>{opt.libelle || opt.designation || `Option #${opt.id}`}</TableCell>
                        <TableCell align="right">
                          {formaterMontant(opt.surcout ?? opt.montant ?? opt.cout)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
        )}

        {lignes.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                  Lignes de devis (catalogue)
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Composant / libellé</TableCell>
                      <TableCell align="right">Montant</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lignes.map((lig) => (
                      <TableRow key={lig.id || lig.composant}>
                        <TableCell>
                          {lig.libelle || lig.composant_libelle || `Ligne #${lig.id}`}
                        </TableCell>
                        <TableCell align="right">
                          {formaterMontant(lig.montant || lig.cout || lig.prix)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      <ConfirmDialog
        ouvert={confirmationValidation}
        titre="Valider ce devis ?"
        message="La commande passera au statut « Validée » et un dossier de fabrication sera généré automatiquement, avec affectation d'atelier et réservation des matières nécessaires (RG4, RG5, RG8, RG34)."
        icone={<FactCheckIcon sx={{ fontSize: 24 }} />}
        couleur="success"
        texteConfirmer="Valider"
        enCours={enCours}
        onConfirmer={gererValidation}
        onAnnuler={() => setConfirmationValidation(false)}
      />
    </Box>
  );
}