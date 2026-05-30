from django.urls import path
from .views import (
    PerformanceSummaryView,
    WeeklyTrendsView,
    ActivityRankingView,
    ProcessFlowView,
    PerformanceCasesView,
    PerformanceAnalysisAggregatedView,
)

urlpatterns = [
    path("summary/", PerformanceSummaryView.as_view(), name="performance-summary"),
    path("weekly-trends/", WeeklyTrendsView.as_view(), name="performance-weekly-trends"),
    path("activity-ranking/", ActivityRankingView.as_view(), name="performance-activity-ranking"),
    path("process-flow/", ProcessFlowView.as_view(), name="performance-process-flow"),
    path("cases/", PerformanceCasesView.as_view(), name="performance-cases"),
    path("aggregate/", PerformanceAnalysisAggregatedView.as_view(), name="performance-aggregate"),
]
