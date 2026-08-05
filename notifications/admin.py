from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('notification_id', 'user', 'type', 'message', 'is_read', 'created_at')
    list_filter = ('is_read', 'type')
    search_fields = ('user__email', 'message')
