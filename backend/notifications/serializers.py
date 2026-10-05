from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source='notification_id', read_only=True)
    recipient_email = serializers.EmailField(source='user.email', read_only=True)
    recipient_role = serializers.CharField(source='user.role', read_only=True)

    class Meta:
        model = Notification
        fields = (
            'notification_id',
            'id',
            'type',
            'message',
            'is_read',
            'created_at',
            'recipient_email',
            'recipient_role',
        )

