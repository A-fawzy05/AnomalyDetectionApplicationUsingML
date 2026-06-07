
   
import uuid
from django.db import models
from apps.event_logs.models import EventLog, P2PCase

class ProcessVariant(models.Model):

    event_log = models.ForeignKey(
        EventLog, on_delete=models.CASCADE, related_name="variants"
    )
    variant_id = models.IntegerField()                                 
    name = models.CharField(max_length=255)                                        
    activity_sequence = models.JSONField()                            
    frequency_pct = models.FloatField()
    case_count = models.IntegerField()
    avg_duration_days = models.FloatField()
    conformance_score = models.FloatField()         
    anomaly_rate_pct = models.FloatField(default=0.0)
    computed_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "process_variant"
        unique_together = [["event_log", "variant_id"]]
        ordering = ["-frequency_pct"]

    def __str__(self) -> str:
        return f"{self.name} (variant {self.variant_id}, log {self.event_log_id})"

class CaseAnomalySeverity(models.Model):


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
