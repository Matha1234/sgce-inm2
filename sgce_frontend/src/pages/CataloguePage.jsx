import { useEffect, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, Grid, IconButton,
  MenuItem, Paper, Stack, TextField, Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import CategoryIcon from "@mui/icons-material/Category";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";
import { alpha } from "@mui/material/styles";

import {
  creerComposant, creerFamille, creerLigneMatiere, creerLigneOperation,
  creerPosteDeCharge, creerProduit, listerFamilles, listerPostesDeCharge,
  listerProduits, recupererProduit, supprimerComposant, supprimerFamille,
  supprimerLigneMatiere, supprimerLigneOperation, supprimerProduit,
} from "../api/catalogueApi";
import { listerArticles } from "../api/commandesApi";
import PageHeader, { PastilleIcone } from "../components/common/PageHeader";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { useNotifier } from "../components/common/Notifier";
import BoutonExport from "../components/common/BoutonExport";

const LIBELLES_FAMILLE = {
  FEUILLE_VOLANTE: "Feuille volante",
  BROCHURE: "Brochure",
  MAGAZINE_LIVRE: "Magazine / Livre / Agenda",
  CARNET_REGISTRE: "Carnet de factures / Registre",
};

const LIBELLES_TYPE_POSTE = {
  MACHINE: "Machine (amortissement + électricité)",
  MANUEL: "Manuel (main-d'œuvre directe)",
};

const LIBELLES_TYPE_CHARGE = {
  FIXE: "Fixe",
  VARIABLE: "Variable",
};

function normaliser(d) {
  return Array.isArray(d) ? d : d.results || [];
}

export default function CataloguePage() {
  const { afficherSucces } = useNotifier();
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [familles, setFamilles] = useState([]);
  const [produits, setProduits] = useState([]);
  const [articles, setArticles] = useState([]);
  const [postesDeCharge, setPostesDeCharge] = useState([]);

  const [produitSelectionne, setProduitSelectionne] = useState(null);
  const [chargementDetail, setChargementDetail] = useState(false);

  const [dialogueFamille, setDialogueFamille] = useState(false);
  const [nouvelleFamille, setNouvelleFamille] = useState({ nom: "FEUILLE_VOLANTE" });
  const [dialogueProduit, setDialogueProduit] = useState(false);
  const [nouveauProduit, setNouveauProduit] = useState({
    famille: "", nom: "", reference: "", marge_min: "", marge_max: "",
  });
  const [dialoguePoste, setDialoguePoste] = useState(false);
  const [nouveauPoste, setNouveauPoste] = useState({
    nom: "", type_poste: "MACHINE", cout_horaire: "",
  });

  const [nouveauComposant, setNouveauComposant] = useState({ ordre: "", designation: "" });
  const [nouvelleLigneMatiere, setNouvelleLigneMatiere] = useState({});
  const [nouvelleLigneOperation, setNouvelleLigneOperation] = useState({});
  const [confirmationSuppression, setConfirmationSuppression] = useState(null);

  const charger = async () => {
    setChargement(true);
    try {
      const [f, p, a, postes] = await Promise.all([
        listerFamilles(), listerProduits(), listerArticles(), listerPostesDeCharge(),
      ]);
      setFamilles(normaliser(f));
      setProduits(normaliser(p));
      setArticles(normaliser(a));
      setPostesDeCharge(normaliser(postes));
    } catch {
      setErreur("Impossible de charger le catalogue.");
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => { charger(); }, []);

  const ouvrirProduit = async (id) => {
    setChargementDetail(true);
    try {
      const detail = await recupererProduit(id);
      setProduitSelectionne(detail);
    } catch {
      setErreur("Impossible de charger le détail du produit.");
    } finally {
      setChargementDetail(false);
    }
  };

  const rafraichirProduitOuvert = async () => {
    if (produitSelectionne?.id) await ouvrirProduit(produitSelectionne.id);
    await charger();
  };

  const gererCreationFamille = async () => {
    try {
      await creerFamille(nouvelleFamille);
      afficherSucces("Famille créée avec succès.");
      setDialogueFamille(false);
      setNouvelleFamille({ nom: "FEUILLE_VOLANTE" });
      charger();
    } catch {
      setErreur("Impossible de créer cette famille.");
    }
  };

  const gererCreationProduit = async () => {
    try {
      const cree = await creerProduit({
        famille: nouveauProduit.famille,
        nom: nouveauProduit.nom,
        reference: nouveauProduit.reference || "",
        marge_min: nouveauProduit.marge_min || null,
        marge_max: nouveauProduit.marge_max || null,
      });
      afficherSucces(`Produit « ${cree.nom} » créé avec succès.`);
      setDialogueProduit(false);
      setNouveauProduit({ famille: "", nom: "", reference: "", marge_min: "", marge_max: "" });
      await charger();
      ouvrirProduit(cree.id);
    } catch {
      setErreur("Impossible de créer ce produit.");
    }
  };

  const gererCreationPoste = async () => {
    try {
      await creerPosteDeCharge(nouveauPoste);
      afficherSucces("Poste de charge créé avec succès.");
      setDialoguePoste(false);
      setNouveauPoste({ nom: "", type_poste: "MACHINE", cout_horaire: "" });
      charger();
    } catch {
      setErreur("Impossible de créer ce poste de charge.");
    }
  };

  const gererAjoutComposant = async () => {
    try {
      await creerComposant({
        produit: produitSelectionne.id,
        ordre: Number(nouveauComposant.ordre),
        designation: nouveauComposant.designation,
      });
      afficherSucces("Composant ajouté avec succès.");
      setNouveauComposant({ ordre: "", designation: "" });
      rafraichirProduitOuvert();
    } catch (err) {
      setErreur(err.response?.data?.ordre?.[0] || "Impossible d'ajouter ce composant (RG26).");
    }
  };

  const gererAjoutLigneMatiere = async (composantId) => {
    const valeurs = nouvelleLigneMatiere[composantId] || {};
    if (!valeurs.article || !valeurs.quantite_unitaire) return;
    try {
      await creerLigneMatiere({
        composant: composantId,
        article: valeurs.article,
        quantite_unitaire: valeurs.quantite_unitaire,
        type_charge: valeurs.type_charge || "VARIABLE",
        formule_calcul: valeurs.formule_calcul || "",
      });
      afficherSucces("Ligne de matière première ajoutée avec succès.");
      setNouvelleLigneMatiere((s) => ({ ...s, [composantId]: {} }));
      rafraichirProduitOuvert();
    } catch {
      setErreur("Impossible d'ajouter cette ligne de matière première.");
    }
  };

  const gererAjoutLigneOperation = async (composantId) => {
    const valeurs = nouvelleLigneOperation[composantId] || {};
    if (!valeurs.poste || !valeurs.libelle || !valeurs.temps_unitaire) return;
    try {
      await creerLigneOperation({
        composant: composantId,
        poste: valeurs.poste,
        libelle: valeurs.libelle,
        temps_unitaire: valeurs.temps_unitaire,
        type_charge: valeurs.type_charge || "VARIABLE",
        formule_calcul: valeurs.formule_calcul || "",
      });
      afficherSucces("Ligne d'opération ajoutée avec succès.");
      setNouvelleLigneOperation((s) => ({ ...s, [composantId]: {} }));
      rafraichirProduitOuvert();
    } catch {
      setErreur("Impossible d'ajouter cette ligne d'opération.");
    }
  };

  const demanderSuppression = (type, id, nom) => setConfirmationSuppression({ type, id, nom });

  const confirmerSuppression = async () => {
    const cible = confirmationSuppression;
    if (!cible) return;
    setConfirmationSuppression(null);
    try {
      switch (cible.type) {
        case "famille":
          await supprimerFamille(cible.id);
          afficherSucces("Famille supprimée avec succès.");
          charger();
          break;
        case "produit":
          await supprimerProduit(cible.id);
          setProduitSelectionne(null);
          afficherSucces("Produit supprimé avec succès.");
          charger();
          break;
        case "composant":
          await supprimerComposant(cible.id);
          rafraichirProduitOuvert();
          afficherSucces("Composant supprimé avec succès.");
          break;
        case "ligneMatiere":
          await supprimerLigneMatiere(cible.id);
          rafraichirProduitOuvert();
          afficherSucces("Ligne de matière première supprimée avec succès.");
          break;
        case "ligneOperation":
          await supprimerLigneOperation(cible.id);
          rafraichirProduitOuvert();
          afficherSucces("Ligne d'opération supprimée avec succès.");
          break;
        default:
          return;
      }
    } catch {
      setErreur("Impossible de supprimer cet élément.");
    }
  };

  if (chargement) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, mt: 12 }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">Chargement du catalogue…</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        icone={<CategoryIcon />}
        titre="Catalogue de produits"
        sousTitre="Familles, produits, composants et nomenclature — base de calcul des devis (RG25-RG27)."
        centre
        taillePastille={28}
        titreVariant="h6"
        action={
          <BoutonExport
            surExcel={async () => {
              const e = await import("../utils/exportateur");
              await e.exporterExcel({
                fichier: `Catalogue_${Date.now()}.xlsx`,
                feuilles: [{
                  nom: "Produits",
                  titre: "Catalogue de produits",
                  meta: e.metaEdition(produits.length),
                  colonnes: [
                    e.colonne("Produit", "nom", "left"),
                    e.colonnePerso("Famille", (p) => LIBELLES_FAMILLE[p.famille_nom] || p.famille_nom, "left"),
                    e.colonnePerso("Composants", (p) => String(p.nombre_composants)),
                    e.colonnePerso("Actif", (p) => (p.actif ? "Oui" : "Non")),
                  ],
                  lignes: produits,
                }],
              });
            }}
            libelle="Exporter"
            taille="small"
          />
        }
      />

      {erreur && (
        <Alert severity="warning" sx={{ mb: 1.5 }} onClose={() => setErreur("")}>
          {erreur}
        </Alert>
      )}      
      <Box>
        <Grid container spacing={2} alignItems="flex-start">
          {/* ========== COLONNE GAUCHE ========== */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={2}>
              <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{
                    px: 2,
                    py: 1.25,
                    bgcolor: "action.hover",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Produits ({produits.length})
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<AddIcon fontSize="small" />}
                    onClick={() => setDialogueProduit(true)}
                    sx={{ flexShrink: 0, ml: "auto" }}
                  >
                    Nouveau
                  </Button>
                </Stack>
                <Box sx={{ maxHeight: 380, overflow: "auto" }}>
                  {produits.length === 0 ? (
                    <Typography variant="body2" color="text.disabled" sx={{ p: 2.5, textAlign: "center" }}>
                      Aucun produit dans le catalogue.
                    </Typography>
                  ) : (
                    produits.map((p) => (
                      <Box
                        key={p.id}
                        onClick={() => ouvrirProduit(p.id)}
                        sx={{
                          px: 2, py: 1.35, cursor: "pointer",
                          borderBottom: "1px solid", borderColor: "divider",
                          bgcolor: produitSelectionne?.id === p.id
                            ? (t) => alpha(t.palette.primary.main, 0.12)
                            : "transparent",
                          borderLeft: "3px solid",
                          borderLeftColor: produitSelectionne?.id === p.id ? "primary.main" : "transparent",
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>{p.nom}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {LIBELLES_FAMILLE[p.famille_nom] || p.famille_nom}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.25 }}>
                          <Typography variant="caption" color="text.disabled">
                            {p.nombre_composants} composant(s)
                          </Typography>
                          {!p.actif && (
                            <Chip label="Inactif" size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                          )}
                        </Stack>
                      </Box>
                    ))
                  )}
                </Box>
              </Paper>

              <Paper
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  p: 2,
                  overflow: "hidden",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mb: 1.5, width: "100%" }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Familles
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<AddIcon fontSize="small" />}
                    onClick={() => setDialogueFamille(true)}
                    sx={{ flexShrink: 0, ml: "auto" }}
                  >
                    Ajouter
                  </Button>
                </Stack>

                {/* Les chips restent DANS le cadre */}
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                    width: "100%",
                    maxWidth: "100%",
                    overflow: "hidden",
                    boxSizing: "border-box",
                  }}
                >
                  {familles.length === 0 ? (
                    <Typography variant="caption" color="text.disabled">
                      Aucune famille.
                    </Typography>
                  ) : (
                    familles.map((f) => (
                      <Chip
                        key={f.id}
                        label={LIBELLES_FAMILLE[f.nom] || f.nom}
                        size="small"
                        variant="outlined"
                        onDelete={() =>
                          demanderSuppression("famille", f.id, LIBELLES_FAMILLE[f.nom] || f.nom)
                        }
                        sx={{ maxWidth: "100%" }}
                      />
                    ))
                  )}
                </Box>
              </Paper>
            </Stack>
          </Grid>

          {/* ========== COLONNE DROITE ========== */}
          <Grid size={{ xs: 12, md: 8 }}>
            {!produitSelectionne ? (
              <Paper variant="outlined" sx={{ borderRadius: 2, minHeight: 360, display: "flex", alignItems: "center", justifyContent: "center", p: 4 }}>
                <Typography color="text.secondary" textAlign="center">
                  Sélectionnez un produit à gauche pour afficher sa nomenclature
                  (composants, matières et opérations).
                </Typography>
              </Paper>
            ) : chargementDetail ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Stack spacing={2}>
                <Paper variant="outlined" sx={{ borderRadius: 2, p: 2.5 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    spacing={2}
                    sx={{ width: "100%" }}
                  >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.25 }}>
                        {produitSelectionne.nom}
                        {produitSelectionne.reference && (
                          <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1, fontWeight: 500 }}>
                            ({produitSelectionne.reference})
                          </Typography>
                        )}
                      </Typography>
                      {produitSelectionne.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {produitSelectionne.description}
                        </Typography>
                      )}
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.25 }}>
                        <Chip
                          size="small" color="primary" variant="outlined"
                          label={LIBELLES_FAMILLE[produitSelectionne.famille] || produitSelectionne.famille_nom || "—"}
                        />
                        {(produitSelectionne.marge_min != null || produitSelectionne.marge_max != null) && (
                          <Chip
                            size="small" variant="outlined"
                            label={`Marge cible : ${produitSelectionne.marge_min ?? "—"}% à ${produitSelectionne.marge_max ?? "—"}%`}
                          />
                        )}
                        {produitSelectionne.date_maj && (
                          <Chip
                            size="small" variant="outlined"
                            label={`MAJ : ${new Date(produitSelectionne.date_maj).toLocaleDateString("fr-FR")}`}
                          />
                        )}
                      </Stack>
                    </Box>
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() =>
                        demanderSuppression("produit", produitSelectionne.id, produitSelectionne.nom)
                      }
                      sx={{ flexShrink: 0, ml: "auto" }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Paper>

                {(produitSelectionne.composants || []).map((composant) => (
                  <Paper key={composant.id} variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      sx={{
                        px: 2,
                        py: 1.25,
                        bgcolor: "action.hover",
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, pr: 1, minWidth: 0 }} noWrap>
                        Composant {composant.ordre} — {composant.designation}
                      </Typography>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => demanderSuppression("composant", composant.id, composant.designation)}
                        sx={{ flexShrink: 0, ml: "auto" }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Stack>

                    <Grid container>
                      {/* Matières */}
                      <Grid size={{ xs: 12, md: 6 }} sx={{ p: 2, borderRight: { md: "1px solid" }, borderBottom: { xs: "1px solid", md: 0 }, borderColor: "divider" }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.4 }}>
                          Matières premières
                        </Typography>
                        <Stack spacing={1} sx={{ mt: 1.25, mb: 1.5 }}>
                          {(composant.lignes_matiere_premiere || []).length === 0 ? (
                            <Typography variant="caption" color="text.disabled">Aucune matière définie.</Typography>
                          ) : (
                            (composant.lignes_matiere_premiere || []).map((l) => (
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="flex-start"
                                spacing={1}
                                sx={{ width: "100%" }}
                              >
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{l.article_designation}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {l.quantite_unitaire} {l.article_unite || ""}/ex · {LIBELLES_TYPE_CHARGE[l.type_charge] || l.type_charge}
                                  </Typography>
                                  {l.formule_calcul && (
                                    <Typography variant="caption" color="text.disabled" display="block" sx={{ fontStyle: "italic" }}>
                                      Formule : {l.formule_calcul}
                                    </Typography>
                                  )}
                                </Box>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => demanderSuppression("ligneMatiere", l.id, l.article_designation)}
                                  sx={{ flexShrink: 0, ml: "auto" }}
                                >
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </Stack>
                            ))
                          )}
                        </Stack>
                        <Stack spacing={1} sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 1.5, border: "1px dashed", borderColor: "divider" }}>
                          <TextField
                            select size="small" fullWidth label="Article"
                            value={nouvelleLigneMatiere[composant.id]?.article || ""}
                            onChange={(e) => setNouvelleLigneMatiere((s) => ({ ...s, [composant.id]: { ...s[composant.id], article: e.target.value } }))}
                          >
                            {articles.map((a) => <MenuItem key={a.id} value={a.id}>{a.designation}</MenuItem>)}
                          </TextField>
                          <Stack direction="row" spacing={1}>
                            <TextField
                              size="small" label="Quantité" type="number" fullWidth
                              value={nouvelleLigneMatiere[composant.id]?.quantite_unitaire || ""}
                              onChange={(e) => setNouvelleLigneMatiere((s) => ({ ...s, [composant.id]: { ...s[composant.id], quantite_unitaire: e.target.value } }))}
                            />
                            <TextField
                              select size="small" label="Charge" fullWidth
                              value={nouvelleLigneMatiere[composant.id]?.type_charge || "VARIABLE"}
                              onChange={(e) => setNouvelleLigneMatiere((s) => ({ ...s, [composant.id]: { ...s[composant.id], type_charge: e.target.value } }))}
                            >
                              <MenuItem value="VARIABLE">Variable</MenuItem>
                              <MenuItem value="FIXE">Fixe</MenuItem>
                            </TextField>
                          </Stack>
                          <TextField
                            size="small" fullWidth label="Formule de calcul (optionnel)"
                            value={nouvelleLigneMatiere[composant.id]?.formule_calcul || ""}
                            onChange={(e) => setNouvelleLigneMatiere((s) => ({ ...s, [composant.id]: { ...s[composant.id], formule_calcul: e.target.value } }))}
                          />
                          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => gererAjoutLigneMatiere(composant.id)}>
                            Ajouter la matière
                          </Button>
                        </Stack>
                      </Grid>

                      {/* Opérations */}
                      <Grid size={{ xs: 12, md: 6 }} sx={{ p: 2 }}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          sx={{ width: "100%", mb: 0.5 }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 700,
                              color: "text.secondary",
                              textTransform: "uppercase",
                              letterSpacing: 0.4,
                            }}
                          >
                            Opérations
                          </Typography>
                          <Button
                            size="small"
                            onClick={() => setDialoguePoste(true)}
                            sx={{ fontSize: 11, flexShrink: 0, ml: "auto" }}
                          >
                            + Poste de charge
                          </Button>
                        </Stack>
                        <Stack spacing={1} sx={{ mt: 1.25, mb: 1.5 }}>
                          {(composant.lignes_operation || []).length === 0 ? (
                            <Typography variant="caption" color="text.disabled">Aucune opération définie.</Typography>
                          ) : (
                            (composant.lignes_operation || []).map((l) => (
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="flex-start"
                                spacing={1}
                                sx={{ width: "100%" }}
                              >
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{l.libelle}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {l.poste_nom} · {l.temps_unitaire} min/ex · {LIBELLES_TYPE_CHARGE[l.type_charge] || l.type_charge}
                                  </Typography>
                                  {l.formule_calcul && (
                                    <Typography variant="caption" color="text.disabled" display="block" sx={{ fontStyle: "italic" }}>
                                      Formule : {l.formule_calcul}
                                    </Typography>
                                  )}
                                </Box>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => demanderSuppression("ligneOperation", l.id, l.libelle)}
                                  sx={{ flexShrink: 0, ml: "auto" }}
                                >
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </Stack>
                            ))
                          )}
                        </Stack>
                        <Stack spacing={1} sx={{ p: 1.5, bgcolor: "grey.50", borderRadius: 1.5, border: "1px dashed", borderColor: "divider" }}>
                          <TextField
                            size="small" fullWidth label="Libellé"
                            value={nouvelleLigneOperation[composant.id]?.libelle || ""}
                            onChange={(e) => setNouvelleLigneOperation((s) => ({ ...s, [composant.id]: { ...s[composant.id], libelle: e.target.value } }))}
                          />
                          <Stack direction="row" spacing={1}>
                            <TextField
                              select size="small" label="Poste" fullWidth
                              value={nouvelleLigneOperation[composant.id]?.poste || ""}
                              onChange={(e) => setNouvelleLigneOperation((s) => ({ ...s, [composant.id]: { ...s[composant.id], poste: e.target.value } }))}
                            >
                              {postesDeCharge.map((p) => <MenuItem key={p.id} value={p.id}>{p.nom}</MenuItem>)}
                            </TextField>
                            <TextField
                              size="small" label="Temps (min)" type="number" fullWidth
                              value={nouvelleLigneOperation[composant.id]?.temps_unitaire || ""}
                              onChange={(e) => setNouvelleLigneOperation((s) => ({ ...s, [composant.id]: { ...s[composant.id], temps_unitaire: e.target.value } }))}
                            />
                          </Stack>
                          <TextField
                            select size="small" label="Charge" fullWidth
                            value={nouvelleLigneOperation[composant.id]?.type_charge || "VARIABLE"}
                            onChange={(e) => setNouvelleLigneOperation((s) => ({ ...s, [composant.id]: { ...s[composant.id], type_charge: e.target.value } }))}
                          >
                            <MenuItem value="VARIABLE">Variable</MenuItem>
                            <MenuItem value="FIXE">Fixe</MenuItem>
                          </TextField>
                          <TextField
                            size="small" fullWidth label="Formule de calcul (optionnel)"
                            value={nouvelleLigneOperation[composant.id]?.formule_calcul || ""}
                            onChange={(e) => setNouvelleLigneOperation((s) => ({ ...s, [composant.id]: { ...s[composant.id], formule_calcul: e.target.value } }))}
                          />
                          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => gererAjoutLigneOperation(composant.id)}>
                            Ajouter l&apos;opération
                          </Button>
                        </Stack>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}

                <Paper variant="outlined" sx={{ borderRadius: 2, p: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Ajouter un composant</Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25} alignItems={{ sm: "center" }}>
                    <TextField
                      size="small" label="Ordre" type="number"
                      sx={{ width: { xs: "100%", sm: 100 } }}
                      value={nouveauComposant.ordre}
                      onChange={(e) => setNouveauComposant((s) => ({ ...s, ordre: e.target.value }))}
                    />
                    <TextField
                      size="small" label="Désignation du composant" fullWidth
                      value={nouveauComposant.designation}
                      onChange={(e) => setNouveauComposant((s) => ({ ...s, designation: e.target.value }))}
                    />
                    <Button variant="contained" startIcon={<AddIcon />} onClick={gererAjoutComposant} sx={{ flexShrink: 0, whiteSpace: "nowrap" }}>
                      Ajouter
                    </Button>
                  </Stack>
                </Paper>
              </Stack>
            )}
          </Grid>
        </Grid>
      </Box>

      {/* Dialogues */}
      <Dialog open={dialogueFamille} onClose={() => setDialogueFamille(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Nouvelle famille</Typography>
          <IconButton onClick={() => setDialogueFamille(false)} size="small"><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            select fullWidth label="Famille" value={nouvelleFamille.nom}
            onChange={(e) => setNouvelleFamille({ nom: e.target.value })}
            sx={{ mt: 1 }}
          >
            {Object.entries(LIBELLES_FAMILLE).map(([code, libelle]) => (
              <MenuItem key={code} value={code}>{libelle}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => setDialogueFamille(false)}>Annuler</Button>
          <Button variant="contained" onClick={gererCreationFamille}>Créer</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialogueProduit} onClose={() => setDialogueProduit(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Nouveau produit</Typography>
          <IconButton onClick={() => setDialogueProduit(false)} size="small"><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select fullWidth label="Famille" value={nouveauProduit.famille}
              onChange={(e) => setNouveauProduit((s) => ({ ...s, famille: e.target.value }))}
            >
              {familles.map((f) => (
                <MenuItem key={f.id} value={f.id}>{LIBELLES_FAMILLE[f.nom] || f.nom}</MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth label="Nom du produit" value={nouveauProduit.nom}
              onChange={(e) => setNouveauProduit((s) => ({ ...s, nom: e.target.value }))}
            />
            <TextField
              fullWidth label="Référence (optionnel)" value={nouveauProduit.reference || ""}
              onChange={(e) => setNouveauProduit((s) => ({ ...s, reference: e.target.value }))}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth label="Marge min (%)" type="number" value={nouveauProduit.marge_min || ""}
                onChange={(e) => setNouveauProduit((s) => ({ ...s, marge_min: e.target.value }))}
              />
              <TextField
                fullWidth label="Marge max (%)" type="number" value={nouveauProduit.marge_max || ""}
                onChange={(e) => setNouveauProduit((s) => ({ ...s, marge_max: e.target.value }))}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => setDialogueProduit(false)}>Annuler</Button>
          <Button
            variant="contained"
            disabled={!nouveauProduit.famille || !nouveauProduit.nom}
            onClick={gererCreationProduit}
          >
            Créer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialoguePoste} onClose={() => setDialoguePoste(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <PastilleIcone icone={<PrecisionManufacturingIcon sx={{ fontSize: 18 }} />} taille={32} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Nouveau poste de charge</Typography>
          </Stack>
          <IconButton onClick={() => setDialoguePoste(false)} size="small"><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth label="Nom" value={nouveauPoste.nom}
              onChange={(e) => setNouveauPoste((s) => ({ ...s, nom: e.target.value }))}
            />
            <TextField
              select fullWidth label="Type de poste" value={nouveauPoste.type_poste}
              onChange={(e) => setNouveauPoste((s) => ({ ...s, type_poste: e.target.value }))}
            >
              {Object.entries(LIBELLES_TYPE_POSTE).map(([code, libelle]) => (
                <MenuItem key={code} value={code}>{libelle}</MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth label="Coût horaire" type="number" value={nouveauPoste.cout_horaire}
              onChange={(e) => setNouveauPoste((s) => ({ ...s, cout_horaire: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => setDialoguePoste(false)}>Annuler</Button>
          <Button variant="contained" onClick={gererCreationPoste}>Créer</Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        ouvert={Boolean(confirmationSuppression)}
        titre={
          confirmationSuppression?.type === "famille" ? "Supprimer cette famille ?"
            : confirmationSuppression?.type === "produit" ? "Supprimer ce produit ?"
              : confirmationSuppression?.type === "composant" ? "Supprimer ce composant ?"
                : confirmationSuppression?.type === "ligneMatiere" ? "Supprimer cette ligne de matière première ?"
                  : "Supprimer cette ligne d'opération ?"
        }
        message={
          confirmationSuppression
            ? `« ${confirmationSuppression.nom} » sera définitivement supprimé du catalogue. Cette action est irréversible.`
            : undefined
        }
        icone={<DeleteOutlineIcon sx={{ fontSize: 24 }} />}
        couleur="error"
        texteConfirmer="Supprimer"
        onConfirmer={confirmerSuppression}
        onAnnuler={() => setConfirmationSuppression(null)}
      />
    </Box>
  );
}