                                                                   
from rest_framework import serializers
from .models import EventLog

class EventLogUploadSerializer(serializers.Serializer):

    name = serializers.CharField(max_length=255)
    file = serializers.FileField()
    sla_threshold_days = serializers.IntegerField(required=False, min_value=1)

class EventLogSerializer(serializers.ModelSerializer):

    class Meta:
        model = EventLog
        fields = [
            "id",
            "name",
            "format",
            "uploaded_at",
            "status",
            "case_count",
            "event_count",
            "sla_threshold_days",
            "error_message",
        ]
        read_only_fields = fields

class EventLogStatusSerializer(serializers.ModelSerializer):

    class Meta:
        model = EventLog
        fields = ["id", "status", "case_count", "event_count", "error_message"]
        read_only_fields = fields
