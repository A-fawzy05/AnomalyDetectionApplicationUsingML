                                               

import django.db.models.deletion
from django.db import migrations, models

class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('event_logs', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='CaseAnomalySeverity',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('severity', models.CharField(choices=[('critical', 'Critical'), ('high', 'High'), ('medium', 'Medium'), ('low', 'Low'), ('none', 'None')], default='none', max_length=10)),
                ('anomaly_score', models.FloatField(blank=True, null=True)),
                ('anomaly_count', models.IntegerField(default=0)),
                ('flagged_by', models.JSONField(blank=True, default=list)),
                ('case', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='anomaly_severity', to='event_logs.p2pcase')),
            ],
            options={
                'db_table': 'case_anomaly_severity',
            },
        ),
        migrations.CreateModel(
            name='ProcessVariant',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('variant_id', models.IntegerField()),
                ('name', models.CharField(max_length=255)),
                ('activity_sequence', models.JSONField()),
                ('frequency_pct', models.FloatField()),
                ('case_count', models.IntegerField()),
                ('avg_duration_days', models.FloatField()),
                ('conformance_score', models.FloatField()),
                ('anomaly_rate_pct', models.FloatField(default=0.0)),
                ('computed_at', models.DateTimeField(auto_now=True)),
                ('event_log', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='variants', to='event_logs.eventlog')),
            ],
            options={
                'db_table': 'process_variant',
                'ordering': ['-frequency_pct'],
                'unique_together': {('event_log', 'variant_id')},
            },
        ),
    ]
