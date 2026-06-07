                                               

import django.db.models.deletion
from django.db import migrations, models

class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('event_logs', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='WeeklyMetric',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('week_label', models.CharField(max_length=20)),
                ('week_start', models.DateField()),
                ('throughput_cases', models.IntegerField()),
                ('avg_cycle_time_days', models.FloatField()),
                ('industry_benchmark_days', models.FloatField(blank=True, null=True)),
                ('event_log', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='weekly_metrics', to='event_logs.eventlog')),
            ],
            options={
                'db_table': 'weekly_metric',
                'ordering': ['week_start'],
            },
        ),
        migrations.CreateModel(
            name='ActivityMetric',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('activity_name', models.CharField(db_index=True, max_length=255)),
                ('avg_duration_days', models.FloatField()),
                ('min_duration_days', models.FloatField()),
                ('max_duration_days', models.FloatField()),
                ('variance_pct', models.FloatField()),
                ('is_bottleneck', models.BooleanField(default=False)),
                ('bottleneck_severity', models.CharField(blank=True, choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High')], max_length=10, null=True)),
                ('recommendation', models.TextField(blank=True, null=True)),
                ('computed_at', models.DateTimeField(auto_now=True)),
                ('event_log', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='activity_metrics', to='event_logs.eventlog')),
            ],
            options={
                'db_table': 'activity_metric',
                'ordering': ['-avg_duration_days'],
                'unique_together': {('event_log', 'activity_name')},
            },
        ),
    ]
