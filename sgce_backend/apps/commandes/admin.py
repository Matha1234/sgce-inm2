from django.contrib import admin

from .models import (
    Article,
    Atelier,
    Commande,
    Devis,
    DossierFabrication,
    EtapeProduction,
    LigneDevis,
    MouvementStock,
    OrganismeClient,
)


class LigneDevisInline(admin.TabularInline):
    model = LigneDevis
    extra = 0
    readonly_fields = ["composant", "cout_matiere_estime", "cout_operation_estime", "part_fixe_amortie", "part_variable"]
    can_delete = False


class DevisAdmin(admin.ModelAdmin):
    list_display = ["commande", "produit_catalogue", "prix_revient", "prix_vente", "valide"]
    list_filter = ["valide", "pluriannuel"]
    inlines = [LigneDevisInline]


admin.site.register(OrganismeClient)
admin.site.register(Commande)
admin.site.register(Devis, DevisAdmin)
admin.site.register(LigneDevis)
admin.site.register(Atelier)
admin.site.register(DossierFabrication)
admin.site.register(EtapeProduction)
admin.site.register(Article)
admin.site.register(MouvementStock)