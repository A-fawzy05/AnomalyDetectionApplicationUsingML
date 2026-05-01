"""
Variant Analysis API Views.
All views are thin: validate → call service → serialize → return.
"""
import logging

from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.pagination import StandardPagePagination
from apps.common.utils import error_response
from apps.event_logs.models import EventLog
from apps.variants.models import ProcessVariant, CaseAnomalySeverity
from apps.variants.services.insights import generate_variant_insights
from apps.variants.services.severity import get_severity_distribution
from .serializers import (
    VariantSummaryResponseSerializer,
    ScatterResponseSerializer,
    VariantListSerializer,
    VariantDetailSerializer,
    AnomalySeverityDistributionSerializer,
    CaseAnomalySeverityWriteSerializer,
)

logger = logging.getLogger(__name__)

ANOMALY_THRESHOLD_PCT = 15.0
CONFORMANCE_TARGET_PCT = 85.0


def _get_event_log(event_log_id: str) -> EventLog | None:
    try:
        return EventLog.objects.get(pk=event_log_id)
    except EventLog.DoesNotExist:
        return None


class VariantSummaryView(APIView):
    """GET /api/v1/variants/summary/"""

    @extend_schema(
        parameters=[
            OpenApiParameter("event_log_id", OpenApiTypes.UUID, required=True),
            OpenApiParameter("period", OpenApiTypes.STR, required=False,
                             enum=["7d", "30d", "90d"]),
        ],
        responses={200: VariantSummaryResponseSerializer},
        summary="Variant Analysis KPI Summary",
        description="4 KPI cards: total variants, most frequent, highest anomaly rate, conformance fitness.",
        tags=["Variant Analysis"],
    )
    def get(self, request: Request) -> Response:
        event_log_id = request.query_params.get("event_log_id")
        if not event_log_id:
            return error_response("MISSING_PARAM", "event_log_id is required", 400)

        event_log = _get_event_log(event_log_id)
        if not event_log:
            return error_response(
                "EVENT_LOG_NOT_FOUND",
                f"No event log with id {event_log_id}",
                status.HTTP_404_NOT_FOUND,
            )

        variants = ProcessVariant.objects.filter(event_log=event_log)
        total = variants.count()

        most_frequent = variants.order_by("-frequency_pct").first()
        highest_anomaly = variants.order_by("-anomaly_rate_pct").first()

        # Average conformance across all variants
        if total > 0:
            avg_conformance = sum(v.conformance_score for v in variants) / total
        else:
            avg_conformance = 0.0

        data = {
            "total_variants_detected": {
                "value": total,
                "benchmark": max(0, total - 5),
                "benchmark_label": f"{max(0, total - 5)} variants (baseline)",
                "change": 3,
                "trend": "up" if total > 0 else "neutral",
            },
            "most_frequent_variant": {
                "variant_id": most_frequent.variant_id if most_frequent else 0,
                "frequency_pct": most_frequent.frequency_pct if most_frequent else 0.0,
                "benchmark_label": "Standard P2P flow",
                "change_pct": 0.0,
                "trend": "neutral",
            },
            "highest_anomaly_rate_variant": {
                "variant_id": highest_anomaly.variant_id if highest_anomaly else 0,
                "anomaly_rate_pct": highest_anomaly.anomaly_rate_pct if highest_anomaly else 0.0,
                "benchmark_threshold_pct": ANOMALY_THRESHOLD_PCT,
                "change_pct": 0.0,
                "trend": "neutral",
            },
            "conformance_fitness": {
                "value_pct": round(avg_conformance, 1),
                "benchmark_pct": CONFORMANCE_TARGET_PCT,
                "benchmark_label": f"{CONFORMANCE_TARGET_PCT:.0f}% target",
                "change_pct": 0.0,
                "trend": "up" if avg_conformance >= CONFORMANCE_TARGET_PCT else "down",
            },
        }
        return Response(data, status=status.HTTP_200_OK)


class FrequencyAnomalyScatterView(APIView):
    """GET /api/v1/variants/frequency-anomaly-scatter/"""

    @extend_schema(
        parameters=[
            OpenApiParameter("event_log_id", OpenApiTypes.UUID, required=True),
            OpenApiParameter("period", OpenApiTypes.STR, required=False),
            OpenApiParameter("min_frequency", OpenApiTypes.FLOAT, required=False),
            OpenApiParameter("max_frequency", OpenApiTypes.FLOAT, required=False),
            OpenApiParameter("conformance_threshold", OpenApiTypes.FLOAT, required=False),
        ],
        responses={200: ScatterResponseSerializer},
        summary="Variant Frequency vs Anomaly Rate Scatter",
        description="Bubble chart data where each bubble = one variant. Bubble size = case volume.",
        tags=["Variant Analysis"],
    )
    def get(self, request: Request) -> Response:
        event_log_id = request.query_params.get("event_log_id")
        if not event_log_id:
            return error_response("MISSING_PARAM", "event_log_id is required", 400)

        event_log = _get_event_log(event_log_id)
        if not event_log:
            return error_response(
                "EVENT_LOG_NOT_FOUND",
                f"No event log with id {event_log_id}",
                status.HTTP_404_NOT_FOUND,
            )

        qs = ProcessVariant.objects.filter(event_log=event_log)

        # Filters
        try:
            min_freq = float(request.query_params.get("min_frequency", 0))
            max_freq = float(request.query_params.get("max_frequency", 100))
            conf_threshold = float(request.query_params.get("conformance_threshold", 0))
        except ValueError:
            min_freq, max_freq, conf_threshold = 0.0, 100.0, 0.0

        qs = qs.filter(
            frequency_pct__gte=min_freq,
            frequency_pct__lte=max_freq,
            conformance_score__gte=conf_threshold,
        )

        def _color_category(anomaly_rate: float) -> str:
            if anomaly_rate < 8:
                return "low"
            if anomaly_rate <= 15:
                return "medium"
            return "high"

        variants_data = [
            {
                "variant_id": v.variant_id,
                "name": v.name,
                "frequency_pct": v.frequency_pct,
                "anomaly_rate_pct": v.anomaly_rate_pct,
                "case_count": v.case_count,
                "conformance_score": v.conformance_score,
                "color_category": _color_category(v.anomaly_rate_pct),
            }
            for v in qs
        ]

        return Response(
            {
                "variants": variants_data,
                "color_legend": {"low": "<8%", "medium": "8-15%", "high": ">15%"},
            },
            status=status.HTTP_200_OK,
        )


class VariantListView(APIView):
    """GET /api/v1/variants/list/"""

    @extend_schema(
        parameters=[
            OpenApiParameter("event_log_id", OpenApiTypes.UUID, required=True),
            OpenApiParameter("sort_by", OpenApiTypes.STR, required=False,
                             enum=["frequency", "anomaly_rate", "conformance", "cases", "avg_duration"]),
            OpenApiParameter("order", OpenApiTypes.STR, required=False, enum=["asc", "desc"]),
            OpenApiParameter("filter", OpenApiTypes.STR, required=False,
                             enum=["high_frequency", "high_conformance", "rare_variants", "low_conformance"]),
            OpenApiParameter("period", OpenApiTypes.STR, required=False),
            OpenApiParameter("page", OpenApiTypes.INT, required=False),
            OpenApiParameter("page_size", OpenApiTypes.INT, required=False),
        ],
        responses={200: VariantListSerializer(many=True)},
        summary="Process Variant Comparison Table",
        description="Paginated variant list with frequency, anomaly rate, conformance, and duration.",
        tags=["Variant Analysis"],
    )
    def get(self, request: Request) -> Response:
        event_log_id = request.query_params.get("event_log_id")
        if not event_log_id:
            return error_response("MISSING_PARAM", "event_log_id is required", 400)

        event_log = _get_event_log(event_log_id)
        if not event_log:
            return error_response(
                "EVENT_LOG_NOT_FOUND",
                f"No event log with id {event_log_id}",
                status.HTTP_404_NOT_FOUND,
            )

        qs = ProcessVariant.objects.filter(event_log=event_log)

        # Preset filters
        filter_param = request.query_params.get("filter")
        filter_map = {
            "high_frequency": {"frequency_pct__gte": 20.0},
            "high_conformance": {"conformance_score__gte": 85.0},
            "rare_variants": {"frequency_pct__lt": 5.0},
            "low_conformance": {"conformance_score__lt": 70.0},
        }
        if filter_param and filter_param in filter_map:
            qs = qs.filter(**filter_map[filter_param])

        # Sorting
        sort_db_map = {
            "frequency": "frequency_pct",
            "anomaly_rate": "anomaly_rate_pct",
            "conformance": "conformance_score",
            "cases": "case_count",
            "avg_duration": "avg_duration_days",
        }
        sort_by = request.query_params.get("sort_by", "frequency")
        order = request.query_params.get("order", "desc")
        sort_field = sort_db_map.get(sort_by, "frequency_pct")
        qs = qs.order_by(sort_field if order == "asc" else f"-{sort_field}")

        # Pagination
        paginator = StandardPagePagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = VariantListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class VariantDetailView(APIView):
    """GET /api/v1/variants/{variant_id}/detail/"""

    @extend_schema(
        parameters=[
            OpenApiParameter("event_log_id", OpenApiTypes.UUID, required=True,
                             location=OpenApiParameter.QUERY),
        ],
        responses={200: VariantDetailSerializer, 404: None},
        summary="Variant Detail",
        description="Full detail view for a single variant including severity breakdown and rule-based insights.",
        tags=["Variant Analysis"],
    )
    def get(self, request: Request, variant_id: int) -> Response:
        event_log_id = request.query_params.get("event_log_id")
        if not event_log_id:
            return error_response("MISSING_PARAM", "event_log_id is required", 400)

        try:
            variant = ProcessVariant.objects.get(
                event_log_id=event_log_id, variant_id=variant_id
            )
        except ProcessVariant.DoesNotExist:
            return error_response(
                "VARIANT_NOT_FOUND",
                f"No variant {variant_id} in event log {event_log_id}",
                status.HTTP_404_NOT_FOUND,
            )

        event_log = variant.event_log
        dist = get_severity_distribution(event_log, variant)

        # Build severity_breakdown as {level: {count, pct}}
        severity_breakdown = {
            item["level"]: {"count": item["count"], "pct": item["pct"]}
            for item in dist["severity_distribution"]
        }

        quick_insights = generate_variant_insights(variant)

        data = {
            "variant_id": variant.variant_id,
            "name": variant.name,
            "activity_sequence": variant.activity_sequence,
            "frequency_pct": variant.frequency_pct,
            "anomaly_rate_pct": variant.anomaly_rate_pct,
            "conformance_score": variant.conformance_score,
            "case_count": variant.case_count,
            "avg_duration_days": variant.avg_duration_days,
            "severity_breakdown": severity_breakdown,
            "quick_insights": quick_insights,
        }
        return Response(data, status=status.HTTP_200_OK)


class AnomalySeverityDistributionView(APIView):
    """GET /api/v1/variants/anomaly-severity-distribution/"""

    @extend_schema(
        parameters=[
            OpenApiParameter("event_log_id", OpenApiTypes.UUID, required=True),
            OpenApiParameter("variant_id", OpenApiTypes.INT, required=False),
            OpenApiParameter("period", OpenApiTypes.STR, required=False),
        ],
        responses={200: AnomalySeverityDistributionSerializer},
        summary="Anomaly Severity Distribution",
        description="Global or per-variant severity pie chart data.",
        tags=["Variant Analysis"],
    )
    def get(self, request: Request) -> Response:
        event_log_id = request.query_params.get("event_log_id")
        if not event_log_id:
            return error_response("MISSING_PARAM", "event_log_id is required", 400)

        event_log = _get_event_log(event_log_id)
        if not event_log:
            return error_response(
                "EVENT_LOG_NOT_FOUND",
                f"No event log with id {event_log_id}",
                status.HTTP_404_NOT_FOUND,
            )

        variant = None
        variant_id_param = request.query_params.get("variant_id")
        if variant_id_param:
            try:
                variant = ProcessVariant.objects.get(
                    event_log=event_log, variant_id=int(variant_id_param)
                )
            except (ProcessVariant.DoesNotExist, ValueError):
                return error_response(
                    "VARIANT_NOT_FOUND",
                    f"No variant {variant_id_param} in event log {event_log_id}",
                    status.HTTP_404_NOT_FOUND,
                )

        dist = get_severity_distribution(event_log, variant)
        return Response(dist, status=status.HTTP_200_OK)


class CaseAnomalySeverityPushView(APIView):
    """
    POST /api/v1/variants/anomaly-severity/
    Called by the FastAPI anomaly service to push severity results per case.
    """

    @extend_schema(
        request=CaseAnomalySeverityWriteSerializer,
        responses={201: None, 400: None},
        summary="Push anomaly severity for a case (FastAPI integration)",
        description="Receives anomaly severity data from the FastAPI service and upserts CaseAnomalySeverity.",
        tags=["Variant Analysis"],
    )
    def post(self, request: Request) -> Response:
        from apps.event_logs.models import P2PCase

        serializer = CaseAnomalySeverityWriteSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response("VALIDATION_ERROR", str(serializer.errors), 400)

        data = serializer.validated_data
        try:
            case = P2PCase.objects.get(pk=data["case_id"])
        except P2PCase.DoesNotExist:
            return error_response(
                "CASE_NOT_FOUND",
                f"No P2PCase with id {data['case_id']}",
                status.HTTP_404_NOT_FOUND,
            )

        CaseAnomalySeverity.objects.update_or_create(
            case=case,
            defaults={
                "severity": data["severity"],
                "anomaly_score": data.get("anomaly_score"),
                "anomaly_count": data.get("anomaly_count", 0),
                "flagged_by": data.get("flagged_by", []),
            },
        )
        logger.info(
            {
                "event": "anomaly_severity_pushed",
                "case_id": str(data["case_id"]),
                "severity": data["severity"],
            }
        )
        return Response({"status": "ok"}, status=status.HTTP_201_CREATED)
