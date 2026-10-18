"""
Envoi d'emails lies a la gestion des comptes utilisateurs (Admin).
- Creation : identifiants (role, username, mot de passe)
- Modification : profil, role, activation / desactivation
- Suppression : notification de suppression du compte
"""

import html
import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def _from_email():
    return (
        getattr(settings, "DEFAULT_FROM_EMAIL", None)
        or getattr(settings, "EMAIL_HOST_USER", None)
        or None
    )


def _frontend():
    return getattr(settings, "FRONTEND_URL", "http://localhost:5173").rstrip("/")


def _libelle_role(utilisateur_ou_code):
    if hasattr(utilisateur_ou_code, "get_role_display"):
        try:
            return utilisateur_ou_code.get_role_display()
        except Exception:
            pass
    # Code role brut (ex. "AGENT_SDO")
    from .models import Utilisateur
    for code, label in Utilisateur.Role.choices:
        if code == utilisateur_ou_code:
            return label
    return str(utilisateur_ou_code or "")


def _envoyer_email(destinataire, sujet, message_texte, message_html):
    email = (destinataire or "").strip()
    if not email:
        logger.warning("Email non envoye (adresse vide) : %s", sujet)
        return
    try:
        send_mail(
            subject=sujet,
            message=message_texte,
            from_email=_from_email(),
            recipient_list=[email],
            html_message=message_html,
            fail_silently=False,
        )
        logger.info("Email envoye a %s : %s", email, sujet)
    except Exception:
        logger.exception("Echec envoi email a %s : %s", email, sujet)


def _gabarit_html(titre, prenom, paragraphes, bouton_label=None, bouton_url=None):
    blocs = "".join(
        f'<p style="color:#334155;font-size:14px;line-height:1.6;">{html.escape(p)}</p>'
        for p in paragraphes
    )
    bouton = ""
    if bouton_label and bouton_url:
        bouton = f"""
          <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0;">
            <tr><td>
              <a href="{html.escape(bouton_url)}"
                 style="display:inline-block;background-color:#0d3c73;color:#ffffff;
                        text-decoration:none;padding:12px 28px;border-radius:8px;
                        font-size:14px;font-weight:700;">
                {html.escape(bouton_label)}
              </a>
            </td></tr>
          </table>"""
    return f"""<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background-color:#eef1f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
             style="max-width:520px;background-color:#ffffff;border-radius:12px;
                    box-shadow:0 8px 30px rgba(15,40,80,0.12);">
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 8px;color:#0d3c73;font-size:20px;">{html.escape(titre)}</h2>
          <p style="color:#7a1f2b;font-size:13px;font-weight:700;margin:0 0 20px;">
            Système SGCFC-INM — Imprimerie Nationale de Madagascar
          </p>
          <p style="color:#334155;font-size:14px;line-height:1.6;">
            Bonjour {html.escape(prenom)},
          </p>
          {blocs}
          {bouton}
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
          <p style="color:#94a3b8;font-size:11px;margin:0;">
            © SGCFC-INM — Imprimerie Nationale de Madagascar
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Creation de compte
# ---------------------------------------------------------------------------

def envoyer_identifiants_nouveau_compte(utilisateur, mot_de_passe_clair):
    email = (utilisateur.email or "").strip()
    if not email:
        logger.warning("Compte %s cree sans email : identifiants non envoyes.", utilisateur.username)
        return

    role = _libelle_role(utilisateur)
    identifiant = utilisateur.username
    prenom = utilisateur.first_name or identifiant
    lien = f"{_frontend()}/login?nouveau=1"

    sujet = "Vos identifiants SGCFC-INM"
    texte = (
        f"Bonjour {prenom},\n\n"
        f"Un compte a été créé pour vous sur le système SGCFC-INM.\n\n"
        f"Rôle : {role}\n"
        f"Identifiant : {identifiant}\n"
        f"Mot de passe : {mot_de_passe_clair}\n\n"
        f"Connectez-vous ici : {lien}\n\n"
        f"Changez votre mot de passe après la première connexion.\n\n"
        f"— Imprimerie Nationale de Madagascar"
    )
    html_msg = _gabarit_html(
        "Bienvenue sur SGCFC-INM",
        prenom,
        [
            "Un compte a été créé pour vous. Voici vos identifiants :",
            f"Rôle : {role}",
            f"Identifiant : {identifiant}",
            f"Mot de passe : {mot_de_passe_clair}",
            "Pour votre sécurité, changez ce mot de passe dès la première connexion.",
        ],
        bouton_label="Se connecter",
        bouton_url=lien,
    )
    _envoyer_email(email, sujet, texte, html_msg)


# ---------------------------------------------------------------------------
# Modifications (profil, role, activation)
# ---------------------------------------------------------------------------

def notifier_modifications_compte(utilisateur, changements):
    """
    changements : dict des champs modifies, ex. :
      {
        "role": ("AGENT_SDO", "CHEF_ATELIER"),
        "is_active": (True, False),
        "email": ("a@x.mg", "b@x.mg"),
        ...
      }
    Valeurs = (ancienne, nouvelle).
    """
    if not changements:
        return

    email = (utilisateur.email or "").strip()
    if not email:
        return

    prenom = utilisateur.first_name or utilisateur.username
    lignes = []

    if "role" in changements:
        ancien, nouveau = changements["role"]
        lignes.append(
            f"Votre rôle a été modifié : « {_libelle_role(ancien)} » → « {_libelle_role(nouveau)} »."
        )

    if "is_active" in changements:
        _, nouveau = changements["is_active"]
        if nouveau:
            lignes.append(
                "Votre compte a été réactivé. Vous pouvez à nouveau vous connecter au SGCFC-INM."
            )
        else:
            lignes.append(
                "Votre compte a été désactivé. Vous ne pouvez plus vous connecter au SGCFC-INM. "
                "Contactez un administrateur si besoin."
            )

    champs_profil = {
        "first_name": "Prénom",
        "last_name": "Nom",
        "email": "Email",
        "telephone": "Téléphone",
    }
    details_profil = []
    for champ, libelle in champs_profil.items():
        if champ in changements:
            ancien, nouveau = changements[champ]
            details_profil.append(f"{libelle} : « {ancien or '—'} » → « {nouveau or '—'} »")

    if details_profil:
        lignes.append("Vos informations personnelles ont été mises à jour :")
        lignes.extend(details_profil)

    if "password" in changements:
        lignes.append(
            "Votre mot de passe a été modifié par un administrateur. "
            "Utilisez le nouveau mot de passe pour vous connecter."
        )

    if not lignes:
        return

    sujet = "Modification de votre compte SGCFC-INM"
    texte = f"Bonjour {prenom},\n\n" + "\n".join(lignes) + "\n\n— Imprimerie Nationale de Madagascar"
    html_msg = _gabarit_html(
        "Modification de votre compte",
        prenom,
        lignes,
        bouton_label="Se connecter",
        bouton_url=f"{_frontend()}/login?nouveau=1",
    )
    _envoyer_email(email, sujet, texte, html_msg)


# ---------------------------------------------------------------------------
# Suppression de compte
# ---------------------------------------------------------------------------

def notifier_suppression_compte(utilisateur):
    """
    A appeler AVANT la suppression effective (l'email du compte est encore disponible).
    """
    email = (utilisateur.email or "").strip()
    if not email:
        return

    prenom = utilisateur.first_name or utilisateur.username
    identifiant = utilisateur.username
    role = _libelle_role(utilisateur)

    sujet = "Suppression de votre compte SGCFC-INM"
    lignes = [
        f"Votre compte « {identifiant} » (rôle : {role}) a été supprimé du système SGCFC-INM.",
        "Vous ne pouvez plus vous connecter avec cet identifiant.",
        "Si vous pensez qu'il s'agit d'une erreur, contactez un administrateur de l'Imprimerie Nationale.",
    ]
    texte = f"Bonjour {prenom},\n\n" + "\n".join(lignes) + "\n\n— Imprimerie Nationale de Madagascar"
    html_msg = _gabarit_html("Suppression de votre compte", prenom, lignes)
    _envoyer_email(email, sujet, texte, html_msg)