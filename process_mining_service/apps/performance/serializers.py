                                                         
from rest_framework import serializers
from .models import ActivityMetric, WeeklyMetric
from apps.event_logs.models import P2PCase

class KpiMetricSerializer(serializers.Serializer):
                                                     
    value = serializers.FloatField()
    unit = serializers.CharField()
    change_pct = serializers.FloatField(allow_null=True)
    trend = serializers.CharField()

class PerformanceSummarySerializer(serializers.Serializer):
    average_cycle_time = KpiMetricSerializer()
    processing_throughput = KpiMetricSerializer()
    bottleneck_count = KpiMetricSerializer()
    sla_compliance_rate = KpiMetricSerializer()
    activity_duration_variance = KpiMetricSerializer()
    process_efficiency_score = KpiMetricSerializer()

class WeeklyTrendItemSerializer(serializers.ModelSerializer):
    label = serializers.CharField(source="week_label")
    week_start = serializers.DateField()
    throughput_cases = serializers.IntegerField()
    avg_cycle_time_days = serializers.FloatField()
    industry_benchmark_days = serializers.FloatField(allow_null=True)

    class Meta:
        model = WeeklyMetric
        fields = [
            "label",
            "week_start",
            "throughput_cases",
            "avg_cycle_time_days",
            "industry_benchmark_days",
        ]

class WeeklyTrendsResponseSerializer(serializers.Serializer):
    weeks = WeeklyTrendItemSerializer(many=True)
    benchmark_enabled = serializers.BooleanField()

class ActivityRankingItemSerializer(serializers.Serializer):
    rank = serializers.IntegerField()
    activity_name = serializers.CharField()
    avg_duration_days = serializers.FloatField()
    min_duration_days = serializers.FloatField()
    max_duration_days = serializers.FloatField()
    variance_pct = serializers.FloatField()
    is_bottleneck = serializers.BooleanField()
    bottleneck_severity = serializers.CharField(allow_null=True)
    recommendation = serializers.CharField(allow_null=True)

class ActivityRankingResponseSerializer(serializers.Serializer):
    activities = ActivityRankingItemSerializer(many=True)

class ProcessFlowStageSerializer(serializers.Serializer):
    step = serializers.IntegerField()
    activity_name = serializers.CharField()
    cases_processed = serializers.IntegerField()
    avg_duration_days = serializers.FloatField()
    is_bottleneck = serializers.BooleanField()
    severity = serializers.CharField()
    color_code = serializers.CharField()

class ProcessFlowResponseSerializer(serializers.Serializer):
    stages = ProcessFlowStageSerializer(many=True)
    severity_legend = serializers.DictField(child=serializers.CharField())

class CaseDetailSerializer(serializers.ModelSerializer):
    case_id = serializers.CharField()
    supplier = serializers.CharField()
    period_start = serializers.DateTimeField(source="start_date", format="%Y-%m-%d")
    period_end = serializers.DateTimeField(source="end_date", format="%Y-%m-%d", allow_null=True)
    status = serializers.CharField()
    cycle_time_days = serializers.FloatField(allow_null=True)
    activity_count = serializers.IntegerField()
    bottleneck_count = serializers.SerializerMethodField()
    sla_breached = serializers.BooleanField()

    class Meta:
        model = P2PCase
        fields = [
            "case_id",
            "supplier",
            "period_start",
            "period_end",
            "status",
            "cycle_time_days",
            "activity_count",
            "bottleneck_count",
            "sla_breached",
        ]

    def get_bottleneck_count(self, obj: P2PCase) -> int:
                                                                                    
        return obj.events.filter(duration_days__gt=10).count()
