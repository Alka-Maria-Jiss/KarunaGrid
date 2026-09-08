from django.urls import path
from care_coordination.views import (
    DoctorPendingConsultationsView,
    DoctorUpcomingConsultationsView,
    DoctorConsultationListView,
    ConsultationDetailView,
    DoctorAcceptConsultationView,
    DoctorRejectConsultationView,
    DoctorScheduleConsultationView,
    DoctorStartConsultationView,
    DoctorCompleteConsultationView,
    ConsultationNotesView,
    ConsultationFollowUpView,
)

urlpatterns = [
    path('pending/', DoctorPendingConsultationsView.as_view(), name='doctor_telemedicine_pending'),
    path('upcoming/', DoctorUpcomingConsultationsView.as_view(), name='doctor_telemedicine_upcoming'),
    path('consultations/', DoctorConsultationListView.as_view(), name='doctor_telemedicine_consultations'),
    path('<int:pk>/', ConsultationDetailView.as_view(), name='doctor_telemedicine_detail'),
    path('<int:pk>/accept/', DoctorAcceptConsultationView.as_view(), name='doctor_telemedicine_accept'),
    path('<int:pk>/reject/', DoctorRejectConsultationView.as_view(), name='doctor_telemedicine_reject'),
    path('<int:pk>/schedule/', DoctorScheduleConsultationView.as_view(), name='doctor_telemedicine_schedule'),
    path('<int:pk>/reschedule/', DoctorScheduleConsultationView.as_view(), name='doctor_telemedicine_reschedule'),
    path('<int:pk>/start/', DoctorStartConsultationView.as_view(), name='doctor_telemedicine_start'),
    path('<int:pk>/complete/', DoctorCompleteConsultationView.as_view(), name='doctor_telemedicine_complete'),
    path('<int:pk>/notes/', ConsultationNotesView.as_view(), name='doctor_telemedicine_notes'),
    path('<int:pk>/followups/', ConsultationFollowUpView.as_view(), name='doctor_telemedicine_followups'),
    path('<int:pk>/schedule-followup/', ConsultationFollowUpView.as_view(), name='doctor_telemedicine_schedule_followup'),
]
