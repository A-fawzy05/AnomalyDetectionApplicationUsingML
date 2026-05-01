"""
Event Log models: stores uploaded event log files and parsed P2P cases/events.
Supports XES, CSV, and OCEL JSON formats.
"""
import uuid
from django.db import models


class EventLog(models.Model):
    """Uploaded event log file — can be XES, CSV, or OCEL JSON."""

    class Format(models.TextChoices):
        XES = "XES", "XES"
        CSV = "CSV", "CSV"
        OCEL = "OCEL", "OCEL"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PROCESSING = "PROCESSING", "Processing"
        READY = "READY", "Ready"
        FAILED = "FAILED", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    format = models.CharField(max_length=10, choices=Format.choices)
    file = models.FileField(upload_to="event_logs/")
    uploaded_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    case_count = models.IntegerField(null=True, blank=True)
    event_count = models.IntegerField(null=True, blank=True)
    # Optional SLA threshold (days) per log — overrides global default
    sla_threshold_days = models.IntegerField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ["-uploaded_at"]
        db_table = "event_log"

    def __str__(self) -> str:
        return f"{self.name} ({self.format}) — {self.status}"


class P2PCase(models.Model):
    """One procurement case / trace from an event log."""

    class CaseStatus(models.TextChoices):
        IN_PROGRESS = "In Progress", "In Progress"
        COMPLETED = "Completed", "Completed"
        DELAYED = "Delayed", "Delayed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case_id = models.CharField(max_length=100, db_index=True)
    event_log = models.ForeignKey(
        EventLog, on_delete=models.CASCADE, related_name="cases"
    )
    supplier = models.CharField(max_length=255, blank=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField(null=True, blank=True)
    cycle_time_days = models.FloatField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=CaseStatus.choices, default=CaseStatus.IN_PROGRESS
    )
    activity_count = models.IntegerField(default=0)
    sla_breached = models.BooleanField(default=False)
    # Reference to discovered variant (set after variant discovery)
    variant_id = models.IntegerField(null=True, blank=True, db_index=True)

    class Meta:
        ordering = ["-start_date"]
        db_table = "p2p_case"
        unique_together = [["case_id", "event_log"]]

    def __str__(self) -> str:
        return f"{self.case_id} ({self.event_log_id})"


class P2PEvent(models.Model):
    """One activity event within a P2P case."""

    case = models.ForeignKey(
        P2PCase, on_delete=models.CASCADE, related_name="events"
    )
    activity = models.CharField(max_length=255, db_index=True)
    timestamp = models.DateTimeField(db_index=True)
    resource = models.CharField(max_length=255, null=True, blank=True)
    # Time elapsed since the previous event in the same case (days)
    duration_days = models.FloatField(null=True, blank=True)
    attributes = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["case", "timestamp"]
        db_table = "p2p_event"

    def __str__(self) -> str:
        return f"{self.activity} @ {self.timestamp} (case={self.case_id})"
