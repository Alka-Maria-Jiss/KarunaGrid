from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        notifications = Notification.objects.filter(user=request.user).order_by('-created_at')
        unread_count = notifications.filter(is_read=False).count()
        serializer = NotificationSerializer(notifications, many=True)

        return Response(
            {
                "unread_count": unread_count,
                "notifications": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, notification_id, *args, **kwargs):
        notification = Notification.objects.filter(notification_id=notification_id).first()
        if not notification:
            return Response({"detail": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)

        if notification.user != request.user:
            return Response(
                {"detail": "You do not have permission to modify this notification."},
                status=status.HTTP_403_FORBIDDEN,
            )

        notification.is_read = True
        notification.save()

        return Response(
            {"message": "Notification marked as read.", "notification_id": notification.notification_id},
            status=status.HTTP_200_OK,
        )


class NotificationMarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"message": "All notifications marked as read."}, status=status.HTTP_200_OK)
