                                               

from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ('event_logs', '0002_eventlog_run_id'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='eventlog',
            name='run_id',
        ),
    ]
