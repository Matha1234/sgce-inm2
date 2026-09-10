"""
Signaux generant automatiquement une notification (RG18) a chaque
changement de statut d'une Commande, d'un DossierFabrication ou d'une
EtapeProduction, sans intervention manuelle des vues.

Approche : un signal pre_save memorise le statut avant ecriture sur
l'instance (attribut prive `_statut_avant`), et le signal post_save
compare avec le nouveau statut pour decider s'il faut notifier.
"""

from django.db import transaction
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from apps.commandes.models import Article, Commande, DossierFabrication, EtapeProduction, ExecutionOperation, MouvementStock
from apps.controle.models import ControlePrixRevient
from apps.utilisateurs.models import Utilisateur

from .models import Notification


def _admins():
    return Utilisateur.objects.filter(role="ADMIN")


def _magasiniers():
    return Utilisateur.objects.filter(role="MAGASINIER")


def _notifier(destinataires, categorie, message, reference_objet_id=None):
    """Cree une notification pour chaque destinataire distinct (ignore les None)."""
    utilisateurs = {u for u in destinataires if u is not None}
    Notification.objects.bulk_create(
        [
            Notification(
                destinataire=u,
                categorie=categorie,
                message=message,
                reference_objet_id=reference_objet_id,
            )
            for u in utilisateurs
        ]
    )


# ---------------------------------------------------------------------
# Commande
# ---------------------------------------------------------------------
@receiver(pre_save, sender=Commande)
def _memoriser_statut_commande(sender, instance, **kwargs):
    instance._statut_avant = None
    if instance.pk:
        instance._statut_avant = (
            Commande.objects.filter(pk=instance.pk).values_list("statut", flat=True).first()
        )


@receiver(post_save, sender=Commande)
def _notifier_changement_statut_commande(sender, instance, created, **kwargs):
    if created or getattr(instance, "_statut_avant", None) == instance.statut:
        return

    message = f"Commande {instance.numero} : statut passé à « {instance.get_statut_display()} »."
    destinataires = list(_admins())
    if instance.cree_par_id:
        destinataires.append(instance.cree_par)
    _notifier(destinataires, Notification.Categorie.COMMANDE, message, instance.pk)


# ---------------------------------------------------------------------
# DossierFabrication
# ---------------------------------------------------------------------
@receiver(pre_save, sender=DossierFabrication)
def _memoriser_statut_dossier(sender, instance, **kwargs):
    instance._statut_avant = None
    if instance.pk:
        instance._statut_avant = (
            DossierFabrication.objects.filter(pk=instance.pk)
            .values_list("statut_production", flat=True)
            .first()
        )


@receiver(post_save, sender=DossierFabrication)
def _notifier_changement_statut_dossier(sender, instance, created, **kwargs):
    destinataires = list(_admins())
    if instance.commande.cree_par_id:
        destinataires.append(instance.commande.cree_par)
    if instance.atelier.chef_atelier_id:
        destinataires.append(instance.atelier.chef_atelier)

    if created:
        message = f"Nouveau dossier {instance.numero_dossier} affecté à {instance.atelier}."
        _notifier(destinataires, Notification.Categorie.DOSSIER, message, instance.pk)
        return

    if getattr(instance, "_statut_avant", None) != instance.statut_production:
        message = (
            f"Dossier {instance.numero_dossier} : statut passé à "
            f"« {instance.get_statut_production_display()} »."
        )
        _notifier(destinataires, Notification.Categorie.DOSSIER, message, instance.pk)


# ---------------------------------------------------------------------
# EtapeProduction
# ---------------------------------------------------------------------
@receiver(pre_save, sender=EtapeProduction)
def _memoriser_statut_etape(sender, instance, **kwargs):
    instance._statut_avant = None
    if instance.pk:
        instance._statut_avant = (
            EtapeProduction.objects.filter(pk=instance.pk).values_list("statut", flat=True).first()
        )


@receiver(post_save, sender=EtapeProduction)
def _notifier_changement_statut_etape(sender, instance, created, **kwargs):
    if created or getattr(instance, "_statut_avant", None) == instance.statut:
        return

    dossier = instance.dossier
    destinataires = list(_admins())
    if dossier.commande.cree_par_id:
        destinataires.append(dossier.commande.cree_par)
    if dossier.atelier.chef_atelier_id:
        destinataires.append(dossier.atelier.chef_atelier)

    message = (
        f"Étape « {instance.libelle} » du dossier {dossier.numero_dossier} : "
        f"statut passé à « {instance.get_statut_display()} »."
    )
    _notifier(destinataires, Notification.Categorie.ETAPE, message, instance.pk)


# ---------------------------------------------------------------------
# ControlePrixRevient
# ---------------------------------------------------------------------
@receiver(post_save, sender=ControlePrixRevient)
def _notifier_controle_prix_revient(sender, instance, created, **kwargs):
    """
    RG18 étendu au contrôle du prix de revient : notifie l'Administrateur
    et l'Agent SDO à l'origine de la commande dès qu'une fiche de contrôle
    est établie, avec un message renforcé en cas d'écart significatif
    (theme de stage, module "Contrôle du prix de revient et analyse de
    rentabilité").
    """
    if not created:
        return

    dossier = instance.dossier
    destinataires = list(_admins())
    if dossier.commande.cree_par_id:
        destinataires.append(dossier.commande.cree_par)

    if instance.ecart_significatif:
        cible = (
            f" composant « {instance.composant.designation} » du dossier {dossier.numero_dossier}"
            if instance.composant_id
            else f" dossier {dossier.numero_dossier}"
        )
        message = (
            f"Écart significatif détecté sur le{cible} : "
            f"résultat {instance.get_resultat_display().lower()} "
            f"(marge réelle {instance.marge_reelle_pourcentage}% vs cible "
            f"{instance.marge_cible_pourcentage}%)."
        )
    else:
        cible = (
            f" composant « {instance.composant.designation} » du dossier {dossier.numero_dossier}"
            if instance.composant_id
            else f" dossier {dossier.numero_dossier}"
        )
        message = (
            f"Contrôle du prix de revient établi pour le{cible} : "
            f"{instance.get_resultat_display().lower()} "
            f"(marge réelle {instance.marge_reelle_pourcentage}%)."
        )
    _notifier(destinataires, Notification.Categorie.CONTROLE, message, instance.pk)


# ---------------------------------------------------------------------
# MouvementStock (RG18 etendu au stock — categorie STOCK jusqu'ici
# definie sur le modele mais jamais declenchee)
# ---------------------------------------------------------------------
@receiver(post_save, sender=MouvementStock)
def _notifier_mouvement_stock(sender, instance, created, **kwargs):
    """
    Deux notifications distinctes peuvent etre generees a la creation d'un
    mouvement de stock :

    1. Une sortie rattachee a un dossier de fabrication est confirmee : le
       Chef d'atelier concerne (et l'Administrateur) sont notifies que la
       matiere demandee a bien ete sortie du magasin (boucle du circuit
       decrit au PR-07 du manuel de procedure).
    2. L'article mouvemente vient de franchir son seuil de securite : le
       Magasinier et l'Administrateur sont avertis, afin de declencher un
       reapprovisionnement avant rupture.

    Important : Article.quantite_stock n'est mis a jour, de facon atomique,
    qu'apres l'appel a super().save() dans MouvementStock.save() — donc
    apres que ce signal post_save se soit deja declenche. On reporte donc
    la lecture de l'article a la fin de la transaction (transaction.on_commit)
    pour etre certain de lire la quantite reellement en base.
    """
    if not created:
        return

    mouvement_id = instance.pk
    article_id = instance.article_id
    dossier_id = instance.dossier_id
    type_mouvement = instance.type_mouvement
    quantite = instance.quantite

    def _apres_commit():
        try:
            article = Article.objects.get(pk=article_id)
        except Article.DoesNotExist:
            return

        magasiniers = list(_magasiniers())
        admins = list(_admins())

        # 1) Notification systématique aux Magasiniers (+ Admin) pour toute
        #    action sur un article (entrée, sortie, réservation).
        libelles_type = {
            MouvementStock.TypeMouvement.ENTREE: "Entrée",
            MouvementStock.TypeMouvement.SORTIE: "Sortie",
            MouvementStock.TypeMouvement.RESERVATION: "Réservation",
        }
        libelle = libelles_type.get(type_mouvement, type_mouvement)
        message_mouvement = (
            f"{libelle} de {quantite} {article.unite} de « {article.designation} » "
            f"enregistrée (disponible : {article.quantite_disponible} {article.unite})."
        )
        _notifier(
            magasiniers + admins,
            Notification.Categorie.STOCK,
            message_mouvement,
            mouvement_id,
        )

        # 2) Sortie / réservation rattachée à un dossier : informer aussi le
        #    Chef d'atelier concerné (boucle PR-07).
        if type_mouvement in (MouvementStock.TypeMouvement.SORTIE, MouvementStock.TypeMouvement.RESERVATION) and dossier_id:
            try:
                dossier = DossierFabrication.objects.select_related("atelier", "commande").get(
                    pk=dossier_id
                )
            except DossierFabrication.DoesNotExist:
                dossier = None
            if dossier is not None and dossier.atelier.chef_atelier_id:
                message_chef = (
                    f"{libelle} de {quantite} {article.unite} de « {article.designation} » "
                    f"confirmée pour le dossier {dossier.numero_dossier}."
                )
                _notifier(
                    [dossier.atelier.chef_atelier],
                    Notification.Categorie.STOCK,
                    message_chef,
                    mouvement_id,
                )

        # 3) Franchissement du seuil de sécurité (disponible passe sous le seuil).
        #    disponible = quantite_stock - quantite_reservee.
        disponible_apres = article.quantite_disponible
        if type_mouvement == MouvementStock.TypeMouvement.RESERVATION:
            disponible_avant = disponible_apres + quantite
        elif type_mouvement == MouvementStock.TypeMouvement.SORTIE:
            disponible_avant = disponible_apres + quantite
        elif type_mouvement == MouvementStock.TypeMouvement.ENTREE:
            disponible_avant = disponible_apres - quantite
        else:
            disponible_avant = disponible_apres

        etait_en_alerte = disponible_avant <= article.seuil_securite

        if article.est_en_alerte and not etait_en_alerte:
            message_alerte = (
                f"Stock de « {article.designation} » passé sous le seuil de sécurité "
                f"({disponible_apres} {article.unite} disponibles, seuil {article.seuil_securite})."
            )
            _notifier(
                magasiniers + admins,
                Notification.Categorie.STOCK,
                message_alerte,
                article.pk,
            )

    transaction.on_commit(_apres_commit)


# ---------------------------------------------------------------------
# ExecutionOperation (RG18 + RG35)
# ---------------------------------------------------------------------
@receiver(pre_save, sender=ExecutionOperation)
def _memoriser_statut_execution(sender, instance, **kwargs):
    instance._statut_avant = None
    if instance.pk:
        instance._statut_avant = (
            ExecutionOperation.objects.filter(pk=instance.pk)
            .values_list("statut", flat=True)
            .first()
        )


@receiver(post_save, sender=ExecutionOperation)
def _notifier_changement_statut_execution(sender, instance, created, **kwargs):
    if created or getattr(instance, "_statut_avant", None) == instance.statut:
        return

    dossier = instance.dossier
    destinataires = list(_admins())
    if dossier.commande.cree_par_id:
        destinataires.append(dossier.commande.cree_par)
    if dossier.atelier.chef_atelier_id:
        destinataires.append(dossier.atelier.chef_atelier)

    message = (
        f"Exécution op. #{instance.id} du dossier {dossier.numero_dossier} : "
        f"statut passé à « {instance.get_statut_display()} »."
    )
    _notifier(destinataires, Notification.Categorie.ETAPE, message, instance.pk)