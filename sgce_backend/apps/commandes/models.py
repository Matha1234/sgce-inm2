from django.conf import settings
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models, transaction
from django.db.models import F
from django.utils import timezone


class SequenceCounter(models.Model):
    """
    Compteur atomique partage, utilise pour generer des numeros metier
    sequentiels (Commande.numero, DossierFabrication.numero_dossier,
    Facture.numero_facture) sans condition de concurrence.

    Correctif : l'ancien pattern `Modele.objects.filter(...).count() + 1`
    n'est pas atomique - deux creations simultanees peuvent lire le meme
    compte avant l'ecriture et calculer le meme numero, ce qui declenche une
    IntegrityError (contrainte unique) au lieu de produire un numero valide.
    `prochain()` verrouille la ligne du compteur (select_for_update) et
    l'incremente dans une transaction, garantissant l'unicite meme sous
    acces concurrents.
    """

    cle = models.CharField(max_length=30, unique=True)
    valeur = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "sequences_compteurs"

    def __str__(self):
        return f"{self.cle} = {self.valeur}"

    @classmethod
    def prochain(cls, cle):
        with transaction.atomic():
            compteur, _ = cls.objects.select_for_update().get_or_create(
                cle=cle, defaults={"valeur": 0}
            )
            compteur.valeur = F("valeur") + 1
            compteur.save(update_fields=["valeur"])
            compteur.refresh_from_db(fields=["valeur"])
            return compteur.valeur


class OrganismeClient(models.Model):
    """Organisme a l'origine d'une commande (RG1, RG2)."""

    class TypeOrganisme(models.TextChoices):
        MINISTERE = "MINISTERE", "Ministère"
        COLLECTIVITE = "COLLECTIVITE", "Collectivité territoriale"
        ETABLISSEMENT_PUBLIC = "ETABLISSEMENT_PUBLIC", "Établissement public"
        PARTICULIER = "PARTICULIER", "Particulier"

    nom = models.CharField(max_length=100)
    type = models.CharField(max_length=30, choices=TypeOrganisme.choices)
    nif_stat = models.CharField(
        max_length=30, blank=True,
        help_text="Numéro d'identification fiscale / statistique.",
    )
    adresse = models.CharField(max_length=255, blank=True)
    telephone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    contact_principal = models.CharField(
        max_length=100, blank=True,
        help_text="Nom du contact principal chez l'organisme.",
    )
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "organismes_clients"
        verbose_name = "Organisme client"
        verbose_name_plural = "Organismes clients"

    def __str__(self):
        return f"{self.nom} ({self.get_type_display()})"


class Commande(models.Model):
    """
    Commande passee par un organisme (RG1). Le delai contractuel est
    obligatoire pour une commande etatique soumise a marche public (RG19).
    """

    class Statut(models.TextChoices):
        EN_ATTENTE = "EN_ATTENTE", "En attente"
        DEVIS = "DEVIS", "Devis en cours"
        VALIDEE = "VALIDEE", "Validée"
        EN_PRODUCTION = "EN_PRODUCTION", "En production"
        LIVREE = "LIVREE", "Livrée"
        ANNULEE = "ANNULEE", "Annulée"

    class TypeDocument(models.TextChoices):
        JOURNAL_OFFICIEL = "JOURNAL_OFFICIEL", "Journal officiel"
        BULLETIN_ANNONCES = "BULLETIN_ANNONCES", "Bulletin d'annonces légales"
        FORMULAIRE_ADMINISTRATIF = "FORMULAIRE_ADMINISTRATIF", "Formulaire administratif"
        CACHET_ADMINISTRATIF = "CACHET_ADMINISTRATIF", "Cachet administratif"
        DOCUMENT_FIDUCIAIRE = "DOCUMENT_FIDUCIAIRE", "Document fiduciaire"
        AUTRE = "AUTRE", "Autre"

    class Atelier(models.TextChoices):
        SPA = "SPA", "Service de Production A"
        SPB = "SPB", "Service de Production B"

    class Nature(models.TextChoices):
        SUR_CONFECTION = "SUR_CONFECTION", "Sur confection (sur-mesure)"
        STANDARDISEE = "STANDARDISEE", "Standardisée (prix fixe)"

    numero = models.CharField(max_length=15, unique=True, blank=True)
    date_commande = models.DateTimeField(auto_now_add=True)
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.EN_ATTENTE)
    delai_contractuel = models.DateField(
        null=True, blank=True,
        help_text="Obligatoire pour les commandes étatiques soumises à marché public (RG19).",
    )
    date_livraison_souhaitee = models.DateField(
        null=True, blank=True,
        help_text="Date de livraison souhaitée par le client.",
    )

    nature = models.CharField(
        max_length=20, choices=Nature.choices, default=Nature.STANDARDISEE,
        help_text=(
            "Distingue le circuit de devis applique : sur confection (devis "
            "au cas par cas) ou standardisee (prix unitaire fixe). Fixee a "
            "la creation et non modifiable apres validation du devis (RG21)."
        ),
    )

    type_document = models.CharField(
        max_length=30, choices=TypeDocument.choices, default=TypeDocument.AUTRE
    )
    quantite = models.PositiveIntegerField(default=1)
    atelier = models.CharField(max_length=5, choices=Atelier.choices, default=Atelier.SPA)

    est_fictif = models.BooleanField(
        default=False,
        help_text="Commande generee artificiellement pour entrainer le modele IA en l'absence d'historique reel.",
    )

    organisme = models.ForeignKey(
        OrganismeClient, on_delete=models.PROTECT, related_name="commandes"
    )
    cree_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name="commandes_creees",
    )

    class Meta:
        db_table = "commandes"
        ordering = ["-date_commande"]

    def __str__(self):
        return f"Commande {self.numero} ({self.get_statut_display()})"

    def clean(self):
        if (
            self.organisme_id
            and self.organisme.type != OrganismeClient.TypeOrganisme.PARTICULIER
            and not self.delai_contractuel
        ):
            raise ValidationError(
                "Le délai contractuel est obligatoire pour une commande étatique (RG19)."
            )

    def save(self, *args, **kwargs):
        if not self.numero:
            annee = timezone.now().year
            compteur = SequenceCounter.prochain(f"CMD-{annee}")
            self.numero = f"CMD-{annee}-{compteur:04d}"
        super().save(*args, **kwargs)


class Devis(models.Model):
    """
    Devis associe a une commande (RG3). Seul un Agent SDO peut le valider
    (RG16) - controle applique au niveau des vues/permissions.

    Pour un marche public a prix fixe pluriannuel (jusqu'a 5 ans), le taux
    d'inflation projete doit etre renseigne avant validation (RG22), afin
    d'equilibrer le prix unitaire sur toute la duree du contrat plutot que
    de le figer sur le seul cout actuel (risque de perte des l'annee 2-3,
    ou de prix hors marche des le depart).
    """

    DUREE_CONTRAT_MAX_ANNEES = 5

    commande = models.OneToOneField(Commande, on_delete=models.CASCADE, related_name="devis")
    produit_catalogue = models.ForeignKey(
        "catalogue.Produit", on_delete=models.PROTECT, null=True, blank=True,
        related_name="devis_instancies",
        help_text=(
            "Produit du catalogue instancié pour ce devis (RG27, mise à jour STI). "
            "Laissé vide pour un devis hors catalogue, dont le prix de revient est saisi manuellement."
        ),
    )
    options_ajustees = models.JSONField(
        default=dict, blank=True,
        help_text="Options mineures ajustées au devis (ex. couleur du papier de couverture).",
    )
    prix_revient = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0"))])
    prix_vente = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0"))])
    duree_production = models.PositiveIntegerField(
        default=1, help_text="Durée réelle ou estimée de production, en jours."
    )
    date_devis = models.DateTimeField(auto_now_add=True)
    valide = models.BooleanField(default=False)
    valide_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="devis_valides",
    )

    pluriannuel = models.BooleanField(
        default=False,
        help_text="Marché public à prix unitaire fixe sur plusieurs années.",
    )
    duree_contrat_annees = models.PositiveSmallIntegerField(
        null=True, blank=True,
        help_text=f"Durée du contrat à prix fixe, en années (maximum {DUREE_CONTRAT_MAX_ANNEES}).",
    )
    taux_inflation_projete = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True,
        help_text="Taux d'inflation annuel moyen projeté (%), calculé sur l'historique des 5 dernières années.",
    )

    class Meta:
        db_table = "devis"

    def __str__(self):
        return f"Devis de {self.commande.numero}"

    def clean(self):
        if self.pluriannuel:
            if not self.duree_contrat_annees:
                raise ValidationError(
                    "La durée du contrat est obligatoire pour un devis pluriannuel (RG22)."
                )
            if self.duree_contrat_annees > self.DUREE_CONTRAT_MAX_ANNEES:
                raise ValidationError(
                    f"La durée d'un marché à prix fixe ne peut excéder {self.DUREE_CONTRAT_MAX_ANNEES} ans (RG22)."
                )
            if self.taux_inflation_projete is None:
                raise ValidationError(
                    "Le taux d'inflation projeté est obligatoire pour valider un devis pluriannuel (RG22)."
                )

    def recalculer_prix_revient(self):
        """Recalcule le coût du devis à partir de ses lignes et de ses options."""
        if not self.produit_catalogue_id:
            return self.prix_revient

        total_lignes = sum(
            (ligne.cout_total_estime for ligne in self.lignes_devis.all()),
            Decimal("0"),
        )
        total_options = sum(
            (option.surcout_total for option in self.options.all()),
            Decimal("0"),
        )
        self.prix_revient = (total_lignes + total_options).quantize(Decimal("0.01"))
        return self.prix_revient

    def recalculer_et_sauvegarder_prix_revient(self):
        self.recalculer_prix_revient()
        self.save(update_fields=["prix_revient"])

    def generer_lignes_devis(self, remarques_par_composant=None):
        """
        RG27 + RG28 (mise à jour STI) : génère les LigneDevis du devis à
        partir de la nomenclature du produit du catalogue instancié — une
        ligne par composant, chiffrée par le moteur de calcul (RG27, RG29).

        Chaque ligne porte le prévisionnel granulaire (coûts matières et
        opérations estimés, parts fixe et variable) qui servira de support
        de comparaison au contrôle du prix de revient à la clôture (RG28).

        RG30 : une remarque technique fournie par l'Agent SDO (option
        mineure spécifique au devis) prévaut sur le comportement théorique
        du catalogue lors de la génération du dossier de fabrication.

        RG39 (correctif) : chaque LigneDevis est en outre détaillée par
        copie depuis la nomenclature et la gamme du composant catalogue
        (LigneMatiereDevis depuis LigneMatierePremiere, LigneOperationDevis
        depuis LigneOperation), pour la quantité commandée — jusqu'ici
        documenté sur les modèles mais jamais réellement exécuté, ce qui
        laissait ExecutionOperation et la génération du dossier de
        fabrication (RG7, RG34) sans aucune donnée à exploiter.

        Ne fait rien si le devis n'est pas rattaché à un produit du
        catalogue (prévisionnel saisi manuellement, non granulaire).
        Les lignes existantes sont remplacées (recréation du chiffrage).
        """
        if not self.produit_catalogue_id:
            return []

        resultat = self.produit_catalogue.calculer_prix_revient(self.commande.quantite)
        remarques = remarques_par_composant or {}
        quantite = self.commande.quantite

        LigneDevis.objects.filter(devis=self).delete()
        lignes = []
        for detail in resultat["detail_composants"]:
            composant_id = detail["composant_id"]
            lignes.append(
                LigneDevis(
                    devis=self,
                    composant_id=composant_id,
                    cout_matiere_estime=detail["cout_matiere_estime"],
                    cout_operation_estime=detail["cout_operation_estime"],
                    part_fixe_amortie=detail["part_fixe_amortie"],
                    part_variable=detail["part_variable"],
                    remarque=remarques.get(composant_id, ""),
                )
            )
        LigneDevis.objects.bulk_create(lignes)

        # RG39 : copie du detail matiere/operation, composant par composant,
        # depuis la nomenclature et la gamme catalogue.
        lignes_matiere_a_creer = []
        lignes_operation_a_creer = []
        for ligne_devis in lignes:
            composant = ligne_devis.composant
            for ligne_matiere in composant.lignes_matiere_premiere.select_related("article").all():
                if ligne_matiere.type_charge == ligne_matiere.TypeCharge.FIXE:
                    quantite_estimee = ligne_matiere.quantite_unitaire
                else:
                    quantite_estimee = ligne_matiere.quantite_unitaire * quantite
                cout_estime = quantite_estimee * (ligne_matiere.article.cout_unitaire or 0)
                lignes_matiere_a_creer.append(
                    LigneMatiereDevis(
                        ligne_devis=ligne_devis,
                        article=ligne_matiere.article,
                        quantite_estimee=quantite_estimee,
                        unite=getattr(ligne_matiere, "unite", "") or "",
                        cout_estime=cout_estime,
                    )
                )

            for rang, ligne_operation in enumerate(
                composant.lignes_operation.select_related("poste").all(), start=1
            ):
                if ligne_operation.type_charge == ligne_operation.TypeCharge.FIXE:
                    temps_estime = ligne_operation.temps_unitaire
                else:
                    temps_estime = ligne_operation.temps_unitaire * quantite
                cout_horaire = ligne_operation.poste.cout_horaire or 0
                cout_estime = (temps_estime / 60) * cout_horaire
                lignes_operation_a_creer.append(
                    LigneOperationDevis(
                        ligne_devis=ligne_devis,
                        poste=ligne_operation.poste,
                        ordre_execution=rang,
                        temps_estime=temps_estime,
                        cout_estime=cout_estime,
                    )
                )

        if lignes_matiere_a_creer:
            LigneMatiereDevis.objects.bulk_create(lignes_matiere_a_creer)
        if lignes_operation_a_creer:
            LigneOperationDevis.objects.bulk_create(lignes_operation_a_creer)

        self.recalculer_prix_revient()
        self.save(update_fields=["prix_revient"])

        return lignes


class OptionDevis(models.Model):
    """
    Option ou specification technique sur-mesure d'un devis (RG33, mise a
    jour STI n°2). En complement du produit catalogue de base, l'Agent SDO
    peut ajouter une ou plusieurs personnalisations (ex. couleur de papier
    differente, pelliculage, encart special), chacune pouvant ajouter un
    surcout matiere et/ou operation au prix de revient.

    RG38 (principe anti-duplication) : le devis reference le produit
    catalogue par cle etrangere sans en dupliquer les attributs ; les
    personnalisations propres a la commande transitent uniquement par
    OptionDevis.
    """

    devis = models.ForeignKey(
        Devis, on_delete=models.CASCADE, related_name="options"
    )
    libelle = models.CharField(
        max_length=100,
        help_text="Ex. « Pelliculage mat », « Papier couleur couverture ».",
    )
    description = models.TextField(
        blank=True,
        help_text="Description detaillee de l'option.",
    )
    surcout_matiere = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(Decimal("0"))],
        help_text="Surcoût matière de cette option, le cas échéant (RG33).",
    )
    surcout_operation = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(Decimal("0"))],
        help_text="Surcoût opération de cette option, le cas échéant (RG33).",
    )
    date_ajout = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "options_devis"
        verbose_name = "Option de devis"
        verbose_name_plural = "Options de devis"

    def __str__(self):
        return f"{self.libelle} (devis #{self.devis_id})"

    @property
    def surcout_total(self):
        """Surcoût total de l'option (matiere + operation)."""
        total = 0
        if self.surcout_matiere:
            total += self.surcout_matiere
        if self.surcout_operation:
            total += self.surcout_operation
        return total


class LigneDevis(models.Model):
    """
    Ligne de devis (RÉTABLIE — mise à jour STI, section 5.7) : chiffrage
    prévisionnel par composant d'un devis instancié depuis le catalogue
    (RG27).

    RG28 : chaque ligne sert de support prévisionnel granulaire à la
    comparaison du contrôle du prix de revient à la clôture, composant par
    composant, face aux consommations réelles constatées en fabrication.

    RG30 : la remarque technique portée par la ligne prévaut sur le
    comportement théorique du catalogue en cas de divergence avec la
    demande spécifique du client (génération du dossier de fabrication).
    """

    devis = models.ForeignKey(Devis, on_delete=models.CASCADE, related_name="lignes_devis")
    composant = models.ForeignKey(
        "catalogue.Composant", on_delete=models.PROTECT, related_name="lignes_devis"
    )
    cout_matiere_estime = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Coût prévisionnel des matières premières du composant (RG27).",
    )
    cout_operation_estime = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Coût prévisionnel des opérations du composant (RG27).",
    )
    part_fixe_amortie = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Part des charges fixes amortie sur la quantité totale commandée (RG29).",
    )
    part_variable = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Part des charges variables, proportionnelle à la quantité (RG29).",
    )
    remarque = models.CharField(
        max_length=255, blank=True,
        help_text="Remarque technique prévalant sur le catalogue en cas de divergence (RG30).",
    )

    class Meta:
        db_table = "lignes_devis"
        verbose_name = "Ligne de devis"
        verbose_name_plural = "Lignes de devis"
        ordering = ["devis_id", "composant__ordre"]
        unique_together = [("devis", "composant")]

    def __str__(self):
        return f"Devis #{self.devis_id} — {self.composant} ({self.cout_total_estime} Ar)"

    @property
    def cout_total_estime(self):
        return (self.cout_matiere_estime or 0) + (self.cout_operation_estime or 0)


class LigneMatiereDevis(models.Model):
    """
    Detail matiere premiere d'une ligne de devis (RG39, mise a jour STI
    n°4). Initialise par copie depuis LigneMatierePremiere du composant
    catalogue au moment de la creation du devis, et ajustable ensuite via
    les options du devis (OptionDevis).

    cout_matiere_estime de LigneDevis est la somme calculee des
    cout_estime de ses LigneMatiereDevis.
    """

    ligne_devis = models.ForeignKey(
        LigneDevis, on_delete=models.CASCADE, related_name="lignes_matiere"
    )
    article = models.ForeignKey(
        "commandes.Article", on_delete=models.PROTECT, related_name="lignes_devis"
    )
    quantite_estimee = models.DecimalField(
        max_digits=10, decimal_places=3, validators=[MinValueValidator(Decimal("0.001"))],
        help_text="Quantité estimée de matière pour ce devis.",
    )
    unite = models.CharField(max_length=20, blank=True)
    cout_estime = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Coût estimé de cette ligne matière (calculé depuis le catalogue).",
    )

    class Meta:
        db_table = "lignes_matiere_devis"
        verbose_name = "Ligne matière du devis"
        verbose_name_plural = "Lignes matière du devis"

    def __str__(self):
        return f"LigneDevis #{self.ligne_devis_id} — {self.article.designation} ({self.quantite_estimee})"


class LigneOperationDevis(models.Model):
    """
    Detail operation d'une ligne de devis (RG39, mise a jour STI n°4).
    Initialise par copie depuis LigneOperation du composant catalogue
    au moment de la creation du devis, et ajustable ensuite via les
    options du devis (OptionDevis).

    cout_operation_estime de LigneDevis est la somme calculee des
    cout_estime de ses LigneOperationDevis.

    ExecutionOperation reference cette entite (plutot que LigneOperation
    du catalogue) pour comparer le reel a l'engagement du devis (RG35,
    RG39).
    """

    ligne_devis = models.ForeignKey(
        LigneDevis, on_delete=models.CASCADE, related_name="lignes_operation"
    )
    poste = models.ForeignKey(
        "catalogue.PosteDeCharge", on_delete=models.PROTECT,
        related_name="lignes_operation_devis",
    )
    ordre_execution = models.PositiveSmallIntegerField(
        help_text="Rang d'execution de l'operation dans la gamme.",
    )
    temps_estime = models.DecimalField(
        max_digits=8, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))],
        help_text="Temps estimé pour cette opération, en minutes (RG39).",
    )
    cout_estime = models.DecimalField(
        max_digits=12, decimal_places=2, default=0,
        help_text="Coût estimé de cette ligne opération (calculé depuis le catalogue).",
    )

    class Meta:
        db_table = "lignes_operation_devis"
        verbose_name = "Ligne opération du devis"
        verbose_name_plural = "Lignes opération du devis"
        ordering = ["ligne_devis_id", "ordre_execution"]

    def __str__(self):
        return f"LigneDevis #{self.ligne_devis_id} — Op. {self.ordre_execution}"


class Atelier(models.Model):
    """Atelier de production (RG6). Reference fixe : SPA et SPB."""

    class Nom(models.TextChoices):
        SPA = "SPA", "Service de Production A"
        SPB = "SPB", "Service de Production B"

    nom = models.CharField(max_length=5, choices=Nom.choices, unique=True)
    chef_atelier = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="ateliers_diriges",
    )
    capacite = models.PositiveIntegerField(
        default=0,
        help_text="Capacité horaire de l'atelier (heures par période de référence).",
    )

    class Meta:
        db_table = "ateliers"
        verbose_name = "Atelier"
        verbose_name_plural = "Ateliers"

    def __str__(self):
        return self.get_nom_display()


class DossierFabrication(models.Model):
    """Dossier de fabrication (RG5, RG6, RG7)."""

    class Statut(models.TextChoices):
        CREE = "CREE", "Créé"
        EN_COURS = "EN_COURS", "En cours"
        TERMINE = "TERMINE", "Terminé"

    commande = models.OneToOneField(
        Commande, on_delete=models.CASCADE, related_name="dossier_fabrication"
    )
    numero_dossier = models.CharField(max_length=20, unique=True, blank=True)
    atelier = models.ForeignKey(Atelier, on_delete=models.PROTECT, related_name="dossiers")
    statut_production = models.CharField(
        max_length=20, choices=Statut.choices, default=Statut.CREE
    )
    date_creation = models.DateTimeField(auto_now_add=True)
    date_cloture = models.DateTimeField(
        null=True, blank=True,
        help_text="Date de cloture effective du dossier de fabrication.",
    )

    class Meta:
        db_table = "dossiers_fabrication"
        ordering = ["-date_creation"]

    def __str__(self):
        return f"Dossier {self.numero_dossier} ({self.get_statut_production_display()})"

    def save(self, *args, **kwargs):
        if not self.numero_dossier:
            annee = timezone.now().year
            compteur = SequenceCounter.prochain(f"DOS-{annee}")
            self.numero_dossier = f"DOS-{annee}-{compteur:04d}"
        super().save(*args, **kwargs)


class EtapeProduction(models.Model):
    """Etape de production au sein d'un dossier de fabrication (RG7)."""

    class Statut(models.TextChoices):
        A_FAIRE = "A_FAIRE", "À faire"
        EN_COURS = "EN_COURS", "En cours"
        TERMINEE = "TERMINEE", "Terminée"

    dossier = models.ForeignKey(
        DossierFabrication, on_delete=models.CASCADE, related_name="etapes"
    )
    ordre = models.PositiveSmallIntegerField(
        default=0,
        help_text="Ordre d'execution de l'etape dans le dossier.",
    )
    libelle = models.CharField(max_length=100)
    poste = models.ForeignKey(
        "catalogue.PosteDeCharge", on_delete=models.PROTECT,
        null=True, blank=True, related_name="etapes_production",
        help_text="Poste de charge concerne par cette etape.",
    )
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.A_FAIRE)
    date_debut = models.DateTimeField(null=True, blank=True)
    date_fin = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "etapes_production"
        ordering = ["dossier_id", "ordre", "id"]

    def __str__(self):
        return f"{self.libelle} - {self.dossier.numero_dossier}"


class ExecutionOperation(models.Model):
    """
    Execution reelle d'une operation sur un poste de charge, dans le cadre
    d'un dossier de fabrication (RG35, mise a jour STI n°2 et n°3).

    RG35 : chaque operation reellement executee fait l'objet d'une saisie
    de temps reel, comparee a LigneOperationDevis correspondante (et non
    a la valeur standard du catalogue) pour objectiver les ecarts.

    RG38 : chaque operation transite par un statut explicite (PLANIFIEE,
    EN_COURS, EXECUTEE), symetrique de la sortie de stock pour les
    matieres.
    """

    class Statut(models.TextChoices):
        PLANIFIEE = "PLANIFIEE", "Planifiée"
        EN_COURS = "EN_COURS", "En cours"
        EXECUTEE = "EXECUTEE", "Exécutée"

    dossier = models.ForeignKey(
        DossierFabrication, on_delete=models.CASCADE,
        related_name="executions_operation",
    )
    ligne_operation_devis = models.ForeignKey(
        LigneOperationDevis, on_delete=models.PROTECT,
        null=True, blank=True, related_name="executions",
        help_text=(
            "Ligne d'operation du devis correspondante (RG39) : "
            "reference l'engagement du devis, pas le catalogue generique."
        ),
    )
    poste = models.ForeignKey(
        "catalogue.PosteDeCharge", on_delete=models.PROTECT,
        related_name="executions_operation",
    )
    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="executions_saisies",
    )
    temps_reel = models.DecimalField(
        max_digits=8, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))],
        help_text="Temps réellement passé, en minutes (RG35).",
    )
    statut = models.CharField(
        max_length=15, choices=Statut.choices, default=Statut.PLANIFIEE,
        help_text="Statut d'execution de l'operation (RG38).",
    )
    date_saisie = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "executions_operation"
        verbose_name = "Exécution d'opération"
        verbose_name_plural = "Exécutions d'opérations"
        ordering = ["-date_saisie"]

    def __str__(self):
        return f"Exécution op. #{self.id} — dossier {self.dossier.numero_dossier}"


class Article(models.Model):
    """
    Article de stock (matiere premiere ou fourniture). Conformement aux
    remarques du STI : la designation reste generique et unique au niveau
    de la base (ex. "papier offset"), quelles que soient les declinaisons
    commerciales existantes. Les criteres type_papier/type_encre/type_film
    servent au calcul coherent des couts.
    """

    class ClasseComptable(models.TextChoices):
        CLASSE_2 = "CLASSE_2", "Classe 2 - Immobilisation"
        CLASSE_6 = "CLASSE_6", "Classe 6 - Charge / matière première"

    class TypePapier(models.TextChoices):
        OFFSET = "OFFSET", "Offset"
        DOSSIER = "DOSSIER", "Dossier"
        AUTOCOPIANT = "AUTOCOPIANT", "Autocopiant"
        NON_APPLICABLE = "NON_APPLICABLE", "Non applicable"

    designation = models.CharField(
        max_length=100, unique=True,
        help_text="Désignation générique unique (ex. « papier offset », « encre noire »).",
    )
    emplacement_stock = models.CharField(
        max_length=80, blank=True,
        help_text="Emplacement de stockage de l'article au magasin (RG32, mise à jour STI).",
    )
    classe_comptable = models.CharField(
        max_length=10, choices=ClasseComptable.choices, default=ClasseComptable.CLASSE_6
    )
    type_papier = models.CharField(
        max_length=20, choices=TypePapier.choices, default=TypePapier.NON_APPLICABLE, blank=True
    )
    type_encre = models.CharField(max_length=50, blank=True)
    type_film = models.CharField(max_length=50, blank=True)
    unite = models.CharField(max_length=20, default="unité")
    cout_unitaire = models.DecimalField(
        max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(Decimal("0"))],
        help_text="Coût unitaire de l'article, utilisé par le moteur de calcul du catalogue (RG27).",
    )

    quantite_stock = models.DecimalField(max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(Decimal("0"))])
    quantite_reservee = models.DecimalField(
        max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(Decimal("0"))],
        help_text="Quantité réservée pour des dossiers de fabrication, non encore sortie physiquement.",
    )
    seuil_securite = models.DecimalField(
        max_digits=12, decimal_places=2, default=0, validators=[MinValueValidator(Decimal("0"))],
        help_text="Stock de sécurité : seuil en-dessous duquel une alerte est déclenchée.",
    )

    class Meta:
        db_table = "articles"
        ordering = ["designation"]

    def __str__(self):
        return self.designation

    @property
    def quantite_disponible(self):
        return self.quantite_stock - self.quantite_reservee

    @property
    def est_en_alerte(self):
        return self.quantite_disponible <= self.seuil_securite


class MouvementStock(models.Model):
    """
    Mouvement de stock (entree ou sortie), relie a un dossier de fabrication
    lorsque la sortie est destinee a la production (RG8, RG9, RG10).
    La quantite en stock de l'article est mise a jour de facon atomique a
    la creation du mouvement, avec verification de disponibilite pour une
    sortie (RG11).
    """

    class TypeMouvement(models.TextChoices):
        ENTREE = "ENTREE", "Entrée"
        SORTIE = "SORTIE", "Sortie"
        RESERVATION = "RESERVATION", "Réservation"

    article = models.ForeignKey(Article, on_delete=models.PROTECT, related_name="mouvements")
    dossier = models.ForeignKey(
        DossierFabrication, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="mouvements_stock",
    )
    type_mouvement = models.CharField(max_length=15, choices=TypeMouvement.choices)
    quantite = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    commentaire = models.CharField(
        max_length=255, blank=True,
        help_text="Commentaire libre sur le mouvement de stock.",
    )
    date_mouvement = models.DateTimeField(auto_now_add=True)
    valide_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="mouvements_valides",
    )

    class Meta:
        db_table = "mouvements_stock"
        ordering = ["-date_mouvement"]

    def __str__(self):
        return f"{self.get_type_mouvement_display()} {self.quantite} {self.article.unite} - {self.article.designation}"

    def clean(self):
        if self.quantite is None or self.quantite <= 0:
            raise ValidationError({"quantite": "La quantité du mouvement doit être strictement positive."})

    def save(self, *args, **kwargs):
        est_nouveau = self._state.adding
        if not est_nouveau:
            super().save(*args, **kwargs)
            return

        self.full_clean()
        with transaction.atomic():
            article = Article.objects.select_for_update().get(pk=self.article_id)

            if self.type_mouvement == self.TypeMouvement.RESERVATION:
                # Une réservation ne consomme pas le stock physique : elle
                # diminue uniquement la quantité disponible.
                disponible = article.quantite_stock - article.quantite_reservee
                if disponible < self.quantite:
                    raise ValidationError(
                        "Quantité disponible insuffisante pour cette réservation (RG11/RG34)."
                    )
                Article.objects.filter(pk=article.pk).update(
                    quantite_reservee=F("quantite_reservee") + self.quantite
                )

            elif self.type_mouvement == self.TypeMouvement.SORTIE:
                # Une sortie physique consomme d'abord une réservation du
                # dossier si elle existe, puis diminue le stock physique.
                from django.db.models import Sum

                reserve_dossier = (
                    MouvementStock.objects.filter(
                        article_id=article.pk,
                        dossier_id=self.dossier_id,
                        type_mouvement=self.TypeMouvement.RESERVATION,
                    ).aggregate(total=Sum("quantite"))["total"] or Decimal("0")
                )
                sorties_dossier = (
                    MouvementStock.objects.filter(
                        article_id=article.pk,
                        dossier_id=self.dossier_id,
                        type_mouvement=self.TypeMouvement.SORTIE,
                    ).aggregate(total=Sum("quantite"))["total"] or Decimal("0")
                )
                reservation_restante = max(reserve_dossier - sorties_dossier, Decimal("0"))
                disponible = article.quantite_stock - article.quantite_reservee
                quantite_couverte_par_reservation = min(self.quantite, reservation_restante)
                quantite_hors_reservation = self.quantite - quantite_couverte_par_reservation

                if quantite_hors_reservation > disponible:
                    raise ValidationError(
                        "Quantité disponible insuffisante pour cette sortie (RG11)."
                    )

                Article.objects.filter(pk=article.pk).update(
                    quantite_stock=F("quantite_stock") - self.quantite,
                    quantite_reservee=F("quantite_reservee") - quantite_couverte_par_reservation,
                )

            elif self.type_mouvement == self.TypeMouvement.ENTREE:
                Article.objects.filter(pk=article.pk).update(
                    quantite_stock=F("quantite_stock") + self.quantite
                )

            super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        # Les mouvements sont une trace comptable : ils ne doivent pas être
        # supprimés silencieusement après avoir modifié le stock. Les vues
        # n'exposent pas DELETE, mais cette garde protège aussi l'admin/API.
        raise ValidationError(
            "Un mouvement de stock ne peut pas être supprimé ; utilisez un mouvement inverse."
        )