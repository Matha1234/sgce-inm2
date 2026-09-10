from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.catalogue.models import (
    Composant,
    FamilleProduit,
    LigneMatierePremiere,
    LigneOperation,
    PosteDeCharge,
    Produit,
)
from apps.utilisateurs.models import Utilisateur

from .models import Article, Atelier, Commande, Devis, DossierFabrication, MouvementStock, OrganismeClient


class DevisInstancieCatalogueApiTests(TestCase):
    """
    Couvre le parcours complet RG27 : un Agent SDO crée un devis rattaché à
    un produit du catalogue sans saisir de prix de revient - le serveur le
    calcule automatiquement à partir de la nomenclature.
    """

    def setUp(self):
        self.client = APIClient()
        self.agent = Utilisateur.objects.create_user(
            username="agent1", password="x", role=Utilisateur.Role.AGENT_SDO
        )
        self.client.force_authenticate(user=self.agent)

        famille = FamilleProduit.objects.create(nom=FamilleProduit.Nom.FEUILLE_VOLANTE)
        self.produit = Produit.objects.create(famille=famille, nom="Flyer A4 test")
        article = Article.objects.create(designation="Papier A4 test", cout_unitaire=Decimal("5.00"))
        composant = Composant.objects.create(produit=self.produit, ordre=1, designation="Unique")
        LigneMatierePremiere.objects.create(
            composant=composant, article=article, quantite_unitaire=Decimal("1.000")
        )
        machine = PosteDeCharge.objects.create(nom="Presse test", cout_horaire=Decimal("60.00"))
        LigneOperation.objects.create(
            composant=composant, poste=machine, libelle="Impression", temps_unitaire=Decimal("1.00")
        )
        # Par exemplaire : matière = 1*5 = 5 ; opération = (1/60)*60 = 1 -> total 6/exemplaire

        organisme = OrganismeClient.objects.create(
            nom="Client test", type=OrganismeClient.TypeOrganisme.PARTICULIER
        )
        self.commande = Commande.objects.create(organisme=organisme, quantite=50)

    def test_creation_devis_sans_prix_revient_calcule_via_catalogue(self):
        reponse = self.client.post(
            "/api/devis/",
            {
                "commande": self.commande.id,
                "produit_catalogue": self.produit.id,
                "prix_vente": "500.00",
                "duree_production": 2,
            },
            format="json",
        )
        self.assertEqual(reponse.status_code, 201, reponse.data)
        # 50 exemplaires * 6.00 / exemplaire = 300.00
        self.assertEqual(reponse.data["prix_revient"], "300.00")

    def test_creation_devis_catalogue_genere_lignes_devis(self):
        """RG27 + RG28 : une LigneDevis prévisionnelle est générée par composant."""
        reponse = self.client.post(
            "/api/devis/",
            {
                "commande": self.commande.id,
                "produit_catalogue": self.produit.id,
                "prix_vente": "500.00",
                "duree_production": 2,
            },
            format="json",
        )
        self.assertEqual(reponse.status_code, 201, reponse.data)
        lignes = reponse.data["lignes_devis"]
        self.assertEqual(len(lignes), 1)
        # 50 exemplaires : matière 1*5*50 = 250 ; opération (1/60)*60*50 = 50
        self.assertEqual(lignes[0]["cout_matiere_estime"], "250.00")
        self.assertEqual(lignes[0]["cout_operation_estime"], "50.00")
        self.assertEqual(lignes[0]["cout_total_estime"], "300.00")

    def test_creation_devis_catalogue_avec_remarque_rg30(self):
        """RG30 : la remarque portée par la LigneDevis prévaut sur le catalogue."""
        composant = Composant.objects.get(produit=self.produit)
        reponse = self.client.post(
            "/api/devis/",
            {
                "commande": self.commande.id,
                "produit_catalogue": self.produit.id,
                "prix_vente": "500.00",
                "duree_production": 2,
                "remarques_lignes": [
                    {"composant": composant.id, "remarque": "Papier recyclé à la demande du client"},
                ],
            },
            format="json",
        )
        self.assertEqual(reponse.status_code, 201, reponse.data)
        self.assertEqual(
            reponse.data["lignes_devis"][0]["remarque"],
            "Papier recyclé à la demande du client",
        )

    def test_creation_devis_catalogue_refuse_prix_revient_saisi(self):
        """RG27 : le prix de revient d'un devis catalogue est calculé, jamais saisi."""
        reponse = self.client.post(
            "/api/devis/",
            {
                "commande": self.commande.id,
                "produit_catalogue": self.produit.id,
                "prix_revient": "999.00",
                "prix_vente": "500.00",
                "duree_production": 2,
            },
            format="json",
        )
        self.assertEqual(reponse.status_code, 400)
        self.assertIn("prix_revient", reponse.data)

    def test_creation_devis_hors_catalogue_sans_prix_revient_est_refusee(self):
        reponse = self.client.post(
            "/api/devis/",
            {"commande": self.commande.id, "prix_vente": "500.00", "duree_production": 2},
            format="json",
        )
        self.assertEqual(reponse.status_code, 400)
        self.assertIn("prix_revient", reponse.data)


class DossierFabricationApiTests(TestCase):
    """
    Couvre RG5 (dossier cree uniquement pour une commande validee, une fois)
    et la synchronisation du statut de la commande avec l'avancement du
    dossier : EN_COURS -> EN_PRODUCTION, retour CREE -> VALIDEE.
    """

    def setUp(self):
        self.client = APIClient()
        self.agent = Utilisateur.objects.create_user(
            username="agent2", password="x", role=Utilisateur.Role.AGENT_SDO
        )
        self.chef = Utilisateur.objects.create_user(
            username="chef1", password="x", role=Utilisateur.Role.CHEF_ATELIER
        )
        self.client.force_authenticate(user=self.agent)

        self.atelier = Atelier.objects.create(nom=Atelier.Nom.SPA, chef_atelier=self.chef)
        organisme = OrganismeClient.objects.create(
            nom="Client test", type=OrganismeClient.TypeOrganisme.PARTICULIER
        )
        self.commande = Commande.objects.create(organisme=organisme, quantite=100)

    def test_dossier_refuse_pour_commande_livree(self):
        """Le bug signale : la commande LIVREE (issue du seed) ne doit pas permettre la creation (RG5)."""
        self.commande.statut = Commande.Statut.LIVREE
        self.commande.save()
        reponse = self.client.post("/api/dossiers/", {"commande": self.commande.id}, format="json")
        self.assertEqual(reponse.status_code, 400)
        self.assertIn(
            "Un dossier de fabrication ne peut être créé que pour une commande validée (RG5).",
            reponse.data["commande"],
        )

    def test_creation_dossier_pour_commande_validee(self):
        self.commande.statut = Commande.Statut.VALIDEE
        self.commande.save()
        reponse = self.client.post("/api/dossiers/", {"commande": self.commande.id}, format="json")
        self.assertEqual(reponse.status_code, 201, reponse.data)
        self.assertEqual(reponse.data["statut_production"], "CREE")

    def test_dossier_en_cours_met_commande_en_production(self):
        self.commande.statut = Commande.Statut.VALIDEE
        self.commande.save()
        dossier_id = self.client.post(
            "/api/dossiers/", {"commande": self.commande.id}, format="json"
        ).data["id"]

        # Le chef d'atelier fait passer le dossier en cours (RG17)
        self.client.force_authenticate(user=self.chef)
        reponse = self.client.patch(
            f"/api/dossiers/{dossier_id}/", {"statut_production": "EN_COURS"}, format="json"
        )
        self.assertEqual(reponse.status_code, 200, reponse.data)
        self.commande.refresh_from_db()
        self.assertEqual(self.commande.statut, Commande.Statut.EN_PRODUCTION)

    def test_retour_dossier_a_cree_remet_commande_validee(self):
        self.commande.statut = Commande.Statut.VALIDEE
        self.commande.save()
        dossier_id = self.client.post(
            "/api/dossiers/", {"commande": self.commande.id}, format="json"
        ).data["id"]

        self.client.force_authenticate(user=self.chef)
        self.client.patch(f"/api/dossiers/{dossier_id}/", {"statut_production": "EN_COURS"}, format="json")
        reponse = self.client.patch(
            f"/api/dossiers/{dossier_id}/", {"statut_production": "CREE"}, format="json"
        )
        self.assertEqual(reponse.status_code, 200, reponse.data)
        self.commande.refresh_from_db()
        self.assertEqual(self.commande.statut, Commande.Statut.VALIDEE)


class ValidationDevisGenereDossierAutomatiquementApiTests(TestCase):
    """
    Couvre l'écart comblé entre le mémoire (UC-03, section 5.10.4, RG4/RG5/
    RG8/RG34) et le code : la validation d'un devis catalogue déclenche
    automatiquement, sans action manuelle supplémentaire, la génération du
    dossier de fabrication, l'affectation à l'atelier le moins chargé, les
    étapes de production et la réservation des matières nécessaires.
    """

    def setUp(self):
        self.client = APIClient()
        self.agent = Utilisateur.objects.create_user(
            username="agent-rg4", password="x", role=Utilisateur.Role.AGENT_SDO
        )
        self.client.force_authenticate(user=self.agent)

        # RG8 : SPA a déjà 3 dossiers actifs, SPB n'en a aucun -> SPB doit
        # être choisi par l'équilibrage de charge.
        self.spa = Atelier.objects.create(nom=Atelier.Nom.SPA)
        self.spb = Atelier.objects.create(nom=Atelier.Nom.SPB)
        autre_organisme = OrganismeClient.objects.create(
            nom="Autre client", type=OrganismeClient.TypeOrganisme.PARTICULIER
        )
        for _ in range(3):
            commande_bis = Commande.objects.create(organisme=autre_organisme, quantite=10, atelier="SPA")
            DossierFabrication.objects.create(commande=commande_bis, atelier=self.spa)

        famille = FamilleProduit.objects.create(nom=FamilleProduit.Nom.BROCHURE)
        self.produit = Produit.objects.create(famille=famille, nom="Brochure test")
        self.article = Article.objects.create(
            designation="Papier brochure test", cout_unitaire=Decimal("2.00"), quantite_stock=Decimal("1000")
        )
        composant = Composant.objects.create(produit=self.produit, ordre=1, designation="Corps")
        LigneMatierePremiere.objects.create(
            composant=composant, article=self.article, quantite_unitaire=Decimal("2.000")
        )
        poste = PosteDeCharge.objects.create(nom="Presse brochure", cout_horaire=Decimal("60.00"))
        LigneOperation.objects.create(
            composant=composant, poste=poste, libelle="Impression", temps_unitaire=Decimal("30.00")
        )

        organisme = OrganismeClient.objects.create(
            nom="Client RG4", type=OrganismeClient.TypeOrganisme.PARTICULIER
        )
        self.commande = Commande.objects.create(organisme=organisme, quantite=20)
        reponse_devis = self.client.post(
            "/api/devis/",
            {
                "commande": self.commande.id,
                "produit_catalogue": self.produit.id,
                "prix_vente": "500.00",
                "duree_production": 2,
            },
            format="json",
        )
        self.assertEqual(reponse_devis.status_code, 201, reponse_devis.data)
        self.devis_id = reponse_devis.data["id"]

    def test_validation_devis_genere_dossier_atelier_moins_charge(self):
        reponse = self.client.patch(f"/api/devis/{self.devis_id}/", {"valide": True}, format="json")
        self.assertEqual(reponse.status_code, 200, reponse.data)

        self.commande.refresh_from_db()
        self.assertTrue(hasattr(self.commande, "dossier_fabrication"))
        dossier = self.commande.dossier_fabrication
        # RG8 : SPB (0 dossier actif) est choisi plutôt que SPA (3 dossiers actifs).
        self.assertEqual(dossier.atelier_id, self.spb.id)

    def test_validation_devis_genere_etapes_depuis_gamme_devis(self):
        """RG7 : une étape de production par ligne d'opération du devis."""
        self.client.patch(f"/api/devis/{self.devis_id}/", {"valide": True}, format="json")
        self.commande.refresh_from_db()
        dossier = self.commande.dossier_fabrication
        self.assertEqual(dossier.etapes.count(), 1)

    def test_validation_devis_reserve_le_stock_necessaire(self):
        """RG34 : réservation du stock avant toute sortie physique réelle."""
        self.client.patch(f"/api/devis/{self.devis_id}/", {"valide": True}, format="json")
        self.commande.refresh_from_db()
        dossier = self.commande.dossier_fabrication

        mouvement = MouvementStock.objects.get(dossier=dossier, article=self.article)
        self.assertEqual(mouvement.type_mouvement, MouvementStock.TypeMouvement.RESERVATION)
        # 20 exemplaires * 2.000 / exemplaire = 40.000
        self.assertEqual(mouvement.quantite, Decimal("40.000"))

        self.article.refresh_from_db()
        self.assertEqual(self.article.quantite_stock, Decimal("1000.00"))
        self.assertEqual(self.article.quantite_reservee, Decimal("40.00"))
        self.assertEqual(self.article.quantite_disponible, Decimal("960.00"))

    def test_validation_devis_est_idempotente_pour_le_dossier(self):
        """RG5 : une seule fois par commande, même si la validation est rejouée."""
        self.client.patch(f"/api/devis/{self.devis_id}/", {"valide": True}, format="json")
        self.commande.refresh_from_db()
        dossier_avant = self.commande.dossier_fabrication.id

        # Reconfirmation sans changement : ne doit pas échouer ni dupliquer le dossier.
        reponse = self.client.patch(f"/api/devis/{self.devis_id}/", {"valide": True}, format="json")
        self.assertEqual(reponse.status_code, 200, reponse.data)
        self.commande.refresh_from_db()
        self.assertEqual(self.commande.dossier_fabrication.id, dossier_avant)


class CorrectionsRegressionsApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.agent = Utilisateur.objects.create_user(username="agent-fix", password="x", role=Utilisateur.Role.AGENT_SDO)
        self.chef = Utilisateur.objects.create_user(username="chef-fix", password="x", role=Utilisateur.Role.CHEF_ATELIER)
        self.client.force_authenticate(user=self.agent)
        self.atelier = Atelier.objects.create(nom=Atelier.Nom.SPA, chef_atelier=self.chef)
        organisme = OrganismeClient.objects.create(nom="Client fix", type=OrganismeClient.TypeOrganisme.PARTICULIER)
        self.commande = Commande.objects.create(organisme=organisme, quantite=10)
        self.article = Article.objects.create(designation="Papier fix", cout_unitaire=Decimal("5"), quantite_stock=100)
        famille = FamilleProduit.objects.create(nom=FamilleProduit.Nom.BROCHURE)
        produit = Produit.objects.create(famille=famille, nom="Produit fix")
        composant = Composant.objects.create(produit=produit, ordre=1, designation="Composant")
        LigneMatierePremiere.objects.create(composant=composant, article=self.article, quantite_unitaire=Decimal("1"))
        poste = PosteDeCharge.objects.create(nom="Poste fix", cout_horaire=Decimal("60"))
        LigneOperation.objects.create(composant=composant, poste=poste, libelle="Op", temps_unitaire=Decimal("1"))
        self.devis = Devis.objects.create(commande=self.commande, produit_catalogue=produit, prix_revient=Decimal("60"), prix_vente=Decimal("100"))
        self.devis.generer_lignes_devis()

    def test_option_recalcule_le_prix_revient(self):
        self.client.post("/api/options-devis/", {"devis": self.devis.id, "libelle": "Option", "surcout_matiere": "25.00"}, format="json")
        self.devis.refresh_from_db()
        self.assertEqual(self.devis.prix_revient, Decimal("85.00"))

    def test_sortie_consomme_reservation_sans_double_decrement(self):
        self.devis.valide = True
        self.devis.save(update_fields=["valide"])
        dossier = DossierFabrication.objects.create(commande=self.commande, atelier=self.atelier)
        MouvementStock.objects.create(article=self.article, dossier=dossier, type_mouvement=MouvementStock.TypeMouvement.RESERVATION, quantite=40)
        MouvementStock.objects.create(article=self.article, dossier=dossier, type_mouvement=MouvementStock.TypeMouvement.SORTIE, quantite=40)
        self.article.refresh_from_db()
        self.assertEqual(self.article.quantite_stock, Decimal("60.00"))
        self.assertEqual(self.article.quantite_reservee, Decimal("0.00"))

    def test_devis_valide_ne_peut_pas_etre_reouvert(self):
        self.devis.valide = True
        self.devis.save(update_fields=["valide"])
        reponse = self.client.patch(f"/api/devis/{self.devis.id}/", {"valide": False}, format="json")
        self.assertEqual(reponse.status_code, 400)



class DevisValideNestPlusModifiableApiTests(TestCase):
    """RG16 / UC-13 : un devis déjà validé ne peut plus être modifié."""

    def setUp(self):
        self.client = APIClient()
        self.agent = Utilisateur.objects.create_user(
            username="agent-rg16", password="x", role=Utilisateur.Role.AGENT_SDO
        )
        self.client.force_authenticate(user=self.agent)
        Atelier.objects.get_or_create(nom=Atelier.Nom.SPA)

        organisme = OrganismeClient.objects.create(
            nom="Client RG16", type=OrganismeClient.TypeOrganisme.PARTICULIER
        )
        self.commande = Commande.objects.create(organisme=organisme, quantite=10)
        self.devis = Devis.objects.create(
            commande=self.commande, prix_revient=Decimal("100.00"), prix_vente=Decimal("150.00")
        )

    def test_modification_refusee_apres_validation(self):
        self.client.patch(f"/api/devis/{self.devis.id}/", {"valide": True}, format="json")

        reponse = self.client.patch(
            f"/api/devis/{self.devis.id}/", {"prix_vente": "999.00"}, format="json"
        )
        self.assertEqual(reponse.status_code, 400)

        self.devis.refresh_from_db()
        self.assertEqual(self.devis.prix_vente, Decimal("150.00"))

    def test_reconfirmation_sans_changement_est_acceptee(self):
        self.client.patch(f"/api/devis/{self.devis.id}/", {"valide": True}, format="json")
        reponse = self.client.patch(f"/api/devis/{self.devis.id}/", {"valide": True}, format="json")
        self.assertEqual(reponse.status_code, 200, reponse.data)

    def test_modification_autorisee_avant_validation(self):
        reponse = self.client.patch(
            f"/api/devis/{self.devis.id}/", {"prix_vente": "175.00"}, format="json"
        )
        self.assertEqual(reponse.status_code, 200, reponse.data)
        self.devis.refresh_from_db()
        self.assertEqual(self.devis.prix_vente, Decimal("175.00"))
