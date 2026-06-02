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
    VariantAnalysisAggregateRequestSerializer,
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


class VariantAnalysisAggregatedView(APIView):
    """POST /api/v1/variants/aggregate/ — All variant analysis in one endpoint with FastAPI input in body."""

    @extend_schema(
        parameters=[
            OpenApiParameter("period", OpenApiTypes.STR, required=False, enum=["7d", "30d", "90d"]),
            OpenApiParameter("min_frequency", OpenApiTypes.FLOAT, required=False),
            OpenApiParameter("max_frequency", OpenApiTypes.FLOAT, required=False),
            OpenApiParameter("conformance_threshold", OpenApiTypes.FLOAT, required=False),
            OpenApiParameter("sort_by", OpenApiTypes.STR, required=False,
                             enum=["frequency", "anomaly_rate", "conformance", "cases", "avg_duration"]),
            OpenApiParameter("order", OpenApiTypes.STR, required=False, enum=["asc", "desc"]),
            OpenApiParameter("filter", OpenApiTypes.STR, required=False,
                             enum=["high_frequency", "high_conformance", "rare_variants", "low_conformance"]),
            OpenApiParameter("variant_page", OpenApiTypes.INT, required=False),
            OpenApiParameter("variant_page_size", OpenApiTypes.INT, required=False),
        ],
        request=VariantAnalysisAggregateRequestSerializer,
        responses={200: None},
        summary="Aggregated Variant Analysis with FastAPI Input",
        description="Returns all variant analysis data in a single response: summary, scatter, list, and severity distribution. Accepts FastAPI anomaly data in request body with event_log_id and run_id. Optionally recomputes conformance scores.",
        tags=["Variant Analysis"],
    )
    def post(self, request: Request) -> Response:
        from apps.event_logs.models import P2PCase

        serializer = VariantAnalysisAggregateRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response("VALIDATION_ERROR", str(serializer.errors), 400)

        data = serializer.validated_data
        event_log_id = data["event_log_id"]
        run_id = data.get("run_id")
        anomaly_data = data.get("anomaly_data")
        recompute_conformance = data.get("recompute_conformance", False)

        event_log = _get_event_log(event_log_id)
        if not event_log:
            return error_response(
                "EVENT_LOG_NOT_FOUND",
                f"No event log with id {event_log_id}",
                status.HTTP_404_NOT_FOUND,
            )

        logger.info({"event": "variant_aggregate_request", "event_log_id": event_log_id, "run_id": str(run_id) if run_id else None})

        # ---- Process FastAPI anomaly data if provided ----
        anomaly_data_processed = False
        if anomaly_data:
            # Handle full FastAPI response format with anomaly_cases array
            if "anomaly_cases" in anomaly_data:
                # Map FastAPI severity labels to Django severity enum
                severity_map = {
                    "Critical": "critical",
                    "High": "high",
                    "Medium": "medium",
                    "Low": "low",
                }
                for case_anomaly in anomaly_data["anomaly_cases"]:
                    case_id_str = case_anomaly.get("case_id")
                    # Scope the lookup to THIS event log. case_id is unique within
                    # an event log but NOT across uploads (e.g. the OCEL2 test file
                    # reuses deterministic ids like "purchase_order:test_1"), so an
                    # unscoped .get() raised MultipleObjectsReturned → HTTP 500.
                    # .filter().first() can never raise on duplicates.
                    case = (
                        P2PCase.objects
                        .filter(event_log=event_log, case_id=case_id_str)
                        .first()
                    )
                    if case is None:
                        logger.warning({"event": "case_not_found_for_anomaly", "case_id": case_id_str})
                        continue
                    # Extract flags as flagged_by list
                    flags = case_anomaly.get("flags", {})
                    flagged_by = [flag for flag, is_flagged in flags.items() if is_flagged]
                    # Map severity label to lowercase
                    severity_label = case_anomaly.get("severity_label", "none")
                    severity = severity_map.get(severity_label, "none")
                    CaseAnomalySeverity.objects.update_or_create(
                        case=case,
                        defaults={
                            "severity": severity,
                            "anomaly_score": case_anomaly.get("severity_score"),
                            "anomaly_count": 1,  # Each case counted once
                            "flagged_by": flagged_by,
                        },
                    )
                anomaly_data_processed = True
                logger.info({"event": "fastapi_anomaly_data_processed", "event_log_id": event_log_id})
            else:
                # Handle simplified format {case_id: {severity, anomaly_score, anomaly_count, flagged_by}}
                for case_id_str, case_data in anomaly_data.items():
                    try:
                        case = P2PCase.objects.get(pk=case_id_str)
                        CaseAnomalySeverity.objects.update_or_create(
                            case=case,
                            defaults={
                                "severity": case_data.get("severity", "none"),
                                "anomaly_score": case_data.get("anomaly_score"),
                                "anomaly_count": case_data.get("anomaly_count", 0),
                                "flagged_by": case_data.get("flagged_by", []),
                            },
                        )
                    except P2PCase.DoesNotExist:
                        logger.warning({"event": "case_not_found_for_anomaly", "case_id": case_id_str})
                anomaly_data_processed = True
                logger.info({"event": "fastapi_anomaly_data_processed", "event_log_id": event_log_id})

        # ---- Recompute conformance and/or anomaly rates ----
        from apps.variants.services.conformance import compute_conformance
        from apps.variants.services.severity import compute_anomaly_rates

        variants_for_recompute = list(ProcessVariant.objects.filter(event_log=event_log))

        # Auto-recompute conformance if explicitly requested OR if all scores are still 0
        all_zero_conformance = variants_for_recompute and all(
            v.conformance_score == 0.0 for v in variants_for_recompute
        )
        if recompute_conformance or all_zero_conformance:
            compute_conformance(event_log, variants_for_recompute)
            # Refresh from DB after save
            variants_for_recompute = list(ProcessVariant.objects.filter(event_log=event_log))
            recompute_conformance = True
            logger.info({"event": "conformance_recomputed", "event_log_id": event_log_id})

        # Always recompute anomaly rates when anomaly data was just processed,
        # or when conformance was recomputed (which may have refreshed the variant list)
        if anomaly_data_processed or recompute_conformance:
            compute_anomaly_rates(event_log, variants_for_recompute)
            logger.info({"event": "anomaly_rates_recomputed", "event_log_id": event_log_id})

        # ---- Variant Summary ----
        variants = ProcessVariant.objects.filter(event_log=event_log)
        total = variants.count()
        most_frequent = variants.order_by("-frequency_pct").first()
        highest_anomaly = variants.order_by("-anomaly_rate_pct").first()

        if total > 0:
            avg_conformance = sum(v.conformance_score for v in variants) / total
        else:
            avg_conformance = 0.0

        # ---- Frequency Anomaly Scatter ----
        try:
            min_freq = float(request.query_params.get("min_frequency", 0))
            max_freq = float(request.query_params.get("max_frequency", 100))
            conf_threshold = float(request.query_params.get("conformance_threshold", 0))
        except ValueError:
            min_freq, max_freq, conf_threshold = 0.0, 100.0, 0.0

        scatter_qs = variants.filter(
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

        scatter_data = [
            {
                "variant_id": v.variant_id,
                "name": v.name,
                "frequency_pct": v.frequency_pct,
                "anomaly_rate_pct": v.anomaly_rate_pct,
                "case_count": v.case_count,
                "conformance_score": v.conformance_score,
                "color_category": _color_category(v.anomaly_rate_pct),
            }
            for v in scatter_qs
        ]

        # ---- Variant List (paginated) ----
        list_qs = ProcessVariant.objects.filter(event_log=event_log)

        filter_param = request.query_params.get("filter")
        filter_map = {
            "high_frequency": {"frequency_pct__gte": 20.0},
            "high_conformance": {"conformance_score__gte": 85.0},
            "rare_variants": {"frequency_pct__lt": 5.0},
            "low_conformance": {"conformance_score__lt": 70.0},
        }
        if filter_param and filter_param in filter_map:
            list_qs = list_qs.filter(**filter_map[filter_param])

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
        list_qs = list_qs.order_by(sort_field if order == "asc" else f"-{sort_field}")

        try:
            variant_page = int(request.query_params.get("variant_page", 1))
            variant_page_size = int(request.query_params.get("variant_page_size", 20))
        except ValueError:
            variant_page = 1
            variant_page_size = 20

        paginator = StandardPagePagination()
        paginator.page_size = variant_page_size
        request.query_params._mutable = True
        request.query_params["page"] = variant_page
        request.query_params["page_size"] = variant_page_size
        request.query_params._mutable = False
        page = paginator.paginate_queryset(list_qs, request)
        serializer = VariantListSerializer(page, many=True)
        variants_response = paginator.get_paginated_response(serializer.data)
        variants_data = variants_response.data

        # ---- Anomaly Severity Distribution ----
        severity_dist = get_severity_distribution(event_log, None)

        return Response({
            "summary": {
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
            },
            "frequency_anomaly_scatter": {
                "variants": scatter_data,
                "color_legend": {"low": "<8%", "medium": "8-15%", "high": ">15%"},
            },
            "variants_list": variants_data,
            "anomaly_severity_distribution": severity_dist,
            "anomaly_data_processed": anomaly_data_processed,
            "conformance_recomputed": bool(recompute_conformance),
            "run_id": str(run_id) if run_id else None,
        }, status=status.HTTP_200_OK)
