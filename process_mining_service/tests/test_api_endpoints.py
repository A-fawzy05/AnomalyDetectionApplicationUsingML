
   
import uuid
import pytest
from unittest.mock import patch, MagicMock
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

@pytest.fixture
def client():
    return APIClient()

@pytest.fixture
def event_log_id():
    return str(uuid.uuid4())

@pytest.mark.django_db
class TestPerformanceSummaryView:
    def test_missing_event_log_id_returns_400(self, client):
        url = "/api/v1/performance/summary/"
        response = client.get(url)
        assert response.status_code == 400
        assert response.data["error"] == "MISSING_PARAM"

    def test_nonexistent_log_returns_404(self, client, event_log_id):
        url = f"/api/v1/performance/summary/?event_log_id={event_log_id}"
        response = client.get(url)
        assert response.status_code == 404
        assert response.data["error"] == "EVENT_LOG_NOT_FOUND"

    @patch("apps.performance.views.get_average_cycle_time", return_value=18.5)
    @patch("apps.performance.views.get_sla_compliance_rate", return_value=87.3)
    @patch("apps.performance.views.compute_process_efficiency_score", return_value=78.5)
    @patch("apps.performance.views.ActivityMetric.objects.filter")
    @patch("apps.performance.views._get_event_log")
    def test_success_returns_all_kpis(
        self, mock_get_log, mock_filter, mock_efficiency, mock_sla, mock_ct, client, event_log_id
    ):
        mock_event_log = MagicMock()
        mock_event_log.cases.count.return_value = 1247
        mock_get_log.return_value = mock_event_log

        mock_metrics = MagicMock()
        mock_metrics.exists.return_value = True
        mock_metrics.count.return_value = 2
        mock_metrics.__iter__ = MagicMock(
            return_value=iter([MagicMock(variance_pct=30.0), MagicMock(variance_pct=40.0)])
        )
        mock_filter.return_value = mock_metrics

        url = f"/api/v1/performance/summary/?event_log_id={event_log_id}"
        response = client.get(url)
        assert response.status_code == 200
        data = response.data
        assert "average_cycle_time" in data
        assert "sla_compliance_rate" in data
        assert "process_efficiency_score" in data
        assert "bottleneck_count" in data

@pytest.mark.django_db
class TestVariantSummaryView:
    def test_missing_event_log_id_returns_400(self, client):
        response = client.get("/api/v1/variants/summary/")
        assert response.status_code == 400

    def test_nonexistent_log_returns_404(self, client, event_log_id):
        response = client.get(f"/api/v1/variants/summary/?event_log_id={event_log_id}")
        assert response.status_code == 404

    @patch("apps.variants.views._get_event_log")
    @patch("apps.variants.views.ProcessVariant.objects.filter")
    def test_returns_summary_structure(self, mock_filter, mock_get_log, client, event_log_id):
        mock_get_log.return_value = MagicMock()
        mock_qs = MagicMock()
        mock_qs.count.return_value = 5
        mock_qs.order_by.return_value = mock_qs
        mock_qs.first.return_value = MagicMock(
            variant_id=1, frequency_pct=28.5, anomaly_rate_pct=5.0,
            conformance_score=94.0
        )
        mock_qs.__iter__ = MagicMock(return_value=iter([
            MagicMock(conformance_score=94.0),
            MagicMock(conformance_score=88.0),
        ]))
        mock_filter.return_value = mock_qs

        response = client.get(f"/api/v1/variants/summary/?event_log_id={event_log_id}")
        assert response.status_code == 200
        assert "total_variants_detected" in response.data
        assert "conformance_fitness" in response.data

@pytest.mark.django_db
class TestEventLogUploadView:
    def test_upload_missing_file_returns_400(self, client):
        response = client.post(
            "/api/v1/event-logs/upload/",
            {"name": "test log"},
            format="multipart",
        )
        assert response.status_code == 400

    def test_upload_missing_name_returns_400(self, client):
        from django.core.files.uploadedfile import SimpleUploadedFile
        f = SimpleUploadedFile("test.csv", b"case_id,activity,timestamp\n")
        response = client.post(
            "/api/v1/event-logs/upload/",
            {"file": f},
            format="multipart",
        )
        assert response.status_code == 400
