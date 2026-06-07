
   
from django.db import models
from apps.event_logs.models import EventLog

class ActivityMetric(models.Model):

    class Severity(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    event_log = models.ForeignKey(
        EventLog,
        on_delete=models.CASCADE,
        related_name="activity_metrics",
    )
    activity_name = models.CharField(max_length=255, db_index=True)
    avg_duration_days = models.FloatField()
    min_duration_days = models.FloatField()
    max_duration_days = models.FloatField()
    variance_pct = models.FloatField()
    is_bottleneck = models.BooleanField(default=False)
    bottleneck_severity = models.CharField(
        max_length=10, choices=Severity.choices, null=True, blank=True
    )
    recommendation = models.TextField(null=True, blank=True)
    computed_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "activity_metric"
        unique_together = [["event_log", "activity_name"]]
        ordering = ["-avg_duration_days"]

    def __str__(self) -> str:
        return f"{self.activity_name} — {self.event_log_id}"

class WeeklyMetric(models.Model):

    event_log = models.ForeignKey(
        EventLog,
        on_delete=models.CASCADE,
        related_name="weekly_metrics",
    )
    week_label = models.CharField(max_length=20)                 
    week_start = models.DateField()
    throughput_cases = models.IntegerField()
    avg_cycle_time_days = models.FloatField()
    industry_benchmark_days = models.FloatField(null=True, blank=True)

    class Meta:
        db_table = "weekly_metric"
        ordering = ["week_start"]

    def __str__(self) -> str:
        return f"{self.week_label} ({self.event_log_id})"
