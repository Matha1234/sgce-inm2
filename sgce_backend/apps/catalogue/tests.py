from decimal import Decimal

from django.test import TestCase

from apps.commandes.models import Article

from .models import Composant, FamilleProduit, LigneMatierePremiere, LigneOperation, Machine, Produit


class CalculPrixRevientCatalogueTests(TestCase):
    """Couvre Produit.calculer_prix_revient() (RG27)."""

    def setUp(self):
        self.famille = FamilleProduit.objects.create(
            nom=FamilleProduit.Nom.BROCHURE, structure_type="Couverture + intérieur"
        )
        self.produit = Produit.objects.create(famille=self.famille, nom="Brochure test")

        self.papier = Article.objects.create(
            designation="Papier offset test", cout_unitaire=Decimal("10.00")
        )
        self.encre = Article.objects.create(
            designation="Encre noire test", cout_unitaire=Decimal("50.00")
        )
        self.machine = Machine.objects.create(nom="Presse offset", cout_horaire=Decimal("600.00"))

        self.composant = Composant.objects.create(
            produit=self.produit, ordre=1, designation="Couverture"
        )
        LigneMatierePremiere.objects.create(
            composant=self.composant, article=self.papier, quantite_unitaire=Decimal("2.000")
        )
        LigneMatierePremiere.objects.create(
            composant=self.composant, article=self.encre, quantite_unitaire=Decimal("0.050")
        )
        LigneOperation.objects.create(
            composant=self.composant, machine=self.machine, libelle="Impression",
            temps_unitaire=Decimal("3.00"),  # minutes
        )

    def test_calcul_prix_revient_pour_une_quantite(self):
        # Par exemplaire : matière = 2*10 + 0.05*50 = 22.5 ; opération = (3/60)*600 = 30
        # Total par exemplaire = 52.5 ; pour 100 exemplaires = 5250.00
        prix = self.produit.calculer_prix_revient(100)
        self.assertEqual(prix, Decimal("5250.00"))

    def test_quantite_invalide_leve_une_erreur(self):
        from django.core.exceptions import ValidationError

        with self.assertRaises(ValidationError):
            self.produit.calculer_prix_revient(0)

    def test_produit_sans_composant_leve_une_erreur(self):
        from django.core.exceptions import ValidationError

        produit_vide = Produit.objects.create(famille=self.famille, nom="Produit sans composant")
        with self.assertRaises(ValidationError):
            produit_vide.calculer_prix_revient(10)

    def test_rg26_numerotation_unique_par_produit(self):
        with self.assertRaises(Exception):
            Composant.objects.create(produit=self.produit, ordre=1, designation="Doublon")
