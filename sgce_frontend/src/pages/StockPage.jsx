import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Paper,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import HistoryIcon from "@mui/icons-material/History";
import { useSelector } from "react-redux";

import {
  creerArticle, creerMouvement, listerArticles, listerDossiers,
  listerMouvements, modifierArticle,
} from "../api/commandesApi";
import PageHeader from "../components/common/PageHeader";
import SearchField from "../components/common/SearchField";
import ConfirmDialog from "../components/common/ConfirmDialog";
import BoutonExport from "../components/common/BoutonExport";
import { useNotifier } from "../components/common/Notifier";
import EnTeteTriable, { STYLE_EN_TETE } from "../components/common/EnTeteTriable";
import PaginationBar from "../components/common/PaginationBar";
import { useTriTableau } from "../utils/tri";
import { useHauteurCinqLignes } from "../utils/tableau";

const LIBELLES_CLASSE = {
  CLASSE_2: "Classe 2 — Immobilisation",
  CLASSE_6: "Classe 6 — Charge / matière première",
};

const LIBELLES_PAPIER = {
  OFFSET: "Offset", DOSSIER: "Dossier", AUTOCOPIANT: "Autocopiant", NON_APPLICABLE: "Non applicable",
};

const LIBELLES_MOUVEMENT = { ENTREE: "Entrée", SORTIE: "Sortie" };
const COULEURS_MOUVEMENT = { ENTREE: "success", SORTIE: "warning" };

const ARTICLE_VIDE = {
  designation: "", emplacement_stock: "", classe_comptable: "CLASSE_6", type_papier: "NON_APPLICABLE",
  type_encre: "", type_film: "", unite: "unité", cout_unitaire: "", seuil_securite: "",
};

function normaliser(donnees) {
  return Array.isArray(donnees) ? donnees : donnees.results || [];
}

export default function StockPage() {
  const { utilisateur } = useSelector((state) => state.auth);
  const { afficherSucces } = useNotifier();
  const peutGererStock = utilisateur?.role === "ADMIN" || utilisateur?.role === "MAGASINIER";

  const [articles, setArticles] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(0);
  const [surPage, setSurPage] = useState(5);

  // Pagination indépendante pour l'historique des mouvements
  const [pageMouvements, setPageMouvements] = useState(0);
  const [surPageMouvements, setSurPageMouvements] = useState(5);

  const [dialogueArticleOuvert, setDialogueArticleOuvert] = useState(false);
  const [articleEnEdition, setArticleEnEdition] = useState(null);
  const [formulaireArticle, setFormulaireArticle] = useState(ARTICLE_VIDE);
  const [enCoursArticle, setEnCoursArticle] = useState(false);

  const [dialogueMouvementOuvert, setDialogueMouvementOuvert] = useState(false);
  const [articleSelectionne, setArticleSelectionne] = useState(null);
  const [typeMouvement, setTypeMouvement] = useState("ENTREE");
  const [quantiteMouvement, setQuantiteMouvement] = useState("");
  const [dossierMouvementId, setDossierMouvementId] = useState("");
  const [dossiers, setDossiers] = useState([]);
  const [enCoursMouvement, setEnCoursMouvement] = useState(false);
  const [confirmationMouvement, setConfirmationMouvement] = useState(false);

  const charger = () => {
    setChargement(true);
    Promise.all([
      listerArticles().then(normaliser).catch(() => { throw new Error("articles"); }),
      listerMouvements().then(normaliser).catch(() => []),
    ])
      .then(([listeArticles, listeMouvements]) => {
        setArticles(listeArticles);
        setMouvements(listeMouvements);
      })
      .catch(() => setErreur("Impossible de charger le stock."))
      .finally(() => setChargement(false));
  };

  useEffect(() => { charger(); }, []);

  const articlesFiltres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter((a) =>
      [a.designation, a.classe_comptable, a.unite, a.emplacement_stock]
        .filter(Boolean).some((champ) => String(champ).toLowerCase().includes(q))
    );
  }, [articles, recherche]);

  // Tri par colonne (articles puis mouvements) + page courante
  const { cleTri, directionTri, gererTri, donneesTriees: articlesTries } = useTriTableau(articlesFiltres);
  const { cleTriMouvements, directionTriMouvements, gererTriMouvements, donneesTriees: mouvementsTries } = useTriTableau(mouvements);
  const articlesPaginees = useMemo(
    () => articlesTries.slice(page * surPage, page * surPage + surPage),
    [articlesTries, page, surPage]
  );
  const mouvementsPaginees = useMemo(
    () => mouvementsTries.slice(pageMouvements * surPageMouvements, pageMouvements * surPageMouvements + surPageMouvements),
    [mouvementsTries, pageMouvements, surPageMouvements]
  );

  // Cadres mesurés : exactement l'en-tête + 5 lignes, sans barre de
  // défilement à 5 entrées ; elle apparaît dès qu'on augmente l'affichage.
  const refCadreArticles = useRef(null);
  const hauteurCadreArticles = useHauteurCinqLignes(refCadreArticles, articlesPaginees.length);
  const refCadreMouvements = useRef(null);
  const hauteurCadreMouvements = useHauteurCinqLignes(refCadreMouvements, mouvementsPaginees.length);

  const articlesEnAlerte = articles.filter((a) => a.est_en_alerte ?? (Number(a.quantite_stock) <= Number(a.seuil_securite)));

  const gererRecherche = (valeur) => { setRecherche(valeur); setPage(0); };

  // --- Fiche article ---
  const ouvrirCreationArticle = () => {
    setArticleEnEdition(null);
    setFormulaireArticle(ARTICLE_VIDE);
    setDialogueArticleOuvert(true);
  };

  const ouvrirModificationArticle = (article) => {
    setArticleEnEdition(article);
    setFormulaireArticle({
      designation: article.designation, emplacement_stock: article.emplacement_stock || "",
      classe_comptable: article.classe_comptable,
      type_papier: article.type_papier || "NON_APPLICABLE",
      type_encre: article.type_encre || "", type_film: article.type_film || "", unite: article.unite,
      cout_unitaire: String(article.cout_unitaire ?? ""), seuil_securite: String(article.seuil_securite ?? ""),
    });
    setDialogueArticleOuvert(true);
  };

  const gererEnregistrementArticle = async () => {
    setEnCoursArticle(true);
    setErreur("");
    try {
      const donnees = {
        designation: formulaireArticle.designation.trim(), emplacement_stock: (formulaireArticle.emplacement_stock || "").trim(),
        classe_comptable: formulaireArticle.classe_comptable,
        type_papier: formulaireArticle.type_papier,
        type_encre: (formulaireArticle.type_encre || "").trim(), type_film: (formulaireArticle.type_film || "").trim(),
        unite: formulaireArticle.unite,
        cout_unitaire: formulaireArticle.cout_unitaire || 0, seuil_securite: formulaireArticle.seuil_securite || 0,
      };
      if (articleEnEdition) await modifierArticle(articleEnEdition.id, donnees);
      else await creerArticle(donnees);
      afficherSucces(articleEnEdition ? "Article modifié avec succès." : "Article créé avec succès.");
      setDialogueArticleOuvert(false);
      charger();
    } catch (err) {
      const donnees = err.response?.data;
      const premierMessage = donnees ? Object.values(donnees)[0] : null;
      setErreur(Array.isArray(premierMessage) ? premierMessage[0] : premierMessage || "Impossible d'enregistrer cet article.");
    } finally { setEnCoursArticle(false); }
  };

  // --- Mouvement de stock ---
  const ouvrirDialogueMouvement = async (article) => {
    setArticleSelectionne(article);
    setTypeMouvement("ENTREE");
    setQuantiteMouvement("");
    setDossierMouvementId("");
    setDialogueMouvementOuvert(true);
    try { setDossiers(normaliser(await listerDossiers())); } catch { setDossiers([]); }
  };

  const gererMouvement = async () => {
    setConfirmationMouvement(false);
    if (!quantiteMouvement || Number(quantiteMouvement) <= 0) return;
    setEnCoursMouvement(true);
    setErreur("");
    try {
      await creerMouvement({
        article: articleSelectionne.id, type_mouvement: typeMouvement,
        quantite: Number(quantiteMouvement),
        dossier: typeMouvement === "SORTIE" && dossierMouvementId ? dossierMouvementId : null,
      });
      afficherSucces(
        typeMouvement === "ENTREE"
          ? `Entrée de ${quantiteMouvement} ${articleSelectionne.unite} enregistrée avec succès.`
          : `Sortie de ${quantiteMouvement} ${articleSelectionne.unite} enregistrée avec succès.`
      );
      setDialogueMouvementOuvert(false);
      charger();
    } catch (err) {
      const donnees = err.response?.data;
      if (donnees?.quantite) setErreur(Array.isArray(donnees.quantite) ? donnees.quantite[0] : donnees.quantite);
      else setErreur("Impossible d'enregistrer ce mouvement.");
    } finally { setEnCoursMouvement(false); }
  };

  return (
    <Box>
      <PageHeader
        icone={<Inventory2Icon />}
        titre="Stock de matières premières"
        sousTitre="Articles, mouvements tracés et alertes de seuil de sécurité (RG9 à RG11)."
        centre
        taillePastille={28}
        titreVariant="h6"
      />

      {erreur && <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }} onClose={() => setErreur("")}>{erreur}</Alert>}

      {articlesEnAlerte.length > 0 && (
        <Card sx={{ mb: 1.5, borderLeft: 4, borderColor: "error.main", boxShadow: 1, flexShrink: 0 }}>
          <CardContent sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, py: 1.5, "&:last-child": { pb: 1.5 } }}>
            <WarningAmberIcon color="error" sx={{ mt: 0.25 }} />
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "error.main", fontSize: 13 }}>
                Alerte de stock (UC : anticiper les réapprovisionnements)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12.5 }}>
                {articlesEnAlerte.length} article(s) sous le seuil de sécurité : {articlesEnAlerte.map((a) => a.designation).join(", ")}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="center"
        sx={{ mb: 1.5, justifyContent: "space-between", flexShrink: 0 }}>
        <SearchField valeur={recherche} onChange={(e) => gererRecherche(e.target.value)}
          placeholder="Rechercher un article par désignation, classe ou unité…"
          largeur={400} sx={{ mb: 0, flexGrow: 1, maxWidth: 400 }} />
        <BoutonExport
          surPdf={async () => {
            const e = await import("../utils/exportateur");
            await e.exporterPDF({
              fichier: `Stock_${Date.now()}.pdf`,
              titre: "Inventaire des articles",
              meta: e.metaEdition(articlesFiltres.length),
              colonnes: [
                e.colonne("Article", "designation"),
                e.colonne("Emplacement", "emplacement_stock"),
                e.colonnePerso("Coût unitaire", (a) => `${Number(a.cout_unitaire).toLocaleString("fr-FR")} Ar`, "right"),
                e.colonnePerso("Stock", (a) => Number(a.quantite_stock).toLocaleString("fr-FR"), "right"),
                e.colonnePerso("Seuil", (a) => Number(a.seuil_securite).toLocaleString("fr-FR"), "right"),
              ],
              lignes: articlesFiltres,
            });
          }}
          surExcel={async () => {
            const e = await import("../utils/exportateur");
            await e.exporterExcel({
              fichier: `Stock_${Date.now()}.xlsx`,
              feuilles: [{
                nom: "Articles", titre: "Inventaire des articles",
                meta: e.metaEdition(articlesFiltres.length),
                colonnes: [
                  e.colonne("Article", "designation"),
                  e.colonne("Emplacement", "emplacement_stock"),
                  e.colonnePerso("Unité", (a) => a.unite),
                  e.colonnePerso("Coût unitaire", (a) => Number(a.cout_unitaire).toLocaleString("fr-FR"), "right"),
                  e.colonnePerso("Stock actuel", (a) => Number(a.quantite_stock).toLocaleString("fr-FR"), "right"),
                  e.colonnePerso("Seuil sécurité", (a) => Number(a.seuil_securite).toLocaleString("fr-FR"), "right"),
                ],
                lignes: articlesFiltres,
              }, {
                nom: "Mouvements", titre: "Historique des mouvements",
                meta: e.metaEdition(mouvements.length),
                colonnes: [
                  e.colonnePerso("Date", (m) => new Date(m.date_mouvement).toLocaleString("fr-FR")),
                  e.colonne("Article", "article_designation"),
                  e.colonne("Type", "type_mouvement"),
                  e.colonnePerso("Quantité", (m) => Number(m.quantite).toLocaleString("fr-FR"), "right"),
                  e.colonne("Dossier", "dossier_numero"),
                ],
                lignes: mouvements,
              }],
            });
          }}
          libelle="Exporter"
          taille="small"
        />
        {peutGererStock && (
          <Button variant="contained" size="small" startIcon={<AddIcon />}
            onClick={ouvrirCreationArticle} sx={{ flexShrink: 0, whiteSpace: "nowrap" }}>
            Nouvel article
          </Button>
        )}
      </Stack>

      {chargement ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}><CircularProgress /></Box>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
          {/* --- Tableau des articles --- */}
          <TableContainer ref={refCadreArticles} sx={{ maxHeight: hauteurCadreArticles ?? 320, overflow: "auto" }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell align="center" sx={{ width: 48, ...STYLE_EN_TETE }}>#</TableCell>
                  <EnTeteTriable cle="designation" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Article</EnTeteTriable>
                  <EnTeteTriable cle="classe_comptable" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Classe comptable</EnTeteTriable>
                  <EnTeteTriable cle="unite" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Unité</EnTeteTriable>
                  <EnTeteTriable cle="cout_unitaire" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Coût unitaire</EnTeteTriable>
                  <EnTeteTriable cle="quantite_stock" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Stock actuel</EnTeteTriable>
                  <EnTeteTriable cle="seuil_securite" cleTri={cleTri} directionTri={directionTri} onTri={gererTri}>Seuil sécurité</EnTeteTriable>
                  <TableCell align="center" sx={STYLE_EN_TETE}>État</TableCell>
                  {peutGererStock && <TableCell align="center" sx={STYLE_EN_TETE}>Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {articlesPaginees.map((article, index) => {
                  const enAlerte = article.est_en_alerte ?? (Number(article.quantite_stock) <= Number(article.seuil_securite));
                  return (
                    <TableRow key={article.id} hover sx={{
                      "&:last-child td": { borderBottom: 0 },
                      "&:nth-of-type(even)": { bgcolor: "background.default" },
                    }}>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 500, color: "text.secondary" }}>
                          {page * surPage + index + 1}
                        </Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>
                        {article.designation}
                        {article.emplacement_stock && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontWeight: 400 }}>
                            {article.emplacement_stock}
                          </Typography>
                        )}
                        {(article.type_encre || article.type_film) && (
                          <Typography variant="caption" color="text.disabled" sx={{ display: "block", fontWeight: 400 }}>
                            {[article.type_encre && `Encre : ${article.type_encre}`, article.type_film && `Film : ${article.type_film}`]
                              .filter(Boolean).join(" — ")}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">{LIBELLES_CLASSE[article.classe_comptable] || article.classe_comptable}</TableCell>
                      <TableCell align="center">{article.unite}</TableCell>
                      <TableCell align="center">{Number(article.cout_unitaire).toLocaleString("fr-FR")} Ar</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>
                        {Number(article.quantite_stock).toLocaleString("fr-FR")}
                      </TableCell>
                      <TableCell align="center">{Number(article.seuil_securite).toLocaleString("fr-FR")}</TableCell>
                      <TableCell align="center">
                        <Chip label={enAlerte ? "Stock bas" : "Normal"}
                          color={enAlerte ? "error" : "success"} size="small" sx={{ fontWeight: 600 }} />
                      </TableCell>
                      {peutGererStock && (
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            <Tooltip title="Mouvement d'entrée / sortie">
                              <IconButton size="small" color="primary" onClick={() => ouvrirDialogueMouvement(article)}>
                                <SwapVertIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Modifier la fiche article">
                              <IconButton size="small" onClick={() => ouvrirModificationArticle(article)}>
                                <EditOutlinedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
                {articlesPaginees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={peutGererStock ? 9 : 8} align="center" sx={{ py: 5, color: "text.secondary" }}>
                      {recherche ? "Aucun article ne correspond à votre recherche." : "Aucun article enregistré."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination fixe */}
          {articlesFiltres.length > 0 && (
            <PaginationBar
              compte={articlesFiltres.length}
              page={page}
              surPage={surPage}
              onPageChange={setPage}
              onSurPageChange={(nouvelleValeur) => { setSurPage(nouvelleValeur); setPage(0); }}
            />
          )}

          {/* --- Séparateur + Historique des mouvements --- */}
          <Box sx={{ borderTop: "1px solid", borderColor: "divider" }}>
            <Stack direction="row" alignItems="center" spacing={1.25}
              sx={{ px: 2, py: 1, bgcolor: "background.default" }}>
              <HistoryIcon color="primary" fontSize="small" />
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 14 }}>Mouvements</Typography>
              <Chip label={`${mouvements.length}`} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
            </Stack>
            <TableContainer ref={refCadreMouvements} sx={{ maxHeight: hauteurCadreMouvements ?? 320, overflow: "auto" }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <EnTeteTriable cle="date_mouvement" cleTri={cleTriMouvements} directionTri={directionTriMouvements} onTri={gererTriMouvements} sx={{ py: 0.75 }}>Date</EnTeteTriable>
                    <EnTeteTriable cle="article_designation" cleTri={cleTriMouvements} directionTri={directionTriMouvements} onTri={gererTriMouvements} sx={{ py: 0.75 }}>Article</EnTeteTriable>
                    <EnTeteTriable cle="type_mouvement" cleTri={cleTriMouvements} directionTri={directionTriMouvements} onTri={gererTriMouvements} sx={{ py: 0.75 }}>Type</EnTeteTriable>
                    <EnTeteTriable cle="quantite" cleTri={cleTriMouvements} directionTri={directionTriMouvements} onTri={gererTriMouvements} sx={{ py: 0.75 }}>Quantité</EnTeteTriable>
                    <EnTeteTriable cle="dossier_numero" cleTri={cleTriMouvements} directionTri={directionTriMouvements} onTri={gererTriMouvements} sx={{ py: 0.75 }}>Dossier</EnTeteTriable>
                    <TableCell align="center" sx={{ py: 0.75, ...STYLE_EN_TETE }}>Validé par</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mouvementsPaginees.map((mouvement) => (
                    <TableRow key={mouvement.id} hover sx={{
                      "&:last-child td": { borderBottom: 0 },
                      "&:nth-of-type(even)": { bgcolor: "background.default" },
                    }}>
                      <TableCell align="center" sx={{ py: 0.6 }}>{new Date(mouvement.date_mouvement).toLocaleString("fr-FR")}</TableCell>
                      <TableCell align="center" sx={{ py: 0.6 }}>{mouvement.article_designation}</TableCell>
                      <TableCell align="center" sx={{ py: 0.6 }}>
                        <Chip label={LIBELLES_MOUVEMENT[mouvement.type_mouvement] || mouvement.type_mouvement}
                          color={COULEURS_MOUVEMENT[mouvement.type_mouvement] || "default"}
                          size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, py: 0.6 }}>
                        {Number(mouvement.quantite).toLocaleString("fr-FR")}
                      </TableCell>
                      <TableCell align="center" sx={{ py: 0.6 }}>{mouvement.dossier_numero || "—"}</TableCell>
                      <TableCell align="center" sx={{ py: 0.6 }}>{mouvement.valide_par_nom || "—"}</TableCell>
                    </TableRow>
                  ))}
                  {mouvements.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3, color: "text.secondary" }}>
                        Aucun mouvement enregistré pour le moment.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            {mouvements.length > 0 && (
              <PaginationBar
                compte={mouvements.length}
                page={pageMouvements}
                surPage={surPageMouvements}
                onPageChange={setPageMouvements}
                onSurPageChange={(nouvelleValeur) => { setSurPageMouvements(nouvelleValeur); setPageMouvements(0); }}
              />
            )}
          </Box>
        </Paper>
      )}

      {/* Modale : fiche article */}
      <Dialog open={dialogueArticleOuvert} onClose={() => setDialogueArticleOuvert(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {articleEnEdition ? "Modifier l'article" : "Nouvel article de stock"}
          <IconButton onClick={() => setDialogueArticleOuvert(false)} size="small"><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <TextField label="Désignation générique" value={formulaireArticle.designation}
              onChange={(e) => setFormulaireArticle((f) => ({ ...f, designation: e.target.value }))}
              fullWidth required helperText="Unique en base (ex. « papier offset », « encre noire »)." />
            <TextField label="Emplacement de stockage (RG32)" value={formulaireArticle.emplacement_stock}
              onChange={(e) => setFormulaireArticle((f) => ({ ...f, emplacement_stock: e.target.value }))}
              fullWidth helperText="Emplacement au magasin, ex. « Rayon 2 — étagère B »." />
            <Stack direction="row" spacing={2}>
              <TextField select label="Classe comptable" value={formulaireArticle.classe_comptable}
                onChange={(e) => setFormulaireArticle((f) => ({ ...f, classe_comptable: e.target.value }))} fullWidth>
                {Object.entries(LIBELLES_CLASSE).map(([code, libelle]) => (
                  <MenuItem key={code} value={code}>{libelle}</MenuItem>
                ))}
              </TextField>
              <TextField label="Unité" value={formulaireArticle.unite}
                onChange={(e) => setFormulaireArticle((f) => ({ ...f, unite: e.target.value }))} fullWidth />
            </Stack>
            <TextField select label="Type de papier" value={formulaireArticle.type_papier}
              onChange={(e) => setFormulaireArticle((f) => ({ ...f, type_papier: e.target.value }))} fullWidth>
              {Object.entries(LIBELLES_PAPIER).map(([code, libelle]) => (
                <MenuItem key={code} value={code}>{libelle}</MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField label="Type d'encre (optionnel)" value={formulaireArticle.type_encre}
                onChange={(e) => setFormulaireArticle((f) => ({ ...f, type_encre: e.target.value }))} fullWidth />
              <TextField label="Type de film (optionnel)" value={formulaireArticle.type_film}
                onChange={(e) => setFormulaireArticle((f) => ({ ...f, type_film: e.target.value }))} fullWidth />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="Coût unitaire (Ar)" type="number" value={formulaireArticle.cout_unitaire}
                onChange={(e) => setFormulaireArticle((f) => ({ ...f, cout_unitaire: e.target.value }))}
                fullWidth slotProps={{ htmlInput: { min: 0 } }} />
              <TextField label="Seuil de sécurité" type="number" value={formulaireArticle.seuil_securite}
                onChange={(e) => setFormulaireArticle((f) => ({ ...f, seuil_securite: e.target.value }))}
                fullWidth slotProps={{ htmlInput: { min: 0 } }} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogueArticleOuvert(false)}>Annuler</Button>
          <Button variant="contained" onClick={gererEnregistrementArticle}
            disabled={enCoursArticle || !formulaireArticle.designation.trim()}
            startIcon={enCoursArticle ? <CircularProgress size={16} color="inherit" /> : undefined}>
            {enCoursArticle ? "Enregistrement…" : articleEnEdition ? "Modifier" : "Créer"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modale : mouvement de stock */}
      <Dialog open={dialogueMouvementOuvert} onClose={() => setDialogueMouvementOuvert(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          Mouvement de stock — {articleSelectionne?.designation}
          <IconButton onClick={() => setDialogueMouvementOuvert(false)} size="small"><CloseIcon fontSize="small" /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Alert severity="info">
              Stock disponible : <strong>{Number(articleSelectionne?.quantite_stock).toLocaleString("fr-FR")} {articleSelectionne?.unite}</strong>
            </Alert>
            <TextField select label="Type de mouvement" fullWidth value={typeMouvement}
              onChange={(e) => setTypeMouvement(e.target.value)}>
              <MenuItem value="ENTREE">Entrée (approvisionnement)</MenuItem>
              <MenuItem value="SORTIE">Sortie (consommation production)</MenuItem>
            </TextField>
            {typeMouvement === "SORTIE" && (
              <TextField select label="Dossier de fabrication lié (RG8)" value={dossierMouvementId}
                onChange={(e) => setDossierMouvementId(e.target.value)} fullWidth
                helperText="Rattache la consommation matière à un dossier.">
                <MenuItem value="">— Sans dossier —</MenuItem>
                {dossiers.map((d) => (
                  <MenuItem key={d.id} value={d.id}>{d.numero_dossier} — {d.commande_numero}</MenuItem>
                ))}
              </TextField>
            )}
            <TextField label="Quantité" type="number" fullWidth value={quantiteMouvement}
              onChange={(e) => setQuantiteMouvement(e.target.value)} slotProps={{ htmlInput: { min: 1 } }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogueMouvementOuvert(false)}>Annuler</Button>
          <Button variant="contained" onClick={() => setConfirmationMouvement(true)}
            disabled={enCoursMouvement || !quantiteMouvement || Number(quantiteMouvement) <= 0}
            startIcon={enCoursMouvement ? <CircularProgress size={16} color="inherit" /> : undefined}>
            {enCoursMouvement ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialogue : confirmation du mouvement de stock */}
      <ConfirmDialog
        ouvert={confirmationMouvement}
        titre={typeMouvement === "ENTREE" ? "Enregistrer cette entrée ?" : "Enregistrer cette sortie ?"}
        icone={<SwapVertIcon sx={{ fontSize: 24 }} />}
        couleur={typeMouvement === "ENTREE" ? "success" : "warning"}
        texteConfirmer="Enregistrer"
        enCours={enCoursMouvement}
        onConfirmer={gererMouvement}
        onAnnuler={() => setConfirmationMouvement(false)}
        message={
          typeMouvement === "ENTREE"
            ? `Ajouter ${quantiteMouvement || "…"} ${articleSelectionne?.unite} au stock de « ${articleSelectionne?.designation} » ? Un mouvement est définitif et tracé (RG8-RG11).`
            : `Retirer ${quantiteMouvement || "…"} ${articleSelectionne?.unite} du stock de « ${articleSelectionne?.designation} » ? Un mouvement est définitif et tracé (RG8-RG11).`
        }
      />
    </Box>
  );
}