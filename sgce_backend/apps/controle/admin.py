from django.contrib import admin

from .models import ControlePrixRevient


@admin.register(ControlePrixRevient)
class ControlePrixRevientAdmin(admin.ModelAdmin):
    list_display = (
        "dossier", "composant", "ligne_devis", "resultat", "marge_reelle_pourcentage",
        "marge_cible_pourcentage", "ecart_significatif", "date_controle",
    )
    list_filter = ("resultat", "ecart_significatif")
    search_fields = ("dossier__numero_dossier", "dossier__commande__numero")
    readonly_fields = (
        "marge_reelle_pourcentage", "ecart_prix_revient", "resultat",
        "ecart_significatif", "date_controle",
    )
