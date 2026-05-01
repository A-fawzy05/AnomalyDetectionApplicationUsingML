from django.urls import path
from .views import (
    VariantSummaryView,
    FrequencyAnomalyScatterView,
    VariantListView,
    VariantDetailView,
    AnomalySeverityDistributionView,
    CaseAnomalySeverityPushView,
)

urlpatterns = [
    path("summary/", VariantSummaryView.as_view(), name="variant-summary"),
    path(
        "frequency-anomaly-scatter/",
        FrequencyAnomalyScatterView.as_view(),
        name="variant-scatter",
    ),
    path("list/", VariantListView.as_view(), name="variant-list"),
    path(
        "<int:variant_id>/detail/",
        VariantDetailView.as_view(),
        name="variant-detail",
    ),
    path(
        "anomaly-severity-distribution/",
        AnomalySeverityDistributionView.as_view(),
        name="variant-severity-distribution",
    ),
    path(
        "anomaly-severity/",
        CaseAnomalySeverityPushView.as_view(),
        name="case-anomaly-severity-push",
    ),
]
