
   
import logging

from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView

from apps.common.utils import error_response
from .models import EventLog
from .serializers import (
    EventLogUploadSerializer,
    EventLogSerializer,
    EventLogStatusSerializer,
)
from .services import process_event_log, _detect_format

logger = logging.getLogger(__name__)

class EventLogUploadView(APIView):

    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        request=EventLogUploadSerializer,
        responses={200: EventLogSerializer, 400: None},
        summary="Upload and process an event log",
        description=(
            "Upload an XES, CSV, or OCEL JSON event log. "
            "The file is parsed and all metrics are precomputed **synchronously** before this call returns. "
            "Returns the full EventLog record including status (READY or FAILED) and computed counts."
        ),
        tags=["Event Logs"],
    )
    def post(self, request: Request) -> Response:
        serializer = EventLogUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response("VALIDATION_ERROR", str(serializer.errors), 400)

        validated = serializer.validated_data
        uploaded_file = validated["file"]
        fmt = _detect_format(uploaded_file.name)

        event_log = EventLog.objects.create(
            name=validated["name"],
            format=fmt,
            file=uploaded_file,
            sla_threshold_days=validated.get("sla_threshold_days"),
        )

        logger.info(
            {
                "event": "upload_received",
                "event_log_id": str(event_log.id),
                "filename": uploaded_file.name,
                "format": fmt,
            }
        )

        event_log = process_event_log(str(event_log.id))

        out_serializer = EventLogSerializer(event_log)
        return Response(out_serializer.data, status=status.HTTP_200_OK)

class EventLogListView(ListAPIView):

    queryset = EventLog.objects.all()
    serializer_class = EventLogSerializer

    @extend_schema(
        summary="List all event logs",
        description="Returns all uploaded event logs ordered by upload time (newest first).",
        tags=["Event Logs"],
    )
    def get(self, request: Request, *args, **kwargs) -> Response:
        return super().get(request, *args, **kwargs)

class EventLogStatusView(APIView):

    @extend_schema(
        responses={200: EventLogStatusSerializer, 404: None},
        summary="Get event log status",
        description="Poll until status is READY or FAILED.",
        tags=["Event Logs"],
    )
    def get(self, request: Request, pk: str) -> Response:
        try:
            event_log = EventLog.objects.get(pk=pk)
        except EventLog.DoesNotExist:
            return error_response(
                "EVENT_LOG_NOT_FOUND",
                f"No event log with id {pk}",
                status.HTTP_404_NOT_FOUND,
            )
        serializer = EventLogStatusSerializer(event_log)
        return Response(serializer.data, status=status.HTTP_200_OK)

class ClearAllDataView(APIView):

    @extend_schema(
        responses={200: None},
        summary="Clear all data (TESTING ONLY)",
        description=(
            "DANGER: This deletes ALL data from the database including event logs, cases, events, "
            "variants, metrics, and anomaly severity data. This endpoint is for testing/development only."
        ),
        tags=["Event Logs"],
    )
    def delete(self, request: Request) -> Response:
        from django.db import transaction
        from apps.event_logs.models import EventLog, P2PCase, P2PEvent
        from apps.performance.models import ActivityMetric, WeeklyMetric
        from apps.variants.models import ProcessVariant, CaseAnomalySeverity

        logger.warning({"event": "clear_all_data_requested"})

        with transaction.atomic():
                                             
            CaseAnomalySeverity.objects.all().delete()
            ActivityMetric.objects.all().delete()
            WeeklyMetric.objects.all().delete()
            ProcessVariant.objects.all().delete()
            P2PEvent.objects.all().delete()
            P2PCase.objects.all().delete()
            EventLog.objects.all().delete()

        logger.info({"event": "clear_all_data_complete"})

        return Response(
            {"message": "All data has been cleared from the database"},
            status=status.HTTP_200_OK,
        )
