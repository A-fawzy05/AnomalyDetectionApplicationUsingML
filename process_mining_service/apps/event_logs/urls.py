from django.urls import path
from .views import EventLogUploadView, EventLogListView, EventLogStatusView

urlpatterns = [
    path("upload/", EventLogUploadView.as_view(), name="event-log-upload"),
    path("", EventLogListView.as_view(), name="event-log-list"),
    path("<uuid:pk>/status/", EventLogStatusView.as_view(), name="event-log-status"),
]
