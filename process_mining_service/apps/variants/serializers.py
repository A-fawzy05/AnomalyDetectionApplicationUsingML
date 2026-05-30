"""Serializers for variant analysis API responses."""
from rest_framework import serializers
from .models import ProcessVariant, CaseAnomalySeverity


# ---------------------------------------------------------------------------
# Variant summary KPI serializers
# ---------------------------------------------------------------------------
class VariantKpiSerializer(serializers.Serializer):
    value = serializers.IntegerField(required=False)
    benchmark = serializers.IntegerField(required=False)
    benchmark_label = serializers.CharField(required=False)
    change = serializers.IntegerField(required=False)
    trend = serializers.CharField()


class FrequentVariantKpiSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField()
    frequency_pct = serializers.FloatField()
    benchmark_label = serializers.CharField()
    change_pct = serializers.FloatField()
    trend = serializers.CharField()


class AnomalyVariantKpiSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField()
    anomaly_rate_pct = serializers.FloatField()
    benchmark_threshold_pct = serializers.FloatField()
    change_pct = serializers.FloatField()
    trend = serializers.CharField()


class ConformanceKpiSerializer(serializers.Serializer):
    value_pct = serializers.FloatField()
    benchmark_pct = serializers.FloatField()
    benchmark_label = serializers.CharField()
    change_pct = serializers.FloatField()
    trend = serializers.CharField()


class VariantSummaryResponseSerializer(serializers.Serializer):
    total_variants_detected = VariantKpiSerializer()
    most_frequent_variant = FrequentVariantKpiSerializer()
    highest_anomaly_rate_variant = AnomalyVariantKpiSerializer()
    conformance_fitness = ConformanceKpiSerializer()


# ---------------------------------------------------------------------------
# Scatter chart serializers
# ---------------------------------------------------------------------------
class ScatterVariantSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField()
    name = serializers.CharField()
    frequency_pct = serializers.FloatField()
    anomaly_rate_pct = serializers.FloatField()
    case_count = serializers.IntegerField()
    conformance_score = serializers.FloatField()
    color_category = serializers.CharField()


class ScatterResponseSerializer(serializers.Serializer):
    variants = ScatterVariantSerializer(many=True)
    color_legend = serializers.DictField(child=serializers.CharField())


# ---------------------------------------------------------------------------
# Variant list serializer
# ---------------------------------------------------------------------------
class VariantListSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcessVariant
        fields = [
            "variant_id",
            "name",
            "activity_sequence",
            "frequency_pct",
            "anomaly_rate_pct",
            "conformance_score",
            "case_count",
            "avg_duration_days",
        ]


# ---------------------------------------------------------------------------
# Severity breakdown (shared)
# ---------------------------------------------------------------------------
class SeverityCountSerializer(serializers.Serializer):
    count = serializers.IntegerField()
    pct = serializers.FloatField()


class SeverityDistributionItemSerializer(serializers.Serializer):
    level = serializers.CharField()
    count = serializers.IntegerField()
    pct = serializers.FloatField()
    color = serializers.CharField()


# ---------------------------------------------------------------------------
# Variant detail
# ---------------------------------------------------------------------------
class InsightSerializer(serializers.Serializer):
    type = serializers.CharField()
    title = serializers.CharField()
    description = serializers.CharField()


class VariantDetailSerializer(serializers.Serializer):
    variant_id = serializers.IntegerField()
    name = serializers.CharField()
    activity_sequence = serializers.ListField(child=serializers.CharField())
    frequency_pct = serializers.FloatField()
    anomaly_rate_pct = serializers.FloatField()
    conformance_score = serializers.FloatField()
    case_count = serializers.IntegerField()
    avg_duration_days = serializers.FloatField()
    severity_breakdown = serializers.DictField()
    quick_insights = InsightSerializer(many=True)


# ---------------------------------------------------------------------------
# Anomaly severity distribution
# ---------------------------------------------------------------------------
class AnomalySeverityDistributionSerializer(serializers.Serializer):
    total_cases = serializers.IntegerField()
    anomalous_cases = serializers.IntegerField()
    severity_distribution = SeverityDistributionItemSerializer(many=True)


# ---------------------------------------------------------------------------
# CaseAnomalySeverity push (from FastAPI)
# ---------------------------------------------------------------------------
class CaseAnomalySeverityWriteSerializer(serializers.ModelSerializer):
    case_id = serializers.UUIDField()

    class Meta:
        model = CaseAnomalySeverity
        fields = ["case_id", "severity", "anomaly_score", "anomaly_count", "flagged_by"]


# ---------------------------------------------------------------------------
# Variant analysis aggregate request (with FastAPI data)
# ---------------------------------------------------------------------------
class VariantAnalysisAggregateRequestSerializer(serializers.Serializer):
    event_log_id = serializers.UUIDField(required=True)
    run_id = serializers.UUIDField(required=False)
    anomaly_data = serializers.JSONField(required=False)
    recompute_conformance = serializers.BooleanField(required=False, default=False)
