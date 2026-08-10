from django.urls import path
from .views import (
    RegisterView,
    LoginView,
    RefreshTokenView,
    LogoutView,
    SecureDocumentView,
    CurrentUserProfileView,
    DoctorPendingPatientsView,
    DoctorPatientDetailView,
    DoctorApprovePatientView,
    DoctorRejectPatientView,
    AdminPendingCaregiversView,
    AdminCaregiverDetailView,
    AdminApproveCaregiverView,
    AdminRejectCaregiverView,
    AdminCreateStaffView,
    AdminOnboardDoctorView,
    AdminOnboardNurseView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', LoginView.as_view(), name='auth_login'),
    path('token/refresh/', RefreshTokenView.as_view(), name='auth_token_refresh'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),
    path('documents/view/', SecureDocumentView.as_view(), name='secure_document_view'),
    path('me/', CurrentUserProfileView.as_view(), name='auth_me'),

    # Doctor Patient Approval routes
    path('doctor/patients/pending/', DoctorPendingPatientsView.as_view(), name='doctor_pending_patients'),
    path('doctor/patients/<int:patient_id>/', DoctorPatientDetailView.as_view(), name='doctor_patient_detail'),
    path('doctor/patients/<int:patient_id>/approve/', DoctorApprovePatientView.as_view(), name='doctor_approve_patient'),
    path('doctor/patients/<int:patient_id>/reject/', DoctorRejectPatientView.as_view(), name='doctor_reject_patient'),

    # Admin Caregiver Verification & Staff Creation routes
    path('admin/caregivers/pending/', AdminPendingCaregiversView.as_view(), name='admin_pending_caregivers'),
    path('admin/caregivers/<int:caregiver_id>/', AdminCaregiverDetailView.as_view(), name='admin_caregiver_detail'),
    path('admin/caregivers/<int:caregiver_id>/approve/', AdminApproveCaregiverView.as_view(), name='admin_approve_caregiver'),
    path('admin/caregivers/<int:caregiver_id>/reject/', AdminRejectCaregiverView.as_view(), name='admin_reject_caregiver'),
    path('admin/staff/create/', AdminCreateStaffView.as_view(), name='admin_create_staff'),
    path('admin/onboard-doctor/', AdminOnboardDoctorView.as_view(), name='admin_onboard_doctor'),
    path('admin/onboard-nurse/', AdminOnboardNurseView.as_view(), name='admin_onboard_nurse'),
]
