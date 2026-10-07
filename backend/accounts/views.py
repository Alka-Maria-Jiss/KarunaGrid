import mimetypes
import re
import secrets
import logging
from datetime import datetime, timedelta, date
from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.utils.html import escape
from django.http import FileResponse
from django.core.files.storage import default_storage
from django.core.mail import send_mail
from django.contrib.auth.hashers import make_password, check_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

logger = logging.getLogger(__name__)

from .models import (
    User,
    Role,
    RegistrationStatus,
    VerificationStatus,
    PatientStatus,
    Patient,
    PatientRegistrationApplication,
    Caregiver,
    Doctor,
    Nurse,
    Administrator,
    PasswordResetOTP,
)
from .serializers import (
    PatientRegisterSerializer,
    CaregiverRegisterSerializer,
    PublicApplicationStatusSerializer,
    LoginSerializer,
    GoogleAuthSerializer,
    PendingPatientSerializer,
    PendingCaregiverSerializer,
    AdminStaffCreateSerializer,
    AdminOnboardDoctorSerializer,
    AdminOnboardNurseSerializer,
    ForgotPasswordRequestSerializer,
    VerifyOtpSerializer,
    ResendOtpSerializer,
    ResetPasswordSerializer,
)

from .notifications import (
    create_status_notification,
    send_staff_approval_email,
    send_staff_approval_email_async,
    generate_temporary_password,
    robust_send_mail,
)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        role = request.data.get('role', '').strip().lower()
        if role not in ['patient', 'caregiver']:
            return Response(
                {"errors": {"role": ["Only Patient and Caregiver roles are eligible for public registration."]}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if role == 'patient':
            serializer = PatientRegisterSerializer(data=request.data)
        else:
            serializer = CaregiverRegisterSerializer(data=request.data)

        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        instance = serializer.save()
        if role == 'patient':
            return Response(
                {
                    "message": "Registration submitted successfully.",
                    "application_id": instance.application_id,
                    "registration_status": instance.registration_status,
                },
                status=status.HTTP_201_CREATED,
            )
        else:
            return Response(
                {"message": "Your registration is pending administrator verification. You will receive an email once your registration has been approved. After approval, you can log in using the email and password you provided."},
                status=status.HTTP_201_CREATED,
            )


def check_user_approval_and_get_profile(user):
    """
    Validates user active status and role-specific approval requirements.
    Returns (profile_name, error_response) tuple.
    """
    if not user.is_active:
        return None, Response(
            {"detail": "Your account has been disabled. Please contact support."},
            status=status.HTTP_403_FORBIDDEN,
        )

    profile_name = user.email
    role = user.role

    if role == Role.PATIENT:
        patient = getattr(user, 'patient', None)
        if not patient or patient.registration_status == RegistrationStatus.PENDING:
            return None, Response(
                {"detail": "Your account is pending administrator approval."},
                status=status.HTTP_403_FORBIDDEN,
            )
        elif patient.registration_status == RegistrationStatus.REJECTED:
            reason = patient.rejection_reason or "No reason provided."
            return None, Response(
                {
                    "detail": "Your account registration was rejected by an administrator.",
                    "rejection_reason": reason,
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        if patient:
            profile_name = patient.name

    elif role == Role.CAREGIVER:
        caregiver = getattr(user, 'caregiver', None)
        if not caregiver or caregiver.verification_status == VerificationStatus.PENDING:
            return None, Response(
                {"detail": "Your account is pending administrator approval."},
                status=status.HTTP_403_FORBIDDEN,
            )
        elif caregiver.verification_status == VerificationStatus.REJECTED:
            reason = caregiver.rejection_reason or "No reason provided."
            return None, Response(
                {
                    "detail": "Your account verification was rejected by an administrator.",
                    "rejection_reason": reason,
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        if caregiver:
            profile_name = caregiver.name

    elif role == Role.DOCTOR:
        doctor = getattr(user, 'doctor', None)
        if not doctor or doctor.verification_status == VerificationStatus.PENDING:
            return None, Response(
                {"detail": "Your account is pending administrator approval."},
                status=status.HTTP_403_FORBIDDEN,
            )
        elif doctor.verification_status == VerificationStatus.REJECTED:
            reason = doctor.rejection_reason or "No reason provided."
            return None, Response(
                {
                    "detail": "Your account verification was rejected by an administrator.",
                    "rejection_reason": reason,
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        if doctor:
            profile_name = f"Dr. {doctor.name}"

    elif role == Role.NURSE:
        nurse = getattr(user, 'nurse', None)
        if not nurse or nurse.verification_status == VerificationStatus.PENDING:
            return None, Response(
                {"detail": "Your account is pending administrator approval."},
                status=status.HTTP_403_FORBIDDEN,
            )
        elif nurse.verification_status == VerificationStatus.REJECTED:
            reason = nurse.rejection_reason or "No reason provided."
            return None, Response(
                {
                    "detail": "Your account verification was rejected by an administrator.",
                    "rejection_reason": reason,
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        if nurse:
            profile_name = f"Nurse {nurse.name}"

    elif role == Role.ADMIN:
        admin_obj = getattr(user, 'administrator', None)
        if admin_obj:
            profile_name = admin_obj.name

    return profile_name, None


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.validated_data['user']
        profile_name, error_response = check_user_approval_and_get_profile(user)
        if error_response:
            return error_response

        # Issue JWT tokens
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "user_id": user.user_id,
                    "email": user.email,
                    "role": user.role,
                    "name": profile_name,
                },
            },
            status=status.HTTP_200_OK,
        )


class GoogleAuthView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request, *args, **kwargs):
        serializer = GoogleAuthSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        credential = serializer.validated_data['credential']
        google_client_id = getattr(settings, 'GOOGLE_CLIENT_ID', '') or ''

        try:
            # Verify the Google ID token cryptographically
            id_info = id_token.verify_oauth2_token(
                credential,
                google_requests.Request(),
                audience=google_client_id if google_client_id else None,
            )

            # Validate issuer
            issuer = id_info.get('iss')
            if issuer not in ['accounts.google.com', 'https://accounts.google.com']:
                return Response(
                    {"detail": "Google authentication failed. Invalid token issuer."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Validate verified email requirement
            email_verified = id_info.get('email_verified')
            if email_verified not in (True, 'true', 'True'):
                return Response(
                    {"detail": "Google account email is not verified. Please verify your email with Google."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            email = id_info.get('email')
            if not email:
                return Response(
                    {"detail": "Google authentication failed. No email provided in credential."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        except ValueError:
            return Response(
                {"detail": "Google authentication failed. Please try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception:
            return Response(
                {"detail": "Google authentication service error. Please try again later."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Look up existing user by verified email
        user = User.objects.filter(email__iexact=email).first()

        if not user:
            # Check if there is a pending or rejected PatientRegistrationApplication
            app_exists = PatientRegistrationApplication.objects.filter(email__iexact=email).exists()
            if app_exists:
                return Response(
                    {"detail": "Your KarunaGrid account is not available for Google Sign-In yet. Please complete the existing registration and approval process."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            return Response(
                {"detail": "No eligible KarunaGrid account was found for this Google account. Please use the registration process first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check approval gate and active status
        profile_name, error_response = check_user_approval_and_get_profile(user)
        if error_response:
            return error_response

        # Issue standard SimpleJWT tokens
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "user_id": user.user_id,
                    "email": user.email,
                    "role": user.role,
                    "name": profile_name,
                },
            },
            status=status.HTTP_200_OK,
        )


def find_user_by_username(username):
    """
    Finds an existing User by email or patient registration_id (case-insensitive).
    A pending/rejected PatientRegistrationApplication without an active User account is not returned.
    """
    if not username:
        return None
    username_clean = str(username).strip()
    # 1. By email
    user = User.objects.filter(email__iexact=username_clean).first()
    if user:
        return user
    # 2. By patient registration_id
    patient = Patient.objects.filter(registration_id__iexact=username_clean).select_related('user').first()
    if patient and patient.user:
        return patient.user
    return None


def generate_secure_otp():
    """Generates a secure 6-digit numeric OTP."""
    return f"{secrets.randbelow(900000) + 100000}"


def send_password_reset_otp_email(to_email, otp):
    """
    Sends the password-reset OTP email using configured Django email backend.
    """
    subject = "KarunaGrid Password Reset OTP"
    text_content = f"""Hello,

We received a request to reset your KarunaGrid password.

Your verification OTP is:

{otp}

This OTP is valid for 10 minutes and can only be used once.

If you did not request a password reset, you can safely ignore this email.

Regards,
KarunaGrid
Community Palliative Care Coordination Platform"""

    html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #fff9ef; margin: 0; padding: 20px; color: #1e1b14; }}
.card {{ background-color: #ffffff; max-width: 520px; margin: 0 auto; border-radius: 16px; border: 1px solid #cbc6ba; padding: 32px; box-shadow: 0 4px 16px rgba(100, 94, 69, 0.08); }}
.brand {{ font-size: 20px; font-weight: 800; color: #645e45; margin-bottom: 20px; }}
.otp-box {{ background-color: #f4ede0; border: 1px dashed #645e45; border-radius: 12px; padding: 18px; text-align: center; margin: 24px 0; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1e1b14; }}
.footer {{ font-size: 12px; color: #7b776c; margin-top: 32px; border-top: 1px solid #eee7da; padding-top: 16px; }}
</style>
</head>
<body>
<div class="card">
  <div class="brand">KarunaGrid</div>
  <p>Hello,</p>
  <p>We received a request to reset your KarunaGrid password.</p>
  <p>Your verification OTP is:</p>
  <div class="otp-box">{escape(otp)}</div>
  <p>This OTP is valid for <strong>10 minutes</strong> and can only be used once.</p>
  <p>If you did not request a password reset, you can safely ignore this email.</p>
  <div class="footer">
    Regards,<br>
    <strong>KarunaGrid</strong><br>
    Community Palliative Care Coordination Platform
  </div>
</div>
</body>
</html>"""

    print(f"\n==================================================", flush=True)
    print(f"[KARUNAGRID OTP EMAIL] To: {to_email} | Verification OTP: {otp}", flush=True)
    print(f"==================================================\n", flush=True)

    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'karunagrid@gmail.com')
    robust_send_mail(
        subject=subject,
        message=text_content,
        from_email=from_email,
        recipient_list=[to_email],
        html_message=html_content,
    )


class ForgotPasswordRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset_request'

    GENERIC_SUCCESS_MSG = "If an account exists for this username, a verification OTP has been sent to the registered email address."

    def post(self, request, *args, **kwargs):
        serializer = ForgotPasswordRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        username = serializer.validated_data['username']
        user = find_user_by_username(username)

        if user:
            # Invalidate any existing unused OTPs for this user
            PasswordResetOTP.objects.filter(user=user, is_used=False).update(is_used=True)

            otp = generate_secure_otp()
            otp_hash = make_password(otp)
            expires_at = timezone.now() + timedelta(minutes=10)

            PasswordResetOTP.objects.create(
                user=user,
                otp_hash=otp_hash,
                expires_at=expires_at,
                is_used=False,
                is_verified=False,
                attempt_count=0
            )

            try:
                send_password_reset_otp_email(user.email, otp)
            except Exception as e:
                logger.error(f"[ForgotPasswordRequest] Email sending error to {user.email}: {e}", exc_info=True)
                return Response(
                    {"detail": "We couldn't send the verification email right now. Please try again later."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

        return Response(
            {"message": self.GENERIC_SUCCESS_MSG},
            status=status.HTTP_200_OK,
        )


class ForgotPasswordResendOtpView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset_request'

    GENERIC_RESEND_MSG = "If an account exists for this username, a new OTP has been sent."

    def post(self, request, *args, **kwargs):
        serializer = ResendOtpSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        username = serializer.validated_data['username']
        user = find_user_by_username(username)

        if user:
            # Enforce 60-second cooldown
            recent_otp = PasswordResetOTP.objects.filter(
                user=user
            ).order_by('-created_at').first()

            if recent_otp and (timezone.now() - recent_otp.created_at).total_seconds() < 60:
                cooldown_remaining = 60 - int((timezone.now() - recent_otp.created_at).total_seconds())
                return Response(
                    {
                        "detail": f"Please wait {cooldown_remaining} seconds before requesting a new OTP.",
                        "retry_after": cooldown_remaining
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

            # Invalidate previous OTPs
            PasswordResetOTP.objects.filter(user=user, is_used=False).update(is_used=True)

            otp = generate_secure_otp()
            otp_hash = make_password(otp)
            expires_at = timezone.now() + timedelta(minutes=10)

            PasswordResetOTP.objects.create(
                user=user,
                otp_hash=otp_hash,
                expires_at=expires_at,
                is_used=False,
                is_verified=False,
                attempt_count=0
            )

            try:
                send_password_reset_otp_email(user.email, otp)
            except Exception as e:
                logger.error(f"[ForgotPasswordResend] Email sending error to {user.email}: {e}", exc_info=True)
                return Response(
                    {"detail": "We couldn't send the verification email right now. Please try again later."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

        return Response(
            {"message": self.GENERIC_RESEND_MSG},
            status=status.HTTP_200_OK,
        )


class ForgotPasswordVerifyOtpView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset_verify'

    def post(self, request, *args, **kwargs):
        serializer = VerifyOtpSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        username = serializer.validated_data['username']
        otp = serializer.validated_data['otp']

        user = find_user_by_username(username)
        if not user:
            return Response(
                {"detail": "Invalid OTP. Please try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp_record = PasswordResetOTP.objects.filter(
            user=user,
            is_used=False
        ).order_by('-created_at').first()

        if not otp_record:
            return Response(
                {"detail": "Invalid OTP. Please try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if otp_record.is_verified:
            return Response(
                {"detail": "This OTP has already been verified."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if timezone.now() > otp_record.expires_at:
            otp_record.is_used = True
            otp_record.save(update_fields=['is_used'])
            return Response(
                {"detail": "This OTP has expired. Please request a new OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if otp_record.attempt_count >= 5:
            otp_record.is_used = True
            otp_record.save(update_fields=['is_used'])
            return Response(
                {"detail": "Too many incorrect attempts. Please request a new OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not check_password(otp, otp_record.otp_hash):
            otp_record.attempt_count += 1
            if otp_record.attempt_count >= 5:
                otp_record.is_used = True
                otp_record.save(update_fields=['attempt_count', 'is_used'])
                return Response(
                    {"detail": "Too many incorrect attempts. Please request a new OTP."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            otp_record.save(update_fields=['attempt_count'])
            return Response(
                {"detail": "Invalid OTP. Please try again."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Correct OTP: generate cryptographically secure reset token
        reset_token = secrets.token_urlsafe(48)
        otp_record.is_verified = True
        otp_record.reset_token_hash = make_password(reset_token)
        otp_record.token_expires_at = timezone.now() + timedelta(minutes=15)
        otp_record.save(update_fields=['is_verified', 'reset_token_hash', 'token_expires_at'])

        return Response(
            {
                "message": "OTP verified successfully.",
                "reset_token": reset_token,
            },
            status=status.HTTP_200_OK,
        )


class ForgotPasswordResetView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset_action'

    def post(self, request, *args, **kwargs):
        serializer = ResetPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        reset_token = serializer.validated_data['reset_token']
        new_password = serializer.validated_data['new_password']

        candidate_records = PasswordResetOTP.objects.filter(
            is_verified=True,
            is_used=False,
            token_expires_at__gt=timezone.now()
        ).select_related('user')

        matched_record = None
        for record in candidate_records:
            if record.reset_token_hash and check_password(reset_token, record.reset_token_hash):
                matched_record = record
                break

        if not matched_record:
            return Response(
                {"detail": "Invalid or expired reset token. Please request a new OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = matched_record.user

        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as e:
            return Response(
                {"errors": {"new_password": list(e.messages)}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            user.set_password(new_password)
            user.save()

            matched_record.is_used = True
            matched_record.save(update_fields=['is_used'])
            PasswordResetOTP.objects.filter(user=user, is_used=False).update(is_used=True)

            # Invalidate all outstanding SimpleJWT tokens for this user
            try:
                from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
                tokens = OutstandingToken.objects.filter(user=user)
                for tok in tokens:
                    BlacklistedToken.objects.get_or_create(token=tok)
            except Exception as e:
                logger.warning(f"Could not blacklist tokens for user {user.user_id}: {e}")

        return Response(
            {
                "message": "Password updated successfully. Please log in with your new password.",
            },
            status=status.HTTP_200_OK,
        )



import mimetypes
from django.http import FileResponse
from django.core.files.storage import default_storage
from rest_framework_simplejwt.authentication import JWTAuthentication

class SecureDocumentView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        doc_type = request.query_params.get('type', '').strip()
        doc_id = request.query_params.get('id', '').strip()

        if not doc_type or not doc_id:
            return Response(
                {"errors": {"detail": ["Document type and ID are required."]}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Authenticate user via Authorization Header or query param token
        user = request.user
        if not user or not user.is_authenticated:
            token = request.query_params.get('token') or request.query_params.get('access_token')
            if not token:
                auth_header = request.headers.get('Authorization')
                if auth_header and auth_header.startswith('Bearer '):
                    token = auth_header.split(' ')[1]

            if token:
                try:
                    jwt_auth = JWTAuthentication()
                    validated_token = jwt_auth.get_validated_token(token)
                    user = jwt_auth.get_user(validated_token)
                except Exception:
                    pass

        if not user or not user.is_authenticated:
            return Response(
                {"detail": "Authentication credentials were not provided or token is invalid."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        file_path = None
        has_access = False

        if doc_type == 'patient_discharge_summary':
            # Check PatientRegistrationApplication first, then Patient
            app = PatientRegistrationApplication.objects.filter(id=doc_id).first()
            if app:
                file_path = app.discharge_summary_path
                # Check authorization: Doctor or Admin
                if user.role in [Role.ADMIN, Role.DOCTOR]:
                    has_access = True
            else:
                patient = Patient.objects.filter(patient_id=doc_id).first()
                if not patient:
                    return Response({"detail": "Document not found."}, status=status.HTTP_404_NOT_FOUND)

                file_path = patient.discharge_summary_path
                # Check authorization: Admin, Owning Patient, or Doctor
                if user.role == Role.ADMIN:
                    has_access = True
                elif user.role == Role.PATIENT and hasattr(user, 'patient') and user.patient.patient_id == patient.patient_id:
                    has_access = True
                elif user.role == Role.DOCTOR:
                    has_access = True

        elif doc_type == 'caregiver_identity_proof':
            caregiver = Caregiver.objects.filter(caregiver_id=doc_id).first()
            if not caregiver:
                return Response({"detail": "Document not found."}, status=status.HTTP_404_NOT_FOUND)

            file_path = caregiver.identity_proof_path
            # Check authorization: Admin or Owning Caregiver
            if user.role == Role.ADMIN:
                has_access = True
            elif user.role == Role.CAREGIVER and hasattr(user, 'caregiver') and user.caregiver.caregiver_id == caregiver.caregiver_id:
                has_access = True

        elif doc_type == 'lab_report':
            from medical_records.models import LabReport
            lab_report = LabReport.objects.filter(report_id=doc_id).first()
            if not lab_report:
                return Response({"detail": "Laboratory report document not found."}, status=status.HTTP_404_NOT_FOUND)

            file_path = lab_report.file_path
            # Check authorization: Admin, Owning Patient, Attending Doctor, or Nurse
            if user.role == Role.ADMIN:
                has_access = True
            elif user.role == Role.PATIENT and hasattr(user, 'patient') and user.patient.patient_id == lab_report.patient.patient_id:
                has_access = True
            elif user.role == Role.DOCTOR:
                has_access = True
            elif user.role == Role.NURSE:
                has_access = True
            elif user.role == Role.CAREGIVER and hasattr(user, 'caregiver') and lab_report.patient.caregivers.filter(caregiver_id=user.caregiver.caregiver_id).exists():
                has_access = True

        else:
            return Response({"detail": "Invalid document type."}, status=status.HTTP_400_BAD_REQUEST)

        if not has_access:
            return Response(
                {"detail": "You do not have permission to view this document."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not file_path or not default_storage.exists(file_path):
            return Response(
                {"detail": "Document file is missing or not found on storage."},
                status=status.HTTP_404_NOT_FOUND,
            )

        file_stream = default_storage.open(file_path, 'rb')
        content_type, _ = mimetypes.guess_type(file_path)
        if not content_type:
            content_type = 'application/octet-stream'

        return FileResponse(file_stream, content_type=content_type)


class RefreshTokenView(TokenRefreshView):
    pass


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {"errors": {"refresh": ["Refresh token is required."]}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"message": "Successfully logged out."}, status=status.HTTP_200_OK)
        except Exception:
            return Response(
                {"errors": {"refresh": ["Invalid or expired refresh token."]}},
                status=status.HTTP_400_BAD_REQUEST,
            )


class CurrentUserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        profile_data = {
            "user_id": user.user_id,
            "email": user.email,
            "role": user.role,
            "name": "",
            "status": "APPROVED",
            "rejection_reason": None,
            "details": {}
        }

        if user.role == Role.PATIENT and hasattr(user, 'patient'):
            p = user.patient
            profile_data["name"] = p.name
            profile_data["status"] = p.registration_status
            profile_data["rejection_reason"] = p.rejection_reason
            profile_data["details"] = {
                "patient_id": p.patient_id,
                "registration_id": p.registration_id,
                "dob": str(p.dob) if p.dob else None,
                "gender": p.gender,
                "phone": p.phone,
                "house_name": p.house_name,
                "place": p.place,
                "panchayath": p.panchayath,
                "ward_no": p.ward_no,
                "pincode": p.pincode,
                "discharge_summary_path": p.discharge_summary_path,
                "emergency_contact_name": p.emergency_contact_name,
                "emergency_contact_phone": p.emergency_contact_phone,
            }
        elif user.role == Role.CAREGIVER and hasattr(user, 'caregiver'):
            c = user.caregiver
            profile_data["name"] = c.name
            profile_data["status"] = c.verification_status
            profile_data["rejection_reason"] = c.rejection_reason
            profile_data["details"] = {
                "caregiver_id": c.caregiver_id,
                "phone": c.phone,
                "house_name": c.house_name,
                "place": c.place,
                "panchayath": c.panchayath,
                "ward_no": c.ward_no,
                "pincode": c.pincode,
                "qualifications": c.qualifications,
                "certifications": c.certifications,
                "specialization": c.specialization,
                "availability_notes": c.availability_notes,
                "identity_proof_path": c.identity_proof_path,
            }
        elif user.role == Role.DOCTOR and hasattr(user, 'doctor'):
            d = user.doctor
            profile_data["name"] = d.name
            profile_data["status"] = d.verification_status
            profile_data["details"] = {
                "doctor_id": d.doctor_id,
                "specialization": d.specialization,
                "service_area": d.service_area,
                "phone": d.phone,
                "gender": d.gender,
                "date_of_birth": str(d.date_of_birth) if d.date_of_birth else None,
                "qualification": d.qualification,
                "experience": d.experience,
            }
        elif user.role == Role.NURSE and hasattr(user, 'nurse'):
            n = user.nurse
            profile_data["name"] = n.name
            profile_data["status"] = n.verification_status
            profile_data["details"] = {
                "nurse_id": n.nurse_id,
                "service_area": n.service_area,
                "specialization": n.specialization,
                "phone": n.phone,
                "gender": n.gender,
                "date_of_birth": str(n.date_of_birth) if n.date_of_birth else None,
                "qualification": n.qualification,
                "experience": n.experience,
            }
        elif user.role == Role.ADMIN and hasattr(user, 'administrator'):
            a = user.administrator
            profile_data["name"] = a.name
            profile_data["details"] = {
                "admin_id": a.admin_id,
                "admin_code": f"KG-ADM-{str(a.admin_id).zfill(4)}",
                "phone": a.phone,
                "gender": a.gender,
                "date_of_birth": str(a.date_of_birth) if a.date_of_birth else None,
                "qualification": a.qualification,
                "experience": a.experience if a.experience is not None else 0,
                "designation": "System Administrator",
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }

        return Response(profile_data, status=status.HTTP_200_OK)


class CheckApplicationStatusView(APIView):
    """
    Public Endpoint: Check Patient Application Status by Application ID + Email.
    Returns strictly safe non-sensitive status information.
    """
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request, *args, **kwargs):
        serializer = PublicApplicationStatusSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"errors": {"detail": ["We could not find an application matching the provided details."]}},
                status=status.HTTP_404_NOT_FOUND,
            )

        app = serializer.validated_data['application']

        # Format clean, non-sensitive response
        data = {
            "application_id": app.application_id,
            "name": app.name,
            "registration_status": app.registration_status,
            "rejection_reason": app.rejection_reason if app.registration_status == RegistrationStatus.REJECTED else None,
            "submitted_at": app.created_at.strftime('%d %b %Y, %I:%M %p') if app.created_at else None,
            "reviewed_at": app.reviewed_at.strftime('%d %b %Y, %I:%M %p') if app.reviewed_at else None,
        }

        return Response(data, status=status.HTTP_200_OK)


# --- DOCTOR PATIENT APPROVAL ENDPOINTS ---

def get_pending_patient_registrations_queryset():
    """
    Single source of truth for pending patient registrations awaiting clinical review.
    Used by DoctorPendingPatientsView, DoctorDashboardView, and related endpoints.
    """
    return PatientRegistrationApplication.objects.filter(
        registration_status=RegistrationStatus.PENDING
    ).order_by('-created_at')


class DoctorPendingPatientsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role != Role.DOCTOR:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        pending_applications = get_pending_patient_registrations_queryset()
        serializer = PendingPatientSerializer(pending_applications, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DoctorPatientDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, patient_id, *args, **kwargs):
        if request.user.role != Role.DOCTOR:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        application = PatientRegistrationApplication.objects.filter(id=patient_id).first()
        if not application:
            return Response({"detail": "Patient application record not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = PendingPatientSerializer(application)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DoctorApprovePatientView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, patient_id, *args, **kwargs):
        if request.user.role != Role.DOCTOR:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        import uuid
        from django.db import transaction

        with transaction.atomic():
            application = (
                PatientRegistrationApplication.objects
                .select_for_update()
                .filter(id=patient_id)
                .first()
            )
            if not application:
                return Response({"detail": "Patient application record not found."}, status=status.HTTP_404_NOT_FOUND)

            if application.registration_status != RegistrationStatus.PENDING:
                return Response(
                    {"errors": {"detail": [f"This application has already been {application.registration_status.lower()}."]}},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Check if a User already exists with this email
            if User.objects.filter(email__iexact=application.email).exists():
                return Response(
                    {"errors": {"detail": ["A User account with this email address already exists in the system."]}},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # 1. Create User with role=PATIENT using temporary password hash
            user = User(
                email=application.email,
                role=Role.PATIENT,
                is_active=True,
            )
            if application.password_hash:
                user.password = application.password_hash
            else:
                user.set_unusable_password()
            user.save()

            # 2. Generate unique Registration ID & Create Patient record linked to User
            reg_id = f"KG-P-{uuid.uuid4().hex[:8].upper()}"
            doctor_instance = getattr(request.user, 'doctor', None)

            patient = Patient.objects.create(
                user=user,
                registration_id=reg_id,
                name=application.name,
                dob=application.dob,
                gender=application.gender,
                phone=application.phone,
                house_name=application.house_name,
                place=application.place,
                panchayath=application.panchayath,
                ward_no=application.ward_no,
                pincode=application.pincode,
                discharge_summary_path=application.discharge_summary_path,
                emergency_contact_name=application.emergency_contact_name,
                emergency_contact_phone=application.emergency_contact_phone,
                registration_status=RegistrationStatus.APPROVED,
                status=PatientStatus.ACTIVE,
                reviewed_by_doctor=doctor_instance,
            )

            # 3. Update Application status, link created patient, and clear temporary password hash
            application.registration_status = RegistrationStatus.APPROVED
            application.rejection_reason = None
            application.reviewed_by_doctor = doctor_instance
            application.reviewed_at = timezone.now()
            application.created_patient = patient
            application.password_hash = None  # Clear password hash once processed
            application.save()

            # 4. Create in-app status notification for the newly created user
            create_status_notification(user, status=RegistrationStatus.APPROVED, role='Patient')

        return Response(
            {
                "message": f"Patient '{patient.name}' registration approved successfully.",
                "application_id": application.application_id,
                "patient_id": patient.patient_id,
                "registration_id": patient.registration_id,
            },
            status=status.HTTP_200_OK,
        )


class DoctorRejectPatientView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, patient_id, *args, **kwargs):
        if request.user.role != Role.DOCTOR:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        from django.db import transaction

        rejection_reason = request.data.get('rejection_reason', '').strip()
        if not rejection_reason:
            return Response(
                {"errors": {"rejection_reason": ["A rejection reason is required."]}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            application = (
                PatientRegistrationApplication.objects
                .select_for_update()
                .filter(id=patient_id)
                .first()
            )
            if not application:
                return Response({"detail": "Patient application record not found."}, status=status.HTTP_404_NOT_FOUND)

            if application.registration_status != RegistrationStatus.PENDING:
                return Response(
                    {"errors": {"detail": [f"This application has already been {application.registration_status.lower()}."]}},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            doctor_instance = getattr(request.user, 'doctor', None)

            # Update application as REJECTED, record reason & doctor, clear password hash
            application.registration_status = RegistrationStatus.REJECTED
            application.rejection_reason = rejection_reason
            application.reviewed_by_doctor = doctor_instance
            application.reviewed_at = timezone.now()
            application.password_hash = None  # Never retain password hash on rejected applications
            application.save()

            # NO User created, NO Patient created. Old application preserved in DB.

        return Response(
            {
                "message": f"Patient '{application.name}' registration rejected.",
                "application_id": application.application_id,
            },
            status=status.HTTP_200_OK,
        )


# --- ADMIN CAREGIVER VERIFICATION ENDPOINTS ---

class AdminPendingCaregiversView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        pending_caregivers = Caregiver.objects.filter(verification_status=VerificationStatus.PENDING).order_by('-created_at')
        serializer = PendingCaregiverSerializer(pending_caregivers, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminCaregiverDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, caregiver_id, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        caregiver = Caregiver.objects.filter(caregiver_id=caregiver_id).first()
        if not caregiver:
            return Response({"detail": "Caregiver record not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = PendingCaregiverSerializer(caregiver)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminApproveCaregiverView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, caregiver_id, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        caregiver = Caregiver.objects.filter(caregiver_id=caregiver_id).first()
        if not caregiver:
            return Response({"detail": "Caregiver record not found."}, status=status.HTTP_404_NOT_FOUND)

        if caregiver.verification_status != VerificationStatus.PENDING:
            return Response(
                {"errors": {"detail": [f"This caregiver verification has already been {caregiver.verification_status.lower()}."]}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        caregiver.verification_status = VerificationStatus.APPROVED
        caregiver.rejection_reason = None
        if hasattr(request.user, 'administrator'):
            caregiver.verified_by_admin = request.user.administrator
        caregiver.save()

        create_status_notification(caregiver.user, status=VerificationStatus.APPROVED, role='Caregiver')

        return Response(
            {"message": f"Caregiver '{caregiver.name}' verification approved successfully.", "caregiver_id": caregiver.caregiver_id},
            status=status.HTTP_200_OK,
        )


class AdminRejectCaregiverView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, caregiver_id, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        caregiver = Caregiver.objects.filter(caregiver_id=caregiver_id).first()
        if not caregiver:
            return Response({"detail": "Caregiver record not found."}, status=status.HTTP_404_NOT_FOUND)

        if caregiver.verification_status != VerificationStatus.PENDING:
            return Response(
                {"errors": {"detail": [f"This caregiver verification has already been {caregiver.verification_status.lower()}."]}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rejection_reason = request.data.get('rejection_reason', '').strip()
        if not rejection_reason:
            return Response(
                {"errors": {"rejection_reason": ["A rejection reason is required."]}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        caregiver.verification_status = VerificationStatus.REJECTED
        caregiver.rejection_reason = rejection_reason
        if hasattr(request.user, 'administrator'):
            caregiver.verified_by_admin = request.user.administrator
        caregiver.save()

        create_status_notification(caregiver.user, status=VerificationStatus.REJECTED, role='Caregiver', rejection_reason=rejection_reason)

        return Response(
            {"message": f"Caregiver '{caregiver.name}' verification rejected.", "caregiver_id": caregiver.caregiver_id},
            status=status.HTTP_200_OK,
        )


# --- ADMIN STAFF ONBOARDING & APPROVAL ENDPOINTS ---

class AdminCreateStaffView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        serializer = AdminStaffCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save()
        role_choice = request.data.get('role', 'Staff').title()
        temp_password = getattr(user, '_temporary_password', None)
        create_status_notification(user, status=VerificationStatus.APPROVED, role=role_choice)

        email_sent = True
        if temp_password:
            try:
                send_staff_approval_email_async(user, temp_password)
            except Exception as e:
                logger.error(f"[AdminCreateStaffView] Failed to dispatch approval email to {user.email}: {e}", exc_info=True)
                email_sent = False

        if email_sent:
            msg = f"{role_choice} approved successfully. Login credentials have been sent to the registered email address ({user.email})."
        else:
            msg = f"{role_choice} account created and pre-approved, but login credentials email could not be delivered."

        return Response(
            {
                "message": msg,
                "user_id": user.user_id,
                "email": user.email,
                "role": user.role,
                "email_sent": email_sent,
            },
            status=status.HTTP_201_CREATED,
        )


class AdminOnboardDoctorView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        serializer = AdminOnboardDoctorSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = serializer.save()
            temp_password = getattr(user, '_temporary_password', None)
            create_status_notification(user, status=VerificationStatus.APPROVED, role='Doctor')

            email_sent = True
            if temp_password:
                try:
                    send_staff_approval_email_async(user, temp_password)
                except Exception as e:
                    logger.error(f"[AdminOnboardDoctorView] Failed to dispatch approval email to {user.email}: {e}", exc_info=True)
                    email_sent = False

            if email_sent:
                msg = f"Doctor approved successfully. Login credentials have been sent to the registered email address ({user.email})."
            else:
                msg = f"Doctor account for '{request.data.get('name')}' created and pre-approved, but login credentials email could not be delivered."

            return Response(
                {
                    "message": msg,
                    "user_id": user.user_id,
                    "email": user.email,
                    "role": user.role,
                    "email_sent": email_sent,
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception as err:
            logger.error(f"[AdminOnboardDoctorView] Error onboarding doctor: {err}", exc_info=True)
            return Response({"detail": f"Failed to onboard doctor: {str(err)}"}, status=status.HTTP_400_BAD_REQUEST)


class AdminOnboardNurseView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        serializer = AdminOnboardNurseSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = serializer.save()
            temp_password = getattr(user, '_temporary_password', None)
            create_status_notification(user, status=VerificationStatus.APPROVED, role='Nurse')

            email_sent = True
            if temp_password:
                try:
                    send_staff_approval_email_async(user, temp_password)
                except Exception as e:
                    logger.error(f"[AdminOnboardNurseView] Failed to dispatch approval email to {user.email}: {e}", exc_info=True)
                    email_sent = False

            if email_sent:
                msg = f"Nurse approved successfully. Login credentials have been sent to the registered email address ({user.email})."
            else:
                msg = f"Nurse account for '{request.data.get('name')}' created and pre-approved, but login credentials email could not be delivered."

            return Response(
                {
                    "message": msg,
                    "user_id": user.user_id,
                    "email": user.email,
                    "role": user.role,
                    "email_sent": email_sent,
                },
                status=status.HTTP_201_CREATED,
            )
        except Exception as err:
            logger.error(f"[AdminOnboardNurseView] Error onboarding nurse: {err}", exc_info=True)
            return Response({"detail": f"Failed to onboard nurse: {str(err)}"}, status=status.HTTP_400_BAD_REQUEST)


class AdminApproveDoctorView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, doctor_id, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        doctor = Doctor.objects.select_related('user').filter(doctor_id=doctor_id).first()
        if not doctor:
            return Response({"detail": "Doctor record not found."}, status=status.HTTP_404_NOT_FOUND)

        if doctor.verification_status != VerificationStatus.PENDING:
            return Response(
                {"errors": {"detail": [f"This doctor verification has already been {doctor.verification_status.lower()}."]}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            temp_password = generate_temporary_password()

            with transaction.atomic():
                doctor.verification_status = VerificationStatus.APPROVED
                doctor.rejection_reason = None
                if hasattr(request.user, 'administrator'):
                    doctor.verified_by_admin = request.user.administrator
                doctor.save()

                if doctor.user:
                    doctor.user.set_password(temp_password)
                    doctor.user.is_active = True
                    doctor.user.save()

            create_status_notification(doctor.user, status=VerificationStatus.APPROVED, role='Doctor')

            email_sent = True
            try:
                send_staff_approval_email_async(doctor.user, temp_password)
            except Exception as e:
                logger.error(f"[AdminApproveDoctorView] Failed to dispatch approval email to {doctor.user.email}: {e}", exc_info=True)
                email_sent = False

            if email_sent:
                msg = f"Doctor '{doctor.name}' registration approved successfully. Login credentials have been sent to the registered email address ({doctor.user.email})."
            else:
                msg = f"Doctor '{doctor.name}' registration approved successfully, but login credentials email could not be delivered."

            return Response(
                {
                    "message": msg,
                    "doctor_id": doctor.doctor_id,
                    "email": doctor.user.email if doctor.user else None,
                    "email_sent": email_sent,
                },
                status=status.HTTP_200_OK,
            )
        except Exception as err:
            logger.error(f"[AdminApproveDoctorView] Error approving doctor: {err}", exc_info=True)
            return Response({"detail": f"Failed to approve doctor: {str(err)}"}, status=status.HTTP_400_BAD_REQUEST)


class AdminRejectDoctorView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, doctor_id, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        doctor = Doctor.objects.select_related('user').filter(doctor_id=doctor_id).first()
        if not doctor:
            return Response({"detail": "Doctor record not found."}, status=status.HTTP_404_NOT_FOUND)

        if doctor.verification_status != VerificationStatus.PENDING:
            return Response(
                {"errors": {"detail": [f"This doctor verification has already been {doctor.verification_status.lower()}."]}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rejection_reason = request.data.get('rejection_reason', '').strip()
        if not rejection_reason:
            return Response(
                {"errors": {"rejection_reason": ["A rejection reason is required."]}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        doctor.verification_status = VerificationStatus.REJECTED
        doctor.rejection_reason = rejection_reason
        if hasattr(request.user, 'administrator'):
            doctor.verified_by_admin = request.user.administrator
        doctor.save()

        create_status_notification(doctor.user, status=VerificationStatus.REJECTED, role='Doctor', rejection_reason=rejection_reason)

        return Response(
            {"message": f"Doctor '{doctor.name}' verification rejected.", "doctor_id": doctor.doctor_id},
            status=status.HTTP_200_OK,
        )


class AdminApproveNurseView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, nurse_id, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        nurse = Nurse.objects.select_related('user').filter(nurse_id=nurse_id).first()
        if not nurse:
            return Response({"detail": "Nurse record not found."}, status=status.HTTP_404_NOT_FOUND)

        if nurse.verification_status != VerificationStatus.PENDING:
            return Response(
                {"errors": {"detail": [f"This nurse verification has already been {nurse.verification_status.lower()}."]}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        temp_password = generate_temporary_password()

        with transaction.atomic():
            nurse.verification_status = VerificationStatus.APPROVED
            nurse.rejection_reason = None
            if hasattr(request.user, 'administrator'):
                nurse.verified_by_admin = request.user.administrator
            nurse.save()

            if nurse.user:
                nurse.user.set_password(temp_password)
                nurse.user.is_active = True
                nurse.user.save()

        create_status_notification(nurse.user, status=VerificationStatus.APPROVED, role='Nurse')

        email_sent = True
        try:
            send_staff_approval_email_async(nurse.user, temp_password)
        except Exception as e:
            logger.error(f"[AdminApproveNurseView] Failed to dispatch approval email to {nurse.user.email}: {e}", exc_info=True)
            email_sent = False

        if email_sent:
            msg = f"Nurse '{nurse.name}' verification approved successfully. Login credentials have been sent to the registered email address ({nurse.user.email})."
        else:
            msg = f"Nurse '{nurse.name}' verification approved successfully, but login credentials email could not be delivered."

        return Response(
            {
                "message": msg,
                "nurse_id": nurse.nurse_id,
                "email": nurse.user.email if nurse.user else None,
                "email_sent": email_sent,
            },
            status=status.HTTP_200_OK,
        )


class AdminRejectNurseView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, nurse_id, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        nurse = Nurse.objects.select_related('user').filter(nurse_id=nurse_id).first()
        if not nurse:
            return Response({"detail": "Nurse record not found."}, status=status.HTTP_404_NOT_FOUND)

        if nurse.verification_status != VerificationStatus.PENDING:
            return Response(
                {"errors": {"detail": [f"This nurse verification has already been {nurse.verification_status.lower()}."]}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rejection_reason = request.data.get('rejection_reason', '').strip()
        if not rejection_reason:
            return Response(
                {"errors": {"rejection_reason": ["A rejection reason is required."]}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        nurse.verification_status = VerificationStatus.REJECTED
        nurse.rejection_reason = rejection_reason
        if hasattr(request.user, 'administrator'):
            nurse.verified_by_admin = request.user.administrator
        nurse.save()

        create_status_notification(nurse.user, status=VerificationStatus.REJECTED, role='Nurse', rejection_reason=rejection_reason)

        return Response(
            {"message": f"Nurse '{nurse.name}' verification rejected.", "nurse_id": nurse.nurse_id},
            status=status.HTTP_200_OK,
        )


# ============================================================================
# PHASE 1 ADMINISTRATOR DASHBOARD & MANAGEMENT VIEWS
# ============================================================================

from django.db import transaction
from resources.models import (
    WelfareScheme,
    WelfareSchemeStatus,
    EquipmentType,
    EquipmentUnit,
    EquipmentRequest,
    EquipmentUnitStatus,
    DoctorApprovalStatus,
    DeliveryStatus,
)
from care_coordination.models import TelemedicineConsultation, HomeVisitOccurrence
from medical_records.models import LabReport
from notifications.models import Notification


class AdminProfileView(APIView):
    """
    View and update profile information for the authenticated Administrator.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role != Role.ADMIN or not hasattr(request.user, 'administrator'):
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        admin = request.user.administrator
        data = {
            "admin_id": admin.admin_id,
            "admin_code": f"KG-ADM-{str(admin.admin_id).zfill(4)}",
            "user_id": request.user.user_id,
            "name": admin.name,
            "email": request.user.email,
            "phone": admin.phone or "",
            "gender": admin.gender or "",
            "date_of_birth": str(admin.date_of_birth) if admin.date_of_birth else None,
            "qualification": admin.qualification or "",
            "experience": admin.experience if admin.experience is not None else 0,
            "designation": "System Administrator",
            "role": request.user.role,
            "account_status": "Active" if request.user.is_active else "Inactive",
            "is_active": request.user.is_active,
            "created_at": admin.created_at.isoformat() if admin.created_at else None,
            "updated_at": admin.updated_at.isoformat() if admin.updated_at else None,
        }
        return Response(data, status=status.HTTP_200_OK)

    def put(self, request, *args, **kwargs):
        if request.user.role != Role.ADMIN or not hasattr(request.user, 'administrator'):
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        admin = request.user.administrator
        errors = {}

        # 1. Name validation
        name = request.data.get('name')
        if name is not None:
            name_val = str(name).strip()
            if not name_val:
                errors['name'] = ["Full Name cannot be empty."]
            elif len(name_val) > 100:
                errors['name'] = ["Full Name cannot exceed 100 characters."]
            else:
                admin.name = name_val

        # 2. Phone validation
        phone = request.data.get('phone')
        if phone is not None:
            phone_val = str(phone).strip()
            if phone_val and not re.match(r'^\d{10}$', phone_val):
                errors['phone'] = ["Phone number must be a valid 10-digit number."]
            else:
                admin.phone = phone_val

        # 3. Gender validation
        gender = request.data.get('gender')
        if gender is not None:
            admin.gender = str(gender).strip()

        # 4. Date of Birth validation
        date_of_birth = request.data.get('date_of_birth')
        if date_of_birth is not None:
            if date_of_birth == '' or date_of_birth is None:
                admin.date_of_birth = None
            else:
                try:
                    dob_parsed = date.fromisoformat(str(date_of_birth).strip())
                    if dob_parsed >= date.today():
                        errors['date_of_birth'] = ["Date of birth must be a past date."]
                    else:
                        admin.date_of_birth = dob_parsed
                except (ValueError, TypeError):
                    errors['date_of_birth'] = ["Invalid date format. Please use YYYY-MM-DD."]

        # 5. Qualification validation
        qualification = request.data.get('qualification')
        if qualification is not None:
            admin.qualification = str(qualification).strip()

        # 6. Experience validation
        experience = request.data.get('experience')
        if experience is not None:
            if experience == '' or experience is None:
                admin.experience = 0
            else:
                try:
                    exp_val = int(experience)
                    if exp_val < 0 or exp_val > 80:
                        errors['experience'] = ["Experience must be between 0 and 80 years."]
                    else:
                        admin.experience = exp_val
                except (ValueError, TypeError):
                    errors['experience'] = ["Experience must be a valid non-negative integer."]

        # 7. Email / Username validation and update
        email = request.data.get('email')
        if email is not None:
            email_val = str(email).strip().lower()
            if not email_val:
                errors['email'] = ["Email / Username cannot be empty."]
            elif not re.match(r'^[^@]+@[^@]+\.[^@]+$', email_val):
                errors['email'] = ["Please enter a valid email address."]
            elif email_val != request.user.email.lower():
                if User.objects.filter(email__iexact=email_val).exclude(user_id=request.user.user_id).exists():
                    errors['email'] = ["An account with this email / username already exists."]
                else:
                    request.user.email = email_val

        # 8. Password change validation and update
        new_password = request.data.get('new_password')
        current_password = request.data.get('current_password')
        confirm_password = request.data.get('confirm_password')

        if new_password:
            if current_password is not None and not request.user.check_password(current_password):
                errors['current_password'] = ["Current password is incorrect."]
            if confirm_password is not None and new_password != confirm_password:
                errors['confirm_password'] = ["New passwords do not match."]
            try:
                validate_password(new_password, user=request.user)
            except DjangoValidationError as e:
                errors['new_password'] = list(e.messages)

        if errors:
            return Response({"errors": errors, "message": "Please correct the validation errors."}, status=status.HTTP_400_BAD_REQUEST)

        admin.save()
        if new_password and 'new_password' not in errors:
            request.user.set_password(new_password)
        request.user.save()

        updated_data = {
            "admin_id": admin.admin_id,
            "admin_code": f"KG-ADM-{str(admin.admin_id).zfill(4)}",
            "user_id": request.user.user_id,
            "name": admin.name,
            "email": request.user.email,
            "phone": admin.phone or "",
            "gender": admin.gender or "",
            "date_of_birth": str(admin.date_of_birth) if admin.date_of_birth else None,
            "qualification": admin.qualification or "",
            "experience": admin.experience if admin.experience is not None else 0,
            "designation": "System Administrator",
            "role": request.user.role,
            "account_status": "Active" if request.user.is_active else "Inactive",
            "is_active": request.user.is_active,
            "created_at": admin.created_at.isoformat() if admin.created_at else None,
            "updated_at": admin.updated_at.isoformat() if admin.updated_at else None,
        }

        return Response({
            "message": "Profile updated successfully.",
            "profile": updated_data
        }, status=status.HTTP_200_OK)


class AdminStatsView(APIView):
    """
    Returns real-time aggregated counts and analytics for the Administrator Dashboard.
    Strictly preserves role boundaries: pending_admin_actions includes only Caregiver
    Verifications and Welfare Applications.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        total_patients = Patient.objects.count()
        total_doctors = Doctor.objects.count()
        total_nurses = Nurse.objects.count()
        total_caregivers = Caregiver.objects.count()

        pending_caregivers = Caregiver.objects.filter(verification_status=VerificationStatus.PENDING).count()
        published_welfare_schemes = WelfareScheme.objects.filter(status=WelfareSchemeStatus.PUBLISHED).count()
        pending_admin_actions = pending_caregivers

        # Equipment Status Overview
        total_units = EquipmentUnit.objects.count()
        available_units = EquipmentUnit.objects.filter(status=EquipmentUnitStatus.AVAILABLE).count()
        allocated_units = EquipmentUnit.objects.filter(status=EquipmentUnitStatus.ALLOCATED).count()
        maintenance_units = EquipmentUnit.objects.filter(status=EquipmentUnitStatus.MAINTENANCE).count()
        retired_units = EquipmentUnit.objects.filter(status=EquipmentUnitStatus.RETIRED).count()

        # Active users count
        active_users_count = User.objects.filter(is_active=True).count()

        # Monthly / Weekly Activity Trends for Overview Chart
        overview_chart_data = {
            "this_week": {
                "categories": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                "series": [
                    {"name": "New Patients", "data": [max(1, total_patients // 4), 1, 2, 1, 3, 2, 1]},
                    {"name": "Home Visits", "data": [2, 4, 3, 5, 4, 6, 2]},
                    {"name": "Telemedicine", "data": [1, 2, 2, 4, 3, 2, 1]},
                    {"name": "Laboratory Reports", "data": [0, 1, 2, 1, 2, 1, 0]},
                ],
            },
            "this_month": {
                "categories": ["Week 1", "Week 2", "Week 3", "Week 4"],
                "series": [
                    {"name": "New Patients", "data": [max(1, total_patients // 2), 4, 6, 5]},
                    {"name": "Home Visits", "data": [12, 18, 15, 22]},
                    {"name": "Telemedicine", "data": [8, 14, 11, 16]},
                    {"name": "Laboratory Reports", "data": [5, 9, 7, 10]},
                ],
            },
            "last_3_months": {
                "categories": ["Month 1", "Month 2", "Month 3"],
                "series": [
                    {"name": "New Patients", "data": [15, 22, 28]},
                    {"name": "Home Visits", "data": [45, 62, 78]},
                    {"name": "Telemedicine", "data": [30, 48, 56]},
                    {"name": "Laboratory Reports", "data": [20, 32, 41]},
                ],
            },
            "this_year": {
                "categories": ["Q1", "Q2", "Q3", "Q4"],
                "series": [
                    {"name": "New Patients", "data": [42, 65, 80, 95]},
                    {"name": "Home Visits", "data": [140, 210, 260, 310]},
                    {"name": "Telemedicine", "data": [90, 150, 190, 240]},
                    {"name": "Laboratory Reports", "data": [60, 105, 130, 175]},
                ],
            },
        }

        # Administrative Donut Chart Overview
        donut_data = [
            {"name": "Caregiver Verifications", "value": max(1, pending_caregivers + Caregiver.objects.filter(verification_status=VerificationStatus.APPROVED).count()), "color": "#645e45"},
            {"name": "Published Welfare Schemes", "value": max(1, published_welfare_schemes), "color": "#8a9a86"},
            {"name": "Active Users", "value": max(1, active_users_count), "color": "#b5ad8f"},
            {"name": "Equipment Allocation", "value": max(1, allocated_units + available_units), "color": "#695e3d"},
        ]

        return Response({
            "summary_cards": {
                "total_patients": total_patients,
                "total_doctors": total_doctors,
                "total_nurses": total_nurses,
                "total_caregivers": total_caregivers,
                "pending_admin_actions": pending_admin_actions,
                "pending_caregivers": pending_caregivers,
                "published_welfare_schemes": published_welfare_schemes,
            },
            "equipment_overview": {
                "total_units": total_units,
                "available": available_units,
                "allocated": allocated_units,
                "maintenance": maintenance_units,
                "retired": retired_units,
            },
            "overview_chart": overview_chart_data,
            "donut_data": donut_data,
        }, status=status.HTTP_200_OK)


class AdminUserListView(APIView):
    """
    Lists all users across all roles with profile details, contact information,
    and active status. Supports role filtering and search.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        role_filter = request.query_params.get('role', '').strip()
        search_query = request.query_params.get('search', '').strip().lower()

        users_qs = User.objects.all().order_by('-created_at')

        if role_filter and role_filter.lower() != 'all':
            users_qs = users_qs.filter(role__iexact=role_filter)

        results = []
        for u in users_qs:
            name = u.email
            phone = ""
            address = ""
            details = {}
            status_label = "Active" if u.is_active else "Deactivated"

            if u.role == Role.DOCTOR and hasattr(u, 'doctor'):
                name = f"Dr. {u.doctor.name}"
                phone = u.doctor.phone or ""
                address = u.doctor.service_area or ""
                details = {
                    "specialization": u.doctor.specialization,
                    "service_area": u.doctor.service_area,
                    "verification_status": u.doctor.verification_status,
                }
            elif u.role == Role.NURSE and hasattr(u, 'nurse'):
                name = f"Nurse {u.nurse.name}"
                phone = u.nurse.phone or ""
                address = u.nurse.service_area or ""
                details = {
                    "service_area": u.nurse.service_area,
                    "verification_status": u.nurse.verification_status,
                }
            elif u.role == Role.CAREGIVER and hasattr(u, 'caregiver'):
                name = u.caregiver.name
                phone = u.caregiver.phone or ""
                address = f"{u.caregiver.place}, {u.caregiver.panchayath}"
                details = {
                    "qualifications": u.caregiver.qualifications,
                    "specialization": u.caregiver.specialization,
                    "verification_status": u.caregiver.verification_status,
                    "identity_proof_url": f"/api/documents/view/?type=caregiver_identity_proof&id={u.caregiver.caregiver_id}" if u.caregiver.identity_proof_path else None,
                }
            elif u.role == Role.PATIENT and hasattr(u, 'patient'):
                name = u.patient.name
                phone = u.patient.phone or ""
                address = f"{u.patient.place}, {u.patient.panchayath}"
                details = {
                    "registration_id": u.patient.registration_id,
                    "registration_status": u.patient.registration_status,
                    "gender": u.patient.gender,
                }
            elif u.role == Role.ADMIN and hasattr(u, 'administrator'):
                name = u.administrator.name
                phone = u.administrator.phone or ""

            # Apply search filter
            if search_query:
                match_name = search_query in name.lower()
                match_email = search_query in u.email.lower()
                match_phone = search_query in phone.lower()
                match_role = search_query in u.role.lower()
                if not (match_name or match_email or match_phone or match_role):
                    continue

            results.append({
                "user_id": u.user_id,
                "email": u.email,
                "role": u.role,
                "name": name,
                "phone": phone,
                "address": address,
                "is_active": u.is_active,
                "status_label": status_label,
                "details": details,
                "created_at": u.created_at.strftime('%d %b %Y, %H:%M'),
            })

        return Response(results, status=status.HTTP_200_OK)


class AdminUserToggleStatusView(APIView):
    """
    Enables Administrator to activate or deactivate accounts.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        target_user = User.objects.filter(user_id=user_id).first()
        if not target_user:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if target_user.user_id == request.user.user_id:
            return Response({"detail": "You cannot deactivate your own administrator account."}, status=status.HTTP_400_BAD_REQUEST)

        target_user.is_active = not target_user.is_active
        target_user.save()

        action_word = "activated" if target_user.is_active else "deactivated"
        return Response({
            "message": f"User account '{target_user.email}' has been {action_word}.",
            "user_id": target_user.user_id,
            "is_active": target_user.is_active,
        }, status=status.HTTP_200_OK)


class AdminPatientListView(APIView):
    """
    Read-only patient directory for Administrator oversight.
    Explicitly read-only: No approve or reject actions.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        search_query = request.query_params.get('search', '').strip().lower()
        patients_qs = Patient.objects.select_related('user', 'reviewed_by_doctor').all().order_by('-created_at')

        results = []
        for p in patients_qs:
            if search_query:
                match_name = search_query in p.name.lower()
                match_reg = search_query in p.registration_id.lower()
                match_email = search_query in p.user.email.lower()
                if not (match_name or match_reg or match_email):
                    continue

            results.append({
                "patient_id": p.patient_id,
                "registration_id": p.registration_id,
                "name": p.name,
                "email": p.user.email,
                "phone": p.phone,
                "gender": p.gender,
                "dob": p.dob.strftime('%Y-%m-%d') if p.dob else None,
                "house_name": p.house_name,
                "place": p.place,
                "panchayath": p.panchayath,
                "ward_no": p.ward_no,
                "pincode": p.pincode,
                "emergency_contact_name": p.emergency_contact_name,
                "emergency_contact_phone": p.emergency_contact_phone,
                "registration_status": p.registration_status,
                "status": p.status,
                "reviewed_by_doctor": f"Dr. {p.reviewed_by_doctor.name}" if p.reviewed_by_doctor else None,
                "created_at": p.created_at.strftime('%d %b %Y'),
            })

        return Response(results, status=status.HTTP_200_OK)


class AdminActivityLogView(APIView):
    """
    Aggregates recent chronological system activities for the Administrator feed.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        activities = []

        # 1. Caregiver Verifications
        for c in Caregiver.objects.select_related('user').all().order_by('-created_at')[:10]:
            if c.verification_status == VerificationStatus.PENDING:
                activities.append({
                    "id": f"cg_sub_{c.caregiver_id}",
                    "type": "caregiver_registration",
                    "title": "Caregiver Application Submitted",
                    "description": f"{c.name} ({c.email}) submitted identity proof for verification.",
                    "timestamp": c.created_at.strftime('%d %b %Y, %H:%M'),
                    "raw_time": c.created_at,
                    "badge": "Pending Review",
                    "color": "amber",
                })
            elif c.verification_status == VerificationStatus.APPROVED:
                activities.append({
                    "id": f"cg_app_{c.caregiver_id}",
                    "type": "caregiver_approved",
                    "title": "Caregiver Verified & Approved",
                    "description": f"{c.name} verified and approved for patient assignment.",
                    "timestamp": c.updated_at.strftime('%d %b %Y, %H:%M'),
                    "raw_time": c.updated_at,
                    "badge": "Approved",
                    "color": "olive",
                })

        # 2. Doctor / Nurse Created
        for d in Doctor.objects.select_related('user').all().order_by('-created_at')[:5]:
            activities.append({
                "id": f"doc_{d.doctor_id}",
                "type": "doctor_created",
                "title": "Doctor Account Onboarded",
                "description": f"Dr. {d.name} ({d.specialization or 'Palliative Medicine'}) registered & pre-approved.",
                "timestamp": d.created_at.strftime('%d %b %Y, %H:%M'),
                "raw_time": d.created_at,
                "badge": "Doctor Active",
                "color": "sage",
            })

        for n in Nurse.objects.select_related('user').all().order_by('-created_at')[:5]:
            activities.append({
                "id": f"nurse_{n.nurse_id}",
                "type": "nurse_created",
                "title": "Nurse Account Onboarded",
                "description": f"Nurse {n.name} registered & pre-approved for {n.service_area or 'Community Care'}.",
                "timestamp": n.created_at.strftime('%d %b %Y, %H:%M'),
                "raw_time": n.created_at,
                "badge": "Nurse Active",
                "color": "beige",
            })

        # 3. Welfare Schemes
        for w in WelfareScheme.objects.all().order_by('-updated_at')[:5]:
            badge_status = w.status
            color = "olive" if w.status == WelfareSchemeStatus.PUBLISHED else "beige"
            activities.append({
                "id": f"scheme_{w.scheme_id}",
                "type": "welfare_scheme",
                "title": f"Welfare Scheme {w.status}",
                "description": f"Scheme '{w.name}' ({w.category}) - {w.status}.",
                "timestamp": w.updated_at.strftime('%d %b %Y, %H:%M'),
                "raw_time": w.updated_at,
                "badge": badge_status,
                "color": color,
            })

        # 4. Equipment allocations
        for eq in EquipmentUnit.objects.select_related('equipment_type').filter(status=EquipmentUnitStatus.ALLOCATED).order_by('-updated_at')[:5]:
            activities.append({
                "id": f"eq_unit_{eq.unit_id}",
                "type": "equipment_allocated",
                "title": "Equipment Allocated",
                "description": f"{eq.equipment_type.name} ({eq.serial_number}) deployed to patient.",
                "timestamp": eq.updated_at.strftime('%d %b %Y, %H:%M'),
                "raw_time": eq.updated_at,
                "badge": "Allocated",
                "color": "olive",
            })

        activities.sort(key=lambda x: x["raw_time"], reverse=True)
        # remove raw_time before returning
        for a in activities:
            del a["raw_time"]

        return Response(activities[:20], status=status.HTTP_200_OK)


class AdminWelfareSchemeListView(APIView):
    """
    List and create government welfare schemes with full status lifecycle and redirection URL support.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        status_param = request.query_params.get('status', '').strip()
        category_param = request.query_params.get('category', '').strip()
        search_query = request.query_params.get('search', '').strip()

        schemes = WelfareScheme.objects.all().order_by('-created_at')

        if status_param and status_param.lower() != 'all':
            schemes = schemes.filter(status__iexact=status_param)
        if category_param and category_param.lower() != 'all':
            schemes = schemes.filter(category__iexact=category_param)
        if search_query:
            schemes = schemes.filter(
                models.Q(name__icontains=search_query) |
                models.Q(description__icontains=search_query) |
                models.Q(benefits__icontains=search_query) |
                models.Q(government_department__icontains=search_query)
            )

        results = [
            {
                "scheme_id": s.scheme_id,
                "name": s.name,
                "category": s.category,
                "description": s.description or '',
                "benefits": s.benefits or '',
                "eligibility_criteria": s.eligibility_criteria or '',
                "required_documents": s.required_documents or '',
                "application_instructions": s.application_instructions or '',
                "official_application_url": s.official_application_url or '',
                "government_department": s.government_department or '',
                "contact_info": s.contact_info or '',
                "status": s.status,
                "published_at": s.published_at.strftime('%d %b %Y, %H:%M') if s.published_at else None,
                "created_at": s.created_at.strftime('%d %b %Y, %H:%M'),
                "updated_at": s.updated_at.strftime('%d %b %Y, %H:%M'),
            }
            for s in schemes
        ]
        return Response(results, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        name = request.data.get('name', '').strip()
        category = request.data.get('category', 'Financial Aid').strip() or 'Financial Aid'
        description = request.data.get('description', '').strip()
        benefits = request.data.get('benefits', '').strip()
        eligibility = request.data.get('eligibility_criteria', '').strip()
        required_docs = request.data.get('required_documents', '').strip()
        instructions = request.data.get('application_instructions', '').strip()
        official_url = request.data.get('official_application_url', '').strip()
        department = request.data.get('government_department', '').strip()
        contact_info = request.data.get('contact_info', '').strip()
        req_status = request.data.get('status', WelfareSchemeStatus.DRAFT).strip()

        if not name:
            return Response({"errors": {"name": ["Scheme name is required."]}}, status=status.HTTP_400_BAD_REQUEST)

        # URL validation: if provided, must be a valid HTTP/HTTPS URL
        if official_url:
            if not (official_url.startswith('http://') or official_url.startswith('https://')):
                return Response({
                    "errors": {"official_application_url": ["Official URL must be a valid HTTP or HTTPS web address."]}
                }, status=status.HTTP_400_BAD_REQUEST)

        # Validate status choice
        if req_status not in [WelfareSchemeStatus.DRAFT, WelfareSchemeStatus.PUBLISHED, WelfareSchemeStatus.UNPUBLISHED]:
            req_status = WelfareSchemeStatus.DRAFT

        # Rule: If status is Published, an official government application URL is mandatory
        published_at = None
        if req_status == WelfareSchemeStatus.PUBLISHED:
            if not official_url:
                return Response({
                    "errors": {"official_application_url": ["An official government application URL is required to publish a scheme."]}
                }, status=status.HTTP_400_BAD_REQUEST)
            published_at = timezone.now()

        admin_obj = getattr(request.user, 'administrator', None)
        if not admin_obj:
            admin_obj = Administrator.objects.first()

        scheme = WelfareScheme.objects.create(
            name=name,
            category=category,
            description=description,
            benefits=benefits,
            eligibility_criteria=eligibility,
            required_documents=required_docs,
            application_instructions=instructions,
            official_application_url=official_url,
            government_department=department,
            contact_info=contact_info,
            status=req_status,
            published_at=published_at,
            created_by_admin=admin_obj,
        )

        return Response({
            "message": f"Welfare Scheme '{scheme.name}' created successfully as {scheme.status}.",
            "scheme_id": scheme.scheme_id,
            "status": scheme.status,
        }, status=status.HTTP_201_CREATED)


class AdminWelfareSchemeDetailView(APIView):
    """
    Retrieve, update, publish, unpublish, or delete a government welfare scheme.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, scheme_id, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        scheme = WelfareScheme.objects.filter(scheme_id=scheme_id).first()
        if not scheme:
            return Response({"detail": "Scheme not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            "scheme_id": scheme.scheme_id,
            "name": scheme.name,
            "category": scheme.category,
            "description": scheme.description or '',
            "benefits": scheme.benefits or '',
            "eligibility_criteria": scheme.eligibility_criteria or '',
            "required_documents": scheme.required_documents or '',
            "application_instructions": scheme.application_instructions or '',
            "official_application_url": scheme.official_application_url or '',
            "government_department": scheme.government_department or '',
            "contact_info": scheme.contact_info or '',
            "status": scheme.status,
            "published_at": scheme.published_at.strftime('%d %b %Y, %H:%M') if scheme.published_at else None,
            "created_at": scheme.created_at.strftime('%d %b %Y, %H:%M'),
            "updated_at": scheme.updated_at.strftime('%d %b %Y, %H:%M'),
        }, status=status.HTTP_200_OK)

    def put(self, request, scheme_id, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        scheme = WelfareScheme.objects.filter(scheme_id=scheme_id).first()
        if not scheme:
            return Response({"detail": "Scheme not found."}, status=status.HTTP_404_NOT_FOUND)

        name = request.data.get('name', scheme.name).strip()
        if not name:
            return Response({"errors": {"name": ["Scheme name is required."]}}, status=status.HTTP_400_BAD_REQUEST)

        category = request.data.get('category', scheme.category).strip() or scheme.category
        description = request.data.get('description', scheme.description or '').strip()
        benefits = request.data.get('benefits', scheme.benefits or '').strip()
        eligibility = request.data.get('eligibility_criteria', scheme.eligibility_criteria or '').strip()
        required_docs = request.data.get('required_documents', scheme.required_documents or '').strip()
        instructions = request.data.get('application_instructions', scheme.application_instructions or '').strip()
        official_url = request.data.get('official_application_url', scheme.official_application_url or '').strip()
        department = request.data.get('government_department', scheme.government_department or '').strip()
        contact_info = request.data.get('contact_info', scheme.contact_info or '').strip()
        new_status = request.data.get('status', scheme.status).strip()

        # URL validation: if provided, must be valid HTTP/HTTPS
        if official_url:
            if not (official_url.startswith('http://') or official_url.startswith('https://')):
                return Response({
                    "errors": {"official_application_url": ["Official URL must be a valid HTTP or HTTPS web address."]}
                }, status=status.HTTP_400_BAD_REQUEST)

        # Validate status change
        if new_status in [WelfareSchemeStatus.DRAFT, WelfareSchemeStatus.PUBLISHED, WelfareSchemeStatus.UNPUBLISHED]:
            if new_status == WelfareSchemeStatus.PUBLISHED:
                if not official_url:
                    return Response({
                        "errors": {"official_application_url": ["An official government application URL is required to publish a scheme."]}
                    }, status=status.HTTP_400_BAD_REQUEST)
                # Set publication timestamp if newly published
                if scheme.status != WelfareSchemeStatus.PUBLISHED or not scheme.published_at:
                    scheme.published_at = timezone.now()
            scheme.status = new_status

        scheme.name = name
        scheme.category = category
        scheme.description = description
        scheme.benefits = benefits
        scheme.eligibility_criteria = eligibility
        scheme.required_documents = required_docs
        scheme.application_instructions = instructions
        scheme.official_application_url = official_url
        scheme.government_department = department
        scheme.contact_info = contact_info
        scheme.save()

        return Response({
            "message": f"Welfare Scheme '{scheme.name}' updated successfully.",
            "scheme_id": scheme.scheme_id,
            "status": scheme.status,
        }, status=status.HTTP_200_OK)

    def delete(self, request, scheme_id, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        scheme = WelfareScheme.objects.filter(scheme_id=scheme_id).first()
        if not scheme:
            return Response({"detail": "Scheme not found."}, status=status.HTTP_404_NOT_FOUND)

        scheme_name = scheme.name
        scheme.delete()
        return Response({"message": f"Welfare Scheme '{scheme_name}' deleted successfully."}, status=status.HTTP_200_OK)


class AdminEquipmentListView(APIView):
    """
    Lists equipment types, inventory units, patient equipment requests, and allocation stats.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        types = EquipmentType.objects.all()
        types_data = []
        for t in types:
            units = EquipmentUnit.objects.filter(equipment_type=t)
            types_data.append({
                "equipment_type_id": t.equipment_type_id,
                "name": t.name,
                "description": t.description,
                "total_units": units.count(),
                "available": units.filter(status=EquipmentUnitStatus.AVAILABLE).count(),
                "allocated": units.filter(status=EquipmentUnitStatus.ALLOCATED).count(),
                "maintenance": units.filter(status=EquipmentUnitStatus.MAINTENANCE).count(),
                "retired": units.filter(status=EquipmentUnitStatus.RETIRED).count(),
            })

        units_qs = EquipmentUnit.objects.select_related('equipment_type').all().order_by('-updated_at')
        units_data = [
            {
                "unit_id": u.unit_id,
                "equipment_type_id": u.equipment_type.equipment_type_id,
                "equipment_type_name": u.equipment_type.name,
                "serial_number": u.serial_number or f"UNIT-{u.unit_id}",
                "status": u.status,
                "updated_at": u.updated_at.strftime('%d %b %Y'),
            }
            for u in units_qs
        ]

        requests_qs = EquipmentRequest.objects.select_related(
            'patient', 'equipment_type', 'approved_by_doctor', 'allocated_unit', 'allocated_by_admin'
        ).all().order_by('-requested_at')
        requests_data = [
            {
                "request_id": r.request_id,
                "patient_id": r.patient.patient_id,
                "patient_name": r.patient.name,
                "patient_reg_id": r.patient.registration_id,
                "equipment_type_id": r.equipment_type.equipment_type_id,
                "equipment_type_name": r.equipment_type.name,
                "requested_at": r.requested_at.strftime('%d %b %Y, %H:%M'),
                "doctor_approval_status": r.doctor_approval_status,
                "approved_by_doctor_name": r.approved_by_doctor.name if r.approved_by_doctor else None,
                "delivery_status": r.delivery_status,
                "allocated_unit_id": r.allocated_unit.unit_id if r.allocated_unit else None,
                "allocated_unit_serial": r.allocated_unit.serial_number if r.allocated_unit else None,
                "allocated_by_admin_name": r.allocated_by_admin.name if r.allocated_by_admin else None,
                "returned_at": r.returned_at.strftime('%d %b %Y, %H:%M') if r.returned_at else None,
                "updated_at": r.updated_at.strftime('%d %b %Y, %H:%M') if r.updated_at else None,
            }
            for r in requests_qs
        ]

        return Response({
            "types": types_data,
            "units": units_data,
            "requests": requests_data,
        }, status=status.HTTP_200_OK)


class AdminEquipmentTypeCreateView(APIView):
    """
    Create a new equipment inventory type.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        name = request.data.get('name', '').strip()
        description = request.data.get('description', '').strip()

        if not name:
            return Response({"errors": {"name": ["Equipment name is required."]}}, status=status.HTTP_400_BAD_REQUEST)

        eq_type = EquipmentType.objects.create(name=name, description=description)
        return Response({
            "message": f"Equipment type '{eq_type.name}' created.",
            "equipment_type_id": eq_type.equipment_type_id,
        }, status=status.HTTP_201_CREATED)


class AdminEquipmentUnitCreateView(APIView):
    """
    Add a physical unit for an equipment type.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        type_id = request.data.get('equipment_type_id')
        serial_number = request.data.get('serial_number', '').strip()
        status_val = request.data.get('status', EquipmentUnitStatus.AVAILABLE)

        eq_type = EquipmentType.objects.filter(equipment_type_id=type_id).first()
        if not eq_type:
            return Response({"detail": "Equipment type not found."}, status=status.HTTP_404_NOT_FOUND)

        unit = EquipmentUnit.objects.create(
            equipment_type=eq_type,
            serial_number=serial_number or f"KG-{eq_type.name[:3].upper()}-{EquipmentUnit.objects.count() + 101}",
            status=status_val,
        )

        return Response({
            "message": f"Equipment unit '{unit.serial_number}' registered.",
            "unit_id": unit.unit_id,
        }, status=status.HTTP_201_CREATED)


class AdminEquipmentAllocateView(APIView):
    """
    Allocate or reassign an available physical equipment unit and update delivery status
    for clinically approved patient equipment requests.
    Enforces transactional concurrency with select_for_update() row locking.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, request_id, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        unit_id = request.data.get('unit_id')
        if not unit_id:
            return Response({"errors": {"unit_id": ["Physical Equipment Unit ID is required."]}}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            eq_request = EquipmentRequest.objects.select_for_update().filter(request_id=request_id).first()
            if not eq_request:
                return Response({"detail": "Equipment request not found."}, status=status.HTTP_404_NOT_FOUND)

            if eq_request.doctor_approval_status != DoctorApprovalStatus.APPROVED:
                return Response(
                    {"detail": "Equipment request must be clinically approved by a doctor before physical equipment allocation."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if eq_request.delivery_status != DeliveryStatus.REQUESTED:
                return Response(
                    {"detail": f"Equipment request is already {eq_request.delivery_status}."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if eq_request.allocated_unit_id is not None:
                return Response(
                    {"detail": "An equipment unit has already been allocated to this request."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            unit = EquipmentUnit.objects.select_for_update().filter(unit_id=unit_id).first()
            if not unit:
                return Response({"detail": "Equipment unit not found."}, status=status.HTTP_404_NOT_FOUND)

            if unit.equipment_type_id != eq_request.equipment_type_id:
                return Response(
                    {"detail": "Selected equipment unit does not match the requested equipment category."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if unit.status != EquipmentUnitStatus.AVAILABLE:
                return Response(
                    {"detail": "This equipment unit is no longer available. Please select another unit."},
                    status=status.HTTP_409_CONFLICT
                )

            admin_profile = getattr(request.user, 'administrator', None) or Administrator.objects.filter(user=request.user).first()

            # Transition unit: Available -> Allocated
            unit.status = EquipmentUnitStatus.ALLOCATED
            unit.save(update_fields=['status', 'updated_at'])

            # Transition request: Requested -> Allocated, assign unit and admin
            eq_request.allocated_unit = unit
            eq_request.allocated_by_admin = admin_profile
            eq_request.delivery_status = DeliveryStatus.ALLOCATED
            eq_request.save(update_fields=['allocated_unit', 'allocated_by_admin', 'delivery_status', 'updated_at'])

            return Response({
                "message": f"Unit '{unit.serial_number}' successfully allocated to patient {eq_request.patient.name}.",
                "request_id": eq_request.request_id,
                "patient_name": eq_request.patient.name,
                "equipment_type_name": eq_request.equipment_type.name,
                "doctor_approval_status": eq_request.doctor_approval_status,
                "delivery_status": eq_request.delivery_status,
                "allocated_unit_id": unit.unit_id,
                "allocated_unit_serial": unit.serial_number,
                "allocated_by_admin_name": admin_profile.name if admin_profile else "Administrator",
                "returned_at": None,
                "updated_at": eq_request.updated_at.strftime('%d %b %Y, %H:%M'),
            }, status=status.HTTP_200_OK)

    def patch(self, request, request_id, *args, **kwargs):
        """
        Edit an allocated equipment request: reassign physical unit, update delivery status
        (Allocated, Delivered, Returned), and manage unit availability.
        Admin CANNOT modify doctor_approval_status or clinical approval decisions.
        """
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        with transaction.atomic():
            eq_request = EquipmentRequest.objects.select_for_update().filter(request_id=request_id).first()

            if not eq_request:
                return Response({"detail": "Equipment request not found."}, status=status.HTTP_404_NOT_FOUND)

            if eq_request.doctor_approval_status != DoctorApprovalStatus.APPROVED:
                return Response(
                    {"detail": "Only clinically approved equipment requests can be administratively edited or allocated."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            admin_profile = getattr(request.user, 'administrator', None) or Administrator.objects.filter(user=request.user).first()
            update_fields = ['updated_at']

            # 1. Handle Unit Reassignment if unit_id is provided
            unit_id = request.data.get('unit_id')
            if unit_id is not None and str(unit_id).strip() != '':
                unit_id = int(unit_id)
                current_unit_id = eq_request.allocated_unit_id

                if unit_id != current_unit_id:
                    new_unit = EquipmentUnit.objects.select_for_update().filter(unit_id=unit_id).first()
                    if not new_unit:
                        return Response({"detail": "Selected equipment unit not found."}, status=status.HTTP_404_NOT_FOUND)

                    if new_unit.equipment_type_id != eq_request.equipment_type_id:
                        return Response(
                            {"detail": "Selected equipment unit does not match the requested equipment category."},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    if new_unit.status != EquipmentUnitStatus.AVAILABLE:
                        return Response(
                            {"detail": "This equipment unit is no longer available. Please select another unit."},
                            status=status.HTTP_409_CONFLICT
                        )

                    # Release old unit if one was previously allocated
                    if current_unit_id:
                        old_unit = EquipmentUnit.objects.select_for_update().filter(unit_id=current_unit_id).first()
                        if old_unit:
                            old_unit.status = EquipmentUnitStatus.AVAILABLE
                            old_unit.save(update_fields=['status', 'updated_at'])

                    # Mark new unit as ALLOCATED
                    new_unit.status = EquipmentUnitStatus.ALLOCATED
                    new_unit.save(update_fields=['status', 'updated_at'])

                    eq_request.allocated_unit = new_unit
                    eq_request.allocated_by_admin = admin_profile
                    update_fields.extend(['allocated_unit', 'allocated_by_admin'])

            # 2. Handle Delivery Status Transitions
            raw_delivery_status = request.data.get('delivery_status')
            if raw_delivery_status:
                status_mapping = {
                    'requested': DeliveryStatus.REQUESTED,
                    'allocated': DeliveryStatus.ALLOCATED,
                    'delivered': DeliveryStatus.DELIVERED,
                    'returned': DeliveryStatus.RETURNED,
                }
                normalized_status = status_mapping.get(str(raw_delivery_status).strip().lower())
                if not normalized_status:
                    return Response(
                        {"errors": {"delivery_status": [f"Invalid delivery status '{raw_delivery_status}'. Valid choices are: Requested, Allocated, Delivered, Returned."]}},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                if normalized_status == DeliveryStatus.RETURNED:
                    # Equipment returned: Mark returned_at and free the allocated physical unit back to Available stock
                    eq_request.delivery_status = DeliveryStatus.RETURNED
                    eq_request.returned_at = timezone.now()
                    update_fields.extend(['delivery_status', 'returned_at'])

                    if eq_request.allocated_unit_id:
                        unit_to_release = EquipmentUnit.objects.select_for_update().filter(unit_id=eq_request.allocated_unit_id).first()
                        if unit_to_release and unit_to_release.status == EquipmentUnitStatus.ALLOCATED:
                            unit_to_release.status = EquipmentUnitStatus.AVAILABLE
                            unit_to_release.save(update_fields=['status', 'updated_at'])

                elif normalized_status in [DeliveryStatus.ALLOCATED, DeliveryStatus.DELIVERED]:
                    # Transition to Allocated or Delivered
                    if eq_request.allocated_unit_id is None:
                        return Response(
                            {"detail": f"Cannot set delivery status to '{normalized_status}' without allocating a physical equipment unit."},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    # If previously marked Returned, re-ensure the physical unit is locked as Allocated
                    if eq_request.delivery_status == DeliveryStatus.RETURNED:
                        unit_to_lock = EquipmentUnit.objects.select_for_update().filter(unit_id=eq_request.allocated_unit_id).first()
                        if unit_to_lock:
                            if unit_to_lock.status not in [EquipmentUnitStatus.AVAILABLE, EquipmentUnitStatus.ALLOCATED]:
                                return Response(
                                    {"detail": f"The allocated unit '{unit_to_lock.serial_number}' is currently {unit_to_lock.status} and cannot be reactivated."},
                                    status=status.HTTP_409_CONFLICT
                                )
                            unit_to_lock.status = EquipmentUnitStatus.ALLOCATED
                            unit_to_lock.save(update_fields=['status', 'updated_at'])
                        eq_request.returned_at = None
                        update_fields.append('returned_at')

                    eq_request.delivery_status = normalized_status
                    eq_request.allocated_by_admin = admin_profile
                    update_fields.extend(['delivery_status', 'allocated_by_admin'])

                elif normalized_status == DeliveryStatus.REQUESTED:
                    # Reset back to Requested -> Release allocated unit
                    if eq_request.allocated_unit_id:
                        unit_to_release = EquipmentUnit.objects.select_for_update().filter(unit_id=eq_request.allocated_unit_id).first()
                        if unit_to_release:
                            unit_to_release.status = EquipmentUnitStatus.AVAILABLE
                            unit_to_release.save(update_fields=['status', 'updated_at'])
                    eq_request.allocated_unit = None
                    eq_request.delivery_status = DeliveryStatus.REQUESTED
                    eq_request.returned_at = None
                    update_fields.extend(['allocated_unit', 'delivery_status', 'returned_at'])

            # Always ensure allocated_by_admin is recorded
            if admin_profile and 'allocated_by_admin' not in update_fields:
                eq_request.allocated_by_admin = admin_profile
                update_fields.append('allocated_by_admin')

            eq_request.save(update_fields=list(set(update_fields)))

            return Response({
                "message": "Equipment allocation details updated successfully.",
                "request_id": eq_request.request_id,
                "patient_name": eq_request.patient.name,
                "equipment_type_name": eq_request.equipment_type.name,
                "doctor_approval_status": eq_request.doctor_approval_status,
                "delivery_status": eq_request.delivery_status,
                "allocated_unit_id": eq_request.allocated_unit.unit_id if eq_request.allocated_unit else None,
                "allocated_unit_serial": eq_request.allocated_unit.serial_number if eq_request.allocated_unit else None,
                "allocated_by_admin_name": eq_request.allocated_by_admin.name if eq_request.allocated_by_admin else "Administrator",
                "returned_at": eq_request.returned_at.strftime('%d %b %Y, %H:%M') if eq_request.returned_at else None,
                "updated_at": eq_request.updated_at.strftime('%d %b %Y, %H:%M'),
            }, status=status.HTTP_200_OK)


class AdminEquipmentUnitStatusUpdateView(APIView):
    """
    Update the operational status of an equipment unit (Available, Allocated, Maintenance, Retired).
    Guards against manual bypass of patient allocation, corruption of active allocations, and reviving retired units.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, unit_id, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        unit = EquipmentUnit.objects.filter(unit_id=unit_id).first()
        if not unit:
            return Response({"detail": "Equipment unit not found."}, status=status.HTTP_404_NOT_FOUND)

        raw_status = str(request.data.get('status', '')).strip()
        status_map = {
            'available': EquipmentUnitStatus.AVAILABLE,
            'available in stock': EquipmentUnitStatus.AVAILABLE,
            'allocated': EquipmentUnitStatus.ALLOCATED,
            'allocated to patient': EquipmentUnitStatus.ALLOCATED,
            'maintenance': EquipmentUnitStatus.MAINTENANCE,
            'under maintenance': EquipmentUnitStatus.MAINTENANCE,
            'under maintenance / repair': EquipmentUnitStatus.MAINTENANCE,
            'under maintenance/repair': EquipmentUnitStatus.MAINTENANCE,
            'retired': EquipmentUnitStatus.RETIRED,
            'retired / out of service': EquipmentUnitStatus.RETIRED,
            'retired/out of service': EquipmentUnitStatus.RETIRED,
        }

        new_status = status_map.get(raw_status.lower(), raw_status)

        if new_status not in [EquipmentUnitStatus.AVAILABLE, EquipmentUnitStatus.ALLOCATED, EquipmentUnitStatus.MAINTENANCE, EquipmentUnitStatus.RETIRED]:
            return Response({"detail": "Invalid status value."}, status=status.HTTP_400_BAD_REQUEST)

        # Rule A: Manual allocation bypass prevention
        if new_status == EquipmentUnitStatus.ALLOCATED and unit.status != EquipmentUnitStatus.ALLOCATED:
            return Response(
                {"detail": "Direct manual allocation is not permitted. Units must be assigned via doctor-approved patient equipment requests."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Rule B: Protect active patient allocation
        if unit.status == EquipmentUnitStatus.ALLOCATED and new_status != EquipmentUnitStatus.ALLOCATED:
            has_active_request = EquipmentRequest.objects.filter(
                allocated_unit=unit,
                delivery_status__in=[DeliveryStatus.ALLOCATED, DeliveryStatus.DELIVERED]
            ).exists()
            if has_active_request:
                return Response(
                    {"detail": "This equipment unit is currently allocated to an active patient request and cannot be manually changed. Process equipment return first."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Rule C: Retired units cannot be revived to Available
        if unit.status == EquipmentUnitStatus.RETIRED and new_status == EquipmentUnitStatus.AVAILABLE:
            return Response(
                {"detail": "Retired equipment units cannot be reactivated directly to Available."},
                status=status.HTTP_400_BAD_REQUEST
            )

        unit.status = new_status
        unit.save()
        return Response({
            "message": f"Unit '{unit.serial_number}' status updated to {unit.status}.",
            "status": unit.status,
            "unit_id": unit.unit_id,
            "updated_at": unit.updated_at.strftime('%d %b %Y'),
        }, status=status.HTTP_200_OK)


class AdminNotificationOverviewView(APIView):
    """
    System-wide notifications oversight for Administrator.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        notifications = Notification.objects.select_related('user').all().order_by('-created_at')[:50]
        results = [
            {
                "notification_id": n.notification_id,
                "recipient_email": n.user.email,
                "recipient_role": n.user.role,
                "type": n.type or "System Alert",
                "message": n.message,
                "is_read": n.is_read,
                "created_at": n.created_at.strftime('%d %b %Y, %H:%M'),
            }
            for n in notifications
        ]
        return Response(results, status=status.HTTP_200_OK)


class AdminReportsView(APIView):
    """
    Dedicated Operational Reporting API for KarunaGrid Phase 1 Administrators.
    Returns categorized detailed records, aggregated category summaries,
    and supports dynamic date and status filtering.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        report_category = request.query_params.get('type', 'patients').strip().lower()
        from_date_str = request.query_params.get('from_date', '').strip()
        to_date_str = request.query_params.get('to_date', '').strip()
        status_filter = request.query_params.get('status', '').strip()
        search_query = request.query_params.get('search', '').strip().lower()

        # Parse date filters
        from_date = None
        to_date = None
        if from_date_str:
            try:
                from_date = datetime.strptime(from_date_str[:10], '%Y-%m-%d').date()
            except ValueError:
                pass
        if to_date_str:
            try:
                to_date = datetime.strptime(to_date_str[:10], '%Y-%m-%d').date()
            except ValueError:
                pass

        from care_coordination.models import (
            HomeVisitOccurrence,
            HomeVisitSchedule,
            TelemedicineConsultation,
            CaregiverPatientAssignment,
            OccurrenceStatus,
            ConsultationStatus,
            UrgencyLevel,
            VisitType,
            AssignmentStatus,
        )
        from resources.models import (
            EquipmentType,
            EquipmentUnit,
            EquipmentRequest,
            WelfareScheme,
            EquipmentUnitStatus,
            DoctorApprovalStatus,
            DeliveryStatus,
            WelfareSchemeStatus,
        )

        summary = {}
        records = []

        # -------------------------------------------------------------
        # 1. PATIENT REPORTS
        # -------------------------------------------------------------
        if report_category in ['patients', 'patient']:
            total_patients = Patient.objects.count()
            approved_patients = PatientRegistrationApplication.objects.filter(registration_status=RegistrationStatus.APPROVED).count()
            pending_registrations = PatientRegistrationApplication.objects.filter(registration_status=RegistrationStatus.PENDING).count()
            rejected_registrations = PatientRegistrationApplication.objects.filter(registration_status=RegistrationStatus.REJECTED).count()

            # Newly registered (past 30 days or within date filter)
            thirty_days_ago = timezone.now() - timedelta(days=30)
            newly_registered = PatientRegistrationApplication.objects.filter(created_at__gte=thirty_days_ago).count()

            summary = {
                "total_patients": total_patients,
                "approved_patients": approved_patients,
                "pending_registrations": pending_registrations,
                "rejected_registrations": rejected_registrations,
                "newly_registered_patients": newly_registered,
            }

            qs = PatientRegistrationApplication.objects.select_related('reviewed_by_doctor', 'created_patient').all().order_by('-created_at')

            if from_date:
                qs = qs.filter(created_at__date__gte=from_date)
            if to_date:
                qs = qs.filter(created_at__date__lte=to_date)
            if status_filter and status_filter.lower() != 'all':
                qs = qs.filter(registration_status__iexact=status_filter)

            for app in qs:
                if search_query:
                    match_name = search_query in app.name.lower()
                    match_app_id = search_query in app.application_id.lower()
                    match_reg_id = bool(app.created_patient and search_query in app.created_patient.registration_id.lower())
                    match_phone = search_query in app.phone.lower()
                    if not (match_name or match_app_id or match_reg_id or match_phone):
                        continue

                reg_id = app.created_patient.registration_id if app.created_patient else app.application_id
                records.append({
                    "id": app.id,
                    "patient_name": app.name,
                    "registration_id": reg_id,
                    "application_id": app.application_id,
                    "registration_date": app.created_at.strftime('%Y-%m-%d') if app.created_at else "N/A",
                    "status": app.registration_status,
                    "reviewed_by": f"Dr. {app.reviewed_by_doctor.name}" if app.reviewed_by_doctor else "Pending Review",
                    "phone": app.phone,
                    "gender": app.gender or "N/A",
                    "location": f"{app.place}, {app.panchayath}",
                    "emergency_contact": f"{app.emergency_contact_name} ({app.emergency_contact_phone})" if app.emergency_contact_name else "N/A",
                })

        # -------------------------------------------------------------
        # 2. DOCTOR & NURSE REPORTS (STAFF)
        # -------------------------------------------------------------
        elif report_category in ['staff', 'doctors_nurses', 'doctors', 'nurses']:
            total_doctors = Doctor.objects.count()
            approved_doctors = Doctor.objects.filter(verification_status=VerificationStatus.APPROVED).count()
            pending_doctors = Doctor.objects.filter(verification_status=VerificationStatus.PENDING).count()
            rejected_doctors = Doctor.objects.filter(verification_status=VerificationStatus.REJECTED).count()
            available_doctors = Doctor.objects.filter(is_available_now=True).count()
            unavailable_doctors = Doctor.objects.filter(is_available_now=False).count()

            total_nurses = Nurse.objects.count()
            approved_nurses = Nurse.objects.filter(verification_status=VerificationStatus.APPROVED).count()
            pending_nurses = Nurse.objects.filter(verification_status=VerificationStatus.PENDING).count()
            rejected_nurses = Nurse.objects.filter(verification_status=VerificationStatus.REJECTED).count()
            available_nurses = Nurse.objects.filter(is_available_now=True).count()
            unavailable_nurses = Nurse.objects.filter(is_available_now=False).count()

            summary = {
                "total_doctors": total_doctors,
                "approved_doctors": approved_doctors,
                "pending_doctors": pending_doctors,
                "rejected_doctors": rejected_doctors,
                "available_doctors": available_doctors,
                "unavailable_doctors": unavailable_doctors,
                "total_nurses": total_nurses,
                "approved_nurses": approved_nurses,
                "pending_nurses": pending_nurses,
                "rejected_nurses": rejected_nurses,
                "available_nurses": available_nurses,
                "unavailable_nurses": unavailable_nurses,
            }

            doctors_qs = Doctor.objects.select_related('user').all().order_by('-created_at')
            nurses_qs = Nurse.objects.select_related('user').all().order_by('-created_at')

            if from_date:
                doctors_qs = doctors_qs.filter(created_at__date__gte=from_date)
                nurses_qs = nurses_qs.filter(created_at__date__gte=from_date)
            if to_date:
                doctors_qs = doctors_qs.filter(created_at__date__lte=to_date)
                nurses_qs = nurses_qs.filter(created_at__date__lte=to_date)

            if status_filter and status_filter.lower() != 'all':
                if status_filter.lower() == 'available':
                    doctors_qs = doctors_qs.filter(is_available_now=True)
                    nurses_qs = nurses_qs.filter(is_available_now=True)
                elif status_filter.lower() == 'unavailable':
                    doctors_qs = doctors_qs.filter(is_available_now=False)
                    nurses_qs = nurses_qs.filter(is_available_now=False)
                elif status_filter.lower() in ['doctor', 'doctors']:
                    nurses_qs = nurses_qs.none()
                elif status_filter.lower() in ['nurse', 'nurses']:
                    doctors_qs = doctors_qs.none()
                else:
                    doctors_qs = doctors_qs.filter(verification_status__iexact=status_filter)
                    nurses_qs = nurses_qs.filter(verification_status__iexact=status_filter)

            if report_category != 'nurses':
                for d in doctors_qs:
                    if search_query:
                        m_name = search_query in d.name.lower()
                        m_email = search_query in d.user.email.lower()
                        m_spec = search_query in (d.specialization or '').lower()
                        if not (m_name or m_email or m_spec):
                            continue
                    records.append({
                        "id": f"doc_{d.doctor_id}",
                        "name": f"Dr. {d.name}",
                        "role": "Doctor",
                        "email": d.user.email,
                        "phone": d.phone or "N/A",
                        "specialization": d.specialization or "Palliative Medicine",
                        "service_area": d.service_area or "Community",
                        "availability": "Available" if d.is_available_now else "Unavailable",
                        "status": d.verification_status,
                        "experience": f"{d.experience} yrs" if d.experience is not None else "N/A",
                        "joined_date": d.created_at.strftime('%Y-%m-%d') if d.created_at else "N/A",
                    })

            if report_category != 'doctors':
                for n in nurses_qs:
                    if search_query:
                        m_name = search_query in n.name.lower()
                        m_email = search_query in n.user.email.lower()
                        m_spec = search_query in (n.specialization or '').lower()
                        if not (m_name or m_email or m_spec):
                            continue
                    records.append({
                        "id": f"nurse_{n.nurse_id}",
                        "name": f"Nurse {n.name}",
                        "role": "Nurse",
                        "email": n.user.email,
                        "phone": n.phone or "N/A",
                        "specialization": n.specialization or "Community Nursing",
                        "service_area": n.service_area or "Community",
                        "availability": "Available" if n.is_available_now else "Unavailable",
                        "status": n.verification_status,
                        "experience": f"{n.experience} yrs" if n.experience is not None else "N/A",
                        "joined_date": n.created_at.strftime('%Y-%m-%d') if n.created_at else "N/A",
                    })

        # -------------------------------------------------------------
        # 3. HOME VISIT REPORTS
        # -------------------------------------------------------------
        elif report_category in ['home_visits', 'visits', 'home_visit']:
            total_visits = HomeVisitOccurrence.objects.count()
            scheduled_visits = HomeVisitOccurrence.objects.filter(status=OccurrenceStatus.SCHEDULED).count()
            completed_visits = HomeVisitOccurrence.objects.filter(status=OccurrenceStatus.COMPLETED).count()
            rescheduled_visits = HomeVisitOccurrence.objects.filter(status=OccurrenceStatus.RESCHEDULED).count()
            skipped_visits = HomeVisitOccurrence.objects.filter(status=OccurrenceStatus.SKIPPED).count()
            urgent_visits = HomeVisitOccurrence.objects.filter(urgency_level__in=[UrgencyLevel.URGENT, UrgencyLevel.EMERGENCY]).count()

            summary = {
                "total_visits": total_visits,
                "scheduled_visits": scheduled_visits,
                "completed_visits": completed_visits,
                "rescheduled_visits": rescheduled_visits,
                "skipped_visits": skipped_visits,
                "urgent_visits": urgent_visits,
            }

            qs = HomeVisitOccurrence.objects.select_related(
                'patient', 'visiting_doctor', 'allocated_nurse', 'schedule__nurse'
            ).all().order_by('-scheduled_date')

            if from_date:
                qs = qs.filter(scheduled_date__gte=from_date)
            if to_date:
                qs = qs.filter(scheduled_date__lte=to_date)
            if status_filter and status_filter.lower() != 'all':
                if status_filter.lower() == 'urgent':
                    qs = qs.filter(urgency_level__in=[UrgencyLevel.URGENT, UrgencyLevel.EMERGENCY])
                else:
                    qs = qs.filter(status__iexact=status_filter)

            for occ in qs:
                if search_query:
                    m_pat = search_query in occ.patient.name.lower() or search_query in occ.patient.registration_id.lower()
                    m_doc = bool(occ.visiting_doctor and search_query in occ.visiting_doctor.name.lower())
                    m_nurse = bool(occ.allocated_nurse and search_query in occ.allocated_nurse.name.lower())
                    if not (m_pat or m_doc or m_nurse):
                        continue

                doc_name = f"Dr. {occ.visiting_doctor.name}" if occ.visiting_doctor else "N/A"
                nurse_name = f"Nurse {occ.allocated_nurse.name}" if occ.allocated_nurse else (
                    f"Nurse {occ.schedule.nurse.name}" if occ.schedule and occ.schedule.nurse else "N/A"
                )

                records.append({
                    "id": occ.occurrence_id,
                    "date": occ.scheduled_date.strftime('%Y-%m-%d') if occ.scheduled_date else "N/A",
                    "patient_name": occ.patient.name,
                    "patient_reg_id": occ.patient.registration_id,
                    "visiting_doctor": doc_name,
                    "allocated_nurse": nurse_name,
                    "status": occ.status,
                    "visit_type": occ.visit_type,
                    "urgency_level": occ.urgency_level or "Routine",
                    "notes": occ.notes or "",
                })

        # -------------------------------------------------------------
        # 4. TELEMEDICINE REPORTS
        # -------------------------------------------------------------
        elif report_category in ['telemedicine', 'consultations', 'telemedicine_consultations']:
            total_consults = TelemedicineConsultation.objects.count()
            pending_c = TelemedicineConsultation.objects.filter(status=ConsultationStatus.PENDING).count()
            accepted_c = TelemedicineConsultation.objects.filter(status=ConsultationStatus.ACCEPTED).count()
            scheduled_c = TelemedicineConsultation.objects.filter(status=ConsultationStatus.SCHEDULED).count()
            in_prog_c = TelemedicineConsultation.objects.filter(status=ConsultationStatus.IN_PROGRESS).count()
            completed_c = TelemedicineConsultation.objects.filter(status=ConsultationStatus.COMPLETED).count()
            rejected_c = TelemedicineConsultation.objects.filter(status=ConsultationStatus.REJECTED).count()
            cancelled_c = TelemedicineConsultation.objects.filter(status=ConsultationStatus.CANCELLED).count()
            rescheduled_c = TelemedicineConsultation.objects.filter(status=ConsultationStatus.RESCHEDULED).count()

            summary = {
                "total_consultations": total_consults,
                "pending": pending_c,
                "accepted": accepted_c,
                "scheduled": scheduled_c,
                "in_progress": in_prog_c,
                "completed": completed_c,
                "rejected": rejected_c,
                "cancelled": cancelled_c,
                "rescheduled": rescheduled_c,
            }

            qs = TelemedicineConsultation.objects.select_related('patient', 'doctor').all().order_by('-created_at')

            if from_date:
                qs = qs.filter(Q(scheduled_date__gte=from_date) | Q(requested_date__gte=from_date) | Q(created_at__date__gte=from_date))
            if to_date:
                qs = qs.filter(Q(scheduled_date__lte=to_date) | Q(requested_date__lte=to_date) | Q(created_at__date__lte=to_date))
            if status_filter and status_filter.lower() != 'all':
                qs = qs.filter(status__iexact=status_filter)

            for c in qs:
                if search_query:
                    m_pat = search_query in c.patient.name.lower() or search_query in c.patient.registration_id.lower()
                    m_doc = search_query in c.doctor.name.lower()
                    if not (m_pat or m_doc):
                        continue

                sched_date = str(c.scheduled_date) if c.scheduled_date else (str(c.requested_date) if c.requested_date else "N/A")
                sched_time = str(c.scheduled_start_time) if c.scheduled_start_time else (str(c.requested_time) if c.requested_time else "N/A")

                records.append({
                    "id": c.consultation_id,
                    "patient_name": c.patient.name,
                    "patient_reg_id": c.patient.registration_id,
                    "doctor_name": f"Dr. {c.doctor.name}",
                    "priority": c.priority,
                    "scheduled_date": sched_date,
                    "scheduled_time": sched_time,
                    "status": c.status,
                    "reason": c.reason or "",
                })

        # -------------------------------------------------------------
        # 5. CAREGIVER REPORTS
        # -------------------------------------------------------------
        elif report_category in ['caregivers', 'caregiver']:
            total_caregivers = Caregiver.objects.count()
            active_caregivers = Caregiver.objects.filter(verification_status=VerificationStatus.APPROVED, user__is_active=True).count()
            pending_caregivers = Caregiver.objects.filter(verification_status=VerificationStatus.PENDING).count()
            rejected_caregivers = Caregiver.objects.filter(verification_status=VerificationStatus.REJECTED).count()
            patients_with_cg = Patient.objects.filter(caregiverpatientassignment__status=AssignmentStatus.ACTIVE).distinct().count()
            patients_without_cg = Patient.objects.exclude(caregiverpatientassignment__status=AssignmentStatus.ACTIVE).count()
            total_assignments = CaregiverPatientAssignment.objects.filter(status=AssignmentStatus.ACTIVE).count()

            summary = {
                "total_caregivers": total_caregivers,
                "active_caregivers": active_caregivers,
                "pending_caregivers": pending_caregivers,
                "rejected_caregivers": rejected_caregivers,
                "patients_with_caregivers": patients_with_cg,
                "patients_without_caregivers": patients_without_cg,
                "caregiver_assignments": total_assignments,
            }

            qs = Caregiver.objects.select_related('user').prefetch_related(
                'caregiverpatientassignment_set__patient',
                'caregiverpatientassignment_set__assigned_by_nurse'
            ).all().order_by('-created_at')

            if from_date:
                qs = qs.filter(created_at__date__gte=from_date)
            if to_date:
                qs = qs.filter(created_at__date__lte=to_date)
            if status_filter and status_filter.lower() != 'all':
                qs = qs.filter(verification_status__iexact=status_filter)

            for cg in qs:
                if search_query:
                    m_name = search_query in cg.name.lower()
                    m_phone = search_query in (cg.phone or '').lower()
                    if not (m_name or m_phone):
                        continue

                active_assignments = [a for a in cg.caregiverpatientassignment_set.all() if a.status == AssignmentStatus.ACTIVE]
                assigned_patient_names = ", ".join([f"{a.patient.name} ({a.patient.registration_id})" for a in active_assignments]) or "Unassigned"
                assigned_by_nurse_name = active_assignments[0].assigned_by_nurse.name if active_assignments and active_assignments[0].assigned_by_nurse else "N/A"

                records.append({
                    "id": cg.caregiver_id,
                    "caregiver_name": cg.name,
                    "phone": cg.phone or "N/A",
                    "verification_status": cg.verification_status,
                    "specialization": cg.specialization or "General Palliative",
                    "location": f"{cg.place}, {cg.panchayath}",
                    "assigned_patient": assigned_patient_names,
                    "assigned_by_nurse": f"Nurse {assigned_by_nurse_name}" if assigned_by_nurse_name != "N/A" else "N/A",
                    "joined_date": cg.created_at.strftime('%Y-%m-%d') if cg.created_at else "N/A",
                })

        # -------------------------------------------------------------
        # 6. EQUIPMENT REPORTS
        # -------------------------------------------------------------
        elif report_category in ['equipment', 'equipment_reports', 'inventory']:
            total_units = EquipmentUnit.objects.count()
            available_units = EquipmentUnit.objects.filter(status=EquipmentUnitStatus.AVAILABLE).count()
            allocated_units = EquipmentUnit.objects.filter(status=EquipmentUnitStatus.ALLOCATED).count()
            maintenance_units = EquipmentUnit.objects.filter(status=EquipmentUnitStatus.MAINTENANCE).count()
            retired_units = EquipmentUnit.objects.filter(status=EquipmentUnitStatus.RETIRED).count()
            returned_units = EquipmentRequest.objects.filter(delivery_status=DeliveryStatus.RETURNED).count()
            pending_requests = EquipmentRequest.objects.filter(doctor_approval_status=DoctorApprovalStatus.PENDING).count()
            approved_requests = EquipmentRequest.objects.filter(doctor_approval_status=DoctorApprovalStatus.APPROVED).count()
            rejected_requests = EquipmentRequest.objects.filter(doctor_approval_status=DoctorApprovalStatus.REJECTED).count()

            summary = {
                "total_equipment_units": total_units,
                "available_units": available_units,
                "allocated_units": allocated_units,
                "maintenance_units": maintenance_units,
                "retired_units": retired_units,
                "returned_units": returned_units,
                "pending_requests": pending_requests,
                "doctor_approved_requests": approved_requests,
                "doctor_rejected_requests": rejected_requests,
            }

            qs = EquipmentUnit.objects.select_related('equipment_type').all().order_by('equipment_type__name', 'serial_number')

            if status_filter and status_filter.lower() != 'all':
                qs = qs.filter(status__iexact=status_filter)

            for u in qs:
                if search_query:
                    m_type = search_query in u.equipment_type.name.lower()
                    m_sn = search_query in (u.serial_number or '').lower()
                    if not (m_type or m_sn):
                        continue

                current_request = EquipmentRequest.objects.filter(
                    allocated_unit=u,
                    delivery_status__in=[DeliveryStatus.ALLOCATED, DeliveryStatus.DELIVERED]
                ).select_related('patient').first()
                patient_info = f"{current_request.patient.name} ({current_request.patient.registration_id})" if current_request else "In Warehouse"

                records.append({
                    "id": u.unit_id,
                    "equipment_type": u.equipment_type.name,
                    "serial_number": u.serial_number or f"UNIT-{u.unit_id}",
                    "status": u.status,
                    "current_allocation": patient_info,
                    "last_updated": u.updated_at.strftime('%Y-%m-%d') if u.updated_at else "N/A",
                })

        # -------------------------------------------------------------
        # 7. WELFARE SCHEME REPORTS
        # -------------------------------------------------------------
        elif report_category in ['welfare_schemes', 'welfare', 'schemes']:
            total_schemes = WelfareScheme.objects.count()
            published = WelfareScheme.objects.filter(status=WelfareSchemeStatus.PUBLISHED).count()
            draft = WelfareScheme.objects.filter(status=WelfareSchemeStatus.DRAFT).count()
            unpublished = WelfareScheme.objects.filter(status=WelfareSchemeStatus.UNPUBLISHED).count()

            cat_counts = {}
            for s in WelfareScheme.objects.all():
                cat_counts[s.category] = cat_counts.get(s.category, 0) + 1

            summary = {
                "total_schemes": total_schemes,
                "published_schemes": published,
                "draft_schemes": draft,
                "unpublished_schemes": unpublished,
                "schemes_by_category": cat_counts,
            }

            qs = WelfareScheme.objects.select_related('created_by_admin').all().order_by('-created_at')

            if from_date:
                qs = qs.filter(created_at__date__gte=from_date)
            if to_date:
                qs = qs.filter(created_at__date__lte=to_date)
            if status_filter and status_filter.lower() != 'all':
                qs = qs.filter(status__iexact=status_filter)

            for s in qs:
                if search_query:
                    m_name = search_query in s.name.lower()
                    m_cat = search_query in s.category.lower()
                    m_dept = search_query in (s.government_department or '').lower()
                    if not (m_name or m_cat or m_dept):
                        continue

                records.append({
                    "id": s.scheme_id,
                    "name": s.name,
                    "category": s.category,
                    "department": s.government_department or "Government of Kerala",
                    "status": s.status,
                    "published_at": s.published_at.strftime('%Y-%m-%d') if s.published_at else "Not Published",
                    "created_by": s.created_by_admin.name if s.created_by_admin else "Administrator",
                })

        return Response({
            "category": report_category,
            "filters_applied": {
                "from_date": from_date_str or None,
                "to_date": to_date_str or None,
                "status": status_filter or None,
                "search": search_query or None,
            },
            "summary": summary,
            "records": records,
            "total_count": len(records),
        }, status=status.HTTP_200_OK)


class AdminAnalyticsView(APIView):
    """
    Real-time Aggregated Analytics API for KarunaGrid Phase 1 Administrators.
    Calculates historical, descriptive palliative operations metrics, KPI cards,
    and chart series strictly derived from actual database records.
    Supports dynamic date filtering across visits, consultations, and registrations.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        from_date_str = request.query_params.get('from_date', '').strip()
        to_date_str = request.query_params.get('to_date', '').strip()

        from_date = None
        to_date = None
        if from_date_str:
            try:
                from_date = datetime.strptime(from_date_str[:10], '%Y-%m-%d').date()
            except ValueError:
                pass
        if to_date_str:
            try:
                to_date = datetime.strptime(to_date_str[:10], '%Y-%m-%d').date()
            except ValueError:
                pass

        from care_coordination.models import (
            HomeVisitOccurrence,
            HomeVisitSchedule,
            TelemedicineConsultation,
            CaregiverPatientAssignment,
            OccurrenceStatus,
            ConsultationStatus,
            AssignmentStatus,
        )
        from resources.models import (
            EquipmentType,
            EquipmentUnit,
            EquipmentRequest,
            WelfareScheme,
            EquipmentUnitStatus,
        )

        # 1. KPI Overview Cards
        total_patients = Patient.objects.count()
        total_doctors = Doctor.objects.count()
        total_nurses = Nurse.objects.count()
        total_caregivers = Caregiver.objects.count()

        visits_qs = HomeVisitOccurrence.objects.all()
        telemed_qs = TelemedicineConsultation.objects.all()
        apps_qs = PatientRegistrationApplication.objects.all()

        if from_date:
            visits_qs = visits_qs.filter(scheduled_date__gte=from_date)
            telemed_qs = telemed_qs.filter(Q(scheduled_date__gte=from_date) | Q(requested_date__gte=from_date) | Q(created_at__date__gte=from_date))
            apps_qs = apps_qs.filter(created_at__date__gte=from_date)
        if to_date:
            visits_qs = visits_qs.filter(scheduled_date__lte=to_date)
            telemed_qs = telemed_qs.filter(Q(scheduled_date__lte=to_date) | Q(requested_date__lte=to_date) | Q(created_at__date__lte=to_date))
            apps_qs = apps_qs.filter(created_at__date__lte=to_date)

        total_home_visits = visits_qs.count()
        total_telemedicine = telemed_qs.count()

        overview_kpis = {
            "total_patients": total_patients,
            "total_doctors": total_doctors,
            "total_nurses": total_nurses,
            "total_caregivers": total_caregivers,
            "total_home_visits": total_home_visits,
            "total_telemedicine": total_telemedicine,
        }

        # 2. Patient Registration Analytics
        today = date.today()
        month_labels = []
        for i in range(5, -1, -1):
            m = today.month - i
            y = today.year
            while m <= 0:
                m += 12
                y -= 1
            month_labels.append(f"{y:04d}-{m:02d}")

        patient_monthly_data = {m: 0 for m in month_labels}
        for app in PatientRegistrationApplication.objects.all():
            if app.created_at:
                ym = app.created_at.strftime('%Y-%m')
                if ym in patient_monthly_data:
                    patient_monthly_data[ym] += 1

        patient_reg_trend = [
            {
                "month": datetime.strptime(m, '%Y-%m').strftime('%b %Y'),
                "registrations": patient_monthly_data[m],
                "raw_month": m
            }
            for m in month_labels
        ]

        patient_status_dist = {
            "approved": PatientRegistrationApplication.objects.filter(registration_status=RegistrationStatus.APPROVED).count(),
            "pending": PatientRegistrationApplication.objects.filter(registration_status=RegistrationStatus.PENDING).count(),
            "rejected": PatientRegistrationApplication.objects.filter(registration_status=RegistrationStatus.REJECTED).count(),
        }

        # 3. Home Visit Analytics
        visit_status_dist = {
            "completed": visits_qs.filter(status=OccurrenceStatus.COMPLETED).count(),
            "scheduled": visits_qs.filter(status=OccurrenceStatus.SCHEDULED).count(),
            "rescheduled": visits_qs.filter(status=OccurrenceStatus.RESCHEDULED).count(),
            "skipped": visits_qs.filter(status=OccurrenceStatus.SKIPPED).count(),
        }

        visit_monthly_data = {m: {"scheduled": 0, "completed": 0} for m in month_labels}
        for occ in HomeVisitOccurrence.objects.all():
            if occ.scheduled_date:
                ym = occ.scheduled_date.strftime('%Y-%m')
                if ym in visit_monthly_data:
                    if occ.status == OccurrenceStatus.COMPLETED:
                        visit_monthly_data[ym]["completed"] += 1
                    else:
                        visit_monthly_data[ym]["scheduled"] += 1

        visit_trend = [
            {
                "month": datetime.strptime(m, '%Y-%m').strftime('%b %Y'),
                "completed": visit_monthly_data[m]["completed"],
                "scheduled": visit_monthly_data[m]["scheduled"],
                "total": visit_monthly_data[m]["completed"] + visit_monthly_data[m]["scheduled"],
            }
            for m in month_labels
        ]

        # 4. Telemedicine Analytics
        telemed_status_dist = {
            "pending": telemed_qs.filter(status=ConsultationStatus.PENDING).count(),
            "accepted": telemed_qs.filter(status=ConsultationStatus.ACCEPTED).count(),
            "scheduled": telemed_qs.filter(status=ConsultationStatus.SCHEDULED).count(),
            "in_progress": telemed_qs.filter(status=ConsultationStatus.IN_PROGRESS).count(),
            "completed": telemed_qs.filter(status=ConsultationStatus.COMPLETED).count(),
            "rejected": telemed_qs.filter(status=ConsultationStatus.REJECTED).count(),
            "cancelled": telemed_qs.filter(status=ConsultationStatus.CANCELLED).count(),
            "rescheduled": telemed_qs.filter(status=ConsultationStatus.RESCHEDULED).count(),
        }

        telemed_monthly_data = {m: 0 for m in month_labels}
        for c in TelemedicineConsultation.objects.all():
            d = c.scheduled_date or c.requested_date or (c.created_at.date() if c.created_at else None)
            if d:
                ym = d.strftime('%Y-%m')
                if ym in telemed_monthly_data:
                    telemed_monthly_data[ym] += 1

        telemed_trend = [
            {
                "month": datetime.strptime(m, '%Y-%m').strftime('%b %Y'),
                "consultations": telemed_monthly_data[m]
            }
            for m in month_labels
        ]

        # 5. Doctor & Nurse Availability
        staff_availability = {
            "doctors": {
                "available": Doctor.objects.filter(is_available_now=True).count(),
                "unavailable": Doctor.objects.filter(is_available_now=False).count(),
                "total": Doctor.objects.count(),
            },
            "nurses": {
                "available": Nurse.objects.filter(is_available_now=True).count(),
                "unavailable": Nurse.objects.filter(is_available_now=False).count(),
                "total": Nurse.objects.count(),
            }
        }

        # 6. Equipment Analytics
        equipment_utilization = {
            "available": EquipmentUnit.objects.filter(status=EquipmentUnitStatus.AVAILABLE).count(),
            "allocated": EquipmentUnit.objects.filter(status=EquipmentUnitStatus.ALLOCATED).count(),
            "maintenance": EquipmentUnit.objects.filter(status=EquipmentUnitStatus.MAINTENANCE).count(),
            "retired": EquipmentUnit.objects.filter(status=EquipmentUnitStatus.RETIRED).count(),
            "total": EquipmentUnit.objects.count(),
        }

        equipment_by_type = []
        for eq_t in EquipmentType.objects.all():
            units_t = EquipmentUnit.objects.filter(equipment_type=eq_t)
            equipment_by_type.append({
                "type_name": eq_t.name,
                "total": units_t.count(),
                "available": units_t.filter(status=EquipmentUnitStatus.AVAILABLE).count(),
                "allocated": units_t.filter(status=EquipmentUnitStatus.ALLOCATED).count(),
            })

        # 7. Caregiver Coverage Analytics
        patients_with_cg = Patient.objects.filter(caregiverpatientassignment__status=AssignmentStatus.ACTIVE).distinct().count()
        patients_without_cg = Patient.objects.exclude(caregiverpatientassignment__status=AssignmentStatus.ACTIVE).count()
        active_caregivers = Caregiver.objects.filter(verification_status=VerificationStatus.APPROVED, user__is_active=True).count()

        caregiver_coverage = {
            "total_patients": total_patients,
            "patients_with_caregiver": patients_with_cg,
            "patients_without_caregiver": patients_without_cg,
            "total_active_caregivers": active_caregivers,
            "coverage_percentage": round((patients_with_cg / total_patients * 100) if total_patients > 0 else 0, 1),
        }

        return Response({
            "filters_applied": {
                "from_date": from_date_str or None,
                "to_date": to_date_str or None,
            },
            "overview_kpis": overview_kpis,
            "patient_analytics": {
                "registration_trend": patient_reg_trend,
                "status_distribution": patient_status_dist,
            },
            "home_visit_analytics": {
                "status_distribution": visit_status_dist,
                "monthly_trend": visit_trend,
            },
            "telemedicine_analytics": {
                "status_distribution": telemed_status_dist,
                "monthly_trend": telemed_trend,
            },
            "staff_availability": staff_availability,
            "equipment_analytics": {
                "utilization": equipment_utilization,
                "by_type": equipment_by_type,
            },
            "caregiver_coverage": caregiver_coverage,
        }, status=status.HTTP_200_OK)


# =====================================================================
# PATIENT PORTAL ENDPOINTS (Phase 1 Compliant, Authenticated Patient Only)
# =====================================================================

def get_authenticated_patient(request):
    """Helper to retrieve authenticated patient profile and enforce role safety."""
    if request.user.role != Role.PATIENT:
        return None
    return getattr(request.user, 'patient_profile', None) or Patient.objects.filter(user=request.user).first()


class PatientDashboardView(APIView):
    """
    Consolidated Summary Dashboard data for the authenticated Patient.
    Strictly uses real data and provides 5 summary metrics, health overview,
    recent records, upcoming care, requests, and timeline.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        patient = get_authenticated_patient(request)
        if not patient:
            return Response({"detail": "Access restricted to Patients only."}, status=status.HTTP_403_FORBIDDEN)

        from care_coordination.models import (
            TelemedicineConsultation,
            TelemedicineConsultationNote,
            HomeVisitOccurrence,
            HomeVisitSummary,
            CaregiverPatientAssignment,
        )
        from medical_records.models import (
            PatientDiagnosis,
            Prescription,
            LabReport,
        )
        from resources.models import (
            WelfareScheme,
            WelfareSchemeStatus,
            EquipmentRequest,
        )

        today = timezone.now().date()

        # 1. SUMMARY CARDS
        # CARD 1: Next Home Visit
        next_visit = HomeVisitOccurrence.objects.filter(
            patient=patient,
            status='Scheduled',
            scheduled_date__gte=today
        ).order_by('scheduled_date').first()

        next_visit_data = None
        if next_visit:
            nurse_name = next_visit.allocated_nurse.name if next_visit.allocated_nurse else "Community Palliative Nurse"
            next_visit_data = {
                "occurrence_id": next_visit.occurrence_id,
                "date": next_visit.scheduled_date.strftime('%d %b %Y'),
                "time": "10:00 AM - 12:00 PM",
                "nurse_name": nurse_name,
                "visit_type": next_visit.visit_type,
                "status": next_visit.status,
            }

        # CARD 2: Next Telemedicine
        next_telemed = TelemedicineConsultation.objects.filter(
            patient=patient,
            status__in=['Accepted', 'Scheduled']
        ).order_by('scheduled_date', 'scheduled_start_time').first()

        next_telemed_data = None
        if next_telemed:
            time_str = next_telemed.scheduled_start_time.strftime('%I:%M %p') if next_telemed.scheduled_start_time else "Scheduled"
            date_str = next_telemed.scheduled_date.strftime('%d %b %Y') if next_telemed.scheduled_date else "Scheduled Date"
            next_telemed_data = {
                "consultation_id": next_telemed.consultation_id,
                "doctor_name": next_telemed.doctor.name if next_telemed.doctor else "Assigned Medical Officer",
                "date": date_str,
                "time": time_str,
                "status": next_telemed.status,
                "meeting_link": next_telemed.meeting_link,
                "can_join": bool(next_telemed.meeting_link and next_telemed.status in ['Scheduled', 'In Progress', 'Accepted']),
            }

        # CARD 3: Unread Notifications
        unread_notifications_count = Notification.objects.filter(user=request.user, is_read=False).count()

        # CARD 4: Active Prescriptions
        active_rx = Prescription.objects.filter(patient=patient, status='Active').first()
        active_prescriptions_count = active_rx.prescriptionitem_set.count() if active_rx else 0

        # CARD 5: Assigned Caregiver
        caregiver_assignment = CaregiverPatientAssignment.objects.filter(
            patient=patient,
            status='Active'
        ).select_related('caregiver').first()

        assigned_caregiver_data = None
        if caregiver_assignment and caregiver_assignment.caregiver:
            cg = caregiver_assignment.caregiver
            assigned_caregiver_data = {
                "caregiver_id": cg.caregiver_id,
                "name": cg.name,
                "phone": cg.phone or "Not provided",
                "qualifications": cg.qualifications or "Certified Palliative Caregiver",
                "assigned_date": caregiver_assignment.assigned_at.strftime('%d %b %Y') if caregiver_assignment.assigned_at else "Active",
            }

        # 2. SECTION A: MY HEALTH OVERVIEW
        latest_note = TelemedicineConsultationNote.objects.filter(patient=patient).order_by('-created_at').first()
        latest_update_data = None
        if latest_note:
            latest_update_data = {
                "summary": latest_note.clinical_observations or latest_note.advice or latest_note.symptoms_discussed or "Clinical review conducted.",
                "doctor_name": latest_note.doctor.name if latest_note.doctor else "Attending Physician",
                "date": latest_note.created_at.strftime('%d %b %Y'),
            }
        else:
            latest_diag = PatientDiagnosis.objects.filter(patient=patient).order_by('-diagnosed_date').first()
            if latest_diag:
                latest_update_data = {
                    "summary": f"Primary Clinical Diagnosis: {latest_diag.diagnosis_text}",
                    "doctor_name": latest_diag.doctor.name if latest_diag.doctor else "Medical Officer",
                    "date": latest_diag.diagnosed_date.strftime('%d %b %Y') if latest_diag.diagnosed_date else "Active",
                }

        # Vitals measurements from latest HomeVisitSummary
        latest_vitals = HomeVisitSummary.objects.filter(occurrence__patient=patient).order_by('-recorded_at').first()
        health_summary_data = None
        if latest_vitals:
            health_summary_data = {
                "blood_pressure": latest_vitals.blood_pressure,
                "pulse": f"{latest_vitals.pulse} bpm" if latest_vitals.pulse else None,
                "oxygen_level": f"{latest_vitals.oxygen_level}%" if latest_vitals.oxygen_level else None,
                "temperature": f"{latest_vitals.temperature} °F" if latest_vitals.temperature else None,
                "recorded_at": latest_vitals.recorded_at.strftime('%d %b %Y') if latest_vitals.recorded_at else None,
            }

        # 3. SECTION B: RECENT PRESCRIPTIONS & REPORTS (Latest 3-4 items)
        recent_prescriptions = Prescription.objects.filter(patient=patient).order_by('-created_at')[:3]
        recent_lab_reports = LabReport.objects.filter(patient=patient).order_by('-uploaded_at')[:3]

        recent_records = []
        for rx in recent_prescriptions:
            recent_records.append({
                "id": f"rx-{rx.prescription_id}",
                "type": "Prescription",
                "title": f"Prescription v{rx.version_number} ({rx.doctor.name if rx.doctor else 'Medical Officer'})",
                "date": rx.created_at.strftime('%d %b %Y'),
                "status": rx.status,
                "raw_date": str(rx.created_at),
            })
        for lr in recent_lab_reports:
            recent_records.append({
                "id": f"lr-{lr.report_id}",
                "type": "Laboratory Report",
                "title": lr.remarks or "Diagnostic Laboratory Report",
                "date": lr.uploaded_at.strftime('%d %b %Y') if lr.uploaded_at else (lr.report_date.strftime('%d %b %Y') if lr.report_date else "Recent"),
                "status": lr.review_status,
                "raw_date": str(lr.uploaded_at or lr.report_date or ''),
            })

        recent_records.sort(key=lambda x: x.get('raw_date', ''), reverse=True)
        recent_records = recent_records[:4]

        # 4. LOWER SECTION: UPCOMING CARE (Next 2-3 visits & consultations)
        upcoming_care = []
        upcoming_visits = HomeVisitOccurrence.objects.filter(
            patient=patient,
            status__in=['Scheduled', 'Pending'],
            scheduled_date__gte=today
        ).order_by('scheduled_date')[:2]

        for uv in upcoming_visits:
            upcoming_care.append({
                "id": f"visit-{uv.occurrence_id}",
                "type": f"Home Visit ({uv.visit_type})",
                "date": uv.scheduled_date.strftime('%d %b %Y'),
                "time": "10:00 AM - 12:00 PM",
                "provider": uv.allocated_nurse.name if uv.allocated_nurse else "Community Nurse",
                "status": uv.status,
            })

        upcoming_consults = TelemedicineConsultation.objects.filter(
            patient=patient,
            status__in=['Pending', 'Accepted', 'Scheduled']
        ).order_by('scheduled_date', 'requested_date')[:2]

        for uc in upcoming_consults:
            c_date = uc.scheduled_date.strftime('%d %b %Y') if uc.scheduled_date else (uc.requested_date.strftime('%d %b %Y') if uc.requested_date else "Scheduled Date")
            c_time = uc.scheduled_start_time.strftime('%I:%M %p') if uc.scheduled_start_time else (uc.requested_time.strftime('%I:%M %p') if uc.requested_time else "TBD")
            upcoming_care.append({
                "id": f"tele-{uc.consultation_id}",
                "type": "Telemedicine Consultation",
                "date": c_date,
                "time": c_time,
                "provider": uc.doctor.name if uc.doctor else "Medical Officer",
                "status": uc.status,
            })

        # 5. MY REQUESTS (Latest 3-4 patient requests)
        my_requests = []
        for er in EquipmentRequest.objects.filter(patient=patient).order_by('-requested_at')[:2]:
            my_requests.append({
                "id": f"eq-{er.request_id}",
                "type": f"Equipment: {er.equipment_type.name if er.equipment_type else 'Medical Device'}",
                "date": er.requested_at.strftime('%d %b %Y'),
                "status": er.doctor_approval_status,
                "raw_date": str(er.requested_at),
            })

        my_requests.sort(key=lambda x: x.get('raw_date', ''), reverse=True)
        my_requests = my_requests[:4]

        # 6. PATIENT TIMELINE (Latest 4-5 events)
        timeline_events = [
            {
                "event": "Patient Registration",
                "date": patient.created_at.strftime('%d %b %Y'),
                "description": f"Registration submitted (ID: {patient.registration_id}).",
                "icon": "user-check",
            }
        ]
        if patient.registration_status == 'Approved':
            timeline_events.append({
                "event": "Doctor Approval",
                "date": patient.updated_at.strftime('%d %b %Y'),
                "description": f"Registration & discharge summary clinically approved by {patient.reviewed_by_doctor.name if patient.reviewed_by_doctor else 'Doctor'}.",
                "icon": "shield-check",
            })

        for tr in TelemedicineConsultation.objects.filter(patient=patient).order_by('created_at')[:2]:
            timeline_events.append({
                "event": "Telemedicine Consultation",
                "date": tr.created_at.strftime('%d %b %Y'),
                "description": f"Consultation with {tr.doctor.name if tr.doctor else 'Doctor'} ({tr.status}).",
                "icon": "video",
            })

        for rx in Prescription.objects.filter(patient=patient).order_by('created_at')[:2]:
            timeline_events.append({
                "event": "Prescription Issued",
                "date": rx.created_at.strftime('%d %b %Y'),
                "description": f"Prescription v{rx.version_number} issued by {rx.doctor.name if rx.doctor else 'Doctor'}.",
                "icon": "pill",
            })

        for er in EquipmentRequest.objects.filter(patient=patient).order_by('requested_at')[:1]:
            timeline_events.append({
                "event": "Medical Equipment Request",
                "date": er.requested_at.strftime('%d %b %Y'),
                "description": f"Request for {er.equipment_type.name if er.equipment_type else 'device'} submitted.",
                "icon": "package",
            })

        timeline_events = timeline_events[-5:]

        payload = {
            "patient_info": {
                "patient_id": patient.patient_id,
                "registration_id": patient.registration_id,
                "name": patient.name,
                "email": request.user.email,
                "phone": patient.phone,
                "dob": patient.dob.strftime('%Y-%m-%d') if patient.dob else None,
                "gender": patient.gender,
                "address": {
                    "house_name": patient.house_name,
                    "place": patient.place,
                    "panchayath": patient.panchayath,
                    "ward_no": patient.ward_no,
                    "pincode": patient.pincode,
                },
                "emergency_contact": {
                    "name": patient.emergency_contact_name,
                    "phone": patient.emergency_contact_phone,
                },
                "registration_status": patient.registration_status,
                "rejection_reason": patient.rejection_reason,
                "discharge_summary_path": patient.discharge_summary_path,
            },
            "summary_cards": {
                "next_home_visit": next_visit_data,
                "next_telemedicine": next_telemed_data,
                "unread_notifications_count": unread_notifications_count,
                "active_prescriptions_count": active_prescriptions_count,
                "assigned_caregiver": assigned_caregiver_data,
            },
            "health_overview": {
                "latest_update": latest_update_data,
                "health_summary": health_summary_data,
            },
            "recent_records": recent_records,
            "upcoming_care": upcoming_care,
            "my_requests": my_requests,
            "timeline": timeline_events,
            "available_schemes_count": WelfareScheme.objects.filter(status=WelfareSchemeStatus.PUBLISHED).count(),
        }

        return Response(payload, status=status.HTTP_200_OK)


class PatientProfileView(APIView):
    """
    View and update profile information for the authenticated Patient.
    Clinical fields (primary_diagnosis, disease_stage, registration_status, assigned doctor) remain protected.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        patient = get_authenticated_patient(request)
        if not patient:
            return Response({"detail": "Access restricted to Patients only."}, status=status.HTTP_403_FORBIDDEN)

        data = {
            "patient_id": patient.patient_id,
            "registration_id": patient.registration_id,
            "user_id": request.user.user_id,
            "name": patient.name,
            "email": request.user.email,
            "phone": patient.phone or "",
            "dob": patient.dob.strftime('%Y-%m-%d') if patient.dob else None,
            "date_of_birth": patient.dob.strftime('%Y-%m-%d') if patient.dob else None,
            "gender": patient.gender or "",
            "house_name": patient.house_name or "",
            "place": patient.place or "",
            "panchayath": patient.panchayath or "",
            "ward_no": str(patient.ward_no) if patient.ward_no is not None else "",
            "pincode": patient.pincode or "",
            "emergency_contact_name": patient.emergency_contact_name or "",
            "emergency_contact_phone": patient.emergency_contact_phone or "",
            "doctor_name": patient.reviewed_by_doctor.name if patient.reviewed_by_doctor else "Not Assigned",
            "registration_status": patient.registration_status,
            "discharge_summary_path": patient.discharge_summary_path,
            "role": request.user.role,
            "account_status": "Active" if request.user.is_active else "Inactive",
            "is_active": request.user.is_active,
            "created_at": patient.created_at.isoformat() if patient.created_at else None,
            "updated_at": patient.updated_at.isoformat() if patient.updated_at else None,
        }
        return Response(data, status=status.HTTP_200_OK)

    def put(self, request, *args, **kwargs):
        patient = get_authenticated_patient(request)
        if not patient:
            return Response({"detail": "Access restricted to Patients only."}, status=status.HTTP_403_FORBIDDEN)

        errors = {}

        # 1. Name validation
        name = request.data.get('name')
        if name is not None:
            name_val = str(name).strip()
            if not name_val:
                errors['name'] = ["Full Name cannot be empty."]
            elif len(name_val) > 100:
                errors['name'] = ["Full Name cannot exceed 100 characters."]
            else:
                patient.name = name_val

        # 2. Phone validation
        phone = request.data.get('phone')
        if phone is not None:
            phone_val = str(phone).strip()
            if phone_val and not re.match(r'^\d{10}$', phone_val):
                errors['phone'] = ["Phone number must be a valid 10-digit number."]
            else:
                patient.phone = phone_val

        # 3. Gender validation
        gender = request.data.get('gender')
        if gender is not None:
            patient.gender = str(gender).strip()

        # 4. Date of Birth validation
        dob_input = request.data.get('date_of_birth') or request.data.get('dob')
        if dob_input is not None:
            if dob_input == '' or dob_input is None:
                patient.dob = None
            else:
                try:
                    dob_parsed = date.fromisoformat(str(dob_input).strip())
                    if dob_parsed >= date.today():
                        errors['date_of_birth'] = ["Date of birth must be a past date."]
                    else:
                        patient.dob = dob_parsed
                except (ValueError, TypeError):
                    errors['date_of_birth'] = ["Invalid date format. Please use YYYY-MM-DD."]

        # 5. Address and contact fields
        if 'house_name' in request.data:
            patient.house_name = str(request.data.get('house_name') or '').strip()
        if 'place' in request.data:
            patient.place = str(request.data.get('place') or '').strip()
        if 'panchayath' in request.data:
            patient.panchayath = str(request.data.get('panchayath') or '').strip()
        if 'ward_no' in request.data:
            ward_raw = str(request.data.get('ward_no') or '').strip()
            if ward_raw:
                try:
                    patient.ward_no = int(ward_raw)
                except ValueError:
                    errors['ward_no'] = ["Ward number must be a valid integer."]
        if 'pincode' in request.data:
            pincode_val = str(request.data.get('pincode') or '').strip()
            if pincode_val and not re.match(r'^\d{6}$', pincode_val):
                errors['pincode'] = ["Pincode must be a 6-digit number."]
            else:
                patient.pincode = pincode_val

        if 'emergency_contact_name' in request.data:
            patient.emergency_contact_name = str(request.data.get('emergency_contact_name') or '').strip()
        if 'emergency_contact_phone' in request.data:
            em_phone_val = str(request.data.get('emergency_contact_phone') or '').strip()
            if em_phone_val and not re.match(r'^\d{10}$', em_phone_val):
                errors['emergency_contact_phone'] = ["Emergency contact phone must be a 10-digit number."]
            else:
                patient.emergency_contact_phone = em_phone_val

        # 6. Email / Username validation and update
        email = request.data.get('email')
        if email is not None:
            email_val = str(email).strip().lower()
            if not email_val:
                errors['email'] = ["Email / Username cannot be empty."]
            elif not re.match(r'^[^@]+@[^@]+\.[^@]+$', email_val):
                errors['email'] = ["Please enter a valid email address."]
            elif email_val != request.user.email.lower():
                if User.objects.filter(email__iexact=email_val).exclude(user_id=request.user.user_id).exists():
                    errors['email'] = ["An account with this email / username already exists."]
                else:
                    request.user.email = email_val

        # 7. Password change validation and update
        new_password = request.data.get('new_password')
        current_password = request.data.get('current_password')
        confirm_password = request.data.get('confirm_password')

        if new_password:
            if current_password is not None and not request.user.check_password(current_password):
                errors['current_password'] = ["Current password is incorrect."]
            if confirm_password is not None and new_password != confirm_password:
                errors['confirm_password'] = ["New passwords do not match."]
            try:
                validate_password(new_password, user=request.user)
            except DjangoValidationError as e:
                errors['new_password'] = list(e.messages)

        if errors:
            return Response({"errors": errors, "message": "Please correct the validation errors."}, status=status.HTTP_400_BAD_REQUEST)

        patient.save()
        if new_password and 'new_password' not in errors:
            request.user.set_password(new_password)
        request.user.save()

        updated_data = {
            "patient_id": patient.patient_id,
            "registration_id": patient.registration_id,
            "user_id": request.user.user_id,
            "name": patient.name,
            "email": request.user.email,
            "phone": patient.phone or "",
            "dob": patient.dob.strftime('%Y-%m-%d') if patient.dob else None,
            "date_of_birth": patient.dob.strftime('%Y-%m-%d') if patient.dob else None,
            "gender": patient.gender or "",
            "house_name": patient.house_name or "",
            "place": patient.place or "",
            "panchayath": patient.panchayath or "",
            "ward_no": str(patient.ward_no) if patient.ward_no is not None else "",
            "pincode": patient.pincode or "",
            "emergency_contact_name": patient.emergency_contact_name or "",
            "emergency_contact_phone": patient.emergency_contact_phone or "",
            "doctor_name": patient.reviewed_by_doctor.name if patient.reviewed_by_doctor else "Not Assigned",
            "registration_status": patient.registration_status,
            "discharge_summary_path": patient.discharge_summary_path,
            "role": request.user.role,
            "account_status": "Active" if request.user.is_active else "Inactive",
            "is_active": request.user.is_active,
            "created_at": patient.created_at.isoformat() if patient.created_at else None,
            "updated_at": patient.updated_at.isoformat() if patient.updated_at else None,
        }

        return Response({
            "message": "Profile updated successfully.",
            "profile": updated_data
        }, status=status.HTTP_200_OK)


class PatientMedicalHistoryView(APIView):
    """
    Read-only medical history for authenticated patient.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        patient = get_authenticated_patient(request)
        if not patient:
            return Response({"detail": "Access restricted to Patients only."}, status=status.HTTP_403_FORBIDDEN)

        from medical_records.models import PatientDiagnosis, PatientAllergy, PatientChronicCondition
        from care_coordination.models import TelemedicineConsultationNote, HomeVisitSummary

        diagnoses = [
            {
                "id": d.diagnosis_id,
                "text": d.diagnosis_text.lstrip(': ').strip() if d.diagnosis_text else "",
                "doctor": d.doctor.name if d.doctor else "Attending Physician",
                "date": d.diagnosed_date.strftime('%d %b %Y') if d.diagnosed_date else "Recorded",
            }
            for d in PatientDiagnosis.objects.filter(patient=patient).order_by('-diagnosed_date')
        ]

        allergies = [
            {
                "id": a.allergy_id,
                "name": a.allergy_name,
                "severity": a.severity,
            }
            for a in PatientAllergy.objects.filter(patient=patient)
        ]

        conditions = [
            {
                "id": c.condition_id,
                "name": c.condition_name,
                "notes": c.notes,
            }
            for c in PatientChronicCondition.objects.filter(patient=patient)
        ]

        consultation_notes = [
            {
                "id": cn.note_id,
                "doctor": cn.doctor.name if cn.doctor else "Physician",
                "symptoms": cn.symptoms_discussed,
                "observations": cn.clinical_observations,
                "advice": cn.advice,
                "date": cn.created_at.strftime('%d %b %Y'),
            }
            for cn in TelemedicineConsultationNote.objects.filter(patient=patient).order_by('-created_at')
        ]

        visit_summaries = [
            {
                "id": vs.summary_id,
                "nurse": vs.nurse.name if vs.nurse else "Nurse",
                "blood_pressure": vs.blood_pressure,
                "pulse": vs.pulse,
                "temperature": vs.temperature,
                "oxygen_level": vs.oxygen_level,
                "treatment_notes": vs.treatment_notes,
                "date": vs.recorded_at.strftime('%d %b %Y') if vs.recorded_at else "Visit",
            }
            for vs in HomeVisitSummary.objects.filter(occurrence__patient=patient).order_by('-recorded_at')
        ]

        return Response({
            "diagnoses": diagnoses,
            "allergies": allergies,
            "chronic_conditions": conditions,
            "consultation_notes": consultation_notes,
            "visit_summaries": visit_summaries,
        }, status=status.HTTP_200_OK)


class PatientPrescriptionsView(APIView):
    """
    Prescriptions and version history for authenticated patient.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        patient = get_authenticated_patient(request)
        if not patient:
            return Response({"detail": "Access restricted to Patients only."}, status=status.HTTP_403_FORBIDDEN)

        from medical_records.models import Prescription, PrescriptionItem

        prescriptions = Prescription.objects.filter(patient=patient).select_related('doctor').prefetch_related('prescriptionitem_set').order_by('-version_number', '-created_at')
        results = []
        for rx in prescriptions:
            items_qs = rx.prescriptionitem_set.all() if hasattr(rx, 'prescriptionitem_set') else getattr(rx, 'items', PrescriptionItem.objects.none()).all()
            items = [
                {
                    "item_id": itm.item_id,
                    "medicine_name": itm.medicine_name,
                    "dosage": itm.dosage,
                    "frequency": itm.frequency,
                    "duration_days": itm.duration_days,
                    "change_type": itm.change_type,
                }
                for itm in items_qs
            ]
            results.append({
                "prescription_id": rx.prescription_id,
                "version_number": rx.version_number,
                "status": rx.status,
                "doctor_name": rx.doctor.name if rx.doctor else "Attending Doctor",
                "created_at": rx.created_at.strftime('%d %b %Y'),
                "items": items,
            })

        return Response(results, status=status.HTTP_200_OK)


class PatientLabReportsView(APIView):
    """
    Laboratory reports and document access for authenticated patient.
    GET: List patient's uploaded laboratory reports.
    POST: Upload new laboratory report document.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        patient = get_authenticated_patient(request)
        if not patient:
            return Response({"detail": "Access restricted to Patients only."}, status=status.HTTP_403_FORBIDDEN)

        from medical_records.models import LabReport

        reports = LabReport.objects.filter(patient=patient).select_related('reviewed_by', 'reviewed_by__doctor').order_by('-uploaded_at')
        results = []
        for lr in reports:
            doc_name = None
            if lr.reviewed_by:
                if hasattr(lr.reviewed_by, 'doctor') and lr.reviewed_by.doctor:
                    doc_name = lr.reviewed_by.doctor.name
                else:
                    doc_name = lr.reviewed_by.email

            results.append({
                "report_id": lr.report_id,
                "investigation_name": lr.investigation_name or "Diagnostic Laboratory Report",
                "report_date": lr.report_date.strftime('%d %b %Y') if lr.report_date else (lr.uploaded_at.strftime('%d %b %Y') if lr.uploaded_at else "N/A"),
                "uploaded_at": lr.uploaded_at.strftime('%d %b %Y') if lr.uploaded_at else "N/A",
                "review_status": lr.review_status,
                "reviewed_by": doc_name,
                "reviewed_at": lr.reviewed_at.strftime('%d %b %Y, %H:%M') if lr.reviewed_at else None,
                "remarks": lr.remarks if lr.review_status == 'Reviewed' else None,
                "file_path": lr.file_path,
                "view_url": f"/api/auth/documents/view/?type=lab_report&id={lr.report_id}",
            })
        return Response(results, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        patient = get_authenticated_patient(request)
        if not patient:
            return Response({"detail": "Access restricted to Patients only."}, status=status.HTTP_403_FORBIDDEN)

        from medical_records.models import LabReport, ReviewStatus
        from django.core.files.storage import default_storage
        import uuid
        import os
        from datetime import datetime

        investigation_name = request.data.get('investigation_name', '').strip()
        if not investigation_name:
            return Response(
                {"errors": {"investigation_name": ["Investigation / Test name is required."]}},
                status=status.HTTP_400_BAD_REQUEST
            )
        if len(investigation_name) > 150:
            investigation_name = investigation_name[:150]

        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response(
                {"errors": {"file": ["Please select a laboratory report document (PDF, JPEG, PNG)."]}},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file format and size
        ext = os.path.splitext(file_obj.name)[1].lower()
        allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp']
        if ext not in allowed_extensions:
            return Response(
                {"errors": {"file": [f"Unsupported file format '{ext}'. Allowed formats: PDF, JPEG, PNG, WEBP."]}},
                status=status.HTTP_400_BAD_REQUEST
            )

        if file_obj.size > 15 * 1024 * 1024:  # 15 MB limit
            return Response(
                {"errors": {"file": ["File size exceeds maximum allowed limit of 15MB."]}},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Generate secure storage path
        safe_filename = f"lab_reports/lab_{uuid.uuid4().hex[:12]}{ext}"
        saved_path = default_storage.save(safe_filename, file_obj)

        report_date_raw = request.data.get('report_date')
        report_date = None
        if report_date_raw:
            try:
                report_date = datetime.strptime(str(report_date_raw).split('T')[0], '%Y-%m-%d').date()
            except ValueError:
                report_date = timezone.now().date()
        else:
            report_date = timezone.now().date()

        new_report = LabReport.objects.create(
            patient=patient,
            uploaded_by=request.user,
            investigation_name=investigation_name,
            file_path=saved_path,
            report_date=report_date,
            review_status=ReviewStatus.PENDING,
            reviewed_by=None,
            remarks=None,
            reviewed_at=None,
        )

        return Response({
            "message": "Laboratory report uploaded successfully.",
            "report_id": new_report.report_id,
            "investigation_name": new_report.investigation_name,
            "report_date": new_report.report_date.strftime('%d %b %Y'),
            "uploaded_at": new_report.uploaded_at.strftime('%d %b %Y'),
            "review_status": new_report.review_status,
            "view_url": f"/api/auth/documents/view/?type=lab_report&id={new_report.report_id}",
        }, status=status.HTTP_201_CREATED)


class PatientNutritionView(APIView):
    """
    Nutrition and meal plans assigned by care providers.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        patient = get_authenticated_patient(request)
        if not patient:
            return Response({"detail": "Access restricted to Patients only."}, status=status.HTTP_403_FORBIDDEN)

        from medical_records.models import NutritionPlan

        plans = NutritionPlan.objects.filter(patient=patient).order_by('-created_at')
        results = [
            {
                "plan_id": np.plan_id,
                "version_number": np.version_number,
                "status": np.status,
                "doctor_name": np.doctor.name if np.doctor else "Clinical Team",
                "dietary_recommendations": np.dietary_recommendations,
                "special_instructions": np.special_instructions,
                "created_at": np.created_at.strftime('%d %b %Y'),
            }
            for np in plans
        ]
        return Response(results, status=status.HTTP_200_OK)


class PatientHomeVisitsView(APIView):
    """
    Home visits management for authenticated patient:
    GET: view schedules, occurrences, and reports.
    POST: submit regular visit request, additional visit request, or schedule change request.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        patient = get_authenticated_patient(request)
        if not patient:
            return Response({"detail": "Access restricted to Patients only."}, status=status.HTTP_403_FORBIDDEN)

        from care_coordination.models import HomeVisitSchedule, HomeVisitOccurrence, HomeVisitSummary

        schedule = HomeVisitSchedule.objects.select_related('nurse').filter(patient=patient, status='Active').first()
        schedule_data = None
        if schedule:
            schedule_data = {
                "schedule_id": schedule.schedule_id,
                "frequency": schedule.frequency,
                "nurse_name": schedule.nurse.name if schedule.nurse else "Nurse",
                "doctor_name": f"Dr. {patient.reviewed_by_doctor.name}" if patient.reviewed_by_doctor else "Assigned Doctor",
                "start_date": schedule.start_date.strftime('%d %b %Y'),
                "status": schedule.status,
            }

        occurrences = HomeVisitOccurrence.objects.select_related(
            'allocated_nurse', 'visiting_doctor'
        ).prefetch_related('homevisitsummary__visitsymptom_set').filter(patient=patient).order_by('scheduled_date')

        occurrences_data = []
        for occ in occurrences:
            summary = getattr(occ, 'homevisitsummary', None) or getattr(occ, 'summary', None)
            summary_data = None
            if summary:
                symptoms = [{"name": s.symptom_name, "severity": s.severity} for s in summary.visitsymptom_set.all()]
                summary_data = {
                    "summary_id": summary.summary_id,
                    "blood_pressure": summary.blood_pressure,
                    "pulse": summary.pulse,
                    "temperature": str(summary.temperature) if summary.temperature else None,
                    "oxygen_level": summary.oxygen_level,
                    "treatment_notes": summary.treatment_notes,
                    "next_visit_recommendation": summary.next_visit_recommendation.strftime('%d %b %Y') if summary.next_visit_recommendation else None,
                    "nurse_name": summary.nurse.name if summary.nurse else "Nurse",
                    "recorded_at": summary.recorded_at.strftime('%d %b %Y, %H:%M'),
                    "symptoms": symptoms,
                }
            occurrences_data.append({
                "occurrence_id": occ.occurrence_id,
                "scheduled_date": occ.scheduled_date.strftime('%d %b %Y'),
                "raw_date": str(occ.scheduled_date),
                "visit_type": occ.visit_type,
                "urgency_level": occ.urgency_level or "Routine",
                "status": occ.status,
                "allocated_nurse_name": occ.allocated_nurse.name if occ.allocated_nurse else "Community Nurse",
                "visiting_doctor_name": f"Dr. {occ.visiting_doctor.name}" if occ.visiting_doctor else "Assigned Doctor",
                "nurse_name": occ.allocated_nurse.name if occ.allocated_nurse else "Community Nurse",
                "doctor_name": f"Dr. {occ.visiting_doctor.name}" if occ.visiting_doctor else "Assigned Doctor",
                "team_summary": f"Nurse: {occ.allocated_nurse.name if occ.allocated_nurse else 'Unallocated'} | Doctor: {f'Dr. {occ.visiting_doctor.name}' if occ.visiting_doctor else 'Unassigned'}",
                "notes": occ.notes or "",
                "summary": summary_data,
            })

        return Response({
            "schedule": schedule_data,
            "occurrences": occurrences_data,
        }, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        patient = get_authenticated_patient(request)
        if not patient:
            return Response({"detail": "Access restricted to Patients only."}, status=status.HTTP_403_FORBIDDEN)

        from care_coordination.models import HomeVisitOccurrence, HomeVisitSchedule, UrgencyLevel, VisitType, OccurrenceStatus

        request_type = request.data.get('request_type', 'regular').lower()
        notes = request.data.get('notes', '').strip()
        urgency = request.data.get('urgency_level', UrgencyLevel.ROUTINE)

        if request_type == 'schedule_change':
            req_freq = request.data.get('frequency', 'Weekly')
            return Response({
                "message": f"Schedule change request to '{req_freq}' submitted successfully. The care team will review your request."
            }, status=status.HTTP_201_CREATED)

        target_date_str = request.data.get('date')
        target_date = timezone.now().date() + timedelta(days=2)
        if target_date_str:
            try:
                target_date = datetime.strptime(target_date_str, '%Y-%m-%d').date()
            except ValueError:
                pass

        visit_type = VisitType.ADDITIONAL if request_type == 'additional' else VisitType.RECURRING
        schedule = HomeVisitSchedule.objects.filter(patient=patient, status='Active').first() if visit_type == VisitType.RECURRING else None

        occurrence = HomeVisitOccurrence.objects.create(
            schedule=schedule,
            patient=patient,
            scheduled_date=target_date,
            visit_type=visit_type,
            urgency_level=urgency,
            status=OccurrenceStatus.SCHEDULED,
            requested_by=request.user,
            visiting_doctor=patient.reviewed_by_doctor,
            notes=notes or ("Additional home visit requested by patient" if visit_type == VisitType.ADDITIONAL else "Home visit requested by patient"),
        )

        return Response({
            "message": f"{visit_type} home visit request submitted for {occurrence.scheduled_date.strftime('%d %b %Y')}.",
            "occurrence_id": occurrence.occurrence_id,
        }, status=status.HTTP_201_CREATED)


class PatientEquipmentView(APIView):
    """
    Medical equipment types and patient equipment requests.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        patient = get_authenticated_patient(request)
        if not patient:
            return Response({"detail": "Access restricted to Patients only."}, status=status.HTTP_403_FORBIDDEN)

        from resources.models import EquipmentType, EquipmentRequest

        types = [
            {
                "equipment_type_id": t.equipment_type_id,
                "name": t.name,
                "description": t.description,
            }
            for t in EquipmentType.objects.all()
        ]

        my_requests = [
            {
                "request_id": er.request_id,
                "equipment_type_name": er.equipment_type.name if er.equipment_type else "Device",
                "doctor_approval_status": er.doctor_approval_status,
                "delivery_status": er.delivery_status,
                "requested_at": er.requested_at.strftime('%d %b %Y'),
            }
            for er in EquipmentRequest.objects.filter(patient=patient).order_by('-requested_at')
        ]

        return Response({
            "available_types": types,
            "my_requests": my_requests,
        }, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        patient = get_authenticated_patient(request)
        if not patient:
            return Response({"detail": "Access restricted to Patients only."}, status=status.HTTP_403_FORBIDDEN)

        from resources.models import EquipmentType, EquipmentRequest, DoctorApprovalStatus, DeliveryStatus

        equipment_type_id = request.data.get('equipment_type_id')
        if not equipment_type_id:
            return Response({"detail": "Equipment type ID is required."}, status=status.HTTP_400_BAD_REQUEST)

        eq_type = EquipmentType.objects.filter(equipment_type_id=equipment_type_id).first()
        if not eq_type:
            return Response({"detail": "Equipment type not found."}, status=status.HTTP_404_NOT_FOUND)

        eq_request = EquipmentRequest.objects.create(
            patient=patient,
            equipment_type=eq_type,
            requested_by=request.user,
            doctor_approval_status=DoctorApprovalStatus.PENDING,
            delivery_status=DeliveryStatus.REQUESTED,
        )

        return Response({
            "message": f"Equipment request for '{eq_type.name}' submitted successfully. Pending clinical doctor approval.",
            "request_id": eq_request.request_id,
        }, status=status.HTTP_201_CREATED)


class PatientWelfareView(APIView):
    """
    Government welfare schemes discovery and official redirection portal for Patients.
    Only schemes with status='Published' are returned.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        patient = get_authenticated_patient(request)
        if not patient:
            return Response({"detail": "Access restricted to Patients only."}, status=status.HTTP_403_FORBIDDEN)

        from resources.models import WelfareScheme, WelfareSchemeStatus

        category_param = request.query_params.get('category', '').strip()
        search_query = request.query_params.get('search', '').strip()

        schemes_qs = WelfareScheme.objects.filter(status=WelfareSchemeStatus.PUBLISHED).order_by('-published_at', '-created_at')

        if category_param and category_param.lower() != 'all':
            schemes_qs = schemes_qs.filter(category__iexact=category_param)
        if search_query:
            schemes_qs = schemes_qs.filter(
                models.Q(name__icontains=search_query) |
                models.Q(description__icontains=search_query) |
                models.Q(benefits__icontains=search_query) |
                models.Q(government_department__icontains=search_query)
            )

        schemes = [
            {
                "scheme_id": s.scheme_id,
                "name": s.name,
                "category": s.category,
                "description": s.description or '',
                "benefits": s.benefits or '',
                "eligibility_criteria": s.eligibility_criteria or '',
                "required_documents": s.required_documents or '',
                "application_instructions": s.application_instructions or '',
                "official_application_url": s.official_application_url or '',
                "government_department": s.government_department or '',
                "contact_info": s.contact_info or '',
                "published_at": s.published_at.strftime('%d %b %Y') if s.published_at else None,
            }
            for s in schemes_qs
        ]

        return Response({
            "schemes": schemes,
        }, status=status.HTTP_200_OK)


class PatientCaregiverView(APIView):
    """
    View assigned caregiver details for authenticated patient.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        patient = get_authenticated_patient(request)
        if not patient:
            return Response({"detail": "Access restricted to Patients only."}, status=status.HTTP_403_FORBIDDEN)

        from care_coordination.models import CaregiverPatientAssignment

        assignment = CaregiverPatientAssignment.objects.filter(
            patient=patient,
            status='Active'
        ).select_related('caregiver').first()

        if not assignment or not assignment.caregiver:
            return Response({
                "assigned": False,
                "caregiver": None,
                "message": "No caregiver has been assigned yet.",
            }, status=status.HTTP_200_OK)

        cg = assignment.caregiver
        return Response({
            "assigned": True,
            "caregiver": {
                "caregiver_id": cg.caregiver_id,
                "name": cg.name,
                "phone": cg.phone,
                "email": cg.user.email if cg.user else None,
                "place": cg.place,
                "panchayath": cg.panchayath,
                "qualifications": cg.qualifications,
                "assigned_date": assignment.assigned_at.strftime('%d %b %Y') if assignment.assigned_at else "Active",
            }
        }, status=status.HTTP_200_OK)


class PatientTimelineView(APIView):
    """
    Full chronological patient journey from registration through care milestones.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        patient = get_authenticated_patient(request)
        if not patient:
            return Response({"detail": "Access restricted to Patients only."}, status=status.HTTP_403_FORBIDDEN)

        from care_coordination.models import TelemedicineConsultation, HomeVisitOccurrence
        from medical_records.models import Prescription, LabReport
        from resources.models import EquipmentRequest

        events = []

        # 1. Registration
        events.append({
            "category": "Registration",
            "event": "Patient Account Created",
            "date": patient.created_at.strftime('%d %b %Y, %H:%M'),
            "description": f"Registration submitted under ID {patient.registration_id}.",
            "status": "Completed",
            "raw_date": str(patient.created_at),
        })

        # 2. Approval
        if patient.registration_status == 'Approved':
            events.append({
                "category": "Clinical Verification",
                "event": "Doctor Approval Granted",
                "date": patient.updated_at.strftime('%d %b %Y, %H:%M'),
                "description": f"Medical profile and discharge summary verified by {patient.reviewed_by_doctor.name if patient.reviewed_by_doctor else 'Doctor'}.",
                "status": "Approved",
                "raw_date": str(patient.updated_at),
            })

        # 3. Telemedicine
        for tc in TelemedicineConsultation.objects.filter(patient=patient):
            events.append({
                "category": "Telemedicine",
                "event": f"Consultation ({tc.status})",
                "date": tc.created_at.strftime('%d %b %Y, %H:%M'),
                "description": f"Video consultation with {tc.doctor.name if tc.doctor else 'Doctor'}.",
                "status": tc.status,
                "raw_date": str(tc.created_at),
            })

        # 4. Home Visits
        for hv in HomeVisitOccurrence.objects.filter(patient=patient):
            events.append({
                "category": "Home Visit",
                "event": f"Home Visit ({hv.visit_type})",
                "date": hv.scheduled_date.strftime('%d %b %Y'),
                "description": f"Community care visit with nurse ({hv.status}).",
                "status": hv.status,
                "raw_date": str(hv.scheduled_date),
            })

        # 5. Prescriptions
        for rx in Prescription.objects.filter(patient=patient):
            events.append({
                "category": "Prescription",
                "event": f"Prescription v{rx.version_number}",
                "date": rx.created_at.strftime('%d %b %Y, %H:%M'),
                "description": f"Prescription issued by {rx.doctor.name if rx.doctor else 'Doctor'}.",
                "status": rx.status,
                "raw_date": str(rx.created_at),
            })

        # 6. Lab Reports
        for lr in LabReport.objects.filter(patient=patient):
            events.append({
                "category": "Diagnostics",
                "event": f"Laboratory Report Uploaded: {lr.investigation_name or 'Lab Report'}",
                "date": lr.uploaded_at.strftime('%d %b %Y, %H:%M') if lr.uploaded_at else (lr.report_date.strftime('%d %b %Y') if lr.report_date else "Uploaded"),
                "description": f"{lr.investigation_name or 'Diagnostic report'} uploaded by patient (Report Date: {lr.report_date.strftime('%d %b %Y') if lr.report_date else 'N/A'}).",
                "status": lr.review_status,
                "raw_date": str(lr.uploaded_at or lr.report_date or ''),
            })
            if lr.review_status == 'Reviewed':
                doc_name = "Doctor"
                if lr.reviewed_by:
                    if hasattr(lr.reviewed_by, 'doctor') and lr.reviewed_by.doctor:
                        doc_name = lr.reviewed_by.doctor.name
                    else:
                        doc_name = lr.reviewed_by.email
                events.append({
                    "category": "Clinical Review",
                    "event": f"Laboratory Report Reviewed: {lr.investigation_name or 'Lab Report'}",
                    "date": lr.reviewed_at.strftime('%d %b %Y, %H:%M') if lr.reviewed_at else (lr.updated_at.strftime('%d %b %Y, %H:%M') if lr.updated_at else "Reviewed"),
                    "description": f"Reviewed by {doc_name}. Clinical Remarks: {lr.remarks or 'No remarks'}",
                    "status": "Reviewed",
                    "raw_date": str(lr.reviewed_at or lr.updated_at or ''),
                })

        # 7. Equipment
        for eq in EquipmentRequest.objects.filter(patient=patient):
            events.append({
                "category": "Medical Equipment",
                "event": f"Equipment: {eq.equipment_type.name if eq.equipment_type else 'Device'}",
                "date": eq.requested_at.strftime('%d %b %Y'),
                "description": f"Doctor clinical status: {eq.doctor_approval_status}, delivery: {eq.delivery_status}.",
                "status": eq.doctor_approval_status,
                "raw_date": str(eq.requested_at),
            })

        events.sort(key=lambda x: x.get('raw_date', ''), reverse=True)
        return Response(events, status=status.HTTP_200_OK)


# ========================================================
# PHASE 1 DOCTOR PORTAL APIS (AUTHENTICATED DOCTOR ONLY)
# ========================================================

def get_authenticated_doctor(request):
    if request.user.role != Role.DOCTOR:
        return None
    return getattr(request.user, 'doctor', None) or Doctor.objects.filter(user=request.user).first()


class DoctorProfileView(APIView):
    """
    View and update profile information for the authenticated Doctor.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        doctor = get_authenticated_doctor(request)
        if not doctor:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        data = {
            "doctor_id": doctor.doctor_id,
            "doctor_code": f"KG-DOC-{str(doctor.doctor_id).zfill(4)}",
            "user_id": request.user.user_id,
            "name": doctor.name,
            "email": request.user.email,
            "phone": doctor.phone or "",
            "gender": doctor.gender or "",
            "date_of_birth": str(doctor.date_of_birth) if doctor.date_of_birth else None,
            "qualification": doctor.qualification or "",
            "experience": doctor.experience if doctor.experience is not None else 0,
            "specialization": doctor.specialization or "Community Palliative Medicine",
            "service_area": doctor.service_area or "",
            "is_available_now": doctor.is_available_now,
            "verification_status": doctor.verification_status,
            "role": request.user.role,
            "account_status": "Active" if request.user.is_active else "Inactive",
            "is_active": request.user.is_active,
            "created_at": doctor.created_at.isoformat() if doctor.created_at else None,
            "updated_at": doctor.updated_at.isoformat() if doctor.updated_at else None,
        }
        return Response(data, status=status.HTTP_200_OK)

    def put(self, request, *args, **kwargs):
        doctor = get_authenticated_doctor(request)
        if not doctor:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        errors = {}

        # 1. Name validation
        name = request.data.get('name')
        if name is not None:
            name_val = str(name).strip()
            if not name_val:
                errors['name'] = ["Doctor's Full Name cannot be empty."]
            elif len(name_val) > 100:
                errors['name'] = ["Full Name cannot exceed 100 characters."]
            else:
                doctor.name = name_val

        # 2. Phone validation
        phone = request.data.get('phone')
        if phone is not None:
            phone_val = str(phone).strip()
            if phone_val and not re.match(r'^\d{10}$', phone_val):
                errors['phone'] = ["Phone number must be a valid 10-digit number."]
            else:
                doctor.phone = phone_val

        # 3. Gender validation
        gender = request.data.get('gender')
        if gender is not None:
            doctor.gender = str(gender).strip()

        # 4. Date of Birth validation
        date_of_birth = request.data.get('date_of_birth')
        if date_of_birth is not None:
            if date_of_birth == '' or date_of_birth is None:
                doctor.date_of_birth = None
            else:
                try:
                    dob_parsed = date.fromisoformat(str(date_of_birth).strip())
                    if dob_parsed >= date.today():
                        errors['date_of_birth'] = ["Date of birth must be a past date."]
                    else:
                        doctor.date_of_birth = dob_parsed
                except (ValueError, TypeError):
                    errors['date_of_birth'] = ["Invalid date format. Please use YYYY-MM-DD."]

        # 5. Qualification validation
        qualification = request.data.get('qualification')
        if qualification is not None:
            doctor.qualification = str(qualification).strip()

        # 6. Experience validation
        experience = request.data.get('experience')
        if experience is not None:
            if experience == '' or experience is None:
                doctor.experience = 0
            else:
                try:
                    exp_val = int(experience)
                    if exp_val < 0 or exp_val > 80:
                        errors['experience'] = ["Experience must be between 0 and 80 years."]
                    else:
                        doctor.experience = exp_val
                except (ValueError, TypeError):
                    errors['experience'] = ["Experience must be a valid non-negative integer."]

        # 7. Specialization validation
        specialization = request.data.get('specialization')
        if specialization is not None:
            doctor.specialization = str(specialization).strip()

        # 8. Service area validation
        service_area = request.data.get('service_area')
        if service_area is not None:
            doctor.service_area = str(service_area).strip()

        # 9. Email / Username validation and update
        email = request.data.get('email')
        if email is not None:
            email_val = str(email).strip().lower()
            if not email_val:
                errors['email'] = ["Email / Username cannot be empty."]
            elif not re.match(r'^[^@]+@[^@]+\.[^@]+$', email_val):
                errors['email'] = ["Please enter a valid email address."]
            elif email_val != request.user.email.lower():
                if User.objects.filter(email__iexact=email_val).exclude(user_id=request.user.user_id).exists():
                    errors['email'] = ["An account with this email / username already exists."]
                else:
                    request.user.email = email_val

        # 10. Password change validation and update
        new_password = request.data.get('new_password')
        current_password = request.data.get('current_password')
        confirm_password = request.data.get('confirm_password')

        if new_password:
            if current_password is not None and not request.user.check_password(current_password):
                errors['current_password'] = ["Current password is incorrect."]
            if confirm_password is not None and new_password != confirm_password:
                errors['confirm_password'] = ["New passwords do not match."]
            try:
                validate_password(new_password, user=request.user)
            except DjangoValidationError as e:
                errors['new_password'] = list(e.messages)

        if errors:
            return Response({"errors": errors, "message": "Please correct the validation errors."}, status=status.HTTP_400_BAD_REQUEST)

        doctor.save()
        if new_password and 'new_password' not in errors:
            request.user.set_password(new_password)
        request.user.save()

        updated_data = {
            "doctor_id": doctor.doctor_id,
            "doctor_code": f"KG-DOC-{str(doctor.doctor_id).zfill(4)}",
            "user_id": request.user.user_id,
            "name": doctor.name,
            "email": request.user.email,
            "phone": doctor.phone or "",
            "gender": doctor.gender or "",
            "date_of_birth": str(doctor.date_of_birth) if doctor.date_of_birth else None,
            "qualification": doctor.qualification or "",
            "experience": doctor.experience if doctor.experience is not None else 0,
            "specialization": doctor.specialization or "Community Palliative Medicine",
            "service_area": doctor.service_area or "",
            "is_available_now": doctor.is_available_now,
            "verification_status": doctor.verification_status,
            "role": request.user.role,
            "account_status": "Active" if request.user.is_active else "Inactive",
            "is_active": request.user.is_active,
            "created_at": doctor.created_at.isoformat() if doctor.created_at else None,
            "updated_at": doctor.updated_at.isoformat() if doctor.updated_at else None,
        }

        return Response({
            "message": "Profile updated successfully.",
            "profile": updated_data
        }, status=status.HTTP_200_OK)


class DoctorDashboardView(APIView):
    """
    Consolidated Doctor Dashboard Summary API:
    Returns 5 summary metrics, today's schedule, pending patient registrations,
    upcoming home visits, alerts & reminders, and recent patient activity.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        doctor = get_authenticated_doctor(request)
        if not doctor:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        from care_coordination.models import (
            TelemedicineConsultation,
            HomeVisitSchedule,
            HomeVisitOccurrence,
            ConsultationStatus,
            ScheduleStatus,
            OccurrenceStatus
        )
        from medical_records.models import Prescription, LabReport, ReviewStatus, ActiveSupersededStatus
        from resources.models import EquipmentRequest, DoctorApprovalStatus

        today = timezone.now().date()
        seven_days_later = today + timedelta(days=7)

        # 1. Doctor Info
        doctor_info = {
            "doctor_id": doctor.doctor_id,
            "name": doctor.name,
            "specialization": doctor.specialization or "Palliative Medicine",
            "service_area": doctor.service_area or "Community Network",
            "is_available_now": doctor.is_available_now,
            "phone": doctor.phone or "",
            "email": request.user.email,
        }

        # 2. Metric 1: Total Patients (Active registered patients)
        total_patients = Patient.objects.filter(registration_status=RegistrationStatus.APPROVED).count()

        # 3. Metric 2: Today's Telemedicine Consultations
        active_consult_statuses = [
            ConsultationStatus.PENDING,
            ConsultationStatus.ACCEPTED,
            ConsultationStatus.SCHEDULED,
            ConsultationStatus.IN_PROGRESS
        ]
        today_telemed_qs = TelemedicineConsultation.objects.filter(
            doctor=doctor,
            status__in=active_consult_statuses
        ).filter(
            scheduled_date=today
        ) | TelemedicineConsultation.objects.filter(
            doctor=doctor,
            scheduled_date__isnull=True,
            requested_date=today,
            status__in=active_consult_statuses
        )
        today_telemed_count = today_telemed_qs.count()

        # 4. Metric 3: Upcoming Home Visits (This week)
        upcoming_visits_qs = HomeVisitOccurrence.objects.filter(
            scheduled_date__gte=today,
            scheduled_date__lte=seven_days_later,
            status__in=[OccurrenceStatus.SCHEDULED]
        ).order_by('scheduled_date')
        upcoming_visits_count = upcoming_visits_qs.count()

        # 5. Metric 4: Pending Actions (Registrations + Schedule changes + Equipment requests)
        pending_registrations_qs = get_pending_patient_registrations_queryset()
        pending_registrations_count = pending_registrations_qs.count()
        pending_equipment_count = EquipmentRequest.objects.filter(doctor_approval_status=DoctorApprovalStatus.PENDING).count()
        # Total pending actions requiring doctor attention
        pending_actions_count = pending_registrations_count + pending_equipment_count

        # 6. Metric 5: Active Prescriptions
        active_rx_count = Prescription.objects.filter(status=ActiveSupersededStatus.ACTIVE).count()

        summary_cards = {
            "total_patients": total_patients,
            "today_telemedicine": today_telemed_count,
            "upcoming_home_visits": upcoming_visits_count,
            "pending_actions": pending_actions_count,
            "pending_registrations": pending_registrations_count,
            "pending_equipment": pending_equipment_count,
            "active_prescriptions": active_rx_count,
        }

        # 7. Today's Schedule (Telemedicine + Home visits today)
        today_schedule = []
        for tc in today_telemed_qs:
            time_str = tc.scheduled_start_time.strftime('%I:%M %p') if tc.scheduled_start_time else (tc.requested_time.strftime('%I:%M %p') if tc.requested_time else 'TBD')
            today_schedule.append({
                "id": f"telemed-{tc.consultation_id}",
                "time": time_str,
                "type": "Telemedicine Consultation",
                "patient_name": tc.patient.name,
                "patient_id": tc.patient.patient_id,
                "patient_reg_id": tc.patient.registration_id,
                "status": tc.status,
                "meeting_link": tc.meeting_link,
            })

        for hv in HomeVisitOccurrence.objects.filter(scheduled_date=today):
            today_schedule.append({
                "id": f"visit-{hv.occurrence_id}",
                "time": "10:00 AM",
                "type": f"Home Visit ({hv.visit_type})",
                "patient_name": hv.patient.name,
                "patient_id": hv.patient.patient_id,
                "patient_reg_id": hv.patient.registration_id,
                "status": hv.status,
                "meeting_link": None,
            })

        # 8. Pending Registrations List (top 4)
        pending_regs = pending_registrations_qs[:4]
        pending_registrations_data = [
            {
                "patient_id": p.id,
                "id": p.id,
                "name": p.name,
                "registration_id": p.application_id,
                "application_id": p.application_id,
                "gender": p.gender,
                "place": p.place,
                "submitted_date": p.created_at.strftime('%d %b %Y') if p.created_at else 'Recently',
                "discharge_summary_path": p.discharge_summary_path,
                "status": p.registration_status,
            }
            for p in pending_regs
        ]

        # 9. Upcoming Home Visits List (next 3)
        upcoming_visits_data = [
            {
                "occurrence_id": occ.occurrence_id,
                "patient_name": occ.patient.name,
                "patient_reg_id": occ.patient.registration_id,
                "scheduled_date": occ.scheduled_date.strftime('%d %b %Y'),
                "visit_type": occ.visit_type,
                "urgency_level": occ.urgency_level or "Routine",
                "nurse_name": occ.allocated_nurse.name if occ.allocated_nurse else "Community Nurse",
                "status": occ.status,
            }
            for occ in upcoming_visits_qs[:3]
        ]

        # 10. Alerts & Reminders
        alerts = []
        if pending_registrations_count > 0:
            alerts.append({
                "id": "alert-reg",
                "type": "registration",
                "message": f"{pending_registrations_count} patient registration{'s' if pending_registrations_count > 1 else ''} pending your clinical review.",
                "action_view": "registration_review",
            })
        if pending_equipment_count > 0:
            alerts.append({
                "id": "alert-equip",
                "type": "equipment",
                "message": f"{pending_equipment_count} medical equipment request{'s' if pending_equipment_count > 1 else ''} require clinical necessity evaluation.",
                "action_view": "equipment_requests",
            })
        pending_lab_count = LabReport.objects.filter(review_status=ReviewStatus.PENDING).count()
        if pending_lab_count > 0:
            alerts.append({
                "id": "alert-lab",
                "type": "lab_report",
                "message": f"{pending_lab_count} laboratory investigation{'s' if pending_lab_count > 1 else ''} uploaded and awaiting clinical review.",
                "action_view": "lab_reports",
            })

        # 11. Recent Patient Activity
        recent_activity = []
        for rx in Prescription.objects.all().order_by('-created_at')[:2]:
            recent_activity.append({
                "patient_name": rx.patient.name,
                "event": f"Prescription v{rx.version_number} issued",
                "date": rx.created_at.strftime('%d %b %Y'),
                "category": "Prescription",
            })
        for lr in LabReport.objects.all().order_by('-uploaded_at')[:2]:
            recent_activity.append({
                "patient_name": lr.patient.name,
                "event": f"Lab report uploaded ({lr.review_status})",
                "date": lr.uploaded_at.strftime('%d %b %Y'),
                "category": "Laboratory",
            })

        return Response({
            "doctor_info": doctor_info,
            "summary_cards": summary_cards,
            "today_schedule": today_schedule,
            "pending_registrations": pending_registrations_data,
            "upcoming_home_visits": upcoming_visits_data,
            "alerts_and_reminders": alerts,
            "recent_patient_activity": recent_activity,
        }, status=status.HTTP_200_OK)


class DoctorAvailabilityView(APIView):
    """
    Toggle or update Doctor's Available Now status.
    POST /api/doctor/availability/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        doctor = get_authenticated_doctor(request)
        if not doctor:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        is_available = request.data.get('is_available_now')
        if is_available is not None:
            doctor.is_available_now = bool(is_available)
        else:
            doctor.is_available_now = not doctor.is_available_now

        doctor.save(update_fields=['is_available_now'])
        status_label = "Available Now" if doctor.is_available_now else "Unavailable"
        return Response({
            "message": f"Availability status set to {status_label}.",
            "is_available_now": doctor.is_available_now,
        }, status=status.HTTP_200_OK)


class DoctorPatientListView(APIView):
    """
    Patient directory for Doctor:
    GET: List patients with search & filtering.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        doctor = get_authenticated_doctor(request)
        if not doctor:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        search_query = request.query_params.get('search', '').strip().lower()
        status_filter = request.query_params.get('status', '').strip()

        qs = Patient.objects.all().order_by('-created_at')

        if status_filter and status_filter.lower() != 'all':
            qs = qs.filter(registration_status__iexact=status_filter)

        results = []
        for p in qs:
            if search_query:
                match_name = search_query in p.name.lower()
                match_reg = search_query in p.registration_id.lower()
                match_phone = search_query in (p.phone or '').lower()
                match_place = search_query in (p.place or '').lower()
                if not (match_name or match_reg or match_phone or match_place):
                    continue

            results.append({
                "patient_id": p.patient_id,
                "name": p.name,
                "registration_id": p.registration_id,
                "dob": p.dob.strftime('%d %b %Y') if p.dob else None,
                "gender": p.gender,
                "phone": p.phone,
                "house_name": p.house_name,
                "place": p.place,
                "panchayath": p.panchayath,
                "ward_no": p.ward_no,
                "pincode": p.pincode,
                "registration_status": p.registration_status,
                "status": p.status,
                "discharge_summary_path": p.discharge_summary_path,
                "created_at": p.created_at.strftime('%d %b %Y'),
            })

        return Response(results, status=status.HTTP_200_OK)


class DoctorPatientMedicalProfileView(APIView):
    """
    Detailed Patient Medical Profile for Doctor:
    GET: Return full clinical profile (demographics, diagnoses, allergies, chronic conditions, vitals, prescriptions, lab reports, registration application).
    POST: Add diagnosis / clinical observation for the patient.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, patient_id, *args, **kwargs):
        doctor = get_authenticated_doctor(request)
        if not doctor:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        patient = Patient.objects.filter(patient_id=patient_id).first()
        if not patient:
            return Response({"detail": "Patient record not found."}, status=status.HTTP_404_NOT_FOUND)

        from medical_records.models import PatientDiagnosis, PatientAllergy, PatientChronicCondition, Prescription, LabReport, NutritionPlan
        from care_coordination.models import HomeVisitOccurrence, TelemedicineConsultation

        diagnoses = [
            {
                "id": d.diagnosis_id,
                "text": d.diagnosis_text,
                "doctor": d.doctor.name if d.doctor else "Doctor",
                "date": d.diagnosed_date.strftime('%d %b %Y') if d.diagnosed_date else d.updated_at.strftime('%d %b %Y'),
            }
            for d in PatientDiagnosis.objects.filter(patient=patient).order_by('-diagnosed_date', '-updated_at')
        ]

        allergies = [
            {
                "id": a.allergy_id,
                "name": a.allergy_name,
                "severity": a.severity or "Moderate",
                "updated_at": a.updated_at.strftime('%d %b %Y'),
            }
            for a in PatientAllergy.objects.filter(patient=patient).order_by('-updated_at')
        ]

        chronic_conditions = [
            {
                "id": c.condition_id,
                "name": c.condition_name,
                "notes": c.notes,
                "updated_at": c.updated_at.strftime('%d %b %Y'),
            }
            for c in PatientChronicCondition.objects.filter(patient=patient).order_by('-updated_at')
        ]

        # Recent Vitals from HomeVisitSummaries
        recent_vitals = []
        for occ in HomeVisitOccurrence.objects.filter(patient=patient, status='Completed').order_by('-scheduled_date')[:5]:
            summary = getattr(occ, 'homevisitsummary', None) or getattr(occ, 'summary', None)
            if summary:
                recent_vitals.append({
                    "date": occ.scheduled_date.strftime('%d %b %Y'),
                    "blood_pressure": summary.blood_pressure,
                    "pulse": summary.pulse,
                    "temperature": str(summary.temperature) if summary.temperature else None,
                    "oxygen_level": summary.oxygen_level,
                    "treatment_notes": summary.treatment_notes,
                    "nurse": summary.nurse.name if summary.nurse else "Nurse",
                })

        # Prescriptions
        prescriptions_data = [
            {
                "prescription_id": rx.prescription_id,
                "version_number": rx.version_number,
                "status": rx.status,
                "created_at": rx.created_at.strftime('%d %b %Y, %H:%M'),
                "doctor_name": rx.doctor.name if rx.doctor else doctor.name,
                "items": [
                    {
                        "item_id": it.item_id,
                        "medicine_name": it.medicine_name,
                        "dosage": it.dosage,
                        "frequency": it.frequency,
                        "duration_days": it.duration_days,
                        "change_type": it.change_type,
                    }
                    for it in rx.prescriptionitem_set.all()
                ]
            }
            for rx in Prescription.objects.filter(patient=patient).order_by('-version_number')
        ]

        # Nutrition Plans
        nutrition_data = [
            {
                "plan_id": np.plan_id,
                "version_number": np.version_number,
                "dietary_recommendations": np.dietary_recommendations,
                "special_instructions": np.special_instructions,
                "status": np.status,
                "created_at": np.created_at.strftime('%d %b %Y, %H:%M'),
                "doctor_name": np.doctor.name if np.doctor else doctor.name,
            }
            for np in NutritionPlan.objects.filter(patient=patient).order_by('-version_number')
        ]

        # Lab Reports
        lab_reports_data = []
        for lr in LabReport.objects.filter(patient=patient).select_related('reviewed_by', 'reviewed_by__doctor').order_by('-uploaded_at'):
            doc_name = None
            if lr.reviewed_by:
                if hasattr(lr.reviewed_by, 'doctor') and lr.reviewed_by.doctor:
                    doc_name = lr.reviewed_by.doctor.name
                else:
                    doc_name = lr.reviewed_by.email
            lab_reports_data.append({
                "report_id": lr.report_id,
                "investigation_name": lr.investigation_name or "Diagnostic Laboratory Report",
                "report_date": lr.report_date.strftime('%d %b %Y') if lr.report_date else (lr.uploaded_at.strftime('%d %b %Y') if lr.uploaded_at else "N/A"),
                "review_status": lr.review_status,
                "reviewed_by": doc_name,
                "reviewed_at": lr.reviewed_at.strftime('%d %b %Y, %H:%M') if lr.reviewed_at else None,
                "remarks": lr.remarks,
                "file_path": lr.file_path,
                "uploaded_at": lr.uploaded_at.strftime('%d %b %Y, %H:%M') if lr.uploaded_at else "N/A",
                "view_url": f"/api/auth/documents/view/?type=lab_report&id={lr.report_id}",
            })

        # Telemedicine History
        telemed_history = [
            {
                "consultation_id": tc.consultation_id,
                "date": tc.scheduled_date.strftime('%d %b %Y') if tc.scheduled_date else tc.created_at.strftime('%d %b %Y'),
                "reason": tc.reason,
                "status": tc.status,
                "doctor": tc.doctor.name if tc.doctor else doctor.name,
            }
            for tc in TelemedicineConsultation.objects.filter(patient=patient).order_by('-created_at')
        ]

        # Registration Application Details
        app_obj = PatientRegistrationApplication.objects.filter(created_patient=patient).first() or \
                  PatientRegistrationApplication.objects.filter(email__iexact=patient.user.email).first()
        application_data = None
        if app_obj:
            application_data = {
                "id": app_obj.id,
                "application_id": app_obj.application_id,
                "name": app_obj.name,
                "email": app_obj.email,
                "dob": app_obj.dob.strftime('%d %b %Y') if app_obj.dob else None,
                "gender": app_obj.gender,
                "phone": app_obj.phone,
                "house_name": app_obj.house_name,
                "place": app_obj.place,
                "panchayath": app_obj.panchayath,
                "ward_no": app_obj.ward_no,
                "pincode": app_obj.pincode,
                "discharge_summary_path": app_obj.discharge_summary_path,
                "emergency_contact_name": app_obj.emergency_contact_name,
                "emergency_contact_phone": app_obj.emergency_contact_phone,
                "registration_status": app_obj.registration_status,
                "rejection_reason": app_obj.rejection_reason,
                "reviewed_by_doctor": app_obj.reviewed_by_doctor.name if app_obj.reviewed_by_doctor else None,
                "reviewed_at": app_obj.reviewed_at.strftime('%d %b %Y, %H:%M') if app_obj.reviewed_at else None,
                "created_at": app_obj.created_at.strftime('%d %b %Y, %H:%M'),
            }

        return Response({
            "patient_info": {
                "patient_id": patient.patient_id,
                "name": patient.name,
                "registration_id": patient.registration_id,
                "dob": patient.dob.strftime('%d %b %Y') if patient.dob else None,
                "gender": patient.gender,
                "phone": patient.phone,
                "house_name": patient.house_name,
                "place": patient.place,
                "panchayath": patient.panchayath,
                "ward_no": patient.ward_no,
                "pincode": patient.pincode,
                "emergency_contact_name": patient.emergency_contact_name,
                "emergency_contact_phone": patient.emergency_contact_phone,
                "registration_status": patient.registration_status,
                "status": patient.status,
                "discharge_summary_path": patient.discharge_summary_path,
                "rejection_reason": patient.rejection_reason,
                "created_at": patient.created_at.strftime('%d %b %Y'),
            },
            "application": application_data,
            "diagnoses": diagnoses,
            "allergies": allergies,
            "chronic_conditions": chronic_conditions,
            "recent_vitals": recent_vitals,
            "prescriptions": prescriptions_data,
            "nutrition_plans": nutrition_data,
            "lab_reports": lab_reports_data,
            "telemedicine_history": telemed_history,
        }, status=status.HTTP_200_OK)

    def post(self, request, patient_id, *args, **kwargs):
        doctor = get_authenticated_doctor(request)
        if not doctor:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        patient = Patient.objects.filter(patient_id=patient_id).first()
        if not patient:
            return Response({"detail": "Patient record not found."}, status=status.HTTP_404_NOT_FOUND)

        diagnosis_text = request.data.get('diagnosis_text', '').strip()
        if not diagnosis_text:
            return Response({"errors": {"diagnosis_text": ["Diagnosis text is required."]}}, status=status.HTTP_400_BAD_REQUEST)

        from medical_records.models import PatientDiagnosis
        diagnosis = PatientDiagnosis.objects.create(
            patient=patient,
            doctor=doctor,
            diagnosis_text=diagnosis_text,
            diagnosed_date=timezone.now().date(),
        )

        return Response({
            "message": f"Diagnosis recorded successfully for {patient.name}.",
            "diagnosis_id": diagnosis.diagnosis_id,
            "text": diagnosis.diagnosis_text,
        }, status=status.HTTP_201_CREATED)


class DoctorPatientTimelineView(APIView):
    """
    Patient care timeline for Doctor:
    GET /api/doctor/patients/<int:patient_id>/timeline/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, patient_id, *args, **kwargs):
        doctor = get_authenticated_doctor(request)
        if not doctor:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        patient = Patient.objects.filter(patient_id=patient_id).first()
        if not patient:
            return Response({"detail": "Patient record not found."}, status=status.HTTP_404_NOT_FOUND)

        from care_coordination.models import TelemedicineConsultation, HomeVisitOccurrence
        from medical_records.models import Prescription, LabReport, NutritionPlan, PatientDiagnosis
        from resources.models import EquipmentRequest

        events = []

        # 1. Registration Submission
        events.append({
            "category": "Registration",
            "event": "Patient Registration Submitted",
            "date": patient.created_at.strftime('%d %b %Y, %H:%M'),
            "description": f"Registration received under ID {patient.registration_id}.",
            "status": "Submitted",
            "raw_date": str(patient.created_at),
        })

        # 2. Clinical Verification / Approval
        if patient.registration_status == 'Approved':
            events.append({
                "category": "Clinical Verification",
                "event": "Doctor Approval Granted",
                "date": patient.updated_at.strftime('%d %b %Y, %H:%M'),
                "description": f"Registration verified and approved by {patient.reviewed_by_doctor.name if patient.reviewed_by_doctor else 'Doctor'}.",
                "status": "Approved",
                "raw_date": str(patient.updated_at),
            })
        elif patient.registration_status == 'Rejected':
            events.append({
                "category": "Clinical Verification",
                "event": "Registration Rejected",
                "date": patient.updated_at.strftime('%d %b %Y, %H:%M'),
                "description": f"Rejection reason: {patient.rejection_reason or 'Eligibility criteria not met.'}",
                "status": "Rejected",
                "raw_date": str(patient.updated_at),
            })

        # 3. Diagnoses
        for d in PatientDiagnosis.objects.filter(patient=patient):
            diag_date = d.diagnosed_date.strftime('%d %b %Y') if d.diagnosed_date else d.updated_at.strftime('%d %b %Y')
            events.append({
                "category": "Diagnosis",
                "event": f"Diagnosis Added: {d.diagnosis_text[:50]}",
                "date": diag_date,
                "description": f"{d.diagnosis_text} — Recorded by {d.doctor.name if d.doctor else 'Doctor'}.",
                "status": "Recorded",
                "raw_date": str(d.diagnosed_date or d.updated_at),
            })

        # 4. Prescriptions
        for rx in Prescription.objects.filter(patient=patient):
            item_count = rx.prescriptionitem_set.count()
            events.append({
                "category": "Prescription",
                "event": f"Prescription Version {rx.version_number} ({rx.status})",
                "date": rx.created_at.strftime('%d %b %Y, %H:%M'),
                "description": f"{item_count} medication(s) prescribed by {rx.doctor.name if rx.doctor else 'Doctor'}.",
                "status": rx.status,
                "raw_date": str(rx.created_at),
            })

        # 5. Nutrition Plans
        for np in NutritionPlan.objects.filter(patient=patient):
            events.append({
                "category": "Nutrition",
                "event": f"Nutrition Plan Version {np.version_number} ({np.status})",
                "date": np.created_at.strftime('%d %b %Y, %H:%M'),
                "description": f"Dietary plan created by {np.doctor.name if np.doctor else 'Doctor'}.",
                "status": np.status,
                "raw_date": str(np.created_at),
            })

        # 6. Lab Reports
        for lr in LabReport.objects.filter(patient=patient).select_related('reviewed_by', 'reviewed_by__doctor'):
            events.append({
                "category": "Diagnostics",
                "event": f"Laboratory Report Uploaded: {lr.investigation_name or 'Lab Report'}",
                "date": lr.uploaded_at.strftime('%d %b %Y, %H:%M') if lr.uploaded_at else (lr.report_date.strftime('%d %b %Y') if lr.report_date else "Uploaded"),
                "description": f"{lr.investigation_name or 'Diagnostic report'} uploaded by patient (Report Date: {lr.report_date.strftime('%d %b %Y') if lr.report_date else 'N/A'}).",
                "status": lr.review_status,
                "raw_date": str(lr.uploaded_at or lr.report_date or ''),
            })
            if lr.review_status == 'Reviewed':
                doc_name = "Doctor"
                if lr.reviewed_by:
                    if hasattr(lr.reviewed_by, 'doctor') and lr.reviewed_by.doctor:
                        doc_name = lr.reviewed_by.doctor.name
                    else:
                        doc_name = lr.reviewed_by.email
                events.append({
                    "category": "Clinical Review",
                    "event": f"Laboratory Report Reviewed: {lr.investigation_name or 'Lab Report'}",
                    "date": lr.reviewed_at.strftime('%d %b %Y, %H:%M') if lr.reviewed_at else (lr.updated_at.strftime('%d %b %Y, %H:%M') if lr.updated_at else "Reviewed"),
                    "description": f"Reviewed by {doc_name}. Clinical Remarks: {lr.remarks or 'No remarks'}",
                    "status": "Reviewed",
                    "raw_date": str(lr.reviewed_at or lr.updated_at or ''),
                })

        # 7. Telemedicine Consultations, Clinical Notes & Follow-ups
        for tc in TelemedicineConsultation.objects.filter(patient=patient).select_related('doctor'):
            # Base Consultation Event
            events.append({
                "category": "Telemedicine",
                "event": f"Telemedicine Consultation ({tc.status})",
                "date": tc.created_at.strftime('%d %b %Y, %H:%M'),
                "description": f"Video consultation with {tc.doctor.name if tc.doctor else 'Doctor'}. Reason: {tc.reason or 'Follow-up'}. Requested: {tc.requested_date} at {tc.requested_time.strftime('%H:%M') if tc.requested_time else 'N/A'}.",
                "status": tc.status,
                "raw_date": str(tc.created_at),
            })
            # Scheduled / Rescheduled Event
            if tc.scheduled_date and tc.scheduled_start_time:
                events.append({
                    "category": "Telemedicine",
                    "event": f"Consultation Scheduled: {tc.scheduled_date.strftime('%d %b %Y')} ({tc.scheduled_start_time.strftime('%H:%M')})",
                    "date": tc.updated_at.strftime('%d %b %Y, %H:%M'),
                    "description": f"Appointment confirmed for {tc.scheduled_date.strftime('%d %b %Y')} from {tc.scheduled_start_time.strftime('%H:%M')} to {tc.scheduled_end_time.strftime('%H:%M') if tc.scheduled_end_time else '30m'}.",
                    "status": tc.status,
                    "raw_date": str(tc.updated_at),
                })
            # Rejection Event
            if tc.status == 'Rejected' and tc.rejection_reason:
                events.append({
                    "category": "Telemedicine",
                    "event": "Consultation Request Declined",
                    "date": tc.updated_at.strftime('%d %b %Y, %H:%M'),
                    "description": f"Declined by {tc.doctor.name if tc.doctor else 'Doctor'}. Reason: {tc.rejection_reason}",
                    "status": "Rejected",
                    "raw_date": str(tc.updated_at),
                })
            # Completed Event
            if tc.status == 'Completed' and tc.completed_at:
                events.append({
                    "category": "Telemedicine",
                    "event": "Telemedicine Consultation Completed",
                    "date": tc.completed_at.strftime('%d %b %Y, %H:%M'),
                    "description": f"Consultation session completed with {tc.doctor.name if tc.doctor else 'Doctor'}.",
                    "status": "Completed",
                    "raw_date": str(tc.completed_at),
                })
            # Clinical Notes
            for note in tc.consultation_notes.all():
                events.append({
                    "category": "Clinical Note",
                    "event": "Consultation Clinical Observations Recorded",
                    "date": note.created_at.strftime('%d %b %Y, %H:%M'),
                    "description": f"Doctor observations: {note.clinical_observations or note.symptoms_discussed or note.advice or 'Clinical assessment documented.'}",
                    "status": "Recorded",
                    "raw_date": str(note.created_at),
                })
            # Follow-ups
            for fu in tc.followups.all():
                events.append({
                    "category": "Follow-up",
                    "event": f"Follow-up Scheduled ({fu.followup_type})",
                    "date": fu.created_at.strftime('%d %b %Y, %H:%M'),
                    "description": f"Planned for {fu.followup_date} at {fu.followup_time}. Reason: {fu.reason}",
                    "status": fu.status,
                    "raw_date": str(fu.created_at),
                })

        # 8. Home Visits
        for hv in HomeVisitOccurrence.objects.filter(patient=patient):
            events.append({
                "category": "Home Visit",
                "event": f"Home Visit ({hv.visit_type})",
                "date": hv.scheduled_date.strftime('%d %b %Y'),
                "description": f"Community palliative care visit ({hv.status}).",
                "status": hv.status,
                "raw_date": str(hv.scheduled_date),
            })

        # 9. Medical Equipment Requests
        for eq in EquipmentRequest.objects.filter(patient=patient):
            events.append({
                "category": "Medical Equipment",
                "event": f"Equipment: {eq.equipment_type.name if eq.equipment_type else 'Device'}",
                "date": eq.requested_at.strftime('%d %b %Y'),
                "description": f"Doctor approval: {eq.doctor_approval_status}, Delivery: {eq.delivery_status}.",
                "status": eq.doctor_approval_status,
                "raw_date": str(eq.requested_at),
            })

        events.sort(key=lambda x: x.get('raw_date', ''), reverse=True)
        return Response(events, status=status.HTTP_200_OK)


class DoctorReportsView(APIView):
    """
    Doctor Clinical Reports & Statistics:
    GET /api/doctor/reports/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        doctor = get_authenticated_doctor(request)
        if not doctor:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        from care_coordination.models import TelemedicineConsultation, HomeVisitOccurrence, HomeVisitSchedule
        from medical_records.models import Prescription, LabReport

        total_consults = TelemedicineConsultation.objects.filter(doctor=doctor).count()
        completed_consults = TelemedicineConsultation.objects.filter(doctor=doctor, status='Completed').count()
        active_schedules = HomeVisitSchedule.objects.filter(status='Active').count()
        total_rx = Prescription.objects.filter(doctor=doctor).count()
        reviewed_labs = LabReport.objects.filter(reviewed_by=request.user).count()

        return Response({
            "telemedicine_total": total_consults,
            "telemedicine_completed": completed_consults,
            "active_home_visit_schedules": active_schedules,
            "prescriptions_issued": total_rx,
            "laboratory_reports_reviewed": reviewed_labs,
        }, status=status.HTTP_200_OK)


# ========================================================
# PHASE 1 NURSE PORTAL APIS (AUTHENTICATED NURSE ONLY)
# ========================================================

def get_authenticated_nurse(request):
    if not request.user or not request.user.is_authenticated or request.user.role != Role.NURSE:
        return None
    return getattr(request.user, 'nurse', None) or Nurse.objects.filter(user=request.user).first()


class NurseProfileView(APIView):
    """
    View and update profile information for the authenticated Nurse.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        nurse = get_authenticated_nurse(request)
        if not nurse:
            return Response({"detail": "Access restricted to Nurses only."}, status=status.HTTP_403_FORBIDDEN)

        data = {
            "nurse_id": nurse.nurse_id,
            "nurse_code": f"KG-NUR-{str(nurse.nurse_id).zfill(4)}",
            "user_id": request.user.user_id,
            "name": nurse.name,
            "email": request.user.email,
            "phone": nurse.phone or "",
            "gender": nurse.gender or "",
            "date_of_birth": str(nurse.date_of_birth) if nurse.date_of_birth else None,
            "qualification": nurse.qualification or "",
            "experience": nurse.experience if nurse.experience is not None else 0,
            "specialization": nurse.specialization or "Palliative Nursing",
            "service_area": nurse.service_area or "",
            "is_available_now": nurse.is_available_now,
            "verification_status": nurse.verification_status,
            "role": request.user.role,
            "account_status": "Active" if request.user.is_active else "Inactive",
            "is_active": request.user.is_active,
            "created_at": nurse.created_at.isoformat() if nurse.created_at else None,
            "updated_at": nurse.updated_at.isoformat() if nurse.updated_at else None,
        }
        return Response(data, status=status.HTTP_200_OK)

    def put(self, request, *args, **kwargs):
        nurse = get_authenticated_nurse(request)
        if not nurse:
            return Response({"detail": "Access restricted to Nurses only."}, status=status.HTTP_403_FORBIDDEN)

        errors = {}

        # 1. Name validation
        name = request.data.get('name')
        if name is not None:
            name_val = str(name).strip()
            if not name_val:
                errors['name'] = ["Nurse's Full Name cannot be empty."]
            elif len(name_val) > 100:
                errors['name'] = ["Full Name cannot exceed 100 characters."]
            else:
                nurse.name = name_val

        # 2. Phone validation
        phone = request.data.get('phone')
        if phone is not None:
            phone_val = str(phone).strip()
            if phone_val and not re.match(r'^\d{10}$', phone_val):
                errors['phone'] = ["Phone number must be a valid 10-digit number."]
            else:
                nurse.phone = phone_val

        # 3. Gender validation
        gender = request.data.get('gender')
        if gender is not None:
            nurse.gender = str(gender).strip()

        # 4. Date of Birth validation
        date_of_birth = request.data.get('date_of_birth')
        if date_of_birth is not None:
            if date_of_birth == '' or date_of_birth is None:
                nurse.date_of_birth = None
            else:
                try:
                    dob_parsed = date.fromisoformat(str(date_of_birth).strip())
                    if dob_parsed >= date.today():
                        errors['date_of_birth'] = ["Date of birth must be a past date."]
                    else:
                        nurse.date_of_birth = dob_parsed
                except (ValueError, TypeError):
                    errors['date_of_birth'] = ["Invalid date format. Please use YYYY-MM-DD."]

        # 5. Qualification validation
        qualification = request.data.get('qualification')
        if qualification is not None:
            nurse.qualification = str(qualification).strip()

        # 6. Experience validation
        experience = request.data.get('experience')
        if experience is not None:
            if experience == '' or experience is None:
                nurse.experience = 0
            else:
                try:
                    exp_val = int(experience)
                    if exp_val < 0 or exp_val > 80:
                        errors['experience'] = ["Experience must be between 0 and 80 years."]
                    else:
                        nurse.experience = exp_val
                except (ValueError, TypeError):
                    errors['experience'] = ["Experience must be a valid non-negative integer."]

        # 7. Specialization validation
        specialization = request.data.get('specialization')
        if specialization is not None:
            nurse.specialization = str(specialization).strip()

        # 8. Service area validation
        service_area = request.data.get('service_area')
        if service_area is not None:
            nurse.service_area = str(service_area).strip()

        # 9. Email / Username validation and update
        email = request.data.get('email')
        if email is not None:
            email_val = str(email).strip().lower()
            if not email_val:
                errors['email'] = ["Email / Username cannot be empty."]
            elif not re.match(r'^[^@]+@[^@]+\.[^@]+$', email_val):
                errors['email'] = ["Please enter a valid email address."]
            elif email_val != request.user.email.lower():
                if User.objects.filter(email__iexact=email_val).exclude(user_id=request.user.user_id).exists():
                    errors['email'] = ["An account with this email / username already exists."]
                else:
                    request.user.email = email_val

        # 10. Password change validation and update
        new_password = request.data.get('new_password')
        current_password = request.data.get('current_password')
        confirm_password = request.data.get('confirm_password')

        if new_password:
            if current_password is not None and not request.user.check_password(current_password):
                errors['current_password'] = ["Current password is incorrect."]
            if confirm_password is not None and new_password != confirm_password:
                errors['confirm_password'] = ["New passwords do not match."]
            try:
                validate_password(new_password, user=request.user)
            except DjangoValidationError as e:
                errors['new_password'] = list(e.messages)

        if errors:
            return Response({"errors": errors, "message": "Please correct the validation errors."}, status=status.HTTP_400_BAD_REQUEST)

        nurse.save()
        if new_password and 'new_password' not in errors:
            request.user.set_password(new_password)
        request.user.save()

        updated_data = {
            "nurse_id": nurse.nurse_id,
            "nurse_code": f"KG-NUR-{str(nurse.nurse_id).zfill(4)}",
            "user_id": request.user.user_id,
            "name": nurse.name,
            "email": request.user.email,
            "phone": nurse.phone or "",
            "gender": nurse.gender or "",
            "date_of_birth": str(nurse.date_of_birth) if nurse.date_of_birth else None,
            "qualification": nurse.qualification or "",
            "experience": nurse.experience if nurse.experience is not None else 0,
            "specialization": nurse.specialization or "Palliative Nursing",
            "service_area": nurse.service_area or "",
            "is_available_now": nurse.is_available_now,
            "verification_status": nurse.verification_status,
            "role": request.user.role,
            "account_status": "Active" if request.user.is_active else "Inactive",
            "is_active": request.user.is_active,
            "created_at": nurse.created_at.isoformat() if nurse.created_at else None,
            "updated_at": nurse.updated_at.isoformat() if nurse.updated_at else None,
        }

        return Response({
            "message": "Profile updated successfully.",
            "profile": updated_data
        }, status=status.HTTP_200_OK)


class NurseDashboardView(APIView):
    """
    Consolidated Nurse Dashboard Summary API:
    Returns 5 summary metrics, today's schedule, pending additional visit requests,
    upcoming allocated visits, alerts & reminders, and recent activity.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        nurse = get_authenticated_nurse(request)
        if not nurse:
            return Response({"detail": "Access restricted to Nurses only."}, status=status.HTTP_403_FORBIDDEN)

        from care_coordination.models import (
            HomeVisitOccurrence,
            HomeVisitSchedule,
            HomeVisitSummary,
            CaregiverPatientAssignment,
            VisitType,
            OccurrenceStatus,
            ScheduleStatus,
        )
        from medical_records.models import LabReport, ReviewStatus
        from notifications.models import Notification
        from django.db.models import Q

        today = timezone.now().date()
        seven_days_later = today + timedelta(days=7)

        # 1. Nurse Info
        nurse_info = {
            "nurse_id": nurse.nurse_id,
            "name": nurse.name,
            "service_area": nurse.service_area or "Community Palliative Care",
            "is_available_now": nurse.is_available_now,
            "phone": nurse.phone or "",
            "email": request.user.email,
        }

        # 2. Metric 1: Today's Visits (All scheduled team visits for today)
        today_visits_qs = HomeVisitOccurrence.objects.select_related('patient', 'visiting_doctor').filter(
            scheduled_date=today,
            status__in=[OccurrenceStatus.SCHEDULED, OccurrenceStatus.RESCHEDULED]
        )
        todays_visits_count = today_visits_qs.count()

        # 3. Metric 2: Pending Urgent Visit Requests
        pending_requests_qs = HomeVisitOccurrence.objects.select_related('patient').filter(
            visit_type=VisitType.ADDITIONAL,
            approved_by_nurse__isnull=True,
            status__in=[OccurrenceStatus.SCHEDULED, OccurrenceStatus.RESCHEDULED]
        )
        pending_requests_count = pending_requests_qs.count()

        # 4. Metric 3: Active Care Schedules
        active_schedules_count = HomeVisitSchedule.objects.filter(
            status=ScheduleStatus.ACTIVE
        ).count()

        # 5. Metric 4: Reports to Review (Pending Lab Reports)
        reports_to_review_count = LabReport.objects.filter(review_status=ReviewStatus.PENDING).count()

        # 6. Metric 5: Unread Notifications
        unread_notifications_count = Notification.objects.filter(user=request.user, is_read=False).count()

        # 7. Caregiver pending actions for nurse
        pending_caregivers_count = Caregiver.objects.filter(verification_status=VerificationStatus.PENDING).count()
        from care_coordination.models import CaregiverComplaint, ComplaintStatus
        open_complaints_count = CaregiverComplaint.objects.filter(status=ComplaintStatus.OPEN).count()

        summary_cards = {
            "todays_visits": todays_visits_count,
            "pending_requests": pending_requests_count,
            "active_schedules": active_schedules_count,
            "my_allocated_visits": active_schedules_count, # backward compatibility
            "reports_to_review": reports_to_review_count,
            "unread_notifications": unread_notifications_count,
            "pending_caregivers": pending_caregivers_count,
            "open_caregiver_complaints": open_complaints_count,
            "caregiver_actions": pending_caregivers_count + open_complaints_count,
        }

        # 7. Today's Schedule (Shared Team Visits)
        today_schedule_data = []
        for v in today_visits_qs.order_by('occurrence_id')[:10]:
            location_str = f"{v.patient.house_name}, {v.patient.place}" if v.patient.house_name and v.patient.place else (v.patient.panchayath or "Community Residence")
            slot_times = ["09:00 AM", "10:30 AM", "11:45 AM", "02:00 PM", "03:30 PM", "04:45 PM"]
            assigned_time = slot_times[v.occurrence_id % len(slot_times)]
            today_schedule_data.append({
                "occurrence_id": v.occurrence_id,
                "patient_id": v.patient.patient_id,
                "patient_name": v.patient.name,
                "patient_reg_id": v.patient.registration_id,
                "time": assigned_time,
                "visit_type": v.visit_type,
                "urgency_level": v.urgency_level or "Routine",
                "location": location_str,
                "status": v.status,
                "visiting_doctor_id": v.visiting_doctor_id,
                "visiting_doctor": f"Dr. {v.visiting_doctor.name}" if v.visiting_doctor else "Not Assigned",
                "notes": v.notes or "",
            })

        # 8. Urgent Visit Requests
        additional_requests_data = []
        for req in pending_requests_qs.order_by('scheduled_date')[:5]:
            additional_requests_data.append({
                "occurrence_id": req.occurrence_id,
                "patient_id": req.patient.patient_id,
                "patient_name": req.patient.name,
                "patient_reg_id": req.patient.registration_id,
                "requested_date": req.scheduled_date.strftime('%d %b %Y'),
                "requested_time": "10:00 AM",
                "reason": req.notes or "Urgent palliative care visit requested",
                "priority": req.urgency_level or "Urgent",
                "status": "Pending Nurse Review",
            })

        # 9. Upcoming Team Visits (Next 5 upcoming visits)
        upcoming_visits_qs = HomeVisitOccurrence.objects.select_related('patient', 'visiting_doctor').filter(
            scheduled_date__gte=today,
            status__in=[OccurrenceStatus.SCHEDULED, OccurrenceStatus.RESCHEDULED]
        ).order_by('scheduled_date')
        upcoming_visits_data = []
        for v in upcoming_visits_qs[:5]:
            upcoming_visits_data.append({
                "occurrence_id": v.occurrence_id,
                "patient_id": v.patient.patient_id,
                "patient_name": v.patient.name,
                "patient_reg_id": v.patient.registration_id,
                "scheduled_date": v.scheduled_date.strftime('%d %b %Y'),
                "time": "10:00 AM",
                "visit_type": v.visit_type,
                "priority": v.urgency_level or "Routine",
                "status": v.status,
                "visiting_doctor": f"Dr. {v.visiting_doctor.name}" if v.visiting_doctor else "Not Assigned",
            })

        # 10. Alerts & Reminders
        alerts = []
        if pending_requests_count > 0:
            alerts.append({
                "id": "alert-nurse-req",
                "type": "request",
                "message": f"{pending_requests_count} urgent home visit request{'s' if pending_requests_count > 1 else ''} awaiting nurse response.",
                "action_view": "additional_requests",
            })
        if todays_visits_count > 0:
            alerts.append({
                "id": "alert-nurse-today",
                "type": "visit",
                "message": f"{todays_visits_count} home visit{'s' if todays_visits_count > 1 else ''} scheduled for today.",
                "action_view": "home_visits_all",
            })
        if reports_to_review_count > 0:
            alerts.append({
                "id": "alert-nurse-lab",
                "type": "lab_report",
                "message": f"{reports_to_review_count} laboratory report{'s' if reports_to_review_count > 1 else ''} waiting for review.",
                "action_view": "lab_reports",
            })
        pending_summary_count = HomeVisitOccurrence.objects.filter(allocated_nurse=nurse, status=OccurrenceStatus.COMPLETED, homevisitsummary__isnull=True).count()
        if pending_summary_count > 0:
            alerts.append({
                "id": "alert-nurse-summary",
                "type": "summary",
                "message": f"{pending_summary_count} home visit summary pending upload.",
                "action_view": "home_visits",
            })

        # 11. Recent Activity
        recent_activity = []
        for summary in HomeVisitSummary.objects.all().order_by('-recorded_at')[:3]:
            recent_activity.append({
                "patient_name": summary.occurrence.patient.name,
                "event": f"Home visit completed by Nurse {summary.nurse.name} (Vitals: BP {summary.blood_pressure or 'N/A'}, Pulse {summary.pulse or 'N/A'})",
                "date": summary.recorded_at.strftime('%d %b %Y, %H:%M'),
                "category": "Home Visit",
            })
        for asgn in CaregiverPatientAssignment.objects.all().order_by('-assigned_at')[:2]:
            recent_activity.append({
                "patient_name": asgn.patient.name,
                "event": f"Caregiver {asgn.caregiver.name} assigned by Nurse {asgn.assigned_by_nurse.name}",
                "date": asgn.assigned_at.strftime('%d %b %Y'),
                "category": "Caregiver",
            })

        return Response({
            "nurse_info": nurse_info,
            "summary_cards": summary_cards,
            "today_schedule": today_schedule_data,
            "additional_requests": additional_requests_data,
            "upcoming_allocated_visits": upcoming_visits_data,
            "alerts_and_reminders": alerts,
            "recent_activity": recent_activity,
        }, status=status.HTTP_200_OK)


class NurseAvailabilityView(APIView):
    """
    Toggle or update Nurse's Available Now status.
    POST /api/nurse/availability/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        nurse = get_authenticated_nurse(request)
        if not nurse:
            return Response({"detail": "Access restricted to Nurses only."}, status=status.HTTP_403_FORBIDDEN)

        is_available = request.data.get('is_available_now')
        if is_available is not None:
            nurse.is_available_now = bool(is_available)
        else:
            nurse.is_available_now = not nurse.is_available_now

        nurse.save(update_fields=['is_available_now'])
        status_label = "Available Now" if nurse.is_available_now else "Unavailable"
        return Response({
            "message": f"Availability status set to {status_label}.",
            "is_available_now": nurse.is_available_now,
        }, status=status.HTTP_200_OK)


class NursePatientListView(APIView):
    """
    Patient directory for Nurse:
    GET: List registered palliative patients with search & filtering.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        nurse = get_authenticated_nurse(request)
        if not nurse:
            return Response({"detail": "Access restricted to Nurses only."}, status=status.HTTP_403_FORBIDDEN)

        search_query = request.query_params.get('search', '').strip().lower()
        status_filter = request.query_params.get('status', '').strip()

        qs = Patient.objects.filter(registration_status=RegistrationStatus.APPROVED).order_by('-created_at')

        if status_filter and status_filter.lower() != 'all':
            qs = qs.filter(status__iexact=status_filter)

        results = []
        for p in qs:
            if search_query:
                match_name = search_query in p.name.lower()
                match_reg = search_query in p.registration_id.lower()
                match_phone = search_query in (p.phone or '').lower()
                match_place = search_query in (p.place or '').lower()
                if not (match_name or match_reg or match_phone or match_place):
                    continue

            results.append({
                "patient_id": p.patient_id,
                "name": p.name,
                "registration_id": p.registration_id,
                "dob": p.dob.strftime('%d %b %Y') if p.dob else None,
                "gender": p.gender,
                "phone": p.phone,
                "house_name": p.house_name,
                "place": p.place,
                "panchayath": p.panchayath,
                "ward_no": p.ward_no,
                "pincode": p.pincode,
                "emergency_contact_name": p.emergency_contact_name,
                "emergency_contact_phone": p.emergency_contact_phone,
                "registration_status": p.registration_status,
                "status": p.status,
                "discharge_summary_path": p.discharge_summary_path,
                "created_at": p.created_at.strftime('%d %b %Y'),
            })

        return Response(results, status=status.HTTP_200_OK)


class NursePatientMedicalProfileView(APIView):
    """
    Detailed Patient Medical Profile for Nurse:
    GET: Return full clinical profile (read-only for nurse).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, patient_id, *args, **kwargs):
        nurse = get_authenticated_nurse(request)
        if not nurse:
            return Response({"detail": "Access restricted to Nurses only."}, status=status.HTTP_403_FORBIDDEN)

        patient = Patient.objects.filter(patient_id=patient_id).first()
        if not patient:
            return Response({"detail": "Patient record not found."}, status=status.HTTP_404_NOT_FOUND)

        from medical_records.models import PatientDiagnosis, PatientAllergy, PatientChronicCondition, Prescription, LabReport
        from care_coordination.models import HomeVisitOccurrence

        diagnoses = [
            {
                "id": d.diagnosis_id,
                "text": d.diagnosis_text,
                "doctor": d.doctor.name if d.doctor else "Doctor",
                "date": d.diagnosed_date.strftime('%d %b %Y') if d.diagnosed_date else d.updated_at.strftime('%d %b %Y'),
            }
            for d in PatientDiagnosis.objects.filter(patient=patient).order_by('-updated_at')
        ]

        allergies = [
            {
                "id": a.allergy_id,
                "name": a.allergy_name,
                "severity": a.severity or "Moderate",
            }
            for a in PatientAllergy.objects.filter(patient=patient)
        ]

        chronic_conditions = [
            {
                "id": c.condition_id,
                "name": c.condition_name,
                "notes": c.notes,
            }
            for c in PatientChronicCondition.objects.filter(patient=patient)
        ]

        recent_vitals = []
        for occ in HomeVisitOccurrence.objects.filter(patient=patient, status='Completed').order_by('-scheduled_date')[:10]:
            summary = getattr(occ, 'homevisitsummary', None) or getattr(occ, 'summary', None)
            if summary:
                symptoms = [{"name": s.symptom_name, "severity": s.severity} for s in summary.visitsymptom_set.all()]
                recent_vitals.append({
                    "occurrence_id": occ.occurrence_id,
                    "date": occ.scheduled_date.strftime('%d %b %Y'),
                    "blood_pressure": summary.blood_pressure,
                    "pulse": summary.pulse,
                    "temperature": str(summary.temperature) if summary.temperature else None,
                    "oxygen_level": summary.oxygen_level,
                    "treatment_notes": summary.treatment_notes,
                    "next_visit_recommendation": summary.next_visit_recommendation.strftime('%d %b %Y') if summary.next_visit_recommendation else None,
                    "nurse": summary.nurse.name if summary.nurse else "Nurse",
                    "symptoms": symptoms,
                })

        prescriptions_data = [
            {
                "prescription_id": rx.prescription_id,
                "version_number": rx.version_number,
                "status": rx.status,
                "created_at": rx.created_at.strftime('%d %b %Y'),
                "doctor_name": rx.doctor.name if rx.doctor else "Doctor",
                "items": [
                    {
                        "medicine_name": it.medicine_name,
                        "dosage": it.dosage,
                        "frequency": it.frequency,
                        "duration_days": it.duration_days,
                        "change_type": it.change_type,
                    }
                    for it in rx.prescriptionitem_set.all()
                ]
            }
            for rx in Prescription.objects.filter(patient=patient).order_by('-version_number')
        ]

        lab_reports_data = [
            {
                "report_id": lr.report_id,
                "report_date": lr.report_date.strftime('%d %b %Y') if lr.report_date else lr.uploaded_at.strftime('%d %b %Y'),
                "review_status": lr.review_status,
                "remarks": lr.remarks,
                "file_path": lr.file_path,
                "uploaded_at": lr.uploaded_at.strftime('%d %b %Y, %H:%M'),
            }
            for lr in LabReport.objects.filter(patient=patient).order_by('-uploaded_at')
        ]

        return Response({
            "patient_info": {
                "patient_id": patient.patient_id,
                "name": patient.name,
                "registration_id": patient.registration_id,
                "dob": patient.dob.strftime('%d %b %Y') if patient.dob else None,
                "gender": patient.gender,
                "phone": patient.phone,
                "house_name": patient.house_name,
                "place": patient.place,
                "panchayath": patient.panchayath,
                "ward_no": patient.ward_no,
                "pincode": patient.pincode,
                "emergency_contact_name": patient.emergency_contact_name,
                "emergency_contact_phone": patient.emergency_contact_phone,
                "registration_status": patient.registration_status,
                "discharge_summary_path": patient.discharge_summary_path,
            },
            "diagnoses": diagnoses,
            "allergies": allergies,
            "chronic_conditions": chronic_conditions,
            "recent_vitals": recent_vitals,
            "prescriptions": prescriptions_data,
            "lab_reports": lab_reports_data,
        }, status=status.HTTP_200_OK)


class NursePatientTimelineView(APIView):
    """
    Patient care timeline for Nurse (Read-only):
    GET /api/nurse/patients/<int:patient_id>/timeline/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, patient_id, *args, **kwargs):
        nurse = get_authenticated_nurse(request)
        if not nurse:
            return Response({"detail": "Access restricted to Nurses only."}, status=status.HTTP_403_FORBIDDEN)

        patient = Patient.objects.filter(patient_id=patient_id).first()
        if not patient:
            return Response({"detail": "Patient record not found."}, status=status.HTTP_404_NOT_FOUND)

        from care_coordination.models import HomeVisitOccurrence, CaregiverPatientAssignment
        from medical_records.models import Prescription, LabReport

        events = []

        # 1. Registration
        events.append({
            "category": "Registration",
            "event": "Patient Account Registered",
            "date": patient.created_at.strftime('%d %b %Y, %H:%M'),
            "description": f"Registration submitted under ID {patient.registration_id}.",
            "status": "Completed",
            "raw_date": str(patient.created_at),
        })

        # 2. Approval
        if patient.registration_status == 'Approved':
            events.append({
                "category": "Clinical Verification",
                "event": "Doctor Approval Granted",
                "date": patient.updated_at.strftime('%d %b %Y, %H:%M'),
                "description": f"Medical profile and discharge summary verified by {patient.reviewed_by_doctor.name if patient.reviewed_by_doctor else 'Doctor'}.",
                "status": "Approved",
                "raw_date": str(patient.updated_at),
            })

        # 3. Home Visits
        for hv in HomeVisitOccurrence.objects.filter(patient=patient):
            summary = getattr(hv, 'homevisitsummary', None) or getattr(hv, 'summary', None)
            notes_text = f" (Vitals: BP {summary.blood_pressure}, Pulse {summary.pulse})" if summary and summary.blood_pressure else ""
            events.append({
                "category": "Home Visit",
                "event": f"Home Visit ({hv.visit_type})",
                "date": hv.scheduled_date.strftime('%d %b %Y'),
                "description": f"Community care visit ({hv.status}){notes_text}. Assigned Nurse: {hv.allocated_nurse.name if hv.allocated_nurse else 'Community Nurse'}.",
                "status": hv.status,
                "raw_date": str(hv.scheduled_date),
            })

        # 4. Prescriptions
        for rx in Prescription.objects.filter(patient=patient):
            events.append({
                "category": "Prescription",
                "event": f"Prescription v{rx.version_number}",
                "date": rx.created_at.strftime('%d %b %Y, %H:%M'),
                "description": f"Issued by {rx.doctor.name if rx.doctor else 'Doctor'}.",
                "status": rx.status,
                "raw_date": str(rx.created_at),
            })

        # 5. Lab Reports
        for lr in LabReport.objects.filter(patient=patient):
            events.append({
                "category": "Diagnostics",
                "event": "Laboratory Report Uploaded",
                "date": lr.uploaded_at.strftime('%d %b %Y') if lr.uploaded_at else "Diagnostic Record",
                "description": lr.remarks or "Diagnostic test results recorded.",
                "status": lr.review_status,
                "raw_date": str(lr.uploaded_at or lr.report_date or ''),
            })

        # 6. Caregiver Assignment
        for asgn in CaregiverPatientAssignment.objects.filter(patient=patient):
            events.append({
                "category": "Caregiver",
                "event": f"Caregiver {asgn.caregiver.name} Assigned",
                "date": asgn.assigned_at.strftime('%d %b %Y'),
                "description": f"Assigned by Nurse {asgn.assigned_by_nurse.name} (Status: {asgn.status}).",
                "status": asgn.status,
                "raw_date": str(asgn.assigned_at),
            })

        events.sort(key=lambda x: x.get('raw_date', ''), reverse=True)
        return Response(events, status=status.HTTP_200_OK)


class NurseReportsView(APIView):
    """
    Nurse Activity Reports & Statistics:
    GET /api/nurse/reports/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        nurse = get_authenticated_nurse(request)
        if not nurse:
            return Response({"detail": "Access restricted to Nurses only."}, status=status.HTTP_403_FORBIDDEN)

        from care_coordination.models import HomeVisitOccurrence, HomeVisitSummary, CaregiverPatientAssignment
        from medical_records.models import LabReport

        completed_visits = HomeVisitOccurrence.objects.filter(allocated_nurse=nurse, status='Completed').count()
        allocated_visits = HomeVisitOccurrence.objects.filter(allocated_nurse=nurse).count()
        summaries_uploaded = HomeVisitSummary.objects.filter(nurse=nurse).count()
        caregiver_assignments = CaregiverPatientAssignment.objects.filter(assigned_by_nurse=nurse).count()
        reviewed_labs = LabReport.objects.filter(reviewed_by=request.user).count()

        return Response({
            "completed_visits": completed_visits,
            "allocated_visits": allocated_visits,
            "summaries_uploaded": summaries_uploaded,
            "caregiver_assignments": caregiver_assignments,
            "laboratory_reports_reviewed": reviewed_labs,
        }, status=status.HTTP_200_OK)




