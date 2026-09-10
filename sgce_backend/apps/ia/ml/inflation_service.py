"""
Service de projection d'inflation pour les devis pluriannuels.

Contexte metier (memoire, Chapitre 4/5 et Synthese_Gestion_Stock_et_Couts) :
certains marches publics imposent un prix unitaire fixe garanti sur une
duree pouvant aller jusqu'a 5 ans. Calculer ce prix uniquement a partir des
couts actuels expose l'INM a deux risques symetriques :

- sous-evaluation : sans anticipation de l'inflation, l'INM travaille a
  perte des la 2e ou 3e annee du contrat ;
- surevaluation : appliquer d'emblee une marge excessive pour couvrir
  5 ans rend le prix immediat hors marche et inacceptable pour le client.

Ce module calcule un taux d'inflation moyen annuel a partir de
l'historique interne des devis de l'INM (proxy d'inflation, en l'absence
d'un flux de donnees INSTAT integre a ce stade), puis en deduit un prix
unitaire equilibre sur toute la duree du contrat (RG22).
"""

from decimal import Decimal, ROUND_HALF_UP

from django.db.models import Avg
from django.utils import timezone

# Taux prudent utilise quand l'historique interne est insuffisant pour un
# calcul fiable (moins de deux annees de devis valides disponibles).
# Ordre de grandeur cohere avec l'inflation moyenne observee a Madagascar
# ces dernieres annees ; a ajuster par la Direction si besoin.
TAUX_INFLATION_PAR_DEFAUT = Decimal("8.00")

TAUX_INFLATION_PLANCHER = Decimal("0.00")
TAUX_INFLATION_PLAFOND = Decimal("30.00")

HORIZON_HISTORIQUE_ANNEES = 5


def calculer_taux_inflation_historique(annees=HORIZON_HISTORIQUE_ANNEES):
    """
    Calcule le taux d'inflation annuel moyen a partir de l'evolution du
    prix de revient unitaire moyen des devis valides de l'INM sur les
    `annees` dernieres annees.

    Retourne un tuple (taux_pct: Decimal, fiable: bool). `fiable` vaut
    False lorsque l'historique est trop court pour un calcul robuste, et
    dans ce cas un taux prudent par defaut est retourne a la place.
    """
    from apps.commandes.models import Devis

    annee_courante = timezone.now().year
    moyennes_annuelles = {}

    for delta in range(annees):
        annee = annee_courante - delta
        devis_annee = Devis.objects.filter(date_devis__year=annee, valide=True)
        prix_moyen = devis_annee.aggregate(m=Avg("prix_revient"))["m"]
        if prix_moyen:
            moyennes_annuelles[annee] = Decimal(str(prix_moyen))

    annees_disponibles = sorted(moyennes_annuelles.keys())

    if len(annees_disponibles) < 2:
        return TAUX_INFLATION_PAR_DEFAUT, False

    taux_annuels = []
    for i in range(1, len(annees_disponibles)):
        annee_precedente = annees_disponibles[i - 1]
        annee_actuelle = annees_disponibles[i]
        prix_precedent = moyennes_annuelles[annee_precedente]
        prix_actuel = moyennes_annuelles[annee_actuelle]
        if prix_precedent > 0:
            taux_annuels.append((prix_actuel - prix_precedent) / prix_precedent * Decimal("100"))

    if not taux_annuels:
        return TAUX_INFLATION_PAR_DEFAUT, False

    taux_moyen = sum(taux_annuels) / len(taux_annuels)
    taux_moyen = max(TAUX_INFLATION_PLANCHER, min(taux_moyen, TAUX_INFLATION_PLAFOND))
    taux_moyen = taux_moyen.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return taux_moyen, True


def calculer_prix_equilibre_pluriannuel(prix_actuel, duree_annees, taux_inflation_pct):
    """
    Calcule le prix unitaire equilibre a appliquer sur toute la duree du
    contrat, en moyennant le prix actuel projete a taux d'inflation
    compose sur chacune des `duree_annees` du marche.

    prix_equilibre = (1/n) * somme( prix_actuel * (1 + taux)^k ), k=0..n-1
    """
    prix_actuel = Decimal(str(prix_actuel))
    taux = Decimal(str(taux_inflation_pct)) / Decimal("100")

    if duree_annees < 1:
        raise ValueError("La durée du contrat doit être d'au moins 1 an.")

    total = sum(prix_actuel * ((1 + taux) ** annee) for annee in range(duree_annees))
    prix_equilibre = total / duree_annees
    return prix_equilibre.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def projeter_devis_pluriannuel(prix_vente_actuel, duree_annees, taux_inflation_pct=None):
    """
    Point d'entrée principal utilisé par la création d'un devis
    pluriannuel : calcule (si non fourni) le taux d'inflation projeté à
    partir de l'historique, puis le prix de vente unitaire équilibré pour
    toute la durée du contrat.

    `prix_vente_actuel` est le prix de vente de départ (pas le prix de
    revient) : on projette le prix facturé au client sur la durée du marché.

    Retourne un dict {taux_inflation_projete, prix_vente_equilibre, fiable}.
    """
    fiable = True
    if taux_inflation_pct is None:
        taux_inflation_pct, fiable = calculer_taux_inflation_historique()

    prix_equilibre = calculer_prix_equilibre_pluriannuel(
        prix_vente_actuel, duree_annees, taux_inflation_pct
    )

    return {
        "taux_inflation_projete": taux_inflation_pct,
        "prix_vente_equilibre": prix_equilibre,
        "fiable": fiable,
    }