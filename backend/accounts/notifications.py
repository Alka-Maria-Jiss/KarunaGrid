import secrets
import string
import logging
from django.conf import settings
from django.core.mail import send_mail, get_connection, EmailMultiAlternatives
from django.utils.html import escape
from notifications.models import Notification
from accounts.models import Role, RegistrationStatus, VerificationStatus

logger = logging.getLogger(__name__)


def robust_send_mail(subject, message, from_email, recipient_list, html_message=None):
    """
    Sends email via configured SMTP. If primary fails (e.g. port 587 STARTTLS blocked/throttled on cloud hosts),
    falls back automatically to direct SSL (port 465) with guaranteed credentials to ensure delivery.
    """
    host_user = getattr(settings, 'EMAIL_HOST_USER', None) or 'karunagrid@gmail.com'
    host_password = getattr(settings, 'EMAIL_HOST_PASSWORD', None) or 'wvzbtqenefwpqvtq'
    from_email = from_email or getattr(settings, 'DEFAULT_FROM_EMAIL', None) or host_user
    timeout = getattr(settings, 'EMAIL_TIMEOUT', 15)

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=recipient_list,
            html_message=html_message,
            fail_silently=False,
        )
        logger.info(f"[Email Success] Sent '{subject}' to {recipient_list} via primary SMTP")
        return True
    except Exception as primary_err:
        logger.warning(f"[Email Warning] Primary SMTP delivery failed ({primary_err}). Trying SSL port 465 fallback...")
        try:
            ssl_conn = get_connection(
                backend='django.core.mail.backends.smtp.EmailBackend',
                host=getattr(settings, 'EMAIL_HOST', 'smtp.gmail.com'),
                port=465,
                username=host_user,
                password=host_password,
                use_tls=False,
                use_ssl=True,
                timeout=timeout,
            )
            msg = EmailMultiAlternatives(
                subject=subject,
                body=message,
                from_email=from_email,
                to=recipient_list,
                connection=ssl_conn,
            )
            if html_message:
                msg.attach_alternative(html_message, "text/html")
            msg.send(fail_silently=False)
            logger.info(f"[Email Success] Sent '{subject}' to {recipient_list} via SSL port 465 fallback")
            return True
        except Exception as fallback_err:
            logger.error(f"[Email Error] All SMTP delivery methods failed for {recipient_list}: {fallback_err}", exc_info=True)
            raise fallback_err



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
    if role == Role.DOCTOR or str(role).capitalize() == 'Doctor':
        role_title = 'Doctor'
        doctor_obj = None
        try:
            doctor_obj = getattr(user, 'doctor', None)
        except Exception:
            pass
        if not doctor_obj:
            from accounts.models import Doctor
            doctor_obj = Doctor.objects.filter(user=user).first()
        name = doctor_obj.name if doctor_obj and doctor_obj.name else 'Doctor'
        greeting = f"Dear Dr. {name},"
        subject = "Your KarunaGrid Doctor Account Has Been Approved"
    elif role == Role.NURSE or str(role).capitalize() == 'Nurse':
        role_title = 'Nurse'
        nurse_obj = None
        try:
            nurse_obj = getattr(user, 'nurse', None)
        except Exception:
            pass
        if not nurse_obj:
            from accounts.models import Nurse
            nurse_obj = Nurse.objects.filter(user=user).first()
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
    robust_send_mail(
        subject=subject,
        message=text_content,
        from_email=from_email,
        recipient_list=[user.email],
        html_message=html_content,
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


def send_caregiver_approval_email(user, caregiver_obj=None, nurse_name=None):
    """
    Sends an approval confirmation email to an approved Caregiver with login and portal instructions.
    """
    if not user or not user.email:
        raise ValueError("A valid user with an email address is required to send caregiver approval email.")

    caregiver_name = caregiver_obj.name if caregiver_obj and caregiver_obj.name else "Caregiver"
    approver_text = f"by Nurse {nurse_name}" if nurse_name else "by the Community Nursing Team"

    subject = "KarunaGrid Caregiver Registration Approved"
    
    text_content = f"""Dear {caregiver_name},

Your caregiver registration for KarunaGrid has been approved {approver_text}.

Username / Email: {user.email}

You can now log in to KarunaGrid and access your caregiver dashboard.

Next Steps:
1. Log in to your KarunaGrid Caregiver Portal at http://localhost:5173/login
2. Review your patient care requests and manage your availability.
3. For security, please update your password after your first login if needed.

If you have any questions, please coordinate with your local community palliative care nurse.

Regards,
KarunaGrid Nursing Team
Community Palliative Care Coordination Platform"""

    html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fff9ef; margin: 0; padding: 20px; color: #1e1b14; }}
.card {{ background-color: #ffffff; max-width: 540px; margin: 0 auto; border-radius: 16px; border: 1px solid #cbc6ba; padding: 32px; box-shadow: 0 4px 16px rgba(100, 94, 69, 0.08); }}
.brand {{ font-size: 22px; font-weight: 800; color: #645e45; margin-bottom: 16px; }}
.badge {{ display: inline-block; padding: 4px 12px; background-color: #d1fae5; color: #065f46; border-radius: 20px; font-size: 12px; font-weight: 700; margin-bottom: 16px; border: 1px solid #a7f3d0; }}
.greeting {{ font-size: 16px; font-weight: 700; color: #1e1b14; margin-bottom: 12px; }}
.message {{ font-size: 14px; line-height: 1.6; color: #4a473d; margin-bottom: 16px; }}
.credentials-box {{ background-color: #faf7f0; border: 1px solid #e0d9cc; border-radius: 12px; padding: 18px 20px; margin: 20px 0; }}
.cred-row {{ margin-bottom: 8px; font-size: 13px; }}
.cred-row:last-child {{ margin-bottom: 0; }}
.cred-label {{ font-weight: 700; color: #7b776c; display: inline-block; width: 140px; }}
.cred-value {{ font-weight: 700; color: #1e1b14; }}
.security-note {{ background-color: #fff8e6; border-left: 4px solid #d99b26; padding: 12px 16px; margin: 20px 0; border-radius: 0 8px 8px 0; font-size: 12px; line-height: 1.5; color: #73510d; }}
.btn {{ display: inline-block; background-color: #645e45; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 13px; margin: 12px 0; }}
.footer {{ font-size: 12px; color: #7b776c; margin-top: 28px; border-top: 1px solid #eee7da; padding-top: 16px; line-height: 1.5; }}
</style>
</head>
<body>
<div class="card">
  <div class="brand">KarunaGrid</div>
  <div class="badge">Caregiver Registration Approved</div>
  <div class="greeting">Dear {escape(caregiver_name)},</div>
  <div class="message">
    Your caregiver registration for KarunaGrid has been approved {escape(approver_text)}.
  </div>
  <div class="credentials-box">
    <div class="cred-row">
      <span class="cred-label">Role:</span>
      <span class="cred-value">Certified Community Caregiver</span>
    </div>
    <div class="cred-row">
      <span class="cred-label">Username:</span>
      <span class="cred-value">{escape(user.email)}</span>
    </div>
    <div class="cred-row">
      <span class="cred-label">Status:</span>
      <span class="cred-value" style="color: #065f46;">Approved & Active</span>
    </div>
  </div>
  <div class="message">
    You can now log in to KarunaGrid, receive patient care assignments, and coordinate palliative support.
  </div>
  <div class="security-note">
    <strong>Security Notice:</strong> For your security, please update your password after your first login.
  </div>
  <div class="footer">
    Regards,<br>
    <strong>KarunaGrid Community Nursing Team</strong><br>
    Community Palliative Care Coordination Platform
  </div>
</div>
</body>
</html>"""

    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'karunagrid@gmail.com')
    try:
        robust_send_mail(
            subject=subject,
            message=text_content,
            from_email=from_email,
            recipient_list=[user.email],
            html_message=html_content,
        )
        logger.info("Caregiver approval email sent successfully to %s", user.email)
        return True
    except Exception as exc:
        logger.warning("Failed to send caregiver approval email to %s: %s", user.email, exc)
        return False


def send_caregiver_rejection_email(user, caregiver_obj=None, rejection_reason="Application did not meet requirements"):
    """
    Sends a polite rejection notification email to a Caregiver applicant.
    """
    if not user or not user.email:
        return False

    caregiver_name = caregiver_obj.name if caregiver_obj and caregiver_obj.name else "Caregiver Applicant"
    subject = "KarunaGrid Caregiver Registration Update"
    text_content = f"""Dear {caregiver_name},

Thank you for your interest in joining KarunaGrid.

After reviewing your caregiver application and documentation, we are unable to approve your account at this time.

Reason for decision: {rejection_reason}

If you believe this was in error or have additional certifications to submit, please contact your local community palliative care coordinator.

Regards,
KarunaGrid Team"""

    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'karunagrid@gmail.com')
    try:
        robust_send_mail(
            subject=subject,
            message=text_content,
            from_email=from_email,
            recipient_list=[user.email],
        )
        return True
    except Exception as exc:
        logger.warning("Failed to send caregiver rejection email to %s: %s", user.email, exc)
        return False
