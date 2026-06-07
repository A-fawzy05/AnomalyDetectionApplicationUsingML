
   
import logging

from django.db.models import Avg, Count, Q
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.pagination import StandardPagePagination
from apps.common.utils import error_response
from apps.event_logs.models import EventLog, P2PCase, P2PEvent
from apps.performance.models import ActivityMetric, WeeklyMetric
from apps.performance.services.cycle_time import (
    get_average_cycle_time,
    compute_process_efficiency_score,
)
from apps.performance.services.sla import get_sla_compliance_rate
from apps.performance.services.bottleneck import _severity_from_duration
from .serializers import (
    PerformanceSummarySerializer,
    WeeklyTrendsResponseSerializer,
    ActivityRankingResponseSerializer,
    ProcessFlowResponseSerializer,
    CaseDetailSerializer,
)

logger = logging.getLogger(__name__)

P2P_ACTIVITY_ORDER = [
    "Purchase Requisition Creation",
    "Budget Approval",
    "Manager Approval",
    "Purchase Order Creation",
    "Goods Receipt Verification",
    "Invoice Processing",
    "Three-Way Matching",
    "Payment Authorization",
]

SEVERITY_COLOR_MAP = {"low": "green", "medium": "orange", "high": "red"}

def _get_event_log(event_log_id: str) -> EventLog | None:
    try:
        return EventLog.objects.get(pk=event_log_id)
    except EventLog.DoesNotExist:
        return None

class PerformanceSummaryView(APIView):

    @extend_schema(
        parameters=[
            OpenApiParameter("event_log_id", OpenApiTypes.UUID, required=True,
                             description="UUID of the event log to analyse"),
            OpenApiParameter("period", OpenApiTypes.STR, required=False,
                             enum=["7d", "30d", "90d"],
                             description="Comparison period for trend calculation"),
        ],
        responses={200: PerformanceSummarySerializer},
        summary="Performance KPI Summary",
        description="Top-level KPI cards: avg cycle time, throughput, bottleneck count, SLA rate, variance, efficiency.",
        tags=["Performance Analysis"],
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

        logger.info({"event": "performance_summary_request", "event_log_id": event_log_id})

        avg_ct = get_average_cycle_time(event_log) or 0.0

        total_cases = event_log.cases.count()

        bottleneck_count = ActivityMetric.objects.filter(
            event_log=event_log, is_bottleneck=True
        ).count()

        sla_rate = get_sla_compliance_rate(event_log)

        metrics = ActivityMetric.objects.filter(event_log=event_log)
        if metrics.exists():
            avg_variance = sum(m.variance_pct for m in metrics) / metrics.count()
        else:
            avg_variance = 0.0

        efficiency = compute_process_efficiency_score(event_log)

        data = {
            "average_cycle_time": {
                "value": round(avg_ct, 1),
                "unit": "days",
                "change_pct": None,
                "trend": "neutral",
            },
            "processing_throughput": {
                "value": total_cases,
                "unit": "cases/total",
                "change_pct": None,
                "trend": "neutral",
            },
            "bottleneck_count": {
                "value": bottleneck_count,
                "unit": "activities",
                "change_pct": None,
                "trend": "neutral",
            },
            "sla_compliance_rate": {
                "value": round(sla_rate, 1),
                "unit": "%",
                "change_pct": None,
                "trend": "neutral",
            },
            "activity_duration_variance": {
                "value": round(avg_variance, 1),
                "unit": "%",
                "change_pct": None,
                "trend": "neutral",
            },
            "process_efficiency_score": {
                "value": round(efficiency, 1),
                "unit": "/100",
                "change_pct": None,
                "trend": "neutral",
            },
        }
        return Response(data, status=status.HTTP_200_OK)

class WeeklyTrendsView(APIView):

    @extend_schema(
        parameters=[
            OpenApiParameter("event_log_id", OpenApiTypes.UUID, required=True),
            OpenApiParameter("weeks", OpenApiTypes.INT, required=False,
                             description="Number of most-recent weeks to return (default 7)"),
            OpenApiParameter("include_benchmark", OpenApiTypes.BOOL, required=False),
        ],
        responses={200: WeeklyTrendsResponseSerializer},
        summary="Cycle Time Trends & Throughput",
        description="Weekly aggregated throughput and cycle time data for the trend chart.",
        tags=["Performance Analysis"],
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

        try:
            n_weeks = int(request.query_params.get("weeks", 7))
        except ValueError:
            n_weeks = 7

        include_benchmark = request.query_params.get("include_benchmark", "true").lower() == "true"

        weekly_qs = WeeklyMetric.objects.filter(event_log=event_log).order_by("week_start")

        total = weekly_qs.count()
        if total > n_weeks:
            weekly_qs = weekly_qs[total - n_weeks:]

        weeks_data = []
        for w in weekly_qs:
            item = {
                "label": w.week_label,
                "week_start": str(w.week_start),
                "throughput_cases": w.throughput_cases,
                "avg_cycle_time_days": w.avg_cycle_time_days,
                "industry_benchmark_days": w.industry_benchmark_days if include_benchmark else None,
            }
            weeks_data.append(item)

        return Response(
            {"weeks": weeks_data, "benchmark_enabled": include_benchmark},
            status=status.HTTP_200_OK,
        )

class ActivityRankingView(APIView):

    @extend_schema(
        parameters=[
            OpenApiParameter("event_log_id", OpenApiTypes.UUID, required=True),
            OpenApiParameter("limit", OpenApiTypes.INT, required=False,
                             description="Max activities to return (default 10)"),
        ],
        responses={200: ActivityRankingResponseSerializer},
        summary="Activity Performance Ranking",
        description="Activities sorted by avg duration descending with bottleneck flags and recommendations.",
        tags=["Performance Analysis"],
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

        try:
            limit = int(request.query_params.get("limit", 10))
        except ValueError:
            limit = 10

        metrics = ActivityMetric.objects.filter(event_log=event_log).order_by(
            "-avg_duration_days"
        )[:limit]

        activities = []
        for rank, m in enumerate(metrics, start=1):
            activities.append(
                {
                    "rank": rank,
                    "activity_name": m.activity_name,
                    "avg_duration_days": m.avg_duration_days,
                    "min_duration_days": m.min_duration_days,
                    "max_duration_days": m.max_duration_days,
                    "variance_pct": m.variance_pct,
                    "is_bottleneck": m.is_bottleneck,
                    "bottleneck_severity": m.bottleneck_severity,
                    "recommendation": m.recommendation,
                }
            )

        return Response({"activities": activities}, status=status.HTTP_200_OK)

class ProcessFlowView(APIView):

    @extend_schema(
        parameters=[
            OpenApiParameter("event_log_id", OpenApiTypes.UUID, required=True),
        ],
        responses={200: ProcessFlowResponseSerializer},
        summary="Process Flow with Bottleneck Heatmap",
        description="Full ordered P2P stage list with color-coded severity and bottleneck flags.",
        tags=["Performance Analysis"],
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

        from apps.event_logs.models import P2PEvent
        from django.db.models import Count as DjCount
        activity_case_counts = dict(
            P2PEvent.objects.filter(case__event_log=event_log)
            .values("activity")
            .annotate(n=DjCount("case", distinct=True))
            .values_list("activity", "n")
        )

        stages = []
        for step, m in enumerate(
            ActivityMetric.objects.filter(event_log=event_log).order_by("-avg_duration_days"),
            start=1,
        ):
            avg_dur = m.avg_duration_days
            severity = _severity_from_duration(avg_dur)
            cases_processed = activity_case_counts.get(m.activity_name, 0)
            stages.append(
                {
                    "step": step,
                    "activity_name": m.activity_name,
                    "cases_processed": cases_processed,
                    "avg_duration_days": avg_dur,
                    "is_bottleneck": m.is_bottleneck,
                    "severity": severity,
                    "color_code": SEVERITY_COLOR_MAP.get(severity, "green"),
                }
            )

        return Response(
            {
                "stages": stages,
                "severity_legend": {"low": "<5d", "medium": "5-10d", "high": ">10d"},
            },
            status=status.HTTP_200_OK,
        )

class PerformanceCasesView(APIView):

    @extend_schema(
        parameters=[
            OpenApiParameter("event_log_id", OpenApiTypes.UUID, required=True),
            OpenApiParameter("search", OpenApiTypes.STR, required=False),
            OpenApiParameter("status", OpenApiTypes.STR, required=False,
                             enum=["In Progress", "Completed", "Delayed"]),
            OpenApiParameter("sort_by", OpenApiTypes.STR, required=False,
                             enum=["cycle_time", "start_date", "bottleneck_count"]),
            OpenApiParameter("order", OpenApiTypes.STR, required=False,
                             enum=["asc", "desc"]),
            OpenApiParameter("page", OpenApiTypes.INT, required=False),
            OpenApiParameter("page_size", OpenApiTypes.INT, required=False),
        ],
        responses={200: CaseDetailSerializer(many=True)},
        summary="Detailed Performance Metrics Table",
        description="Case-level list with sorting, filtering, search, and pagination.",
        tags=["Performance Analysis"],
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

        qs = P2PCase.objects.filter(event_log=event_log).prefetch_related("events")

        case_status = request.query_params.get("status")
        if case_status:
            qs = qs.filter(status=case_status)

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(Q(case_id__icontains=search) | Q(supplier__icontains=search))

        sort_by = request.query_params.get("sort_by", "cycle_time")
        order = request.query_params.get("order", "desc")
        sort_map = {
            "cycle_time": "cycle_time_days",
            "start_date": "start_date",
        }
        sort_field = sort_map.get(sort_by, "cycle_time_days")
        if order == "asc":
            qs = qs.order_by(sort_field)
        else:
            qs = qs.order_by(f"-{sort_field}")

        paginator = StandardPagePagination()
        page = paginator.paginate_queryset(qs, request)
        serializer = CaseDetailSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

class PerformanceAnalysisAggregatedView(APIView):

    @extend_schema(
        parameters=[
            OpenApiParameter("event_log_id", OpenApiTypes.UUID, required=True),
            OpenApiParameter("period", OpenApiTypes.STR, required=False, enum=["7d", "30d", "90d"]),
            OpenApiParameter("weeks", OpenApiTypes.INT, required=False),
            OpenApiParameter("include_benchmark", OpenApiTypes.BOOL, required=False),
            OpenApiParameter("activity_limit", OpenApiTypes.INT, required=False),
            OpenApiParameter("case_page", OpenApiTypes.INT, required=False),
            OpenApiParameter("case_page_size", OpenApiTypes.INT, required=False),
        ],
        responses={200: None},
        summary="Aggregated Performance Analysis",
        description="Returns all performance analysis data in a single response: summary, weekly trends, activity ranking, process flow, and cases.",
        tags=["Performance Analysis"],
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

        logger.info({"event": "performance_aggregate_request", "event_log_id": event_log_id})

        avg_ct = get_average_cycle_time(event_log) or 0.0
        total_cases = event_log.cases.count()
        bottleneck_count = ActivityMetric.objects.filter(
            event_log=event_log, is_bottleneck=True
        ).count()
        sla_rate = get_sla_compliance_rate(event_log)
        metrics = ActivityMetric.objects.filter(event_log=event_log)
        avg_variance = sum(m.variance_pct for m in metrics) / metrics.count() if metrics.exists() else 0.0
        efficiency = compute_process_efficiency_score(event_log)

        try:
            n_weeks = int(request.query_params.get("weeks", 7))
        except ValueError:
            n_weeks = 7
        include_benchmark = request.query_params.get("include_benchmark", "true").lower() == "true"

        weekly_qs = WeeklyMetric.objects.filter(event_log=event_log).order_by("week_start")
        total = weekly_qs.count()
        if total > n_weeks:
            weekly_qs = weekly_qs[total - n_weeks:]

        weeks_data = []
        for w in weekly_qs:
            weeks_data.append({
                "label": w.week_label,
                "week_start": str(w.week_start),
                "throughput_cases": w.throughput_cases,
                "avg_cycle_time_days": w.avg_cycle_time_days,
                "industry_benchmark_days": w.industry_benchmark_days if include_benchmark else None,
            })

        try:
            activity_limit = int(request.query_params.get("activity_limit", 10))
        except ValueError:
            activity_limit = 10

        metrics_ordered = ActivityMetric.objects.filter(event_log=event_log).order_by(
            "-avg_duration_days"
        )[:activity_limit]

        activities = []
        for rank, m in enumerate(metrics_ordered, start=1):
            activities.append({
                "rank": rank,
                "activity_name": m.activity_name,
                "avg_duration_days": m.avg_duration_days,
                "min_duration_days": m.min_duration_days,
                "max_duration_days": m.max_duration_days,
                "variance_pct": m.variance_pct,
                "is_bottleneck": m.is_bottleneck,
                "bottleneck_severity": m.bottleneck_severity,
                "recommendation": m.recommendation,
            })

        from django.db.models import Count as DjCount
        activity_case_counts = dict(
            P2PEvent.objects.filter(case__event_log=event_log)
            .values("activity")
            .annotate(n=DjCount("case", distinct=True))
            .values_list("activity", "n")
        )

        stages = []
        for step, m in enumerate(
            ActivityMetric.objects.filter(event_log=event_log).order_by("-avg_duration_days"),
            start=1,
        ):
            avg_dur = m.avg_duration_days
            severity = _severity_from_duration(avg_dur)
            cases_processed = activity_case_counts.get(m.activity_name, 0)
            stages.append({
                "step": step,
                "activity_name": m.activity_name,
                "cases_processed": cases_processed,
                "avg_duration_days": avg_dur,
                "is_bottleneck": m.is_bottleneck,
                "severity": severity,
                "color_code": SEVERITY_COLOR_MAP.get(severity, "green"),
            })

        try:
            case_page = int(request.query_params.get("case_page", 1))
            case_page_size = int(request.query_params.get("case_page_size", 20))
        except ValueError:
            case_page = 1
            case_page_size = 20

        cases_qs = P2PCase.objects.filter(event_log=event_log).prefetch_related("events")
        paginator = StandardPagePagination()
        paginator.page_size = case_page_size
        request.query_params._mutable = True
        request.query_params["page"] = case_page
        request.query_params["page_size"] = case_page_size
        request.query_params._mutable = False
        page = paginator.paginate_queryset(cases_qs, request)
        serializer = CaseDetailSerializer(page, many=True)
        cases_response = paginator.get_paginated_response(serializer.data)
        cases_data = cases_response.data

        return Response({
            "summary": {
                "average_cycle_time": {
                    "value": round(avg_ct, 1),
                    "unit": "days",
                    "change_pct": None,
                    "trend": "neutral",
                },
                "processing_throughput": {
                    "value": total_cases,
                    "unit": "cases/total",
                    "change_pct": None,
                    "trend": "neutral",
                },
                "bottleneck_count": {
                    "value": bottleneck_count,
                    "unit": "activities",
                    "change_pct": None,
                    "trend": "neutral",
                },
                "sla_compliance_rate": {
                    "value": round(sla_rate, 1),
                    "unit": "%",
                    "change_pct": None,
                    "trend": "neutral",
                },
                "activity_duration_variance": {
                    "value": round(avg_variance, 1),
                    "unit": "%",
                    "change_pct": None,
                    "trend": "neutral",
                },
                "process_efficiency_score": {
                    "value": round(efficiency, 1),
                    "unit": "/100",
                    "change_pct": None,
                    "trend": "neutral",
                },
            },
            "weekly_trends": {
                "weeks": weeks_data,
                "benchmark_enabled": include_benchmark,
            },
            "activity_ranking": {
                "activities": activities,
            },
            "process_flow": {
                "stages": stages,
                "severity_legend": {"low": "<5d", "medium": "5-10d", "high": ">10d"},
            },
            "cases": cases_data,
        }, status=status.HTTP_200_OK)
