from django.urls import path
from care_coordination.views import (
    TelemedicineDoctorListView,
    AvailableSlotsView,
    PatientConsultationListCreateView,
    DoctorConsultationListView,
    DoctorPendingConsultationsView,
    DoctorUpcomingConsultationsView,
    ConsultationDetailView,
    DoctorAcceptConsultationView,
    DoctorRejectConsultationView,
    DoctorScheduleConsultationView,
    DoctorStartConsultationView,
    DoctorCompleteConsultationView,
    PatientCancelConsultationView,
    ConsultationNotesView,
    ConsultationFollowUpView,
    HomeVisitCalendarView,
    NurseHomeVisitScheduleView,
    NurseScheduleDetailView,
    HomeVisitOccurrenceListView,
    HomeVisitOccurrenceDetailView,
    NurseAssignDoctorView,
    PatientUrgentVisitRequestView,
    DoctorHomeVisitsView,
    NurseHomeVisitsView,
    NurseVisitAllocationsView,
    NurseSelfAllocateVisitView,
    NurseAdditionalVisitRequestsView,
    NurseApproveAdditionalVisitView,
    NurseRescheduleAdditionalVisitView,
    NurseCompleteVisitView,
    NurseVisitSummaryUploadView,
    NurseCaregiverAssignmentView,
    AvailableDoctorsForVisitView,
)
from care_coordination.caregiver_views import (
    NursePendingCaregiversView,
    NurseApproveCaregiverView,
    NurseRejectCaregiverView,
    NurseApprovedCaregiversView,
    NurseCaregiverComplaintsListView,
    NurseResolveCaregiverComplaintView,
    PatientApprovedCaregiversListView,
    PatientCaregiverStatusView,
    PatientCreateCaregiverRequestView,
    PatientSubmitCaregiverFeedbackView,
    CaregiverRequestsListView,
    CaregiverAcceptRequestView,
    CaregiverRejectRequestView,
    CaregiverActiveAssignmentView,
    CaregiverCompleteCareView,
    CaregiverCareHistoryView,
    CaregiverComplaintsView,
)

urlpatterns = [
    # Telemedicine active doctors list
    path('doctors/', TelemedicineDoctorListView.as_view(), name='telemedicine_doctors'),

    # Fixed slot availability
    path('available-slots/', AvailableSlotsView.as_view(), name='telemedicine_available_slots'),

    # Patient consultation request & list
    path('request/', PatientConsultationListCreateView.as_view(), name='telemedicine_request'),
    path('my-consultations/', PatientConsultationListCreateView.as_view(), name='telemedicine_my_consultations'),
    path('consultations/', PatientConsultationListCreateView.as_view(), name='telemedicine_consultations_list_create'),

    # Direct consultation detail by PK
    path('<int:pk>/', ConsultationDetailView.as_view(), name='telemedicine_direct_detail'),
    path('<int:pk>/cancel/', PatientCancelConsultationView.as_view(), name='telemedicine_direct_cancel'),
    path('<int:pk>/notes/', ConsultationNotesView.as_view(), name='telemedicine_direct_notes'),
    path('<int:pk>/followups/', ConsultationFollowUpView.as_view(), name='telemedicine_direct_followups'),

    # Doctor consultation management
    path('doctor/pending/', DoctorPendingConsultationsView.as_view(), name='telemedicine_doctor_pending'),
    path('doctor/upcoming/', DoctorUpcomingConsultationsView.as_view(), name='telemedicine_doctor_upcoming'),
    path('doctor/consultations/', DoctorConsultationListView.as_view(), name='telemedicine_doctor_consultations'),

    # Consultation action routes with /consultations/<pk>/ prefix
    path('consultations/<int:pk>/', ConsultationDetailView.as_view(), name='telemedicine_consultation_detail'),
    path('consultations/<int:pk>/accept/', DoctorAcceptConsultationView.as_view(), name='telemedicine_accept'),
    path('consultations/<int:pk>/reject/', DoctorRejectConsultationView.as_view(), name='telemedicine_reject'),
    path('consultations/<int:pk>/schedule/', DoctorScheduleConsultationView.as_view(), name='telemedicine_schedule'),
    path('consultations/<int:pk>/reschedule/', DoctorScheduleConsultationView.as_view(), name='telemedicine_reschedule'),
    path('consultations/<int:pk>/start/', DoctorStartConsultationView.as_view(), name='telemedicine_start'),
    path('consultations/<int:pk>/complete/', DoctorCompleteConsultationView.as_view(), name='telemedicine_complete'),
    path('consultations/<int:pk>/cancel/', PatientCancelConsultationView.as_view(), name='telemedicine_cancel'),
    path('consultations/<int:pk>/notes/', ConsultationNotesView.as_view(), name='telemedicine_notes'),
    path('consultations/<int:pk>/followups/', ConsultationFollowUpView.as_view(), name='telemedicine_followups'),
    path('consultations/<int:pk>/schedule-followup/', ConsultationFollowUpView.as_view(), name='telemedicine_schedule_followup'),

    # Canonical Home Visit Endpoints
    path('home-visits/calendar/', HomeVisitCalendarView.as_view(), name='home_visit_calendar'),
    path('home-visits/schedules/', NurseHomeVisitScheduleView.as_view(), name='home_visit_schedules'),
    path('home-visits/schedules/<int:pk>/', NurseScheduleDetailView.as_view(), name='home_visit_schedule_detail'),
    path('home-visits/occurrences/', HomeVisitOccurrenceListView.as_view(), name='home_visit_occurrences'),
    path('home-visits/occurrences/<int:pk>/', HomeVisitOccurrenceDetailView.as_view(), name='home_visit_occurrence_detail'),
    path('home-visits/occurrences/<int:pk>/claim/', NurseSelfAllocateVisitView.as_view(), name='home_visit_occurrence_claim'),
    path('home-visits/occurrences/<int:pk>/assign-doctor/', NurseAssignDoctorView.as_view(), name='home_visit_occurrence_assign_doctor'),
    path('home-visits/occurrences/<int:pk>/complete/', NurseCompleteVisitView.as_view(), name='home_visit_occurrence_complete'),
    path('home-visits/urgent-requests/', PatientUrgentVisitRequestView.as_view(), name='home_visit_urgent_requests'),
    path('home-visits/available-doctors/', AvailableDoctorsForVisitView.as_view(), name='home_visit_available_doctors'),

    # Doctor Home Visits
    path('doctor/home-visits/', DoctorHomeVisitsView.as_view(), name='care_coordination_doctor_home_visits'),

    # Nurse Home Visits & Caregiver Coordination (Compatible routes)
    path('nurse/home-visits/', NurseHomeVisitsView.as_view(), name='nurse_home_visits'),
    path('nurse/visit-allocations/', NurseVisitAllocationsView.as_view(), name='nurse_visit_allocations'),
    path('nurse/visits/<int:occurrence_id>/self-allocate/', NurseSelfAllocateVisitView.as_view(), name='nurse_self_allocate_visit'),
    path('nurse/visits/<int:pk>/assign-doctor/', NurseAssignDoctorView.as_view(), name='nurse_assign_doctor'),
    path('nurse/additional-requests/', NurseAdditionalVisitRequestsView.as_view(), name='nurse_additional_visit_requests'),
    path('nurse/additional-requests/<int:occurrence_id>/approve/', NurseApproveAdditionalVisitView.as_view(), name='nurse_approve_additional_visit'),
    path('nurse/additional-requests/<int:occurrence_id>/accept/', NurseApproveAdditionalVisitView.as_view(), name='nurse_accept_additional_visit'),
    path('nurse/additional-requests/<int:occurrence_id>/reschedule/', NurseRescheduleAdditionalVisitView.as_view(), name='nurse_reschedule_additional_visit'),
    path('nurse/visits/<int:occurrence_id>/complete/', NurseCompleteVisitView.as_view(), name='nurse_complete_visit'),
    path('nurse/visits/<int:occurrence_id>/summary-upload/', NurseVisitSummaryUploadView.as_view(), name='nurse_visit_summary_upload'),
    path('nurse/caregiver-assignments/', NurseCaregiverAssignmentView.as_view(), name='nurse_caregiver_assignments'),
    path('nurse/caregiver-assignments/<int:assignment_id>/end/', NurseCaregiverAssignmentView.as_view(), name='nurse_end_caregiver_assignment'),

    # Complete Caregiver Management Module (Phase 1)
    # Nurse Caregiver Management
    path('nurse/caregivers/pending/', NursePendingCaregiversView.as_view(), name='nurse_pending_caregivers'),
    path('nurse/caregivers/<int:caregiver_id>/approve/', NurseApproveCaregiverView.as_view(), name='nurse_approve_caregiver'),
    path('nurse/caregivers/<int:caregiver_id>/reject/', NurseRejectCaregiverView.as_view(), name='nurse_reject_caregiver'),
    path('nurse/caregivers/approved/', NurseApprovedCaregiversView.as_view(), name='nurse_approved_caregivers'),
    path('nurse/caregiver-complaints/', NurseCaregiverComplaintsListView.as_view(), name='nurse_caregiver_complaints'),
    path('nurse/caregiver-complaints/<int:complaint_id>/resolve/', NurseResolveCaregiverComplaintView.as_view(), name='nurse_resolve_caregiver_complaint'),

    # Patient Caregiver Workflow
    path('patient/caregivers/', PatientApprovedCaregiversListView.as_view(), name='patient_approved_caregivers'),
    path('patient/caregiver/', PatientCaregiverStatusView.as_view(), name='patient_caregiver_status'),
    path('patient/caregiver-requests/', PatientCreateCaregiverRequestView.as_view(), name='patient_create_caregiver_request'),
    path('patient/caregiver-feedback/', PatientSubmitCaregiverFeedbackView.as_view(), name='patient_submit_caregiver_feedback'),

    # Caregiver Portal Workflow
    path('caregiver/requests/', CaregiverRequestsListView.as_view(), name='caregiver_requests_list'),
    path('caregiver/requests/<int:request_id>/accept/', CaregiverAcceptRequestView.as_view(), name='caregiver_accept_request'),
    path('caregiver/requests/<int:request_id>/reject/', CaregiverRejectRequestView.as_view(), name='caregiver_reject_request'),
    path('caregiver/assignment/', CaregiverActiveAssignmentView.as_view(), name='caregiver_active_assignment'),
    path('caregiver/assignment/complete/', CaregiverCompleteCareView.as_view(), name='caregiver_complete_care'),
    path('caregiver/assignment/<int:assignment_id>/complete/', CaregiverCompleteCareView.as_view(), name='caregiver_complete_care_id'),
    path('caregiver/care-history/', CaregiverCareHistoryView.as_view(), name='caregiver_care_history'),
    path('caregiver/complaints/', CaregiverComplaintsView.as_view(), name='caregiver_complaints'),
]
