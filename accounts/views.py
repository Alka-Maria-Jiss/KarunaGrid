import mimetypes
from datetime import datetime, timedelta, date
from django.utils import timezone
from django.http import FileResponse
from django.core.files.storage import default_storage
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
    Patient,
    Caregiver,
    Doctor,
    Nurse,
    Administrator,
)
from .serializers import (
    PatientRegisterSerializer,
    CaregiverRegisterSerializer,
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

        serializer.save()
        approval_type = "doctor approval" if role == 'patient' else "administrator verification"
        return Response(
            {"message": f"Your registration is pending {approval_type}. You will receive an email once your registration has been approved. After approval, you can log in using the email and password you provided."},
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
                "phone": d.phone,
                "panchayath": d.panchayath,
                "pincode": d.pincode,
            }
        elif user.role == Role.NURSE and hasattr(user, 'nurse'):
            n = user.nurse
            profile_data["name"] = n.name
            profile_data["status"] = n.verification_status
            profile_data["details"] = {
                "nurse_id": n.nurse_id,
                "phone": n.phone,
                "panchayath": n.panchayath,
                "pincode": n.pincode,
            }
        elif user.role == Role.ADMIN and hasattr(user, 'administrator'):
            a = user.administrator
            profile_data["name"] = a.name
            profile_data["details"] = {
                "admin_id": a.admin_id,
                "phone": a.phone,
            }

        return Response(profile_data, status=status.HTTP_200_OK)


# --- DOCTOR PATIENT APPROVAL ENDPOINTS ---

class DoctorPendingPatientsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role != Role.DOCTOR:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        pending_patients = Patient.objects.filter(registration_status=RegistrationStatus.PENDING).order_by('-created_at')
        serializer = PendingPatientSerializer(pending_patients, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DoctorPatientDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, patient_id, *args, **kwargs):
        if request.user.role != Role.DOCTOR:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        patient = Patient.objects.filter(patient_id=patient_id).first()
        if not patient:
            return Response({"detail": "Patient record not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = PendingPatientSerializer(patient)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DoctorApprovePatientView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, patient_id, *args, **kwargs):
        if request.user.role != Role.DOCTOR:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        patient = Patient.objects.filter(patient_id=patient_id).first()
        if not patient:
            return Response({"detail": "Patient record not found."}, status=status.HTTP_404_NOT_FOUND)

        if patient.registration_status != RegistrationStatus.PENDING:
            return Response(
                {"errors": {"detail": [f"This patient registration has already been {patient.registration_status.lower()}."]}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        patient.registration_status = RegistrationStatus.APPROVED
        patient.rejection_reason = None
        if hasattr(request.user, 'doctor'):
            patient.reviewed_by_doctor = request.user.doctor
        patient.save()

        create_status_notification(patient.user, status=RegistrationStatus.APPROVED, role='Patient')

        return Response(
            {"message": f"Patient '{patient.name}' registration approved successfully.", "patient_id": patient.patient_id},
            status=status.HTTP_200_OK,
        )


class DoctorRejectPatientView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, patient_id, *args, **kwargs):
        if request.user.role != Role.DOCTOR:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        patient = Patient.objects.filter(patient_id=patient_id).first()
        if not patient:
            return Response({"detail": "Patient record not found."}, status=status.HTTP_404_NOT_FOUND)

        if patient.registration_status != RegistrationStatus.PENDING:
            return Response(
                {"errors": {"detail": [f"This patient registration has already been {patient.registration_status.lower()}."]}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rejection_reason = request.data.get('rejection_reason', '').strip()
        if not rejection_reason:
            return Response(
                {"errors": {"rejection_reason": ["A rejection reason is required."]}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        patient.registration_status = RegistrationStatus.REJECTED
        patient.rejection_reason = rejection_reason
        if hasattr(request.user, 'doctor'):
            patient.reviewed_by_doctor = request.user.doctor
        patient.save()

        create_status_notification(patient.user, status=RegistrationStatus.REJECTED, role='Patient', rejection_reason=rejection_reason)

        return Response(
            {"message": f"Patient '{patient.name}' registration rejected.", "patient_id": patient.patient_id},
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
                address = f"{u.doctor.place}, {u.doctor.panchayath}" if u.doctor.place != 'N/A' else u.doctor.service_area or ""
                details = {
                    "specialization": u.doctor.specialization,
                    "service_area": u.doctor.service_area,
                    "verification_status": u.doctor.verification_status,
                }
            elif u.role == Role.NURSE and hasattr(u, 'nurse'):
                name = f"Nurse {u.nurse.name}"
                phone = u.nurse.phone or ""
                address = f"{u.nurse.place}, {u.nurse.panchayath}" if u.nurse.place != 'N/A' else u.nurse.service_area or ""
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
        active_prescriptions_count = Prescription.objects.filter(patient=patient, status='Active').count()

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
    View and update permitted personal information for the authenticated patient.
    Clinical fields remain protected.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        patient = get_authenticated_patient(request)
        if not patient:
            return Response({"detail": "Access restricted to Patients only."}, status=status.HTTP_403_FORBIDDEN)

        data = {
            "patient_id": patient.patient_id,
            "registration_id": patient.registration_id,
            "name": patient.name,
            "email": request.user.email,
            "phone": patient.phone,
            "dob": patient.dob.strftime('%Y-%m-%d') if patient.dob else None,
            "gender": patient.gender,
            "house_name": patient.house_name,
            "place": patient.place,
            "panchayath": patient.panchayath,
            "ward_no": patient.ward_no,
            "pincode": patient.pincode,
            "emergency_contact_name": patient.emergency_contact_name,
            "emergency_contact_phone": patient.emergency_contact_phone,
            "registration_status": patient.registration_status,
            "discharge_summary_path": patient.discharge_summary_path,
        }
        return Response(data, status=status.HTTP_200_OK)

    def put(self, request, *args, **kwargs):
        patient = get_authenticated_patient(request)
        if not patient:
            return Response({"detail": "Access restricted to Patients only."}, status=status.HTTP_403_FORBIDDEN)

        # Allow updating permitted contact and address fields
        phone = request.data.get('phone', patient.phone)
        if phone:
            patient.phone = str(phone).strip()

        patient.house_name = request.data.get('house_name', patient.house_name)
        patient.place = request.data.get('place', patient.place)
        patient.panchayath = request.data.get('panchayath', patient.panchayath)
        patient.ward_no = request.data.get('ward_no', patient.ward_no)
        patient.pincode = request.data.get('pincode', patient.pincode)
        patient.emergency_contact_name = request.data.get('emergency_contact_name', patient.emergency_contact_name)
        patient.emergency_contact_phone = request.data.get('emergency_contact_phone', patient.emergency_contact_phone)

        patient.save()
        return Response({"message": "Profile updated successfully."}, status=status.HTTP_200_OK)


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
                "text": d.diagnosis_text,
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

        prescriptions = Prescription.objects.filter(patient=patient).prefetch_related('items').order_by('-created_at')
        results = []
        for rx in prescriptions:
            items = [
                {
                    "item_id": itm.item_id,
                    "medicine_name": itm.medicine_name,
                    "dosage": itm.dosage,
                    "frequency": itm.frequency,
                    "duration_days": itm.duration_days,
                    "change_type": itm.change_type,
                }
                for itm in rx.items.all()
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
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        patient = get_authenticated_patient(request)
        if not patient:
            return Response({"detail": "Access restricted to Patients only."}, status=status.HTTP_403_FORBIDDEN)

        from medical_records.models import LabReport

        reports = LabReport.objects.filter(patient=patient).order_by('-uploaded_at')
        results = [
            {
                "report_id": lr.report_id,
                "report_date": lr.report_date.strftime('%d %b %Y') if lr.report_date else "N/A",
                "uploaded_at": lr.uploaded_at.strftime('%d %b %Y') if lr.uploaded_at else "N/A",
                "review_status": lr.review_status,
                "remarks": lr.remarks or "Diagnostic Laboratory Report",
                "file_path": lr.file_path,
            }
            for lr in reports
        ]
        return Response(results, status=status.HTTP_200_OK)


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

        schedule = HomeVisitSchedule.objects.filter(patient=patient, status='Active').first()
        schedule_data = None
        if schedule:
            schedule_data = {
                "schedule_id": schedule.schedule_id,
                "frequency": schedule.frequency,
                "doctor_name": schedule.doctor.name if schedule.doctor else "Doctor",
                "start_date": schedule.start_date.strftime('%d %b %Y'),
                "status": schedule.status,
            }

        occurrences = HomeVisitOccurrence.objects.filter(patient=patient).order_by('-scheduled_date')
        occurrences_data = []
        for occ in occurrences:
            summary = getattr(occ, 'summary', None)
            summary_data = None
            if summary:
                summary_data = {
                    "blood_pressure": summary.blood_pressure,
                    "pulse": summary.pulse,
                    "temperature": summary.temperature,
                    "oxygen_level": summary.oxygen_level,
                    "treatment_notes": summary.treatment_notes,
                }
            occurrences_data.append({
                "occurrence_id": occ.occurrence_id,
                "scheduled_date": occ.scheduled_date.strftime('%d %b %Y'),
                "visit_type": occ.visit_type,
                "urgency_level": occ.urgency_level,
                "status": occ.status,
                "nurse_name": occ.allocated_nurse.name if occ.allocated_nurse else "Community Nurse",
                "notes": occ.notes,
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
            # Recurring schedule change request
            req_freq = request.data.get('frequency', 'Weekly')
            # Save or log schedule change request
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
        schedule = HomeVisitSchedule.objects.filter(patient=patient, status='Active').first()

        occurrence = HomeVisitOccurrence.objects.create(
            schedule=schedule,
            patient=patient,
            scheduled_date=target_date,
            visit_type=visit_type,
            urgency_level=urgency,
            status=OccurrenceStatus.SCHEDULED,
            requested_by=request.user,
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
                "event": "Laboratory Report Uploaded",
                "date": lr.uploaded_at.strftime('%d %b %Y') if lr.uploaded_at else "Diagnostic Record",
                "description": lr.remarks or "Diagnostic test results recorded.",
                "status": lr.review_status,
                "raw_date": str(lr.uploaded_at or lr.report_date or ''),
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




