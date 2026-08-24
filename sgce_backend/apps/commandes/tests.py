from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.catalogue.models import Composant, FamilleProduit, LigneMatierePremiere, LigneOperation, Machine, Produit
from apps.utilisateurs.models import Utilisateur

from .models import Article, Commande, OrganismeClient


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
        machine = Machine.objects.create(nom="Presse test", cout_horaire=Decimal("60.00"))
        LigneOperation.objects.create(
            composant=composant, machine=machine, libelle="Impression", temps_unitaire=Decimal("1.00")
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

    def test_creation_devis_hors_catalogue_sans_prix_revient_est_refusee(self):
        reponse = self.client.post(
            "/api/devis/",
            {"commande": self.commande.id, "prix_vente": "500.00", "duree_production": 2},
            format="json",
        )
        self.assertEqual(reponse.status_code, 400)
        self.assertIn("prix_revient", reponse.data)
