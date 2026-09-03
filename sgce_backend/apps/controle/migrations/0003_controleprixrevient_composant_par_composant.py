# Generated manually - mise a jour STI (RG28) : controle etabli composant par
# composant (plusieurs fiches par dossier, une par composant), relie a la
# LigneDevis previsionnelle comparee. Le dossier passe de OneToOne a
# ForeignKey et le composant devient PROTECT.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalogue', '0002_poste_de_charge_charges_fixes_variables'),
        ('commandes', '0008_lignedevis_article_emplacement_stock'),
        ('controle', '0002_controleprixrevient_composant'),
    ]

    operations = [
        migrations.AlterField(
            model_name='controleprixrevient',
            name='composant',
            field=models.ForeignKey(
                blank=True,
                help_text=(
                    'Composant contrôlé (prévisionnel/réel) lorsque le dossier est rattaché à un '
                    'produit du catalogue (RG28, mise à jour STI). Laissé vide pour une '
                    'comparaison globale (devis hors catalogue).'
                ),
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='controles_prix_revient',
                to='catalogue.composant',
            ),
        ),
        migrations.AlterField(
            model_name='controleprixrevient',
            name='dossier',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='controles_prix_revient',
                to='commandes.dossierfabrication',
            ),
        ),
        migrations.AddField(
            model_name='controleprixrevient',
            name='ligne_devis',
            field=models.ForeignKey(
                blank=True,
                help_text=(
                    'Ligne de devis prévisionnelle comparée (RG28, mise à jour STI) : '
                    'déduite automatiquement du composant contrôlé.'
                ),
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='controles_prix_revient',
                to='commandes.lignedevis',
            ),
        ),
        migrations.AddConstraint(
            model_name='controleprixrevient',
            constraint=models.UniqueConstraint(
                fields=('dossier', 'composant'),
                name='unique_controle_dossier_composant',
            ),
        ),
    ]
