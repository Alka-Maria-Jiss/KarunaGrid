from notifications.models import Notification
from accounts.models import RegistrationStatus, VerificationStatus


def create_status_notification(user, status, role, rejection_reason=None):
    """
    Creates an in-app notification record for Patient or Caregiver registration status change.
    Idempotent: prevents duplicate notifications if a notification for this status change already exists.
    """
    if not user:
        return None

    status_str = str(status).strip()
    is_approved = status_str.lower() == 'approved'
    role_title = str(role).capitalize()

    if is_approved:
        message = f"Your KarunaGrid {role_title} registration has been approved. You can now log in and access your dashboard."
    else:
        reason_text = f" Reason: {rejection_reason}" if rejection_reason else ""
        message = f"Your KarunaGrid {role_title} registration was not approved.{reason_text}"

    # Check for duplicate idempotent creation
    existing_notif = Notification.objects.filter(
        user=user,
        type='registration_status',
        message=message
    ).first()
    if existing_notif:
        return existing_notif

    return Notification.objects.create(
        user=user,
        type='registration_status',
        message=message,
        is_read=False
    )
