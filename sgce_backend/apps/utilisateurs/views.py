import html

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Utilisateur
from .permissions import IsAdmin
from .serializers import UtilisateurAdminSerializer, UtilisateurAnnuaireSerializer, UtilisateurSerializer


class MeView(RetrieveUpdateAPIView):
    """
    GET   /api/auth/me/ - informations de l'utilisateur connecte (a partir du
          token JWT envoye dans l'en-tete Authorization).
    PATCH /api/auth/me/ - mise a jour de son propre profil : prenom, nom,
          email et photo uniquement (le role et le statut actif restent
          reserves a l'Administrateur, cf. UtilisateurSerializer).
    """

    serializer_class = UtilisateurSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        return self.request.user


class AnnuaireView(generics.ListAPIView):
    """
    GET /api/utilisateurs/annuaire/
    Annuaire interne minimal (id, nom complet, rôle), accessible à tout
    utilisateur connecté afin de choisir un destinataire pour un message.
    """

    queryset = Utilisateur.objects.filter(is_active=True).order_by("first_name", "last_name")
    serializer_class = UtilisateurAnnuaireSerializer
    permission_classes = [IsAuthenticated]


class ChangerMotDePasseView(APIView):
    """
    POST /api/auth/changer-mot-de-passe/
    Corps attendu : { "ancien_mot_de_passe": "...", "nouveau_mot_de_passe": "..." }
    Permet à l'utilisateur connecté de changer lui-même son mot de passe.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        ancien = request.data.get("ancien_mot_de_passe", "")
        nouveau = request.data.get("nouveau_mot_de_passe", "")
        utilisateur = request.user

        if not utilisateur.check_password(ancien):
            return Response(
                {"ancien_mot_de_passe": "Le mot de passe actuel est incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            validate_password(nouveau, user=utilisateur)
        except DjangoValidationError as erreur:
            return Response({"nouveau_mot_de_passe": erreur.messages}, status=status.HTTP_400_BAD_REQUEST)

        utilisateur.set_password(nouveau)
        utilisateur.save(update_fields=["password"])
        return Response({"detail": "Mot de passe modifié avec succès."}, status=status.HTTP_200_OK)


class DemandeReinitialisationMotDePasseView(APIView):
    """
    POST /api/auth/mot-de-passe-oublie/
    Corps attendu : { "email": "..." }

    Accepte toute adresse email. Si un compte actif correspondant existe,
    un email est envoyé ; sinon la même réponse générique est renvoyée pour
    éviter de révéler l'existence d'un compte.
    HTML contenant un bouton de réinitialisation est envoyé au titulaire
    du compte.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        if not email:
            return Response(
                {"email": "Veuillez saisir votre adresse email."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        utilisateur = (
            Utilisateur.objects.filter(email__iexact=email, is_active=True)
            .order_by("id")
            .first()
        )

        if utilisateur is None:
            return Response(
                {"detail": "Si un compte correspond à cette adresse, un email de réinitialisation sera envoyé."},
                status=status.HTTP_200_OK,
            )

        token = default_token_generator.make_token(utilisateur)
        uid = urlsafe_base64_encode(force_bytes(utilisateur.pk))
        lien = (
            f"{settings.FRONTEND_URL}/reinitialiser-mot-de-passe"
            f"?uid={uid}&token={token}"
        )
        prenom = utilisateur.first_name or utilisateur.username
        message_texte = (
            f"Bonjour {prenom},\n\n"
            "Vous avez demandé la réinitialisation de votre mot de passe "
            "pour le système SGCFC-INM.\n\n"
            "Cliquez sur le bouton « Choisir un nouveau mot de passe » "
            f"ou copiez ce lien dans votre navigateur :\n{lien}\n\n"
            "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.\n"
            "Ce lien expire dans 30 minutes.\n\n"
            "— Imprimerie Nationale de Madagascar"
        )
        message_html = (
            "<!DOCTYPE html><html lang=\"fr\"><body style=\"margin:0;padding:0;"
            "background-color:#eef1f6;font-family:Arial,Helvetica,sans-serif;\">"
            "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\">"
            "<tr><td align=\"center\" style=\"padding:32px 16px;\">"
            "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" "
            "style=\"max-width:520px;background-color:#ffffff;border-radius:12px;"
            "box-shadow:0 8px 30px rgba(15,40,80,0.12);\">"
            f"<tr><td style=\"padding:32px;\">"
            f"<h2 style=\"margin:0 0 8px;color:#0d3c73;font-size:20px;\">"
            f"Réinitialisation de votre mot de passe</h2>"
            f"<p style=\"color:#7a1f2b;font-size:13px;font-weight:700;margin:0 0 20px;\">"
            f"Système SGCFC-INM — Imprimerie Nationale de Madagascar</p>"
            f"<p style=\"color:#334155;font-size:14px;line-height:1.6;\">"
            f"Bonjour {prenom},</p>"
            f"<p style=\"color:#334155;font-size:14px;line-height:1.6;\">"
            f"Nous avons reçu une demande de réinitialisation de votre mot de passe. "
            f"Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>"
            f"<table role=\"presentation\" cellspacing=\"0\" cellpadding=\"0\" "
            f"style=\"margin:24px 0;\"><tr><td>"
            f"<a href=\"{html.escape(lien)}\" style=\"display:inline-block;"
            f"background-color:#0d3c73;color:#ffffff;text-decoration:none;"
            f"padding:12px 28px;border-radius:8px;font-size:14px;font-weight:700;\">"
            f"Choisir un nouveau mot de passe</a></td></tr></table>"
            f"<p style=\"color:#64748b;font-size:12px;line-height:1.6;\">"
            f"Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>"
            f"{html.escape(lien)}</p>"
            f"<p style=\"color:#64748b;font-size:12px;line-height:1.6;\">"
            f"Ce lien expire dans 30 minutes. Si vous n'êtes pas à l'origine de cette "
            f"demande, ignorez cet email.</p>"
            f"<hr style=\"border:none;border-top:1px solid #e2e8f0;margin:24px 0;\">"
            f"<p style=\"color:#94a3b8;font-size:11px;margin:0;\">© {settings.FRONTEND_URL} "
            f"— Imprimerie Nationale de Madagascar. Tous droits réservés.</p>"
            f"</td></tr></table></td></tr></table></body></html>"
        )
        from_email = settings.DEFAULT_FROM_EMAIL or settings.EMAIL_HOST_USER or None
        try:
            send_mail(
                subject="Réinitialisation de votre mot de passe SGCFC-INM",
                message=message_texte,
                from_email=from_email,
                recipient_list=[utilisateur.email],
                html_message=message_html,
                fail_silently=False,
            )
        except Exception:
            return Response(
                {"detail": "Impossible d'envoyer l'email. Veuillez réessayer plus tard."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {"detail": "Un email avec un bouton de réinitialisation vient d'être envoyé."},
            status=status.HTTP_200_OK,
        )


class ReinitialiserMotDePasseView(APIView):
    """
    POST /api/auth/reinitialiser-mot-de-passe/
    Corps attendu : { "uid": "...", "token": "...", "nouveau_mot_de_passe": "..." }

    Valide le jeton signé reçu par email puis réinitialise le mot de passe
    du compte concerné. Accessible sans authentification.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        uid = request.data.get("uid", "")
        token = request.data.get("token", "")
        nouveau = request.data.get("nouveau_mot_de_passe", "")

        try:
            pk = force_str(urlsafe_base64_decode(uid))
            utilisateur = Utilisateur.objects.get(pk=pk, is_active=True)
        except (TypeError, ValueError, OverflowError, Utilisateur.DoesNotExist):
            return Response(
                {"token": "Le lien est invalide ou a expiré."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(utilisateur, token):
            return Response(
                {"token": "Le lien est invalide ou a expiré."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(nouveau, user=utilisateur)
        except DjangoValidationError as erreur:
            return Response(
                {"nouveau_mot_de_passe": erreur.messages},
                status=status.HTTP_400_BAD_REQUEST,
            )

        utilisateur.set_password(nouveau)
        utilisateur.save(update_fields=["password"])
        return Response(
            {"detail": "Mot de passe réinitialisé avec succès. Vous pouvez vous connecter."},
            status=status.HTTP_200_OK,
        )


class UtilisateurListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/utilisateurs/  - liste tous les comptes (Administrateur uniquement)
    POST /api/utilisateurs/  - cree un nouveau compte (Administrateur uniquement)
    """

    queryset = Utilisateur.objects.all().order_by("username")
    serializer_class = UtilisateurAdminSerializer
    permission_classes = [IsAdmin]


class UtilisateurDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PATCH/PUT/DELETE /api/utilisateurs/<id>/ (Administrateur uniquement)

    Garde-fou : un Administrateur ne peut pas désactiver ni supprimer
    son propre compte (évite de perdre accidentellement tout accès admin).
    """

    queryset = Utilisateur.objects.all()
    serializer_class = UtilisateurAdminSerializer
    permission_classes = [IsAdmin]

    def perform_update(self, serializer):
        instance = self.get_object()
        desactivation_de_soi = (
            instance.pk == self.request.user.pk
            and serializer.validated_data.get("is_active") is False
        )
        if desactivation_de_soi:
            raise PermissionDenied("Vous ne pouvez pas désactiver votre propre compte.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.pk == self.request.user.pk:
            raise PermissionDenied("Vous ne pouvez pas supprimer votre propre compte.")
        instance.delete()