from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("catalogue", "0003_produit_date_maj_produit_description_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="produit",
            name="marge_min",
            field=models.DecimalField(decimal_places=2, default=Decimal("10"), help_text="Marge minimale acceptable (en %) — RG36.", max_digits=5, validators=[MinValueValidator(Decimal("0"))]),
        ),
        migrations.AlterField(
            model_name="produit",
            name="marge_max",
            field=models.DecimalField(decimal_places=2, default=Decimal("30"), help_text="Marge maximale acceptable (en %) — RG36.", max_digits=5, validators=[MinValueValidator(Decimal("0"))]),
        ),
        migrations.AlterField(
            model_name="lignematierepremiere",
            name="quantite_unitaire",
            field=models.DecimalField(decimal_places=3, max_digits=10, help_text="Quantité de matière requise par exemplaire produit (ou par lot pour une charge fixe).", validators=[MinValueValidator(Decimal("0.001"))]),
        ),
        migrations.AlterField(
            model_name="ligneoperation",
            name="temps_unitaire",
            field=models.DecimalField(decimal_places=2, max_digits=8, help_text="Temps requis par exemplaire produit (ou par lot pour une charge fixe), en minutes.", validators=[MinValueValidator(Decimal("0.01"))]),
        ),
        migrations.AlterField(
            model_name="postedecharge",
            name="cout_horaire",
            field=models.DecimalField(decimal_places=2, default=0, help_text="Coût horaire du poste, utilisé par le moteur de calcul.", max_digits=12, validators=[MinValueValidator(Decimal("0"))]),
        ),
    ]
