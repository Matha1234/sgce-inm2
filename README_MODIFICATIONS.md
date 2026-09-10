# Fichiers modifiés / ajoutés — mise en conformité complète avec le Chapitre 5

À copier dans ton projet en respectant l'arborescence (mêmes chemins que
ton zip). Ce patch inclut TOUT le travail effectué (génération auto du
dossier + affichage exhaustif des attributs du dictionnaire de données).

## Backend

### apps/commandes/
- **services.py** (NOUVEAU) — génération automatique du dossier de
  fabrication à la validation du devis (RG4, RG5, RG8, RG34).
- **models.py** — `Devis.generer_lignes_devis()` copie désormais réellement
  le détail matière/opération (LigneMatiereDevis, LigneOperationDevis)
  depuis le catalogue (RG39) — bug découvert en écrivant les tests.
- **views.py** — dossier auto-généré à la validation (transactionnel, avec
  gestion d'erreur propre) ; verrou RG16/UC-13 (devis validé non
  modifiable) ; filtre `?organisme=` (UC-14) ; vues de détail (modif/
  suppression) pour options et lignes de devis, avec filtres `?devis=`,
  `?ligne_devis=`, `?dossier=`.
- **serializers.py** — verrou RG16 ; `MouvementStockSerializer` expose
  désormais `valide_par_nom` (libellé, pas juste l'identifiant brut).
- **urls.py** — routes des nouvelles vues.
- **tests.py** — 7 nouveaux tests (génération auto du dossier, RG8, RG34,
  RG5, RG16).

### apps/catalogue/
- **views.py** / **urls.py** — endpoint `GET /composants-a-reviser/`
  (RG37, boucle de rétroaction, réservé Admin).

### apps/controle/
- **serializers.py** — `ControlePrixRevientSerializer` expose désormais
  `controle_par_nom` (libellé plutôt qu'identifiant brut).

Aucune migration nécessaire (aucun champ de modèle modifié). Vérifié :
`manage.py check` OK, `makemigrations --check` : aucun changement,
suite de tests complète (25/25) OK.

## Frontend

### src/api/
- **commandesApi.js** — fonctions pour options/lignes de devis, exécutions
  d'opération, `listerAteliers` (déjà présent mais jamais appelé), filtre
  `organisme` sur les commandes.
- **catalogueApi.js** — `listerComposantsAReviser()`.

### src/components/commandes/
- **NouvelleCommandeForm.jsx** — formulaire de création d'organisme
  enrichi : `adresse`, `nif_stat`, `telephone`, `email`,
  `contact_principal`.
- **CommandeDetailContent.jsx** — affichage de `date_devis`,
  `options_ajustees`, détail RG39 (`lignes_matiere_detail`,
  `lignes_operation_detail`) par composant, `date_estimation`/`methode`/
  `score_confiance` de l'estimation IA ; **interface complète de gestion
  des options de devis** (RG33) : liste, ajout, suppression (verrouillée
  si devis validé).

### src/pages/
- **DashboardHomePage.jsx** — panneau "Composants à réviser" (RG37) ;
  enrichissement du panneau "Avancement par atelier" avec
  `chef_atelier_nom` et `capacite`.
- **DossierDetailPage.jsx** — **nouvel écran de suivi des opérations**
  (RG35, RG38) : le Chef d'Atelier saisit le temps réel par opération du
  devis ; `date_cloture` affichée ; fiche de contrôle enrichie avec
  `ecart_prix_revient`, `prix_revient_estime`, `controle_par_nom`.
- **CataloguePage.jsx** — champ `formule_calcul` (matière/opération) ;
  `reference`, `marge_min`, `marge_max`, `date_maj` sur les produits.
- **StockPage.jsx** — `type_encre`, `type_film` sur les articles ;
  `valide_par` sur les mouvements de stock ; utilisation de
  `est_en_alerte` fourni par l'API.
- **ControlesListPage.jsx** — `prix_revient_estime` et `ecart_prix_revient`
  (montant, pas seulement le drapeau significatif), y compris dans les
  exports PDF/Excel.

Vérifié : compilation esbuild de tous les fichiers modifiés (0 erreur).

## Non-gaps identifiés (aucune action nécessaire)

- `type_poste_libelle`, `role_display` : déjà affichés via un mapping
  correspondant calculé côté frontend (`LIBELLES_TYPE_POSTE`,
  `LIBELLES_ROLES`) — fonctionnellement équivalents à l'attribut brut.
