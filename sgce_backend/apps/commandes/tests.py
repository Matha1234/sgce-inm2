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

from .models import Article, Atelier, Commande, OrganismeClient


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
