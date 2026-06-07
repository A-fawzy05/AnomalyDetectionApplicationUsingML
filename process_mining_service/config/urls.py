from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

def health_check(request):
\
\
\
\
\
       
    return JsonResponse({"status": "ok"})

urlpatterns = [
                                                               
    path("health/", health_check, name="health"),
                           
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
                        
    path("api/v1/event-logs/", include("apps.event_logs.urls")),
    path("api/v1/performance/", include("apps.performance.urls")),
    path("api/v1/variants/", include("apps.variants.urls")),
]
