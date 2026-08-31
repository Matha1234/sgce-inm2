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
  creerComposant, creerFamille, creerLigneMatiere, creerLigneOperation, creerMachine,
  creerProduit, listerFamilles, listerMachines, listerProduits, recupererProduit,
  supprimerComposant, supprimerFamille, supprimerLigneMatiere, supprimerLigneOperation,
  supprimerProduit,
} from "../api/catalogueApi";
import { listerArticles } from "../api/commandesApi";
import PageHeader, { PastilleIcone } from "../components/common/PageHeader";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { useNotifier } from "../components/common/Notifier";
import { alpha } from "@mui/material/styles";

const LIBELLES_FAMILLE = {
  FEUILLE_VOLANTE: "Feuille volante",
  BROCHURE: "Brochure",
  MAGAZINE_LIVRE: "Magazine / Livre / Agenda",
  CARNET_REGISTRE: "Carnet de factures / Registre",
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
  const [machines, setMachines] = useState([]);

  const [produitSelectionne, setProduitSelectionne] = useState(null);
  const [chargementDetail, setChargementDetail] = useState(false);

  const [dialogueFamille, setDialogueFamille] = useState(false);
  const [nouvelleFamille, setNouvelleFamille] = useState({ nom: "FEUILLE_VOLANTE", structure_type: "" });

  const [dialogueProduit, setDialogueProduit] = useState(false);
  const [nouveauProduit, setNouveauProduit] = useState({ famille: "", nom: "" });

  const [dialogueMachine, setDialogueMachine] = useState(false);
  const [nouvelleMachine, setNouvelleMachine] = useState({ nom: "", cout_horaire: "" });

  const [nouveauComposant, setNouveauComposant] = useState({ ordre: "", designation: "" });
  const [nouvelleLigneMatiere, setNouvelleLigneMatiere] = useState({});
  const [nouvelleLigneOperation, setNouvelleLigneOperation] = useState({});
  const [confirmationSuppression, setConfirmationSuppression] = useState(null);

  const charger = async () => {
    setChargement(true);
    setErreur("");
    try {
      const [f, p, a, m] = await Promise.all([
        listerFamilles(), listerProduits(), listerArticles(), listerMachines(),
      ]);
      setFamilles(normaliser(f));
      setProduits(normaliser(p));
      setArticles(normaliser(a));
      setMachines(normaliser(m));
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
      const cree = await creerProduit(nouveauProduit);
      afficherSucces(`Produit « ${cree.nom} » créé avec succès.`);
      setDialogueProduit(false);
      setNouveauProduit({ famille: "", nom: "" });
      await charger();
      ouvrirProduit(cree.id);
    } catch {
      setErreur("Impossible de créer ce produit.");
    }
  };

  const gererCreationMachine = async () => {
    try {
      await creerMachine(nouvelleMachine);
      afficherSucces("Machine créée avec succès.");
      setDialogueMachine(false);
      setNouvelleMachine({ nom: "", cout_horaire: "" });
      charger();
    } catch {
      setErreur("Impossible de créer cette machine.");
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
    if (!valeurs.machine || !valeurs.libelle || !valeurs.temps_unitaire) return;
    try {
      await creerLigneOperation({
        composant: composantId,
        machine: valeurs.machine,
        libelle: valeurs.libelle,
        temps_unitaire: valeurs.temps_unitaire,
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
      />

      {erreur && <Alert severity="warning" sx={{ mb: 1.5, flexShrink: 0 }} onClose={() => setErreur("")}>{erreur}</Alert>}

      <Box>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }} sx={{ display: "flex", flexDirection: "column" }}>
          <Stack spacing={1.5}>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.5, flexShrink: 0 }}>
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
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, pt: 1.5, pb: 1 }}>
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
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{produitSelectionne.nom}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {LIBELLES_FAMILLE[produitSelectionne.famille] || produitSelectionne.famille_nom}
                    </Typography>
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
                              <Stack key={l.id} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.2 }}>
                                <Typography variant="body2" sx={{ fontSize: 12, lineHeight: 1.6 }}>
                                  {l.article_designation} — {l.quantite_unitaire} {l.article_unite}/ex
                                </Typography>
                                <IconButton size="small" color="error" onClick={() => demanderSuppression("ligneMatiere", l.id, l.article_designation)} sx={{ width: 22, height: 22 }}>
                                  <DeleteOutlineIcon sx={{ fontSize: 12 }} />
                                </IconButton>
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
                              <Button variant="contained" size="small" onClick={() => gererAjoutLigneMatiere(composant.id)} sx={{ minWidth: 32, px: 1 }}>
                                <AddIcon fontSize="small" />
                              </Button>
                            </Stack>
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
                              <Stack key={l.id} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.2 }}>
                                <Typography variant="body2" sx={{ fontSize: 12, lineHeight: 1.6 }}>
                                  {l.libelle} — {l.machine_nom} ({l.temps_unitaire} min/ex)
                                </Typography>
                                <IconButton size="small" color="error" onClick={() => demanderSuppression("ligneOperation", l.id, l.libelle)} sx={{ width: 22, height: 22 }}>
                                  <DeleteOutlineIcon sx={{ fontSize: 12 }} />
                                </IconButton>
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
                                select size="small" label="Machine"
                                sx={{ minWidth: 95, "& .MuiInputBase-root": { fontSize: 12 }, "& .MuiInputLabel-root": { fontSize: 12 } }}
                                value={nouvelleLigneOperation[composant.id]?.machine || ""}
                                onChange={(e) => setNouvelleLigneOperation((s) => ({ ...s, [composant.id]: { ...s[composant.id], machine: e.target.value } }))}
                              >
                                {machines.map((m) => <MenuItem key={m.id} value={m.id} sx={{ fontSize: 12 }}>{m.nom}</MenuItem>)}
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
                            <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => setDialogueMachine(true)} sx={{ mt: 0.75, px: 1.5, fontSize: 12 }}>
                              + Machine
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
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => setDialogueProduit(false)} sx={{ px: 1.5 }}>Annuler</Button>
          <Button variant="contained" disableElevation disabled={!nouveauProduit.famille || !nouveauProduit.nom} onClick={gererCreationProduit}>
            Créer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialogueMachine} onClose={() => setDialogueMachine(false)} maxWidth="xs">
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
            <PastilleIcone icone={<PrecisionManufacturingIcon sx={{ fontSize: 18 }} />} taille={32} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
              Nouvelle machine / poste
            </Typography>
          </Stack>
          <IconButton onClick={() => setDialogueMachine(false)} size="small"><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nom" value={nouvelleMachine.nom}
              onChange={(e) => setNouvelleMachine((s) => ({ ...s, nom: e.target.value }))}
            />
            <TextField
              label="Coût horaire" type="number" value={nouvelleMachine.cout_horaire}
              onChange={(e) => setNouvelleMachine((s) => ({ ...s, cout_horaire: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => setDialogueMachine(false)} sx={{ px: 1.5 }}>Annuler</Button>
          <Button variant="contained" disableElevation onClick={gererCreationMachine}>Créer</Button>
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
