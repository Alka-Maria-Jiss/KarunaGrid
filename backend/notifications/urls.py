from django.urls import path
from .views import (
    NotificationListView,
    NotificationUnreadCountView,
    NotificationMarkReadView,
    NotificationMarkAllReadView,
)

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification_list'),
    path('unread-count/', NotificationUnreadCountView.as_view(), name='notification_unread_count'),
    path('count/', NotificationUnreadCountView.as_view(), name='notification_count_alias'),
    path('<int:notification_id>/read/', NotificationMarkReadView.as_view(), name='notification_mark_read'),
    path('read-all/', NotificationMarkAllReadView.as_view(), name='notification_mark_all_read'),
]

