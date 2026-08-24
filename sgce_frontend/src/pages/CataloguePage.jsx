import { useEffect, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, Divider, Grid, IconButton,
  List, ListItemButton, ListItemText, MenuItem, Stack, TextField, Tooltip, Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import CategoryIcon from "@mui/icons-material/Category";

import {
  creerComposant, creerFamille, creerLigneMatiere, creerLigneOperation, creerMachine,
  creerProduit, listerFamilles, listerMachines, listerProduits, recupererProduit,
  supprimerComposant, supprimerFamille, supprimerLigneMatiere, supprimerLigneOperation,
  supprimerProduit,
} from "../api/catalogueApi";
import { listerArticles } from "../api/commandesApi";

const LIBELLES_FAMILLE = {
  FEUILLE_VOLANTE: "Feuille volante",
  BROCHURE: "Brochure",
  MAGAZINE_LIVRE: "Magazine / Livre / Agenda",
  CARNET_REGISTRE: "Carnet de factures / Registre",
};

// Pastille carrée arrondie, cohérente avec le reste de l'application
// (Messagerie, Paramètres, Tableau de bord).
function PastilleIcone({ icone, taille = 34 }) {
  return (
    <Box
      sx={{
        width: taille, height: taille, borderRadius: 1.5, display: "flex",
        alignItems: "center", justifyContent: "center", flexShrink: 0,
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
        color: "primary.main",
      }}
    >
      {icone}
    </Box>
  );
}

function normaliser(d) {
  return Array.isArray(d) ? d : d.results || [];
}

export default function CataloguePage() {
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
      setNouvelleLigneOperation((s) => ({ ...s, [composantId]: {} }));
      rafraichirProduitOuvert();
    } catch {
      setErreur("Impossible d'ajouter cette ligne d'opération.");
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
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <PastilleIcone icone={<CategoryIcon sx={{ fontSize: 18 }} />} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Catalogue de produits
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              Familles, produits, composants et nomenclature — base de calcul des devis (RG25-RG27).
            </Typography>
          </Box>
        </Stack>
      </Stack>

      {erreur && <Alert severity="warning" sx={{ mb: 3 }} onClose={() => setErreur("")}>{erreur}</Alert>}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ boxShadow: 1, mb: 2 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">Familles de produits</Typography>
                <Button size="small" startIcon={<AddIcon fontSize="small" />} onClick={() => setDialogueFamille(true)}>
                  Ajouter
                </Button>
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {familles.map((f) => (
                  <Chip
                    key={f.id}
                    label={LIBELLES_FAMILLE[f.nom] || f.nom}
                    size="small"
                    onDelete={async () => { await supprimerFamille(f.id); charger(); }}
                  />
                ))}
                {familles.length === 0 && (
                  <Typography variant="body2" color="text.disabled">Aucune famille définie.</Typography>
                )}
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ boxShadow: 1 }}>
            <CardContent sx={{ p: 0 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, pt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Produits du catalogue</Typography>
                <Button size="small" startIcon={<AddIcon fontSize="small" />} onClick={() => setDialogueProduit(true)}>
                  Nouveau
                </Button>
              </Stack>
              <List sx={{ mt: 1 }}>
                {produits.map((p) => (
                  <ListItemButton
                    key={p.id}
                    selected={produitSelectionne?.id === p.id}
                    onClick={() => ouvrirProduit(p.id)}
                  >
                    <ListItemText
                      primary={p.nom}
                      secondary={`${p.famille_nom} — ${p.nombre_composants} composant(s)`}
                    />
                    {!p.actif && <Chip label="Inactif" size="small" variant="outlined" />}
                  </ListItemButton>
                ))}
                {produits.length === 0 && (
                  <Typography variant="body2" color="text.disabled" sx={{ p: 2 }}>
                    Aucun produit dans le catalogue.
                  </Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          {!produitSelectionne && (
            <Card sx={{ boxShadow: 1 }}>
              <CardContent sx={{ py: 8, textAlign: "center" }}>
                <Inventory2Icon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
                <Typography color="text.secondary">
                  Sélectionnez un produit pour voir ses composants, ou créez-en un nouveau.
                </Typography>
              </CardContent>
            </Card>
          )}

          {produitSelectionne && (
            <Card sx={{ boxShadow: 1 }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{produitSelectionne.nom}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {LIBELLES_FAMILLE[produitSelectionne.famille] || produitSelectionne.famille_nom}
                    </Typography>
                  </Box>
                  <Tooltip title="Supprimer ce produit">
                    <IconButton
                      size="small"
                      onClick={async () => {
                        await supprimerProduit(produitSelectionne.id);
                        setProduitSelectionne(null);
                        charger();
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>

                {chargementDetail && <CircularProgress size={22} sx={{ mt: 2 }} />}

                {!chargementDetail && (
                  <Box sx={{ mt: 2 }}>
                    {(produitSelectionne.composants || []).map((composant) => (
                      <Box
                        key={composant.id}
                        sx={{ mb: 2.5, p: 2, borderRadius: 1.5, border: "1px solid", borderColor: "divider" }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            Composant {composant.ordre} — {composant.designation}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={async () => { await supprimerComposant(composant.id); rafraichirProduitOuvert(); }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Stack>

                        <Typography variant="caption" color="text.secondary">Nomenclature (matières premières)</Typography>
                        {composant.lignes_matiere_premiere.map((l) => (
                          <Stack key={l.id} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.5 }}>
                            <Typography variant="body2">
                              {l.article_designation} — {l.quantite_unitaire} {l.article_unite} / exemplaire
                            </Typography>
                            <IconButton size="small" onClick={async () => { await supprimerLigneMatiere(l.id); rafraichirProduitOuvert(); }}>
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        ))}
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5, mb: 1.5 }}>
                          <TextField
                            select size="small" label="Article" sx={{ minWidth: 160 }}
                            value={nouvelleLigneMatiere[composant.id]?.article || ""}
                            onChange={(e) => setNouvelleLigneMatiere((s) => ({
                              ...s, [composant.id]: { ...s[composant.id], article: e.target.value },
                            }))}
                          >
                            {articles.map((a) => <MenuItem key={a.id} value={a.id}>{a.designation}</MenuItem>)}
                          </TextField>
                          <TextField
                            size="small" label="Qté / exemplaire" type="number" sx={{ width: 140 }}
                            value={nouvelleLigneMatiere[composant.id]?.quantite_unitaire || ""}
                            onChange={(e) => setNouvelleLigneMatiere((s) => ({
                              ...s, [composant.id]: { ...s[composant.id], quantite_unitaire: e.target.value },
                            }))}
                          />
                          <Button size="small" onClick={() => gererAjoutLigneMatiere(composant.id)}>Ajouter</Button>
                        </Stack>

                        <Divider sx={{ my: 1 }} />

                        <Typography variant="caption" color="text.secondary">Gamme d'opérations</Typography>
                        {composant.lignes_operation.map((l) => (
                          <Stack key={l.id} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.5 }}>
                            <Typography variant="body2">
                              {l.libelle} — {l.machine_nom} ({l.temps_unitaire} min / exemplaire)
                            </Typography>
                            <IconButton size="small" onClick={async () => { await supprimerLigneOperation(l.id); rafraichirProduitOuvert(); }}>
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        ))}
                        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
                          <TextField
                            size="small" label="Libellé" sx={{ minWidth: 140 }}
                            value={nouvelleLigneOperation[composant.id]?.libelle || ""}
                            onChange={(e) => setNouvelleLigneOperation((s) => ({
                              ...s, [composant.id]: { ...s[composant.id], libelle: e.target.value },
                            }))}
                          />
                          <TextField
                            select size="small" label="Machine" sx={{ minWidth: 140 }}
                            value={nouvelleLigneOperation[composant.id]?.machine || ""}
                            onChange={(e) => setNouvelleLigneOperation((s) => ({
                              ...s, [composant.id]: { ...s[composant.id], machine: e.target.value },
                            }))}
                          >
                            {machines.map((m) => <MenuItem key={m.id} value={m.id}>{m.nom}</MenuItem>)}
                          </TextField>
                          <TextField
                            size="small" label="Minutes / exemplaire" type="number" sx={{ width: 160 }}
                            value={nouvelleLigneOperation[composant.id]?.temps_unitaire || ""}
                            onChange={(e) => setNouvelleLigneOperation((s) => ({
                              ...s, [composant.id]: { ...s[composant.id], temps_unitaire: e.target.value },
                            }))}
                          />
                          <Button size="small" onClick={() => gererAjoutLigneOperation(composant.id)}>Ajouter</Button>
                          <Button size="small" onClick={() => setDialogueMachine(true)}>+ Machine</Button>
                        </Stack>
                      </Box>
                    ))}

                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                      <TextField
                        size="small" label="Ordre" type="number" sx={{ width: 90 }}
                        value={nouveauComposant.ordre}
                        onChange={(e) => setNouveauComposant((s) => ({ ...s, ordre: e.target.value }))}
                      />
                      <TextField
                        size="small" label="Désignation du composant" sx={{ flexGrow: 1 }}
                        value={nouveauComposant.designation}
                        onChange={(e) => setNouveauComposant((s) => ({ ...s, designation: e.target.value }))}
                      />
                      <Button variant="outlined" size="small" onClick={gererAjoutComposant}>
                        Ajouter un composant
                      </Button>
                    </Stack>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      <Dialog open={dialogueFamille} onClose={() => setDialogueFamille(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nouvelle famille de produits</DialogTitle>
        <DialogContent>
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
        <DialogActions>
          <Button onClick={() => setDialogueFamille(false)}>Annuler</Button>
          <Button variant="contained" onClick={gererCreationFamille}>Créer</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialogueProduit} onClose={() => setDialogueProduit(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nouveau produit du catalogue</DialogTitle>
        <DialogContent>
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
        <DialogActions>
          <Button onClick={() => setDialogueProduit(false)}>Annuler</Button>
          <Button variant="contained" disabled={!nouveauProduit.famille || !nouveauProduit.nom} onClick={gererCreationProduit}>
            Créer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialogueMachine} onClose={() => setDialogueMachine(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nouvelle machine / poste</DialogTitle>
        <DialogContent>
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
        <DialogActions>
          <Button onClick={() => setDialogueMachine(false)}>Annuler</Button>
          <Button variant="contained" onClick={gererCreationMachine}>Créer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
