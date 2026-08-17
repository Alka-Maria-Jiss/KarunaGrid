from django.urls import path
from care_coordination.views import (
    AvailableSlotsView,
    PatientConsultationListCreateView,
    DoctorConsultationListView,
    ConsultationDetailView,
    DoctorAcceptConsultationView,
    DoctorRejectConsultationView,
    DoctorScheduleConsultationView,
    DoctorStartConsultationView,
    DoctorCompleteConsultationView,
    PatientCancelConsultationView,
    ConsultationNotesView,
    ConsultationFollowUpView
)

urlpatterns = [
    path('available-slots/', AvailableSlotsView.as_view(), name='telemedicine_available_slots'),
    path('consultations/', PatientConsultationListCreateView.as_view(), name='telemedicine_consultations_list_create'),
    path('doctor/consultations/', DoctorConsultationListView.as_view(), name='telemedicine_doctor_consultations'),
    path('consultations/<int:pk>/', ConsultationDetailView.as_view(), name='telemedicine_consultation_detail'),
    path('consultations/<int:pk>/accept/', DoctorAcceptConsultationView.as_view(), name='telemedicine_accept'),
    path('consultations/<int:pk>/reject/', DoctorRejectConsultationView.as_view(), name='telemedicine_reject'),
    path('consultations/<int:pk>/schedule/', DoctorScheduleConsultationView.as_view(), name='telemedicine_schedule'),
    path('consultations/<int:pk>/start/', DoctorStartConsultationView.as_view(), name='telemedicine_start'),
    path('consultations/<int:pk>/complete/', DoctorCompleteConsultationView.as_view(), name='telemedicine_complete'),
    path('consultations/<int:pk>/cancel/', PatientCancelConsultationView.as_view(), name='telemedicine_cancel'),
    path('consultations/<int:pk>/notes/', ConsultationNotesView.as_view(), name='telemedicine_notes'),
    path('consultations/<int:pk>/followups/', ConsultationFollowUpView.as_view(), name='telemedicine_followups'),
]
