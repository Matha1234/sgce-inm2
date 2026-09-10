from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import migrations, models
from django.db.models import Sum


def normaliser_reservations(apps, schema_editor):
    Article = apps.get_model("commandes", "Article")
    MouvementStock = apps.get_model("commandes", "MouvementStock")

    for article in Article.objects.all().iterator():
        reservations = MouvementStock.objects.filter(
            article_id=article.pk,
            type_mouvement="RESERVATION",
        ).aggregate(total=Sum("quantite"))["total"] or Decimal("0")
        sorties = MouvementStock.objects.filter(
            article_id=article.pk,
            type_mouvement="SORTIE",
        ).aggregate(total=Sum("quantite"))["total"] or Decimal("0")

        # L'ancien code déduisait les réservations du stock physique. On
        # restaure donc ces quantités dans le stock physique puis conserve
        # comme réservée uniquement la partie non encore sortie.
        if reservations:
            article.quantite_stock = (article.quantite_stock or Decimal("0")) + reservations
        article.quantite_reservee = max(reservations - sorties, Decimal("0"))
        article.save(update_fields=["quantite_stock", "quantite_reservee"])


class Migration(migrations.Migration):
    dependencies = [
        ("catalogue", "0004_validateurs_valeurs_numeriques"),
        ("commandes", "0009_alter_etapeproduction_options_atelier_capacite_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="article",
            name="quantite_reservee",
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                help_text="Quantité réservée pour des dossiers de fabrication, non encore sortie physiquement.",
                max_digits=12,
                validators=[MinValueValidator(Decimal("0"))],
            ),
        ),
        migrations.AlterField(
            model_name="commande",
            name="quantite",
            field=models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)]),
        ),
        migrations.AlterField(
            model_name="devis",
            name="prix_revient",
            field=models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0"))]),
        ),
        migrations.AlterField(
            model_name="devis",
            name="prix_vente",
            field=models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal("0"))]),
        ),
        migrations.AlterField(
            model_name="optiondevis",
            name="surcout_matiere",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True, validators=[MinValueValidator(Decimal("0"))]),
        ),
        migrations.AlterField(
            model_name="optiondevis",
            name="surcout_operation",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True, validators=[MinValueValidator(Decimal("0"))]),
        ),
        migrations.AlterField(
            model_name="ligneoperationdevis",
            name="temps_estime",
            field=models.DecimalField(decimal_places=2, max_digits=8, validators=[MinValueValidator(Decimal("0.01"))]),
        ),
        migrations.RunPython(normaliser_reservations, migrations.RunPython.noop),
    ]
