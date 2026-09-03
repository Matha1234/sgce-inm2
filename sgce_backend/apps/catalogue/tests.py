from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase

from apps.commandes.models import Article

from .models import (
    Composant,
    FamilleProduit,
    LigneMatierePremiere,
    LigneOperation,
    PosteDeCharge,
    Produit,
)


class CalculPrixRevientCatalogueTests(TestCase):
    """Couvre Produit.calculer_prix_revient() (RG27, RG29)."""

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
        self.poste = PosteDeCharge.objects.create(
            nom="Presse offset", type_poste=PosteDeCharge.TypePoste.MACHINE,
            cout_horaire=Decimal("600.00"),
        )

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
            composant=self.composant, poste=self.poste, libelle="Impression",
            temps_unitaire=Decimal("3.00"),  # minutes
        )

    def test_calcul_prix_revient_pour_une_quantite(self):
        # Par exemplaire : matière = 2*10 + 0.05*50 = 22.5 ; opération = (3/60)*600 = 30
        # Total par exemplaire = 52.5 ; pour 100 exemplaires = 5250.00
        resultat = self.produit.calculer_prix_revient(100)
        self.assertEqual(resultat["prix_revient"], Decimal("5250.00"))
        self.assertEqual(len(resultat["detail_composants"]), 1)

    def test_calcul_charge_fixe_amortie_sur_quantite_totale(self):
        # RG29 : une charge fixe (ex. calage machine 30 min) s'amortit sur
        # la quantité totale : (30/60)*600 = 300 Ar pour le lot, soit
        # 300/100 = 3 Ar par exemplaire, quelle que soit la quantité.
        LigneOperation.objects.create(
            composant=self.composant, poste=self.poste, libelle="Calage",
            temps_unitaire=Decimal("30.00"), type_charge=LigneOperation.TypeCharge.FIXE,
        )
        resultat_100 = self.produit.calculer_prix_revient(100)
        resultat_200 = self.produit.calculer_prix_revient(200)
        # Charge variable par exemplaire : 5250/100 = 52.5 ; pour 200 : 10500 + 300 (calage lot)
        self.assertEqual(resultat_100["prix_revient"], Decimal("5550.00"))
        self.assertEqual(resultat_200["prix_revient"], Decimal("10800.00"))
        self.assertEqual(
            resultat_100["detail_composants"][0]["part_fixe_amortie"], Decimal("300.00")
        )

    def test_quantite_invalide_leve_une_erreur(self):
        with self.assertRaises(ValidationError):
            self.produit.calculer_prix_revient(0)

    def test_produit_sans_composant_leve_une_erreur(self):
        produit_vide = Produit.objects.create(famille=self.famille, nom="Produit sans composant")
        with self.assertRaises(ValidationError):
            produit_vide.calculer_prix_revient(10)

    def test_rg26_numerotation_unique_par_produit(self):
        with self.assertRaises(Exception):
            Composant.objects.create(produit=self.produit, ordre=1, designation="Doublon")
