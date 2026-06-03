from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)


def health_check(request):
    """
    Lightweight liveness/readiness probe endpoint.
    Intentionally does NOT touch the database so a slow/unavailable DB does not
    trigger Kubernetes liveness restarts (DB health is gated by readiness at the
    app level instead). Returns 200 as long as the process can serve requests.
    """
    return JsonResponse({"status": "ok"})


urlpatterns = [
    # Health check (used by Kubernetes probes / load balancers)
    path("health/", health_check, name="health"),
    # OpenAPI schema & docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "api/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
    # Application routes
    path("api/v1/event-logs/", include("apps.event_logs.urls")),
    path("api/v1/performance/", include("apps.performance.urls")),
    path("api/v1/variants/", include("apps.variants.urls")),
]
