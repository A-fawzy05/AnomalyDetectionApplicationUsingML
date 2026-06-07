                                               

import django.db.models.deletion
import uuid
from django.db import migrations, models

class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='EventLog',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255)),
                ('format', models.CharField(choices=[('XES', 'XES'), ('CSV', 'CSV'), ('OCEL', 'OCEL')], max_length=10)),
                ('file', models.FileField(upload_to='event_logs/')),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('status', models.CharField(choices=[('PENDING', 'Pending'), ('PROCESSING', 'Processing'), ('READY', 'Ready'), ('FAILED', 'Failed')], default='PENDING', max_length=20)),
                ('case_count', models.IntegerField(blank=True, null=True)),
                ('event_count', models.IntegerField(blank=True, null=True)),
                ('sla_threshold_days', models.IntegerField(blank=True, null=True)),
                ('error_message', models.TextField(blank=True, null=True)),
            ],
            options={
                'db_table': 'event_log',
                'ordering': ['-uploaded_at'],
            },
        ),
        migrations.CreateModel(
            name='P2PCase',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('case_id', models.CharField(db_index=True, max_length=100)),
                ('supplier', models.CharField(blank=True, max_length=255)),
                ('start_date', models.DateTimeField()),
                ('end_date', models.DateTimeField(blank=True, null=True)),
                ('cycle_time_days', models.FloatField(blank=True, null=True)),
                ('status', models.CharField(choices=[('In Progress', 'In Progress'), ('Completed', 'Completed'), ('Delayed', 'Delayed')], default='In Progress', max_length=20)),
                ('activity_count', models.IntegerField(default=0)),
                ('sla_breached', models.BooleanField(default=False)),
                ('variant_id', models.IntegerField(blank=True, db_index=True, null=True)),
                ('event_log', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='cases', to='event_logs.eventlog')),
            ],
            options={
                'db_table': 'p2p_case',
                'ordering': ['-start_date'],
                'unique_together': {('case_id', 'event_log')},
            },
        ),
        migrations.CreateModel(
            name='P2PEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('activity', models.CharField(db_index=True, max_length=255)),
                ('timestamp', models.DateTimeField(db_index=True)),
                ('resource', models.CharField(blank=True, max_length=255, null=True)),
                ('duration_days', models.FloatField(blank=True, null=True)),
                ('attributes', models.JSONField(blank=True, default=dict)),
                ('case', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='events', to='event_logs.p2pcase')),
            ],
            options={
                'db_table': 'p2p_event',
                'ordering': ['case', 'timestamp'],
            },
        ),
    ]
