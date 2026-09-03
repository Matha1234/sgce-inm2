# Generated manually - mise a jour STI (RG29, RG31) : Machine -> PosteDeCharge
# avec type_poste (MACHINE/MANUEL), et qualification FIXE/VARIABLE des lignes
# de matiere premiere et d'operation (type_charge).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalogue', '0001_initial'),
    ]

    operations = [
        migrations.RenameModel(
            old_name='Machine',
            new_name='PosteDeCharge',
        ),
        migrations.AlterModelOptions(
            name='postedecharge',
            options={
                'ordering': ['nom'],
                'verbose_name': 'Poste de charge',
                'verbose_name_plural': 'Postes de charge',
            },
        ),
        # db_table était explicite sur l'ancien modèle : RenameModel ne renomme
        # pas la table dans ce cas, il faut AlterModelTable explicite.
        migrations.AlterModelTable(
            name='postedecharge',
            table='postes_de_charge',
        ),
        migrations.AddField(
            model_name='postedecharge',
            name='type_poste',
            field=models.CharField(
                choices=[
                    ('MACHINE', 'Machine (amortissement + électricité)'),
                    ('MANUEL', "Manuel (main-d'œuvre directe)"),
                ],
                default='MACHINE',
                help_text='Nature du poste : automatisé (machine) ou manuel (RG31).',
                max_length=10,
            ),
        ),
        migrations.RenameField(
            model_name='ligneoperation',
            old_name='machine',
            new_name='poste',
        ),
        migrations.AlterField(
            model_name='lignematierepremiere',
            name='quantite_unitaire',
            field=models.DecimalField(decimal_places=3, help_text='Quantité de matière requise par exemplaire produit (ou par lot pour une charge fixe).', max_digits=10),
        ),
        migrations.AlterField(
            model_name='ligneoperation',
            name='temps_unitaire',
            field=models.DecimalField(decimal_places=2, help_text='Temps requis par exemplaire produit (ou par lot pour une charge fixe), en minutes.', max_digits=8),
        ),
        migrations.AddField(
            model_name='lignematierepremiere',
            name='type_charge',
            field=models.CharField(
                choices=[
                    ('FIXE', 'Charge fixe (amortie sur la quantité totale)'),
                    ('VARIABLE', 'Charge variable (proportionnelle à la quantité)'),
                ],
                default='VARIABLE',
                help_text='Nature de la charge : fixe (amortie) ou variable (proportionnelle) — RG29.',
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name='ligneoperation',
            name='type_charge',
            field=models.CharField(
                choices=[
                    ('FIXE', 'Charge fixe (amortie sur la quantité totale)'),
                    ('VARIABLE', 'Charge variable (proportionnelle à la quantité)'),
                ],
                default='VARIABLE',
                help_text='Nature de la charge : fixe (amortie) ou variable (proportionnelle) — RG29.',
                max_length=10,
            ),
        ),
    ]
