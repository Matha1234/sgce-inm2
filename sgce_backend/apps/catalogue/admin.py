from django.contrib import admin

from .models import (
    Composant,
    FamilleProduit,
    LigneMatierePremiere,
    LigneOperation,
    PosteDeCharge,
    Produit,
)


class ComposantInline(admin.TabularInline):
    model = Composant
    extra = 1


@admin.register(FamilleProduit)
class FamilleProduitAdmin(admin.ModelAdmin):
    list_display = ["nom", "structure_type"]


@admin.register(Produit)
class ProduitAdmin(admin.ModelAdmin):
    list_display = ["nom", "famille", "actif"]
    list_filter = ["famille", "actif"]
    inlines = [ComposantInline]


class LigneMatierePremiereInline(admin.TabularInline):
    model = LigneMatierePremiere
    extra = 1


class LigneOperationInline(admin.TabularInline):
    model = LigneOperation
    extra = 1


@admin.register(Composant)
class ComposantAdmin(admin.ModelAdmin):
    list_display = ["produit", "ordre", "designation"]
    list_filter = ["produit"]
    inlines = [LigneMatierePremiereInline, LigneOperationInline]


@admin.register(PosteDeCharge)
class PosteDeChargeAdmin(admin.ModelAdmin):
    list_display = ["nom", "type_poste", "cout_horaire"]
    list_filter = ["type_poste"]
