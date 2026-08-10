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
        return Response(
            {"message": "Account created successfully. Your registration is pending administrator approval."},
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


class SecureDocumentView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        doc_type = request.query_params.get('type', '').strip()
        doc_id = request.query_params.get('id', '').strip()

        if not doc_type or not doc_id:
            return Response(
                {"errors": {"detail": ["Document type and ID are required."]}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        file_path = None
        has_access = False

        if doc_type == 'patient_discharge_summary':
            patient = Patient.objects.filter(patient_id=doc_id).first()
            if not patient:
                return Response({"detail": "Document not found."}, status=status.HTTP_404_NOT_FOUND)

            file_path = patient.discharge_summary_path
            # Check authorization: Admin, Owning Patient, or Doctor
            if request.user.role == Role.ADMIN:
                has_access = True
            elif request.user.role == Role.PATIENT and hasattr(request.user, 'patient') and request.user.patient.patient_id == patient.patient_id:
                has_access = True
            elif request.user.role == Role.DOCTOR:
                has_access = True

        elif doc_type == 'caregiver_identity_proof':
            caregiver = Caregiver.objects.filter(caregiver_id=doc_id).first()
            if not caregiver:
                return Response({"detail": "Document not found."}, status=status.HTTP_404_NOT_FOUND)

            file_path = caregiver.identity_proof_path
            # Check authorization: Admin or Owning Caregiver
            if request.user.role == Role.ADMIN:
                has_access = True
            elif request.user.role == Role.CAREGIVER and hasattr(request.user, 'caregiver') and request.user.caregiver.caregiver_id == caregiver.caregiver_id:
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


