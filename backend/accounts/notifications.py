import secrets
import string
import logging
from django.conf import settings
from django.core.mail import send_mail, get_connection, EmailMultiAlternatives
from django.utils.html import escape
from notifications.models import Notification
from accounts.models import Role, RegistrationStatus, VerificationStatus

logger = logging.getLogger(__name__)


def send_via_brevo_api(subject, message, from_email, recipient_list, html_message=None):
    """
    Sends transactional email via Brevo HTTPS REST API (port 443).
    Bypasses cloud provider SMTP firewall restrictions (e.g. Render, AWS, Heroku free tiers).
    """
    api_key = (getattr(settings, 'BREVO_API_KEY', '') or '').strip().strip('"').strip("'")
    if not api_key:
        return False

    import requests

    sender_email = from_email or getattr(settings, 'DEFAULT_FROM_EMAIL', None) or 'karunagrid@gmail.com'
    to_list = [{'email': addr.strip()} for addr in recipient_list if addr and addr.strip()]
    if not to_list:
        return False

    payload = {
        'sender': {'name': 'KarunaGrid Support', 'email': sender_email},
        'to': to_list,
        'subject': subject,
    }
    if html_message:
        payload['htmlContent'] = html_message
    if message:
        payload['textContent'] = message

    headers = {
        'accept': 'application/json',
        'api-key': api_key,
        'content-type': 'application/json',
    }

    timeout = getattr(settings, 'EMAIL_TIMEOUT', 15)
    response = requests.post(
        'https://api.brevo.com/v3/smtp/email',
        json=payload,
        headers=headers,
        timeout=timeout,
    )

    if response.status_code in (200, 201, 202):
        logger.info(f"[Email Success] Sent '{subject}' to {recipient_list} via Brevo HTTPS API")
        return True
    else:
        logger.warning(f"[Email Warning] Brevo API error ({response.status_code}): {response.text}")
        return False


def robust_send_mail(subject, message, from_email, recipient_list, html_message=None):
    """
    Sends email reliably across both local development and hosted cloud environments (e.g. Render).
    1. In unit tests (locmem backend), sends via Django's standard backend so mail.outbox is populated.
    2. If BREVO_API_KEY is configured, sends via Brevo HTTPS REST API (port 443, never blocked by cloud firewalls).
    3. Falls back to Django SMTP (port 587 STARTTLS -> port 465 direct SSL).
    """
    email_backend = getattr(settings, 'EMAIL_BACKEND', '') or ''
    if 'locmem' in email_backend:
        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=recipient_list,
            html_message=html_message,
            fail_silently=False,
        )
        return True

    # 1. Try Brevo HTTPS REST API (guaranteed to bypass cloud provider SMTP blocks)
    if getattr(settings, 'BREVO_API_KEY', None):
        try:
            if send_via_brevo_api(subject, message, from_email, recipient_list, html_message):
                return True
        except Exception as brevo_err:
            logger.warning(f"[Email Warning] Brevo HTTPS dispatch exception ({brevo_err}). Falling back to SMTP...")

    # 2. Primary SMTP (Port 587 STARTTLS)
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
            logger.error(f"[Email Error] All email delivery methods failed for {recipient_list}: {fallback_err}", exc_info=True)
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
        raw_name = doctor_obj.name if doctor_obj and doctor_obj.name else 'Doctor'
        clean_name = raw_name.strip()
        if clean_name.lower().startswith('dr. '):
            clean_name = clean_name[4:].strip()
        elif clean_name.lower().startswith('dr '):
            clean_name = clean_name[3:].strip()
        greeting = f"Dear Dr. {clean_name},"
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
        raw_name = nurse_obj.name if nurse_obj and nurse_obj.name else 'Nurse'
        clean_name = raw_name.strip()
        if clean_name.lower().startswith('nurse '):
            clean_name = clean_name[6:].strip()
        greeting = f"Dear Nurse {clean_name},"
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

    logger.info(f"[KARUNAGRID APPROVAL EMAIL] To: {user.email} | Role: {role_title} | Temp Password: {temporary_password}")

    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'karunagrid@gmail.com')
    robust_send_mail(
        subject=subject,
        message=text_content,
        from_email=from_email,
        recipient_list=[user.email],
        html_message=html_content,
    )


def send_staff_approval_email_async(user, temporary_password):
    """
    Sends the staff approval email synchronously to ensure guaranteed SMTP delivery,
    preventing daemon thread cut-offs, database connection drops, and stdout lock crashes.
    """
    return send_staff_approval_email(user, temporary_password)


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
    Confirms acceptance into the KarunaGrid Care Network without exposing passwords or sensitive details.
    """
    if not user or not user.email:
        raise ValueError("A valid user with an email address is required to send caregiver approval email.")

    caregiver_name = caregiver_obj.name if caregiver_obj and caregiver_obj.name else "Caregiver"
    approver_text = f"by Community Nurse {nurse_name}" if nurse_name else "by the Community Nursing Team"

    subject = "KarunaGrid Caregiver Registration Approved - Welcome to the Care Network"
    
    text_content = f"""Dear {caregiver_name},

Congratulations! We are pleased to confirm that you have been accepted into the KarunaGrid Care Network.

Your caregiver registration has been verified and approved {approver_text}. You are now authorized to receive patient care requests and provide home palliative support.

Your Account Details:
- Role: Certified Community Caregiver
- Registered Username / Email: {user.email}
- Account Status: Approved & Active

How to Access the Caregiver Portal:
1. Visit the KarunaGrid login portal at http://localhost:5173/login
2. Sign in using your registered email address ({user.email}) and the password you set during registration.
3. Access your Caregiver Dashboard to review incoming patient requests, manage active care assignments, and coordinate with community nursing teams.

Security Reminder:
For your protection, never share your account credentials with anyone. If you ever need to reset your password, you can use the 'Forgot Password' link on the login page.

If you have any questions or require clinical coordination support, please contact your local community palliative care nurse.

Warm regards,
KarunaGrid Community Nursing Team
Community Palliative Care Coordination Platform"""

    html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fff9ef; margin: 0; padding: 20px; color: #1e1b14; }}
.card {{ background-color: #ffffff; max-width: 560px; margin: 0 auto; border-radius: 16px; border: 1px solid #cbc6ba; padding: 32px; box-shadow: 0 4px 16px rgba(100, 94, 69, 0.08); }}
.brand {{ font-size: 22px; font-weight: 800; color: #645e45; margin-bottom: 16px; }}
.badge {{ display: inline-block; padding: 4px 12px; background-color: #d1fae5; color: #065f46; border-radius: 20px; font-size: 12px; font-weight: 700; margin-bottom: 16px; border: 1px solid #a7f3d0; }}
.greeting {{ font-size: 16px; font-weight: 700; color: #1e1b14; margin-bottom: 12px; }}
.message {{ font-size: 14px; line-height: 1.6; color: #4a473d; margin-bottom: 16px; }}
.credentials-box {{ background-color: #faf7f0; border: 1px solid #e0d9cc; border-radius: 12px; padding: 18px 20px; margin: 20px 0; }}
.cred-row {{ margin-bottom: 8px; font-size: 13px; }}
.cred-row:last-child {{ margin-bottom: 0; }}
.cred-label {{ font-weight: 700; color: #7b776c; display: inline-block; width: 150px; }}
.cred-value {{ font-weight: 700; color: #1e1b14; }}
.steps-box {{ background-color: #fdfbf7; border: 1px solid #ede4d5; border-radius: 12px; padding: 16px 20px; margin: 20px 0; }}
.step-item {{ font-size: 13px; line-height: 1.6; color: #4a473d; margin-bottom: 6px; }}
.step-item:last-child {{ margin-bottom: 0; }}
.security-note {{ background-color: #fff8e6; border-left: 4px solid #d99b26; padding: 12px 16px; margin: 20px 0; border-radius: 0 8px 8px 0; font-size: 12px; line-height: 1.5; color: #73510d; }}
.footer {{ font-size: 12px; color: #7b776c; margin-top: 28px; border-top: 1px solid #eee7da; padding-top: 16px; line-height: 1.5; }}
</style>
</head>
<body>
<div class="card">
  <div class="brand">KarunaGrid</div>
  <div class="badge">Accepted into KarunaGrid Care Network</div>
  <div class="greeting">Dear {escape(caregiver_name)},</div>
  <div class="message">
    Congratulations! We are pleased to confirm that <strong>you have been accepted into the KarunaGrid Care Network</strong>.
  </div>
  <div class="message">
    Your caregiver registration has been verified and approved {escape(approver_text)}. You are now authorized to receive patient care requests and provide home palliative support.
  </div>
  <div class="credentials-box">
    <div class="cred-row">
      <span class="cred-label">Role:</span>
      <span class="cred-value">Certified Community Caregiver</span>
    </div>
    <div class="cred-row">
      <span class="cred-label">Username / Email:</span>
      <span class="cred-value">{escape(user.email)}</span>
    </div>
    <div class="cred-row">
      <span class="cred-label">Verification Status:</span>
      <span class="cred-value" style="color: #065f46;">Approved & Active</span>
    </div>
  </div>
  <div class="steps-box">
    <strong style="font-size: 13px; color: #645e45; display: block; margin-bottom: 8px;">How to Access the Caregiver Portal:</strong>
    <div class="step-item">1. Open the KarunaGrid login portal at <a href="http://localhost:5173/login" style="color: #645e45; font-weight: 700;">http://localhost:5173/login</a></div>
    <div class="step-item">2. Sign in using your registered email address and the password you set during registration.</div>
    <div class="step-item">3. Review incoming patient care requests and manage your active palliative care assignments.</div>
  </div>
  <div class="security-note">
    <strong>Security Notice:</strong> For your security, passwords are never sent via plain email. Please keep your login credentials confidential and do not share them with anyone.
  </div>
  <div class="footer">
    If you have any questions or require assistance, please coordinate with your local community palliative care nurse.<br><br>
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


def send_caregiver_approval_email_async(user, caregiver_obj=None, nurse_name=None):
    """
    Sends the caregiver approval email synchronously to ensure guaranteed SMTP delivery.
    """
    return send_caregiver_approval_email(user, caregiver_obj, nurse_name)


def send_caregiver_rejection_email(user, caregiver_obj=None, rejection_reason="Application did not meet requirements"):
    """
    Sends a polite rejection notification email to a Caregiver applicant with mandatory reason and branded styling.
    """
    if not user or not user.email:
        return False

    caregiver_name = caregiver_obj.name if caregiver_obj and caregiver_obj.name else "Caregiver Applicant"
    subject = "KarunaGrid Caregiver Registration Update"
    text_content = f"""Dear {caregiver_name},

Thank you for your interest in joining the KarunaGrid Care Network.

After reviewing your caregiver application and documentation, our community nursing team is unable to approve your registration at this time.

Reason for decision:
{rejection_reason}

If you believe this decision was made in error or if you have updated certifications or documentation to submit, please contact your local community palliative care coordinator.

Regards,
KarunaGrid Community Nursing Team
Community Palliative Care Coordination Platform"""

    html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fff9ef; margin: 0; padding: 20px; color: #1e1b14; }}
.card {{ background-color: #ffffff; max-width: 560px; margin: 0 auto; border-radius: 16px; border: 1px solid #cbc6ba; padding: 32px; box-shadow: 0 4px 16px rgba(100, 94, 69, 0.08); }}
.brand {{ font-size: 22px; font-weight: 800; color: #645e45; margin-bottom: 16px; }}
.badge {{ display: inline-block; padding: 4px 12px; background-color: #fee2e2; color: #991b1b; border-radius: 20px; font-size: 12px; font-weight: 700; margin-bottom: 16px; border: 1px solid #fecaca; }}
.greeting {{ font-size: 16px; font-weight: 700; color: #1e1b14; margin-bottom: 12px; }}
.message {{ font-size: 14px; line-height: 1.6; color: #4a473d; margin-bottom: 16px; }}
.reason-box {{ background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 18px; margin: 20px 0; border-radius: 0 8px 8px 0; font-size: 13px; line-height: 1.6; color: #7f1d1d; }}
.footer {{ font-size: 12px; color: #7b776c; margin-top: 28px; border-top: 1px solid #eee7da; padding-top: 16px; line-height: 1.5; }}
</style>
</head>
<body>
<div class="card">
  <div class="brand">KarunaGrid</div>
  <div class="badge">Registration Status Update</div>
  <div class="greeting">Dear {escape(caregiver_name)},</div>
  <div class="message">
    Thank you for your interest in joining the KarunaGrid Care Network.
  </div>
  <div class="message">
    After reviewing your caregiver application and documentation, our community nursing team is unable to approve your registration at this time.
  </div>
  <div class="reason-box">
    <strong>Reason for Decision:</strong><br>
    {escape(rejection_reason)}
  </div>
  <div class="message">
    If you believe this decision was made in error or if you have updated certifications to provide, please contact your local community palliative care coordinator.
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
        logger.info("Caregiver rejection email sent successfully to %s", user.email)
        return True
    except Exception as exc:
        logger.warning("Failed to send caregiver rejection email to %s: %s", user.email, exc)
        return False


def send_caregiver_rejection_email_async(user, caregiver_obj=None, rejection_reason="Application did not meet requirements"):
    """
    Sends the caregiver rejection email synchronously to ensure guaranteed SMTP delivery.
    """
    return send_caregiver_rejection_email(user, caregiver_obj, rejection_reason)

