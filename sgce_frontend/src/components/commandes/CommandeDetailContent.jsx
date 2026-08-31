import { useEffect, useState } from "react";
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, Divider,
  FormControlLabel, MenuItem, Stack, TextField, Typography,
} from "@mui/material";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import {
  creerDevis, creerDossier, modifierDevis, recupererCommande,
} from "../../api/commandesApi";
import {
  estimerPrixRevientCatalogue, listerProduits,
} from "../../api/catalogueApi";
import ConfirmDialog from "../common/ConfirmDialog";
import { useNotifier } from "../common/Notifier";
import {
  COULEURS_STATUT_COMMANDE, LIBELLES_NATURE_COMMANDE, LIBELLES_STATUT_COMMANDE,
} from "../../constants/roles";

function LigneInfo({ libelle, valeur }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.6 }}>
      <Typography variant="body2" color="text.secondary">
        {libelle}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, textAlign: "right" }}>
        {valeur ?? "—"}
      </Typography>
    </Box>
  );
}

/**
 * Contenu "Informations générales + Devis" d'une commande, pensé pour être
 * affiché dans une modale (CommandesListPage) mais réutilisable ailleurs.
 *
 * Props :
 * - commandeId : identifiant de la commande à afficher
 * - onClose() : appelé quand l'utilisateur souhaite fermer la modale
 * - onDossierCreated?() : appelé après création réussie d'un dossier de fabrication
 */
export default function CommandeDetailContent({ commandeId, onClose, onDossierCreated }) {
  const navigate = useNavigate();
  const { afficherSucces } = useNotifier();
  const { utilisateur } = useSelector((state) => state.auth);
  const peutGererDevis = utilisateur?.role === "ADMIN" || utilisateur?.role === "AGENT_SDO";

  const [commande, setCommande] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);

  const [confirmationValidationDevis, setConfirmationValidationDevis] = useState(false);
  const [confirmationCreationDossier, setConfirmationCreationDossier] = useState(false);

  const [prixRevient, setPrixRevient] = useState("");
  const [prixVente, setPrixVente] = useState("");
  const [dureeProduction, setDureeProduction] = useState(1);
  const [pluriannuel, setPluriannuel] = useState(false);
  const [dureeContratAnnees, setDureeContratAnnees] = useState(5);

  // Mise à jour STI (RG27) : le devis instancie un produit du catalogue,
  // dont la structure de coût (composants, nomenclature, gamme) est déjà
  // configurée. La sélection déclenche le calcul déterministe du prix de
  // revient côté serveur.
  const [produitsCatalogue, setProduitsCatalogue] = useState([]);
  const [produitCatalogueId, setProduitCatalogueId] = useState("");
  const [estimationCatalogue, setEstimationCatalogue] = useState(null);

  const charger = () => {
    setChargement(true);
    recupererCommande(commandeId)
      .then(setCommande)
      .catch(() => setErreur("Impossible de charger cette commande."))
      .finally(() => setChargement(false));
  };

  useEffect(() => {
    charger();
    listerProduits()
      .then((donnees) => {
        const liste = Array.isArray(donnees) ? donnees : donnees.results || [];
        setProduitsCatalogue(liste.filter((p) => p.actif));
      })
      .catch(() => {
        // silencieux : le catalogue est optionnel pour un devis hors catalogue
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commandeId]);

  const gererChoixProduitCatalogue = async (id) => {
    setProduitCatalogueId(id);
    if (!id) {
      setEstimationCatalogue(null);
      return;
    }
    setEstimationCatalogue({ enCours: true, donnees: null, erreur: null });
    try {
      // RG27 : calcul déterministe composant par composant à partir de la
      // nomenclature du produit, pour la quantité de la commande.
      const donnees = await estimerPrixRevientCatalogue(id, commande.quantite);
      setEstimationCatalogue({ enCours: false, donnees, erreur: null });
      setPrixRevient(String(donnees.prix_revient_catalogue));
    } catch {
      setEstimationCatalogue({
        enCours: false,
        donnees: null,
        erreur: "Impossible de calculer le prix de revient depuis le catalogue (vérifiez la nomenclature du produit).",
      });
    }
  };

  const gererCreationDevis = async (evenement) => {
    evenement.preventDefault();
    setErreur("");
    if (!produitCatalogueId && !prixRevient) {
      setErreur("Sélectionnez un produit du catalogue ou saisissez un prix de revient (RG27).");
      return;
    }
    setEnCours(true);
    try {
      await creerDevis({
        commande: commande.id,
        produit_catalogue: produitCatalogueId || null,
        prix_revient: prixRevient || null,
        prix_vente: prixVente,
        duree_production: dureeProduction,
        pluriannuel,
        duree_contrat_annees: pluriannuel ? dureeContratAnnees : null,
      });
      afficherSucces("Devis créé avec succès.");
      charger();
    } catch (err) {
      const donnees = err.response?.data;
      setErreur(donnees ? JSON.stringify(donnees) : "Impossible de créer le devis.");
    } finally {
      setEnCours(false);
    }
  };

  const gererValidationDevis = async () => {
    setConfirmationValidationDevis(false);
    setErreur("");
    setEnCours(true);
    try {
      await modifierDevis(commande.devis.id, { valide: true });
      afficherSucces("Devis validé avec succès. La commande est désormais validée.");
      charger();
    } catch (err) {
      const donnees = err.response?.data;
      setErreur(donnees ? JSON.stringify(donnees) : "Impossible de valider le devis.");
    } finally {
      setEnCours(false);
    }
  };

  const gererCreationDossier = async () => {
    setConfirmationCreationDossier(false);
    setErreur("");
    setEnCours(true);
    try {
      const dossier = await creerDossier({ commande: commande.id });
      afficherSucces(`Dossier de fabrication ${dossier.numero_dossier} créé avec succès.`);
      onDossierCreated?.();
      navigate(`/dossiers/${dossier.id}`);
    } catch (err) {
      const donnees = err.response?.data;
      setErreur(donnees ? JSON.stringify(donnees) : "Impossible de créer le dossier de fabrication.");
    } finally {
      setEnCours(false);
    }
  };

  if (chargement) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!commande) {
    return <Alert severity="error">{erreur || "Commande introuvable."}</Alert>;
  }

  const devis = commande.devis;
  const estimation = devis?.estimation_ia;
  const produitCatalogueNom = devis?.produit_catalogue
    ? produitsCatalogue.find((p) => p.id === devis.produit_catalogue)?.nom || `Produit #${devis.produit_catalogue}`
    : null;

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5, flexWrap: "wrap" }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Commande {commande.numero}
        </Typography>
        <Chip
          label={LIBELLES_STATUT_COMMANDE[commande.statut] || commande.statut}
          color={COULEURS_STATUT_COMMANDE[commande.statut] || "default"}
          size="small"
        />
      </Box>

      {erreur && <Alert severity="error" sx={{ mb: 2, wordBreak: "break-word" }}>{erreur}</Alert>}

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
        <Box sx={{ flex: "1 1 320px", minWidth: 280 }}>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
            Informations générales
          </Typography>
          <Box sx={{ mt: 0.5 }}>
            <LigneInfo libelle="Organisme" valeur={commande.organisme_nom} />
            <LigneInfo
              libelle="Nature"
              valeur={LIBELLES_NATURE_COMMANDE[commande.nature] || commande.nature}
            />
            <LigneInfo libelle="Type de document" valeur={commande.type_document} />
            <LigneInfo libelle="Quantité" valeur={commande.quantite} />
            <LigneInfo libelle="Atelier prévisionnel" valeur={commande.atelier} />
            <LigneInfo libelle="Délai contractuel" valeur={commande.delai_contractuel} />
            <LigneInfo
              libelle="Date de commande"
              valeur={new Date(commande.date_commande).toLocaleDateString("fr-FR")}
            />
          </Box>

          {devis?.valide && (
            <Box sx={{ mt: 2.5 }}>
              {commande.a_un_dossier ? (
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => { onClose?.(); navigate(`/dossiers`); }}
                >
                  Voir le dossier de fabrication
                </Button>
              ) : commande.statut === "VALIDEE" ? (
                <Button variant="contained" fullWidth onClick={() => setConfirmationCreationDossier(true)} disabled={enCours}>
                  Créer le dossier de fabrication
                </Button>
              ) : (
                <Box>
                  <Button variant="contained" fullWidth disabled>
                    Créer le dossier de fabrication
                  </Button>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", textAlign: "center", mt: 0.75 }}
                  >
                    Le dossier de fabrication ne peut être créé que pour une commande
                    validée (RG5).
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>

        <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", sm: "block" } }} />

        <Box sx={{ flex: "2 1 380px", minWidth: 300 }}>
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
            Devis
          </Typography>

          <Box sx={{ mt: 0.5 }}>
            {!devis && !peutGererDevis && (
              <Typography color="text.secondary">Aucun devis n'a encore été établi.</Typography>
            )}

            {!devis && peutGererDevis && (
              <Box component="form" onSubmit={gererCreationDevis}>
                {produitsCatalogue.length > 0 && (
                  <>
                    <TextField
                      select
                      label="Produit du catalogue (STI — RG27)"
                      value={produitCatalogueId}
                      onChange={(e) => gererChoixProduitCatalogue(e.target.value)}
                      fullWidth
                      margin="dense"
                      helperText="Instancie la structure de coût configurée (composants, nomenclature, gamme)."
                    >
                      <MenuItem value="">— Hors catalogue (saisie manuelle) —</MenuItem>
                      {produitsCatalogue.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.nom} — {p.famille_nom}
                        </MenuItem>
                      ))}
                    </TextField>
                    {estimationCatalogue?.enCours && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, my: 1 }}>
                        <CircularProgress size={16} />
                        <Typography variant="body2" color="text.secondary">
                          Calcul du prix de revient depuis la nomenclature…
                        </Typography>
                      </Box>
                    )}
                    {estimationCatalogue?.donnees && (
                      <Alert severity="success" sx={{ my: 1 }}>
                        Prix de revient calculé composant par composant pour{" "}
                        <strong>{estimationCatalogue.donnees.quantite}</strong> exemplaire
                        {estimationCatalogue.donnees.quantite > 1 ? "s" : ""} :{" "}
                        <strong>{Number(estimationCatalogue.donnees.prix_revient_catalogue).toLocaleString("fr-FR")} Ar</strong>
                      </Alert>
                    )}
                    {estimationCatalogue?.erreur && (
                      <Alert severity="warning" sx={{ my: 1 }}>{estimationCatalogue.erreur}</Alert>
                    )}
                  </>
                )}

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="Prix de revient (Ar)"
                    type="number"
                    value={prixRevient}
                    onChange={(e) => setPrixRevient(e.target.value)}
                    required={!produitCatalogueId}
                    fullWidth
                    margin="dense"
                    helperText={produitCatalogueId ? "Calculé automatiquement depuis le catalogue." : undefined}
                  />
                  <TextField
                    label="Prix de vente (Ar)"
                    type="number"
                    value={prixVente}
                    onChange={(e) => setPrixVente(e.target.value)}
                    required
                    fullWidth
                    margin="dense"
                  />
                </Stack>
                <TextField
                  label="Durée de production estimée (jours)"
                  type="number"
                  value={dureeProduction}
                  onChange={(e) => setDureeProduction(e.target.value)}
                  fullWidth
                  margin="dense"
                  slotProps={{ htmlInput: { min: 1 } }}
                />

                <FormControlLabel
                  sx={{ mt: 1 }}
                  control={
                    <Checkbox
                      checked={pluriannuel}
                      onChange={(e) => setPluriannuel(e.target.checked)}
                    />
                  }
                  label="Marché public à prix fixe pluriannuel"
                />

                {pluriannuel && (
                  <>
                    <TextField
                      select
                      label="Durée du contrat (années)"
                      value={dureeContratAnnees}
                      onChange={(e) => setDureeContratAnnees(Number(e.target.value))}
                      fullWidth
                      margin="dense"
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <MenuItem key={n} value={n}>
                          {n} an{n > 1 ? "s" : ""}
                        </MenuItem>
                      ))}
                    </TextField>
                    <Alert severity="info" sx={{ mt: 1 }}>
                      Le taux d'inflation projeté et le prix de vente équilibré seront
                      calculés automatiquement à partir de l'historique de l'INM (RG22).
                    </Alert>
                  </>
                )}

                <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={enCours}>
                  {enCours ? "Création..." : "Créer le devis"}
                </Button>
              </Box>
            )}

            {devis && (
              <>
                <LigneInfo
                  libelle="Produit du catalogue"
                  valeur={produitCatalogueNom || "Hors catalogue (saisie manuelle)"}
                />
                <LigneInfo libelle="Prix de revient" valeur={`${devis.prix_revient} Ar`} />
                <LigneInfo libelle="Prix de vente" valeur={`${devis.prix_vente} Ar`} />
                <LigneInfo libelle="Durée de production" valeur={`${devis.duree_production} j`} />
                <LigneInfo
                  libelle="Statut"
                  valeur={devis.valide ? "Validé" : "En attente de validation"}
                />

                {devis.pluriannuel && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Marché pluriannuel
                    </Typography>
                    <LigneInfo libelle="Durée du contrat" valeur={`${devis.duree_contrat_annees} ans`} />
                    <LigneInfo
                      libelle="Taux d'inflation projeté"
                      valeur={devis.taux_inflation_projete ? `${devis.taux_inflation_projete} %` : "—"}
                    />
                  </>
                )}

                {estimation && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Estimation intelligente des coûts (IA)
                    </Typography>
                    <LigneInfo libelle="Prix prédit" valeur={`${estimation.prix_predit} Ar`} />
                    <LigneInfo libelle="Durée prédite" valeur={`${estimation.duree_predite} j`} />
                    <LigneInfo libelle="Version du modèle" valeur={estimation.version_modele} />
                  </>
                )}

                {!devis.valide && peutGererDevis && (
                  <Button
                    variant="contained"
                    color="success"
                    sx={{ mt: 2 }}
                    onClick={() => setConfirmationValidationDevis(true)}
                    disabled={enCours}
                  >
                    Valider le devis
                  </Button>
                )}
              </>
            )}
          </Box>
        </Box>
      </Box>

      {/* Dialogue : validation du devis */}
      <ConfirmDialog
        ouvert={confirmationValidationDevis}
        titre="Valider ce devis ?"
        message="La commande passera au statut « Validée » et pourra recevoir un dossier de fabrication (RG5)."
        icone={<FactCheckIcon sx={{ fontSize: 24 }} />}
        couleur="success"
        texteConfirmer="Valider"
        enCours={enCours}
        onConfirmer={gererValidationDevis}
        onAnnuler={() => setConfirmationValidationDevis(false)}
      />

      {/* Dialogue : création du dossier de fabrication */}
      <ConfirmDialog
        ouvert={confirmationCreationDossier}
        titre="Créer le dossier de fabrication ?"
        message="Un dossier sera créé pour la commande et affecté à l'atelier de production."
        icone={<FolderOpenIcon sx={{ fontSize: 24 }} />}
        couleur="primary"
        texteConfirmer="Créer le dossier"
        enCours={enCours}
        onConfirmer={gererCreationDossier}
        onAnnuler={() => setConfirmationCreationDossier(false)}
      />
    </Box>
  );
}
