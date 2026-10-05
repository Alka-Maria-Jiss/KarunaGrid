from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(APIView):
    """
    List notifications for the authenticated user and provide total unread count.
    Supports optional query parameters:
      - unread_only=true: filters notifications list to only unread items
      - limit=N: limits the number of returned notifications
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        base_qs = Notification.objects.filter(user=request.user).order_by('-created_at')
        unread_count = base_qs.filter(is_read=False).count()

        unread_only = request.query_params.get('unread_only', '').lower() in ('true', '1', 'yes')
        qs = base_qs.filter(is_read=False) if unread_only else base_qs

        limit = request.query_params.get('limit')
        if limit:
            try:
                limit_num = int(limit)
                if limit_num > 0:
                    qs = qs[:limit_num]
            except (ValueError, TypeError):
                pass

        serializer = NotificationSerializer(qs, many=True)

        return Response(
            {
                "unread_count": unread_count,
                "notifications": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class NotificationUnreadCountView(APIView):
    """
    Returns only the unread notification count for the currently authenticated user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        unread_count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response(
            {"unread_count": unread_count},
            status=status.HTTP_200_OK,
        )


class NotificationMarkReadView(APIView):
    """
    Marks a single notification belonging to the authenticated user as read.
    Accepts both PATCH and POST requests.
    """
    permission_classes = [IsAuthenticated]

    def _mark_read(self, request, notification_id):
        notification = Notification.objects.filter(notification_id=notification_id).first()
        if not notification:
            return Response({"detail": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)

        if notification.user != request.user:
            return Response(
                {"detail": "You do not have permission to modify this notification."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not notification.is_read:
            notification.is_read = True
            notification.save(update_fields=['is_read'])

        return Response(
            {
                "message": "Notification marked as read.",
                "notification_id": notification.notification_id,
                "is_read": True,
                "notification": NotificationSerializer(notification).data,
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request, notification_id, *args, **kwargs):
        return self._mark_read(request, notification_id)

    def post(self, request, notification_id, *args, **kwargs):
        return self._mark_read(request, notification_id)


class NotificationMarkAllReadView(APIView):
    """
    Marks all unread notifications belonging to the authenticated user as read.
    Accepts both POST and PATCH requests.
    """
    permission_classes = [IsAuthenticated]

    def _mark_all_read(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"message": "All notifications marked as read."}, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        return self._mark_all_read(request)

    def patch(self, request, *args, **kwargs):
        return self._mark_all_read(request)

