"""
Variant analysis models.
ProcessVariant and CaseAnomalySeverity are precomputed at upload time.
"""
import uuid
from django.db import models
from apps.event_logs.models import EventLog, P2PCase


class ProcessVariant(models.Model):
    """A unique process path (sequence of activities) discovered by pm4py."""

    event_log = models.ForeignKey(
        EventLog, on_delete=models.CASCADE, related_name="variants"
    )
    variant_id = models.IntegerField()  # pm4py variant index (0-based)
    name = models.CharField(max_length=255)  # human-readable, e.g. "Standard Flow"
    activity_sequence = models.JSONField()  # list of activity strings
    frequency_pct = models.FloatField()
    case_count = models.IntegerField()
    avg_duration_days = models.FloatField()
    conformance_score = models.FloatField()  # 0–100
    anomaly_rate_pct = models.FloatField(default=0.0)
    computed_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "process_variant"
        unique_together = [["event_log", "variant_id"]]
        ordering = ["-frequency_pct"]

    def __str__(self) -> str:
        return f"{self.name} (variant {self.variant_id}, log {self.event_log_id})"


class CaseAnomalySeverity(models.Model):
    """
    Anomaly severity per case — populated by the FastAPI anomaly service.
    A separate endpoint allows the FastAPI service to push results here.
    """

    class Severity(models.TextChoices):
        CRITICAL = "critical", "Critical"
        HIGH = "high", "High"
        MEDIUM = "medium", "Medium"
        LOW = "low", "Low"
        NONE = "none", "None"

    case = models.OneToOneField(
        P2PCase, on_delete=models.CASCADE, related_name="anomaly_severity"
    )
    severity = models.CharField(
        max_length=10, choices=Severity.choices, default=Severity.NONE
    )
    anomaly_score = models.FloatField(null=True, blank=True)
    anomaly_count = models.IntegerField(default=0)
    flagged_by = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = "case_anomaly_severity"

    def __str__(self) -> str:
        return f"{self.case_id} — {self.severity}"
