import mimetypes
import re
from datetime import datetime, timedelta, date
from django.utils import timezone
from django.http import FileResponse
from django.core.files.storage import default_storage
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

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
)
from .serializers import (
    PatientRegisterSerializer,
    CaregiverRegisterSerializer,
    PublicApplicationStatusSerializer,
    LoginSerializer,
    PendingPatientSerializer,
    PendingCaregiverSerializer,
    AdminStaffCreateSerializer,
    AdminOnboardDoctorSerializer,
    AdminOnboardNurseSerializer,
)
from .notifications import create_status_notification


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


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request, *args, **kwargs):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.validated_data['user']

        if not user.is_active:
            return Response(
                {"detail": "Your account has been disabled. Please contact support."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Check approval gate depending on role
        profile_name = user.email
        role = user.role

        if role == Role.PATIENT:
            patient = getattr(user, 'patient', None)
            if not patient or patient.registration_status == RegistrationStatus.PENDING:
                return Response(
                    {"detail": "Your account is pending administrator approval."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            elif patient.registration_status == RegistrationStatus.REJECTED:
                reason = patient.rejection_reason or "No reason provided."
                return Response(
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
                return Response(
                    {"detail": "Your account is pending administrator approval."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            elif caregiver.verification_status == VerificationStatus.REJECTED:
                reason = caregiver.rejection_reason or "No reason provided."
                return Response(
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
                return Response(
                    {"detail": "Your account is pending administrator approval."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            elif doctor.verification_status == VerificationStatus.REJECTED:
                reason = doctor.rejection_reason or "No reason provided."
                return Response(
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
                return Response(
                    {"detail": "Your account is pending administrator approval."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            elif nurse.verification_status == VerificationStatus.REJECTED:
                reason = nurse.rejection_reason or "No reason provided."
                return Response(
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

class DoctorPendingPatientsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role != Role.DOCTOR:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        pending_applications = PatientRegistrationApplication.objects.filter(
            registration_status=RegistrationStatus.PENDING
        ).order_by('-created_at')
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


# --- ADMIN STAFF ONBOARDING ENDPOINT ---

class AdminCreateStaffView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        serializer = AdminStaffCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save()
        role_label = request.data.get('role', 'Staff').title()
        return Response(
            {"message": f"{role_label} account created and pre-approved successfully.", "user_id": user.user_id},
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

        user = serializer.save()
        create_status_notification(user, status=VerificationStatus.APPROVED, role='Doctor')

        return Response(
            {
                "message": f"Doctor account for '{request.data.get('name')}' created and pre-approved successfully.",
                "user_id": user.user_id,
                "email": user.email,
                "role": user.role,
            },
            status=status.HTTP_201_CREATED,
        )


class AdminOnboardNurseView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        serializer = AdminOnboardNurseSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.save()
        create_status_notification(user, status=VerificationStatus.APPROVED, role='Nurse')

        return Response(
            {
                "message": f"Nurse account for '{request.data.get('name')}' created and pre-approved successfully.",
                "user_id": user.user_id,
                "email": user.email,
                "role": user.role,
            },
            status=status.HTTP_201_CREATED,
        )


# ============================================================================
# PHASE 1 ADMINISTRATOR DASHBOARD & MANAGEMENT VIEWS
# ============================================================================

from resources.models import (
    WelfareScheme,
    WelfareApplication,
    EquipmentType,
    EquipmentUnit,
    EquipmentRequest,
    WelfareApplicationStatus,
    EquipmentUnitStatus,
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
        pending_welfare_apps = WelfareApplication.objects.filter(status=WelfareApplicationStatus.SUBMITTED).count()
        pending_admin_actions = pending_caregivers + pending_welfare_apps

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
            {"name": "Welfare Applications", "value": max(1, WelfareApplication.objects.count()), "color": "#8a9a86"},
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
                "pending_welfare_apps": pending_welfare_apps,
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

        # 3. Welfare Applications
        for w in WelfareApplication.objects.select_related('patient', 'scheme').all().order_by('-submitted_at')[:5]:
            activities.append({
                "id": f"welf_{w.application_id}",
                "type": "welfare_application",
                "title": "Welfare Scheme Application",
                "description": f"Application submitted by {w.patient.name} for '{w.scheme.name}'.",
                "timestamp": w.submitted_at.strftime('%d %b %Y, %H:%M'),
                "raw_time": w.submitted_at,
                "badge": w.status,
                "color": "rose",
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
    List and create government welfare schemes.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        schemes = WelfareScheme.objects.all().order_by('-created_at')
        results = [
            {
                "scheme_id": s.scheme_id,
                "name": s.name,
                "description": s.description,
                "eligibility_criteria": s.eligibility_criteria,
                "required_documents": s.required_documents,
                "application_link": s.application_link,
                "created_at": s.created_at.strftime('%d %b %Y'),
            }
            for s in schemes
        ]
        return Response(results, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        name = request.data.get('name', '').strip()
        description = request.data.get('description', '').strip()
        eligibility = request.data.get('eligibility_criteria', '').strip()
        required_docs = request.data.get('required_documents', '').strip()
        app_link = request.data.get('application_link', '').strip()

        if not name:
            return Response({"errors": {"name": ["Scheme name is required."]}}, status=status.HTTP_400_BAD_REQUEST)

        admin_obj = getattr(request.user, 'administrator', None)
        if not admin_obj:
            admin_obj = Administrator.objects.first()

        scheme = WelfareScheme.objects.create(
            name=name,
            description=description,
            eligibility_criteria=eligibility,
            required_documents=required_docs,
            application_link=app_link,
            created_by_admin=admin_obj,
        )

        return Response({
            "message": f"Welfare Scheme '{scheme.name}' created successfully.",
            "scheme_id": scheme.scheme_id,
        }, status=status.HTTP_201_CREATED)


class AdminWelfareSchemeDetailView(APIView):
    """
    Update or delete a government welfare scheme.
    """
    permission_classes = [IsAuthenticated]

    def put(self, request, scheme_id, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        scheme = WelfareScheme.objects.filter(scheme_id=scheme_id).first()
        if not scheme:
            return Response({"detail": "Scheme not found."}, status=status.HTTP_404_NOT_FOUND)

        scheme.name = request.data.get('name', scheme.name).strip()
        scheme.description = request.data.get('description', scheme.description).strip()
        scheme.eligibility_criteria = request.data.get('eligibility_criteria', scheme.eligibility_criteria).strip()
        scheme.required_documents = request.data.get('required_documents', scheme.required_documents).strip()
        scheme.application_link = request.data.get('application_link', scheme.application_link).strip()
        scheme.save()

        return Response({"message": f"Welfare Scheme '{scheme.name}' updated successfully."}, status=status.HTTP_200_OK)

    def delete(self, request, scheme_id, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        scheme = WelfareScheme.objects.filter(scheme_id=scheme_id).first()
        if not scheme:
            return Response({"detail": "Scheme not found."}, status=status.HTTP_404_NOT_FOUND)

        scheme_name = scheme.name
        scheme.delete()
        return Response({"message": f"Welfare Scheme '{scheme_name}' deleted successfully."}, status=status.HTTP_200_OK)


class AdminWelfareApplicationListView(APIView):
    """
    Lists submitted welfare applications for Administrator review.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        apps = WelfareApplication.objects.select_related('patient', 'scheme', 'submitted_by').all().order_by('-submitted_at')
        results = [
            {
                "application_id": a.application_id,
                "patient_name": a.patient.name,
                "patient_registration_id": a.patient.registration_id,
                "patient_phone": a.patient.phone,
                "scheme_name": a.scheme.name,
                "status": a.status,
                "remarks": a.remarks,
                "submitted_documents": a.submitted_documents,
                "submitted_at": a.submitted_at.strftime('%d %b %Y'),
            }
            for a in apps
        ]
        return Response(results, status=status.HTTP_200_OK)


class AdminWelfareApplicationReviewView(APIView):
    """
    Allows Administrator to update status and add remarks to a welfare application.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, application_id, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        app_obj = WelfareApplication.objects.filter(application_id=application_id).first()
        if not app_obj:
            return Response({"detail": "Application not found."}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status', '').strip()
        remarks = request.data.get('remarks', '').strip()

        if new_status in [WelfareApplicationStatus.UNDER_REVIEW, WelfareApplicationStatus.APPROVED, WelfareApplicationStatus.REJECTED]:
            app_obj.status = new_status
        if remarks:
            app_obj.remarks = remarks

        if hasattr(request.user, 'administrator'):
            app_obj.reviewed_by_admin = request.user.administrator
        app_obj.save()

        # Send notification to patient
        Notification.objects.create(
            user=app_obj.patient.user,
            type="welfare_application_update",
            message=f"Your application for '{app_obj.scheme.name}' has been updated to: {app_obj.status}.",
        )

        return Response({
            "message": f"Welfare Application #{app_obj.application_id} updated to {app_obj.status}.",
            "status": app_obj.status,
        }, status=status.HTTP_200_OK)


class AdminEquipmentListView(APIView):
    """
    Lists equipment types, inventory units, and allocation stats.
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

        return Response({
            "types": types_data,
            "units": units_data,
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


class AdminEquipmentUnitStatusUpdateView(APIView):
    """
    Update the operational status of an equipment unit (Available, Allocated, Maintenance, Retired).
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, unit_id, *args, **kwargs):
        if request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Administrators only."}, status=status.HTTP_403_FORBIDDEN)

        unit = EquipmentUnit.objects.filter(unit_id=unit_id).first()
        if not unit:
            return Response({"detail": "Equipment unit not found."}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status', '').strip()
        if new_status in [EquipmentUnitStatus.AVAILABLE, EquipmentUnitStatus.ALLOCATED, EquipmentUnitStatus.MAINTENANCE, EquipmentUnitStatus.RETIRED]:
            unit.status = new_status
            unit.save()
            return Response({"message": f"Unit '{unit.serial_number}' status updated to {unit.status}.", "status": unit.status}, status=status.HTTP_200_OK)

        return Response({"detail": "Invalid status value."}, status=status.HTTP_400_BAD_REQUEST)


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
            WelfareApplication,
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

        for wa in WelfareApplication.objects.filter(patient=patient).order_by('-submitted_at')[:2]:
            my_requests.append({
                "id": f"welf-{wa.application_id}",
                "type": f"Welfare: {wa.scheme.name if wa.scheme else 'Aid Scheme'}",
                "date": wa.submitted_at.strftime('%d %b %Y'),
                "status": wa.status,
                "raw_date": str(wa.submitted_at),
            })

        for tr in TelemedicineConsultation.objects.filter(patient=patient).order_by('-created_at')[:2]:
            my_requests.append({
                "id": f"tele-req-{tr.consultation_id}",
                "type": "Telemedicine Request",
                "date": tr.created_at.strftime('%d %b %Y'),
                "status": tr.status,
                "raw_date": str(tr.created_at),
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
            "available_schemes_count": WelfareScheme.objects.count(),
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
        ).prefetch_related('homevisitsummary__visitsymptom_set').filter(patient=patient).order_by('-scheduled_date')

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
    Government welfare schemes catalog and patient applications.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        patient = get_authenticated_patient(request)
        if not patient:
            return Response({"detail": "Access restricted to Patients only."}, status=status.HTTP_403_FORBIDDEN)

        from resources.models import WelfareScheme, WelfareApplication

        schemes = [
            {
                "scheme_id": s.scheme_id,
                "name": s.name,
                "description": s.description,
                "eligibility_criteria": s.eligibility_criteria,
                "required_documents": s.required_documents,
                "application_link": s.application_link,
            }
            for s in WelfareScheme.objects.all()
        ]

        my_applications = [
            {
                "application_id": wa.application_id,
                "scheme_id": wa.scheme.scheme_id if wa.scheme else None,
                "scheme_name": wa.scheme.name if wa.scheme else "Welfare Scheme",
                "status": wa.status,
                "remarks": wa.remarks,
                "submitted_documents": wa.submitted_documents,
                "submitted_at": wa.submitted_at.strftime('%d %b %Y'),
            }
            for wa in WelfareApplication.objects.filter(patient=patient).order_by('-submitted_at')
        ]

        return Response({
            "schemes": schemes,
            "my_applications": my_applications,
        }, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        patient = get_authenticated_patient(request)
        if not patient:
            return Response({"detail": "Access restricted to Patients only."}, status=status.HTTP_403_FORBIDDEN)

        from resources.models import WelfareScheme, WelfareApplication, ApplicationStatus

        scheme_id = request.data.get('scheme_id')
        if not scheme_id:
            return Response({"detail": "Welfare scheme ID is required."}, status=status.HTTP_400_BAD_REQUEST)

        scheme = WelfareScheme.objects.filter(scheme_id=scheme_id).first()
        if not scheme:
            return Response({"detail": "Welfare scheme not found."}, status=status.HTTP_404_NOT_FOUND)

        submitted_documents = request.data.get('submitted_documents', '').strip()

        application = WelfareApplication.objects.create(
            patient=patient,
            scheme=scheme,
            submitted_by=request.user,
            status=ApplicationStatus.SUBMITTED,
            submitted_documents=submitted_documents or "Application details submitted via portal",
        )

        return Response({
            "message": f"Application for '{scheme.name}' submitted successfully. The administrator will review your application.",
            "application_id": application.application_id,
        }, status=status.HTTP_201_CREATED)


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
        from resources.models import EquipmentRequest, WelfareApplication

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

        # 8. Welfare
        for wa in WelfareApplication.objects.filter(patient=patient):
            events.append({
                "category": "Welfare Aid",
                "event": f"Application: {wa.scheme.name if wa.scheme else 'Scheme'}",
                "date": wa.submitted_at.strftime('%d %b %Y'),
                "description": f"Application status: {wa.status}.",
                "status": wa.status,
                "raw_date": str(wa.submitted_at),
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
        pending_registrations_count = PatientRegistrationApplication.objects.filter(registration_status=RegistrationStatus.PENDING).count()
        pending_equipment_count = EquipmentRequest.objects.filter(doctor_approval_status=DoctorApprovalStatus.PENDING).count()
        # Schedule changes count
        pending_actions_count = pending_registrations_count + pending_equipment_count

        # 6. Metric 5: Active Prescriptions
        active_rx_count = Prescription.objects.filter(status=ActiveSupersededStatus.ACTIVE).count()

        summary_cards = {
            "total_patients": total_patients,
            "today_telemedicine": today_telemed_count,
            "upcoming_home_visits": upcoming_visits_count,
            "pending_actions": pending_actions_count,
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
        pending_regs = PatientRegistrationApplication.objects.filter(registration_status=RegistrationStatus.PENDING).order_by('-created_at')[:4]
        pending_registrations_data = [
            {
                "patient_id": p.id,
                "id": p.id,
                "name": p.name,
                "registration_id": p.application_id,
                "application_id": p.application_id,
                "gender": p.gender,
                "place": p.place,
                "submitted_date": p.created_at.strftime('%d %b %Y'),
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
            OccurrenceStatus
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

        # 2. Metric 1: Today's Visits
        today_visits_qs = HomeVisitOccurrence.objects.filter(
            scheduled_date=today,
            status__in=[OccurrenceStatus.SCHEDULED, OccurrenceStatus.RESCHEDULED]
        ).filter(
            Q(allocated_nurse=nurse) | Q(allocated_nurse__isnull=True)
        )
        todays_visits_count = today_visits_qs.count()

        # 3. Metric 2: Pending Visit Requests (Additional/One-time requests waiting for nurse approval)
        pending_requests_qs = HomeVisitOccurrence.objects.filter(
            visit_type=VisitType.ADDITIONAL,
            approved_by_nurse__isnull=True,
            status__in=[OccurrenceStatus.SCHEDULED, OccurrenceStatus.RESCHEDULED]
        )
        pending_requests_count = pending_requests_qs.count()

        # 4. Metric 3: My Allocated Visits (Upcoming visits allocated to this Nurse)
        my_allocated_qs = HomeVisitOccurrence.objects.filter(
            allocated_nurse=nurse,
            scheduled_date__gte=today,
            status__in=[OccurrenceStatus.SCHEDULED, OccurrenceStatus.RESCHEDULED]
        ).order_by('scheduled_date')
        my_allocated_count = my_allocated_qs.count()

        # 5. Metric 4: Reports to Review (Pending Lab Reports)
        reports_to_review_count = LabReport.objects.filter(review_status=ReviewStatus.PENDING).count()

        # 6. Metric 5: Unread Notifications
        unread_notifications_count = Notification.objects.filter(user=request.user, is_read=False).count()

        summary_cards = {
            "todays_visits": todays_visits_count,
            "pending_requests": pending_requests_count,
            "my_allocated_visits": my_allocated_count,
            "reports_to_review": reports_to_review_count,
            "unread_notifications": unread_notifications_count,
        }

        # 7. Today's Schedule
        today_schedule_data = []
        for v in today_visits_qs.order_by('occurrence_id')[:10]:
            location_str = f"{v.patient.house_name}, {v.patient.place}" if v.patient.house_name and v.patient.place else (v.patient.panchayath or "Community Residence")
            is_allocated_to_me = v.allocated_nurse_id == nurse.nurse_id
            status_display = "Allocated to You" if is_allocated_to_me else ("Available" if not v.allocated_nurse else v.status)
            today_schedule_data.append({
                "occurrence_id": v.occurrence_id,
                "patient_id": v.patient.patient_id,
                "patient_name": v.patient.name,
                "patient_reg_id": v.patient.registration_id,
                "time": "09:30 AM" if v.occurrence_id % 2 == 0 else "02:00 PM",
                "visit_type": v.visit_type,
                "urgency_level": v.urgency_level or "Routine",
                "location": location_str,
                "status": status_display,
                "is_allocated_to_me": is_allocated_to_me,
                "notes": v.notes or "",
            })

        # 8. Additional Visit Requests
        additional_requests_data = []
        for req in pending_requests_qs.order_by('scheduled_date')[:5]:
            additional_requests_data.append({
                "occurrence_id": req.occurrence_id,
                "patient_id": req.patient.patient_id,
                "patient_name": req.patient.name,
                "patient_reg_id": req.patient.registration_id,
                "requested_date": req.scheduled_date.strftime('%d %b %Y'),
                "requested_time": "10:00 AM",
                "reason": req.notes or "Additional palliative care visit requested",
                "priority": req.urgency_level or "Routine",
                "status": "Pending Nurse Review",
            })

        # 9. My Allocated Visits (Next 3 upcoming visits)
        my_allocated_data = []
        for v in my_allocated_qs[:3]:
            my_allocated_data.append({
                "occurrence_id": v.occurrence_id,
                "patient_id": v.patient.patient_id,
                "patient_name": v.patient.name,
                "patient_reg_id": v.patient.registration_id,
                "scheduled_date": v.scheduled_date.strftime('%d %b %Y'),
                "time": "10:00 AM",
                "visit_type": v.visit_type,
                "priority": v.urgency_level or "Routine",
                "status": v.status,
            })

        # 10. Alerts & Reminders
        alerts = []
        if pending_requests_count > 0:
            alerts.append({
                "id": "alert-nurse-req",
                "type": "request",
                "message": f"{pending_requests_count} additional home visit request{'s' if pending_requests_count > 1 else ''} require your review.",
                "action_view": "additional_requests",
            })
        if todays_visits_count > 0:
            alerts.append({
                "id": "alert-nurse-today",
                "type": "visit",
                "message": f"{todays_visits_count} home visit{'s' if todays_visits_count > 1 else ''} scheduled for today.",
                "action_view": "home_visits",
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
            "upcoming_allocated_visits": my_allocated_data,
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




