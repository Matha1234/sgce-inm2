from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Utilisateur
from .services import (
    envoyer_identifiants_nouveau_compte,
    notifier_modifications_compte,
)


class UtilisateurSerializer(serializers.ModelSerializer):
    """Profil /api/auth/me/ (GET + PATCH)."""

    role_display = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = Utilisateur
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "telephone",
            "role",
            "role_display",
            "is_active",
            "date_joined",
            "last_login",
            "photo",
        ]
        read_only_fields = [
            "id",
            "username",
            "date_joined",
            "last_login",
            "role_display",
            "role",
            "is_active",
        ]


class UtilisateurAnnuaireSerializer(serializers.ModelSerializer):
    nom_complet = serializers.SerializerMethodField()
    role_display = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = Utilisateur
        fields = ["id", "nom_complet", "role", "role_display"]

    def get_nom_complet(self, obj):
        complet = f"{obj.first_name} {obj.last_name}".strip()
        return complet or obj.username


class UtilisateurAdminSerializer(serializers.ModelSerializer):
    """
    Gestion des comptes (Administrateur).
    - Creation : email avec identifiants
    - Mise a jour : email si role, statut, profil ou mot de passe change
    """

    password = serializers.CharField(
        write_only=True, required=False, style={"input_type": "password"}
    )
    role_display = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = Utilisateur
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "telephone",
            "role",
            "role_display",
            "is_active",
            "date_joined",
            "last_login",
            "password",
            "photo",
        ]
        read_only_fields = ["id", "date_joined", "last_login", "role_display", "photo"]

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        if self.instance is None and not attrs.get("password"):
            raise serializers.ValidationError(
                {"password": "Le mot de passe est obligatoire à la création d'un compte."}
            )
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        utilisateur = Utilisateur(**validated_data)
        utilisateur.set_password(password)
        utilisateur.save()
        envoyer_identifiants_nouveau_compte(utilisateur, password)
        return utilisateur

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)

        # Snapshot avant modification
        avant = {
            "role": instance.role,
            "is_active": instance.is_active,
            "first_name": instance.first_name,
            "last_name": instance.last_name,
            "email": instance.email,
            "telephone": getattr(instance, "telephone", "") or "",
        }

        for champ, valeur in validated_data.items():
            setattr(instance, champ, valeur)
        if password:
            instance.set_password(password)
        instance.save()

        # Detecter les changements pour l'email
        changements = {}
        for champ, ancienne in avant.items():
            nouvelle = getattr(instance, champ, "")
            if champ == "telephone":
                nouvelle = nouvelle or ""
            if ancienne != nouvelle:
                changements[champ] = (ancienne, nouvelle)
        if password:
            changements["password"] = (None, "***")

        if changements:
            notifier_modifications_compte(instance, changements)

        return instance