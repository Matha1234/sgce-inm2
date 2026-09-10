import { useEffect, useState } from "react";
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, Divider, Grid, IconButton,
  MenuItem, Paper, Stack, TextField, Tooltip, Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import CategoryIcon from "@mui/icons-material/Category";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";

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
import { alpha } from "@mui/material/styles";

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
  const [nouvelleFamille, setNouvelleFamille] = useState({ nom: "FEUILLE_VOLANTE", structure_type: "" });

  const [dialogueProduit, setDialogueProduit] = useState(false);
  const [nouveauProduit, setNouveauProduit] = useState({ famille: "", nom: "", reference: "", marge_min: "", marge_max: "" });

  const [dialoguePoste, setDialoguePoste] = useState(false);
  const [nouveauPoste, setNouveauPoste] = useState({ nom: "", type_poste: "MACHINE", cout_horaire: "" });

  const [nouveauComposant, setNouveauComposant] = useState({ ordre: "", designation: "" });
  const [nouvelleLigneMatiere, setNouvelleLigneMatiere] = useState({});
  const [nouvelleLigneOperation, setNouvelleLigneOperation] = useState({});
  const [confirmationSuppression, setConfirmationSuppression] = useState(null);

  const charger = async () => {
    setChargement(true);
    setErreur("");
    try {
      const [f, p, a, pc] = await Promise.all([
        listerFamilles(), listerProduits(), listerArticles(), listerPostesDeCharge(),
      ]);
      setFamilles(normaliser(f));
      setProduits(normaliser(p));
      setArticles(normaliser(a));
      setPostesDeCharge(normaliser(pc));
    } catch {
      setErreur("Impossible de charger le catalogue.");
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    charger();
  }, []);

  const ouvrirProduit = async (id) => {
    setChargementDetail(true);
    try {
      const donnees = await recupererProduit(id);
      setProduitSelectionne(donnees);
    } catch {
      setErreur("Impossible de charger ce produit.");
    } finally {
      setChargementDetail(false);
    }
  };

  const rafraichirProduitOuvert = async () => {
    if (produitSelectionne) await ouvrirProduit(produitSelectionne.id);
  };

  const gererCreationFamille = async () => {
    try {
      await creerFamille(nouvelleFamille);
      afficherSucces("Famille de produits créée avec succès.");
      setDialogueFamille(false);
      setNouvelleFamille({ nom: "FEUILLE_VOLANTE", structure_type: "" });
      charger();
    } catch (err) {
      setErreur(err.response?.data?.nom?.[0] || "Impossible de créer cette famille.");
    }
  };

  const gererCreationProduit = async () => {
    try {
      const cree = await creerProduit({
        ...nouveauProduit,
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

  /**
   * Suppressions du catalogue : toutes passent par un dialogue de
   * confirmation (action destructive et definitive), puis affichent un
   * message de succes une fois la suppression executee.
   */
  const demanderSuppression = (type, id, nom) => setConfirmationSuppression({ type, id, nom });

  const confirmerSuppression = async () => {
    const cible = confirmationSuppression;
    if (!cible) return;
    setConfirmationSuppression(null);
    try {
      switch (cible.type) {
        case "famille":
          await supprimerFamille(cible.id);
          charger();
          afficherSucces("Famille supprimée avec succès.");
          break;
        case "produit":
          await supprimerProduit(cible.id);
          setProduitSelectionne(null);
          charger();
          afficherSucces("Produit supprimé avec succès.");
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
        <Typography variant="body2" color="text.secondary">
          Chargement du catalogue…
        </Typography>
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
              const nomComposants = (c) => {
                if (!c || !c.composants) return [];
                const out = [];
                c.composants.forEach((cp) => {
                  out.push({
                    composant: `${cp.ordre} — ${cp.designation}`,
                    type: "Composant",
                    designation: "",
                    quantite: "",
                    cout: "",
                  });
                  (cp.lignes_matiere_premiere || []).forEach((l) => {
                    out.push({
                      composant: "",
                      type: "Matière",
                      designation: l.article_designation,
                      quantite: `${l.quantite_unitaire} ${l.article_unite || ""}/ex`,
                      cout: `${l.type_charge === "FIXE" ? "F" : "V"}`,
                    });
                  });
                  (cp.lignes_operation || []).forEach((l) => {
                    out.push({
                      composant: "",
                      type: "Opération",
                      designation: `${l.libelle} — ${l.poste_nom}`,
                      quantite: `${l.temps_unitaire} min/ex`,
                      cout: `${l.type_charge === "FIXE" ? "F" : "V"}`,
                    });
                  });
                });
                return out;
              };
              const feuilles = [
                {
                  nom: "Produits", titre: "Catalogue de produits",
                  meta: e.metaEdition(produits.length),
                  colonnes: [
                    e.colonne("Produit", "nom", "left"),
                    e.colonnePerso("Famille", (p) => LIBELLES_FAMILLE[p.famille_nom] || p.famille_nom, "left"),
                    e.colonnePerso("Composants", (p) => String(p.nombre_composants)),
                    e.colonnePerso("Actif", (p) => p.actif ? "Oui" : "Non"),
                  ],
                  lignes: produits,
                },
                {
                  nom: "Postes de charge", titre: "Postes de charge",
                  meta: e.metaEdition(postesDeCharge.length),
                  colonnes: [
                    e.colonne("Poste", "nom", "left"),
                    e.colonnePerso("Type", (p) => LIBELLES_TYPE_POSTE[p.type_poste] || p.type_poste, "left"),
                    e.colonnePerso("Coût horaire", (p) => `${Number(p.cout_horaire).toLocaleString("fr-FR")} Ar`, "right"),
                  ],
                  lignes: postesDeCharge,
                },
              ];
              if (produitSelectionne) {
                const lignesNom = nomComposants(produitSelectionne);
                feuilles.push({
                  nom: "Nomenclature", titre: `Nomenclature — ${produitSelectionne.nom}`,
                  meta: e.metaEdition(lignesNom.length),
                  colonnes: [
                    e.colonnePerso("Composant", (l) => l.composant, "left"),
                    e.colonnePerso("Type", (l) => l.type),
                    e.colonnePerso("Désignation", (l) => l.designation, "left"),
                    e.colonne("Quantité", "quantite", "left"),
                    e.colonnePerso("Charge", (l) => l.cout),
                  ],
                  lignes: lignesNom,
                });
              }
              await e.exporterExcel({ fichier: `Catalogue_${Date.now()}.xlsx`, feuilles });
            }}
            surPdf={async () => {
              const e = await import("../utils/exportateur");
              await e.exporterPDF({
                fichier: `Catalogue_${Date.now()}.pdf`,
                titre: "Catalogue de produits",
                meta: e.metaEdition(produits.length),
                colonnes: [
                  e.colonne("Produit", "nom", "left"),
                  e.colonnePerso("Famille", (p) => LIBELLES_FAMILLE[p.famille_nom] || p.famille_nom, "left"),
                  e.colonnePerso("Composants", (p) => String(p.nombre_composants)),
                  e.colonnePerso("Actif", (p) => p.actif ? "Oui" : "Non"),
                ],
                lignes: produits,
              });
            }}
            libelle="Exporter"
            taille="small"
          />
        }
      />

      {erreur && <Alert severity="warning" sx={{ mb: 1.5, flexShrink: 0 }} onClose={() => setErreur("")}>{erreur}</Alert>}

      <Box>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }} sx={{ display: "flex", flexDirection: "column" }}>
          <Stack spacing={1.5}>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pl: 2, pr: 1, py: 1.5, flexShrink: 0 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>Produits ({produits.length})</Typography>
                <Button size="small" startIcon={<AddIcon fontSize="small" />} onClick={() => setDialogueProduit(true)}>
                  Nouveau
                </Button>
              </Stack>
              <Divider />
              <Box>
                {produits.length === 0 ? (
                  <Typography variant="body2" color="text.disabled" sx={{ p: 2, textAlign: "center" }}>
                    Aucun produit dans le catalogue.
                  </Typography>
                ) : (
                  produits.map((p) => (
                    <Box
                      key={p.id}
                      onClick={() => ouvrirProduit(p.id)}
                      sx={{
                        px: 2, py: 1.25, cursor: "pointer", borderBottom: "1px solid", borderColor: "divider",
                        bgcolor: produitSelectionne?.id === p.id ? (t) => alpha(t.palette.primary.main, 0.14) : "transparent",
                        "&:hover": { bgcolor: "action.hover" },
                        transition: "background-color 0.2s",
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.nom}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {LIBELLES_FAMILLE[p.famille_nom] || p.famille_nom} — {p.nombre_composants} composant(s)
                          </Typography>
                        </Box>
                        {!p.actif && <Chip label="Inactif" size="small" variant="outlined" sx={{ ml: 1, flexShrink: 0 }} />}
                      </Stack>
                    </Box>
                  ))
                )}
              </Box>
            </Paper>

            <Paper variant="outlined" sx={{ borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pl: 2, pr: 1, py: 1.5 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>Familles</Typography>
                <Button size="small" startIcon={<AddIcon fontSize="small" />} onClick={() => setDialogueFamille(true)}>
                  Ajouter
                </Button>
              </Stack>
              <Box sx={{ px: 2, pb: 1.5 }}>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                  {familles.map((f) => (
                    <Chip
                      key={f.id}
                      label={LIBELLES_FAMILLE[f.nom] || f.nom}
                      size="small"
                      onDelete={() => demanderSuppression("famille", f.id, LIBELLES_FAMILLE[f.nom] || f.nom)}
                    />
                  ))}
                  {familles.length === 0 && (
                    <Typography variant="body2" color="text.disabled">Aucune famille définie.</Typography>
                  )}
                </Stack>
              </Box>
            </Paper>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }} sx={{ display: "flex" }}>
          {!produitSelectionne && (
            <Paper variant="outlined" sx={{ borderRadius: 2, width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Box sx={{ textAlign: "center", py: 8 }}>
                <Inventory2Icon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
                <Typography color="text.secondary">
                  Sélectionnez un produit pour voir ses composants, ou créez-en un nouveau.
                </Typography>
              </Box>
            </Paper>
          )}

          {produitSelectionne && (
            <Paper variant="outlined" sx={{ borderRadius: 2, width: "100%" }}>
              <Box sx={{ p: 2.5, pb: 0 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {produitSelectionne.nom}
                      {produitSelectionne.reference && (
                        <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                          ({produitSelectionne.reference})
                        </Typography>
                      )}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {LIBELLES_FAMILLE[produitSelectionne.famille] || produitSelectionne.famille_nom}
                    </Typography>
                    {(produitSelectionne.marge_min != null || produitSelectionne.marge_max != null) && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        Marge cible : {produitSelectionne.marge_min ?? "—"}% à {produitSelectionne.marge_max ?? "—"}%
                      </Typography>
                    )}
                    {produitSelectionne.date_maj && (
                      <Typography variant="caption" color="text.disabled" sx={{ display: "block" }}>
                        Dernière mise à jour : {new Date(produitSelectionne.date_maj).toLocaleDateString("fr-FR")}
                      </Typography>
                    )}
                  </Box>
                  <Tooltip title="Supprimer ce produit">
                    <IconButton
                      size="small" color="error"
                      onClick={() => demanderSuppression("produit", produitSelectionne.id, produitSelectionne.nom)}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>

              {chargementDetail && (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress size={22} />
                </Box>
              )}

              {!chargementDetail && (
                <Box sx={{ p: 2.5 }}>
                    {(produitSelectionne.composants || []).map((composant) => (
                      <Box
                        key={composant.id}
                        sx={{ mb: 2, p: 1.5, borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}
                      >
                        {/* Composant header */}
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            Composant {composant.ordre} — {composant.designation}
                          </Typography>
                          <IconButton size="small" color="error"
                            onClick={() => demanderSuppression("composant", composant.id, composant.designation)}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Stack>

                        <Grid container spacing={1.5}>
                          {/* Matières premières column */}
                          <Grid size={{ xs: 12, md: 6 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block", mb: 0.5 }}>
                              Matières premières
                            </Typography>
                            {composant.lignes_matiere_premiere.length === 0 && (
                              <Typography variant="caption" color="text.disabled" sx={{ display: "block", mb: 0.5 }}>
                                Aucune matière définie.
                              </Typography>
                            )}
                            {composant.lignes_matiere_premiere.map((l) => (
                              <Stack key={l.id} direction="column" sx={{ py: 0.2 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                  <Typography variant="body2" sx={{ fontSize: 12, lineHeight: 1.6 }}>
                                    {l.article_designation} — {l.quantite_unitaire} {l.article_unite}/ex
                                  </Typography>
                                  <Stack direction="row" alignItems="center" spacing={0.5}>
                                    <Chip label={LIBELLES_TYPE_CHARGE[l.type_charge] || l.type_charge} size="small" variant="outlined" sx={{ height: 16, fontSize: 10 }} />
                                    <IconButton size="small" color="error" onClick={() => demanderSuppression("ligneMatiere", l.id, l.article_designation)} sx={{ width: 22, height: 22 }}>
                                      <DeleteOutlineIcon sx={{ fontSize: 12 }} />
                                    </IconButton>
                                  </Stack>
                                </Stack>
                                {l.formule_calcul && (
                                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10, fontStyle: "italic" }}>
                                    Formule : {l.formule_calcul}
                                  </Typography>
                                )}
                              </Stack>
                            ))}
                            <Stack direction="row" spacing={0.75} sx={{ mt: 0.5 }}>
                              <TextField
                                select size="small" label="Article"
                                sx={{ minWidth: 110, "& .MuiInputBase-root": { fontSize: 12 }, "& .MuiInputLabel-root": { fontSize: 12 } }}
                                value={nouvelleLigneMatiere[composant.id]?.article || ""}
                                onChange={(e) => setNouvelleLigneMatiere((s) => ({ ...s, [composant.id]: { ...s[composant.id], article: e.target.value } }))}
                              >
                                {articles.map((a) => <MenuItem key={a.id} value={a.id} sx={{ fontSize: 12 }}>{a.designation}</MenuItem>)}
                              </TextField>
                              <TextField
                                size="small" label="Qté" type="number"
                                sx={{ width: 65, "& .MuiInputBase-root": { fontSize: 12 }, "& .MuiInputLabel-root": { fontSize: 12 } }}
                                value={nouvelleLigneMatiere[composant.id]?.quantite_unitaire || ""}
                                onChange={(e) => setNouvelleLigneMatiere((s) => ({ ...s, [composant.id]: { ...s[composant.id], quantite_unitaire: e.target.value } }))}
                              />
                              <TextField
                                select size="small" label="Charge"
                                sx={{ minWidth: 88, "& .MuiInputBase-root": { fontSize: 12 }, "& .MuiInputLabel-root": { fontSize: 12 } }}
                                value={nouvelleLigneMatiere[composant.id]?.type_charge || "VARIABLE"}
                                onChange={(e) => setNouvelleLigneMatiere((s) => ({ ...s, [composant.id]: { ...s[composant.id], type_charge: e.target.value } }))}
                              >
                                <MenuItem value="VARIABLE" sx={{ fontSize: 12 }}>Variable</MenuItem>
                                <MenuItem value="FIXE" sx={{ fontSize: 12 }}>Fixe</MenuItem>
                              </TextField>
                              <Button variant="contained" size="small" onClick={() => gererAjoutLigneMatiere(composant.id)} sx={{ minWidth: 32, px: 1 }}>
                                <AddIcon fontSize="small" />
                              </Button>
                            </Stack>
                            <TextField
                              size="small" label="Formule de calcul (optionnel)"
                              fullWidth
                              sx={{ mt: 0.5, "& .MuiInputBase-root": { fontSize: 11 }, "& .MuiInputLabel-root": { fontSize: 11 } }}
                              value={nouvelleLigneMatiere[composant.id]?.formule_calcul || ""}
                              onChange={(e) => setNouvelleLigneMatiere((s) => ({ ...s, [composant.id]: { ...s[composant.id], formule_calcul: e.target.value } }))}
                            />
                          </Grid>

                          {/* Opérations column */}
                          <Grid size={{ xs: 12, md: 6 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block", mb: 0.5 }}>
                              Opérations
                            </Typography>
                            {composant.lignes_operation.length === 0 && (
                              <Typography variant="caption" color="text.disabled" sx={{ display: "block", mb: 0.5 }}>
                                Aucune opération définie.
                              </Typography>
                            )}
                            {composant.lignes_operation.map((l) => (
                              <Stack key={l.id} direction="column" sx={{ py: 0.2 }}>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                  <Typography variant="body2" sx={{ fontSize: 12, lineHeight: 1.6 }}>
                                    {l.libelle} — {l.poste_nom} ({l.temps_unitaire} min/ex)
                                  </Typography>
                                  <Stack direction="row" alignItems="center" spacing={0.5}>
                                    <Chip label={LIBELLES_TYPE_CHARGE[l.type_charge] || l.type_charge} size="small" variant="outlined" sx={{ height: 16, fontSize: 10 }} />
                                    <IconButton size="small" color="error" onClick={() => demanderSuppression("ligneOperation", l.id, l.libelle)} sx={{ width: 22, height: 22 }}>
                                      <DeleteOutlineIcon sx={{ fontSize: 12 }} />
                                    </IconButton>
                                  </Stack>
                                </Stack>
                                {l.formule_calcul && (
                                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10, fontStyle: "italic" }}>
                                    Formule : {l.formule_calcul}
                                  </Typography>
                                )}
                              </Stack>
                            ))}
                            <Stack direction="row" spacing={0.75} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
                              <TextField
                                size="small" label="Libellé"
                                sx={{ minWidth: 85, flexGrow: 1, "& .MuiInputBase-root": { fontSize: 12 }, "& .MuiInputLabel-root": { fontSize: 12 } }}
                                value={nouvelleLigneOperation[composant.id]?.libelle || ""}
                                onChange={(e) => setNouvelleLigneOperation((s) => ({ ...s, [composant.id]: { ...s[composant.id], libelle: e.target.value } }))}
                              />
                              <TextField
                                select size="small" label="Poste"
                                sx={{ minWidth: 95, "& .MuiInputBase-root": { fontSize: 12 }, "& .MuiInputLabel-root": { fontSize: 12 } }}
                                value={nouvelleLigneOperation[composant.id]?.poste || ""}
                                onChange={(e) => setNouvelleLigneOperation((s) => ({ ...s, [composant.id]: { ...s[composant.id], poste: e.target.value } }))}
                              >
                                {postesDeCharge.map((p) => <MenuItem key={p.id} value={p.id} sx={{ fontSize: 12 }}>{p.nom}</MenuItem>)}
                              </TextField>
                              <TextField
                                select size="small" label="Charge"
                                sx={{ minWidth: 88, "& .MuiInputBase-root": { fontSize: 12 }, "& .MuiInputLabel-root": { fontSize: 12 } }}
                                value={nouvelleLigneOperation[composant.id]?.type_charge || "VARIABLE"}
                                onChange={(e) => setNouvelleLigneOperation((s) => ({ ...s, [composant.id]: { ...s[composant.id], type_charge: e.target.value } }))}
                              >
                                <MenuItem value="VARIABLE" sx={{ fontSize: 12 }}>Variable</MenuItem>
                                <MenuItem value="FIXE" sx={{ fontSize: 12 }}>Fixe</MenuItem>
                              </TextField>
                              <TextField
                                size="small" label="Min" type="number"
                                sx={{ width: 58, "& .MuiInputBase-root": { fontSize: 12 }, "& .MuiInputLabel-root": { fontSize: 12 } }}
                                value={nouvelleLigneOperation[composant.id]?.temps_unitaire || ""}
                                onChange={(e) => setNouvelleLigneOperation((s) => ({ ...s, [composant.id]: { ...s[composant.id], temps_unitaire: e.target.value } }))}
                              />
                              <Button variant="contained" size="small" onClick={() => gererAjoutLigneOperation(composant.id)} sx={{ minWidth: 32, px: 1 }}>
                                <AddIcon fontSize="small" />
                              </Button>
                            </Stack>
                            <TextField
                              size="small" label="Formule de calcul (optionnel)"
                              fullWidth
                              sx={{ mt: 0.5, "& .MuiInputBase-root": { fontSize: 11 }, "& .MuiInputLabel-root": { fontSize: 11 } }}
                              value={nouvelleLigneOperation[composant.id]?.formule_calcul || ""}
                              onChange={(e) => setNouvelleLigneOperation((s) => ({ ...s, [composant.id]: { ...s[composant.id], formule_calcul: e.target.value } }))}
                            />
                            <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => setDialoguePoste(true)} sx={{ mt: 0.75, px: 1.5, fontSize: 12 }}>
                              + Poste de charge
                            </Button>
                          </Grid>
                        </Grid>
                      </Box>
                    ))}

                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
                      <TextField
                        size="small" label="Ordre" type="number" sx={{ width: 80 }}
                        value={nouveauComposant.ordre}
                        onChange={(e) => setNouveauComposant((s) => ({ ...s, ordre: e.target.value }))}
                      />
                      <TextField
                        size="small" label="Désignation du composant" sx={{ flexGrow: 1 }}
                        value={nouveauComposant.designation}
                        onChange={(e) => setNouveauComposant((s) => ({ ...s, designation: e.target.value }))}
                      />
                      <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={gererAjoutComposant}>
                        Ajouter
                      </Button>
                    </Stack>
                  </Box>
                )}
            </Paper>
          )}
        </Grid>
      </Grid>
      </Box>

      <Dialog open={dialogueFamille} onClose={() => setDialogueFamille(false)} maxWidth="xs">
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
            <PastilleIcone icone={<CategoryIcon sx={{ fontSize: 18 }} />} taille={32} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
              Nouvelle famille de produits
            </Typography>
          </Stack>
          <IconButton onClick={() => setDialogueFamille(false)} size="small"><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select label="Nom" value={nouvelleFamille.nom}
              onChange={(e) => setNouvelleFamille((s) => ({ ...s, nom: e.target.value }))}
            >
              {Object.entries(LIBELLES_FAMILLE).map(([code, libelle]) => (
                <MenuItem key={code} value={code}>{libelle}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Type de structure (optionnel)" value={nouvelleFamille.structure_type}
              onChange={(e) => setNouvelleFamille((s) => ({ ...s, structure_type: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => setDialogueFamille(false)} sx={{ px: 1.5 }}>Annuler</Button>
          <Button variant="contained" disableElevation onClick={gererCreationFamille}>Créer</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialogueProduit} onClose={() => setDialogueProduit(false)} maxWidth="xs">
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
            <PastilleIcone icone={<Inventory2Icon sx={{ fontSize: 18 }} />} taille={32} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
              Nouveau produit du catalogue
            </Typography>
          </Stack>
          <IconButton onClick={() => setDialogueProduit(false)} size="small"><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select label="Famille" value={nouveauProduit.famille}
              onChange={(e) => setNouveauProduit((s) => ({ ...s, famille: e.target.value }))}
            >
              {familles.map((f) => (
                <MenuItem key={f.id} value={f.id}>{LIBELLES_FAMILLE[f.nom] || f.nom}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Nom du produit" value={nouveauProduit.nom}
              onChange={(e) => setNouveauProduit((s) => ({ ...s, nom: e.target.value }))}
            />
            <TextField
              label="Référence (optionnel)" value={nouveauProduit.reference || ""}
              onChange={(e) => setNouveauProduit((s) => ({ ...s, reference: e.target.value }))}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Marge min (%)" type="number" fullWidth
                value={nouveauProduit.marge_min || ""}
                onChange={(e) => setNouveauProduit((s) => ({ ...s, marge_min: e.target.value }))}
              />
              <TextField
                label="Marge max (%)" type="number" fullWidth
                value={nouveauProduit.marge_max || ""}
                onChange={(e) => setNouveauProduit((s) => ({ ...s, marge_max: e.target.value }))}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => setDialogueProduit(false)} sx={{ px: 1.5 }}>Annuler</Button>
          <Button variant="contained" disableElevation disabled={!nouveauProduit.famille || !nouveauProduit.nom} onClick={gererCreationProduit}>
            Créer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialoguePoste} onClose={() => setDialoguePoste(false)} maxWidth="xs">
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
            <PastilleIcone icone={<PrecisionManufacturingIcon sx={{ fontSize: 18 }} />} taille={32} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
              Nouveau poste de charge
            </Typography>
          </Stack>
          <IconButton onClick={() => setDialoguePoste(false)} size="small"><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nom" value={nouveauPoste.nom}
              onChange={(e) => setNouveauPoste((s) => ({ ...s, nom: e.target.value }))}
            />
            <TextField
              select label="Type de poste" value={nouveauPoste.type_poste}
              onChange={(e) => setNouveauPoste((s) => ({ ...s, type_poste: e.target.value }))}
            >
              {Object.entries(LIBELLES_TYPE_POSTE).map(([code, libelle]) => (
                <MenuItem key={code} value={code}>{libelle}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Coût horaire" type="number" value={nouveauPoste.cout_horaire}
              onChange={(e) => setNouveauPoste((s) => ({ ...s, cout_horaire: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => setDialoguePoste(false)} sx={{ px: 1.5 }}>Annuler</Button>
          <Button variant="contained" disableElevation onClick={gererCreationPoste}>Créer</Button>
        </DialogActions>
      </Dialog>

      {/* Dialogue de confirmation : suppression */}
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
