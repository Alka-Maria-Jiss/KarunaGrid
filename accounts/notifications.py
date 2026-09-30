import secrets
import string
import logging
from django.conf import settings
from django.core.mail import send_mail
from django.utils.html import escape
from notifications.models import Notification
from accounts.models import Role, RegistrationStatus, VerificationStatus

logger = logging.getLogger(__name__)


def generate_temporary_password(length=12):
    """
    Generates a secure temporary password satisfying KarunaGrid password complexity:
    at least 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character.
    """
    specials = "@#$%^&*!_+="
    uppercase = secrets.choice(string.ascii_uppercase)
    lowercase = secrets.choice(string.ascii_lowercase)
    digit = secrets.choice(string.digits)
    special = secrets.choice(specials)

    remaining_length = max(0, length - 4)
    all_chars = string.ascii_letters + string.digits + specials
    remaining = [secrets.choice(all_chars) for _ in range(remaining_length)]

    password_list = [uppercase, lowercase, digit, special] + remaining
    secrets.SystemRandom().shuffle(password_list)
    return "".join(password_list)


def send_staff_approval_email(user, temporary_password):
    """
    Sends an approval email with login credentials and security instructions
    to an approved Doctor or Nurse.
    """
    if not user or not user.email:
        raise ValueError("A valid user with an email address is required to send approval email.")

    # Determine role and staff name
    role = getattr(user, 'role', None)
    if role == Role.DOCTOR or hasattr(user, 'doctor'):
        role_title = 'Doctor'
        doctor_obj = getattr(user, 'doctor', None)
        name = doctor_obj.name if doctor_obj and doctor_obj.name else 'Doctor'
        greeting = f"Dear Dr. {name},"
        subject = "Your KarunaGrid Doctor Account Has Been Approved"
    elif role == Role.NURSE or hasattr(user, 'nurse'):
        role_title = 'Nurse'
        nurse_obj = getattr(user, 'nurse', None)
        name = nurse_obj.name if nurse_obj and nurse_obj.name else 'Nurse'
        greeting = f"Dear Nurse {name},"
        subject = "Your KarunaGrid Nurse Account Has Been Approved"
    else:
        role_title = str(role).title() if role else 'Staff'
        greeting = f"Dear {role_title},"
        subject = f"Your KarunaGrid {role_title} Account Has Been Approved"

    text_content = f"""{greeting}

Your application to join KarunaGrid has been approved by the Administrator.

Your KarunaGrid account details are:

Role: {role_title}
Username: {user.email}
Temporary Password: {temporary_password}

You can now log in to KarunaGrid using the above credentials.

For your security, please update/change your password after your first login. Do not share your password with anyone.

If you did not request this account or believe this email was sent incorrectly, please contact the KarunaGrid Administrator.

Regards,
KarunaGrid Administration"""

    html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fff9ef; margin: 0; padding: 20px; color: #1e1b14; }}
.card {{ background-color: #ffffff; max-width: 540px; margin: 0 auto; border-radius: 16px; border: 1px solid #cbc6ba; padding: 32px; box-shadow: 0 4px 16px rgba(100, 94, 69, 0.08); }}
.brand {{ font-size: 22px; font-weight: 800; color: #645e45; margin-bottom: 16px; }}
.badge {{ display: inline-block; padding: 4px 12px; background-color: #f4ede0; color: #645e45; border-radius: 20px; font-size: 12px; font-weight: 700; margin-bottom: 16px; border: 1px solid #e0d9cc; }}
.greeting {{ font-size: 16px; font-weight: 700; color: #1e1b14; margin-bottom: 12px; }}
.message {{ font-size: 14px; line-height: 1.6; color: #4a473d; margin-bottom: 16px; }}
.credentials-box {{ background-color: #faf7f0; border: 1px solid #e0d9cc; border-radius: 12px; padding: 18px 20px; margin: 20px 0; }}
.cred-row {{ margin-bottom: 8px; font-size: 13px; }}
.cred-row:last-child {{ margin-bottom: 0; }}
.cred-label {{ font-weight: 700; color: #7b776c; display: inline-block; width: 150px; }}
.cred-value {{ font-weight: 700; color: #1e1b14; font-family: 'Courier New', Courier, monospace; }}
.security-note {{ background-color: #fff8e6; border-left: 4px solid #d99b26; padding: 12px 16px; margin: 20px 0; border-radius: 0 8px 8px 0; font-size: 12px; line-height: 1.5; color: #73510d; }}
.footer {{ font-size: 12px; color: #7b776c; margin-top: 28px; border-top: 1px solid #eee7da; padding-top: 16px; line-height: 1.5; }}
</style>
</head>
<body>
<div class="card">
  <div class="brand">KarunaGrid</div>
  <div class="badge">{escape(role_title)} Account Approved</div>
  <div class="greeting">{escape(greeting)}</div>
  <div class="message">
    Your application to join KarunaGrid has been approved by the Administrator.
  </div>
  <div class="credentials-box">
    <div class="cred-row">
      <span class="cred-label">Role:</span>
      <span class="cred-value">{escape(role_title)}</span>
    </div>
    <div class="cred-row">
      <span class="cred-label">Username:</span>
      <span class="cred-value">{escape(user.email)}</span>
    </div>
    <div class="cred-row">
      <span class="cred-label">Temporary Password:</span>
      <span class="cred-value">{escape(temporary_password)}</span>
    </div>
  </div>
  <div class="message">
    You can now log in to KarunaGrid using the above credentials.
  </div>
  <div class="security-note">
    <strong>Security Notice:</strong> For your security, please update/change your password after your first login. Do not share your password with anyone.
  </div>
  <div class="footer">
    If you did not request this account or believe this email was sent incorrectly, please contact the KarunaGrid Administrator.<br><br>
    Regards,<br>
    <strong>KarunaGrid Administration</strong><br>
    Community Palliative Care Coordination Platform
  </div>
</div>
</body>
</html>"""

    print(f"\n==================================================", flush=True)
    print(f"[KARUNAGRID APPROVAL EMAIL] To: {user.email} | Role: {role_title} | Temp Password: {temporary_password}", flush=True)
    print(f"==================================================\n", flush=True)

    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'karunagrid@gmail.com')
    send_mail(
        subject=subject,
        message=text_content,
        from_email=from_email,
        recipient_list=[user.email],
        html_message=html_content,
        fail_silently=False,
    )


def create_status_notification(user, status, role, rejection_reason=None):
    """
    Creates an in-app notification record for Patient, Caregiver, Doctor, or Nurse registration status change.
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
