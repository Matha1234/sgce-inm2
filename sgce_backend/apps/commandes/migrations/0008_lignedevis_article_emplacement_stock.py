# Generated manually - mise a jour STI : LigneDevis retablie (RG27, RG28,
# RG30) et Article.emplacement_stock (RG32).

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalogue', '0001_initial'),
        ('commandes', '0007_article_cout_unitaire_devis_options_ajustees_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='article',
            name='emplacement_stock',
            field=models.CharField(
                blank=True,
                help_text="Emplacement de stockage de l'article au magasin (RG32, mise à jour STI).",
                max_length=80,
            ),
        ),
        migrations.CreateModel(
            name='LigneDevis',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('cout_matiere_estime', models.DecimalField(decimal_places=2, default=0, help_text='Coût prévisionnel des matières premières du composant (RG27).', max_digits=12)),
                ('cout_operation_estime', models.DecimalField(decimal_places=2, default=0, help_text='Coût prévisionnel des opérations du composant (RG27).', max_digits=12)),
                ('part_fixe_amortie', models.DecimalField(decimal_places=2, default=0, help_text='Part des charges fixes amortie sur la quantité totale commandée (RG29).', max_digits=12)),
                ('part_variable', models.DecimalField(decimal_places=2, default=0, help_text='Part des charges variables, proportionnelle à la quantité (RG29).', max_digits=12)),
                ('remarque', models.CharField(blank=True, help_text='Remarque technique prévalant sur le catalogue en cas de divergence (RG30).', max_length=255)),
                ('composant', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='lignes_devis', to='catalogue.composant')),
                ('devis', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='lignes_devis', to='commandes.devis')),
            ],
            options={
                'verbose_name': 'Ligne de devis',
                'verbose_name_plural': 'Lignes de devis',
                'db_table': 'lignes_devis',
                'ordering': ['devis_id', 'composant__ordre'],
            },
        ),
        migrations.AlterUniqueTogether(
            name='lignedevis',
            unique_together={('devis', 'composant')},
        ),
    ]
