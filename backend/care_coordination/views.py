import uuid
from datetime import datetime, timedelta, time
from django.db import transaction
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from django.db.models import Q
from accounts.models import Role, Doctor, Patient, Caregiver, VerificationStatus
from notifications.models import Notification
from care_coordination.models import (
    TelemedicineConsultation,
    TelemedicineConsultationNote,
    TelemedicineFollowUp,
    ConsultationStatus,
    UrgencyLevel,
    HomeVisitSchedule,
    HomeVisitOccurrence,
    HomeVisitSummary,
    VisitSymptom,
    ScheduleFrequency,
    ScheduleStatus,
    VisitType,
    OccurrenceStatus
)
from care_coordination.serializers import (
    TELEMEDICINE_SLOTS,
    ALLOWED_START_TIMES,
    is_valid_telemedicine_slot,
    get_slot_end_time,
    TelemedicineConsultationSerializer,
    TelemedicineConsultationNoteSerializer,
    TelemedicineFollowUpSerializer,
    ConsultationCreateSerializer,
    ConsultationScheduleSerializer,
    ConsultationRejectSerializer
)

# Active booking statuses that occupy doctor / patient schedule
ACTIVE_BOOKING_STATUSES = [
    ConsultationStatus.ACCEPTED,
    ConsultationStatus.SCHEDULED,
    ConsultationStatus.IN_PROGRESS,
    ConsultationStatus.RESCHEDULED,
]

LUNCH_BREAK = {
    "start_time": "13:00",
    "end_time": "14:00",
    "label": "Lunch Break (01:00 PM – 02:00 PM)",
    "status": "unavailable",
    "is_available": False,
}


def is_time_overlapping(start1, end1, start2, end2):
    """
    Returns True if interval (start1, end1) overlaps with (start2, end2).
    Condition: start1 < end2 AND end1 > start2
    """
    return start1 < end2 and end1 > start2


def get_active_consultations_query(doctor_id, target_date, exclude_id=None):
    """
    Returns active confirmed consultations that reserve doctor's schedule on target_date.
    """
    qs = TelemedicineConsultation.objects.filter(
        doctor_id=doctor_id,
        status__in=ACTIVE_BOOKING_STATUSES
    )
    if exclude_id:
        qs = qs.exclude(consultation_id=exclude_id)

    return [
        c for c in qs
        if (c.scheduled_date == target_date or (not c.scheduled_date and c.requested_date == target_date))
    ]


def get_patient_active_consultations_query(patient_id, target_date, exclude_id=None):
    """
    Returns active confirmed consultations that reserve patient's schedule across all doctors on target_date.
    """
    qs = TelemedicineConsultation.objects.filter(
        patient_id=patient_id,
        status__in=ACTIVE_BOOKING_STATUSES
    )
    if exclude_id:
        qs = qs.exclude(consultation_id=exclude_id)

    return [
        c for c in qs
        if (c.scheduled_date == target_date or (not c.scheduled_date and c.requested_date == target_date))
    ]


def generate_jitsi_meeting_link(consultation_id):
    """
    Jitsi Meet integration for Phase 1 demonstration video solution.
    Generates a secure, unique meeting room URL that can later be swapped with
    a dedicated production telehealth video service if required.
    """
    token = uuid.uuid4().hex[:10]
    return f"https://meet.jit.si/karunagrid-{consultation_id}-{token}"


# --- TELEMEDICINE DOCTORS LIST API ---

class TelemedicineDoctorListView(APIView):
    """
    GET /api/telemedicine/doctors/
    Returns real active, verified doctors eligible for telemedicine consultations.
    Accessible to authenticated Patients, Caregivers, Doctors, and Staff.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        doctors_qs = Doctor.objects.select_related('user').filter(
            user__is_active=True
        ).exclude(
            verification_status=VerificationStatus.REJECTED
        ).order_by('name')

        results = []
        for doc in doctors_qs:
            doc_name = doc.name.strip()
            if not doc_name.lower().startswith("dr."):
                formatted_name = f"Dr. {doc_name}"
            else:
                formatted_name = doc_name

            results.append({
                "doctor_id": doc.doctor_id,
                "user_id": doc.user_id,
                "name": formatted_name,
                "raw_name": doc_name,
                "specialization": doc.specialization or "Palliative Medicine",
                "qualification": doc.qualification or "MBBS",
                "service_area": doc.service_area or "",
                "phone": doc.phone or "",
                "is_available_now": doc.is_available_now,
            })

        return Response(results, status=status.HTTP_200_OK)


# --- AVAILABLE SLOTS API ---

class AvailableSlotsView(APIView):
    """
    GET /api/telemedicine/available-slots/
    Returns all 11 fixed 30-minute consultation slots with current availability for Doctor + Date.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        doctor_id = request.query_params.get('doctor_id')
        date_str = request.query_params.get('date')

        if not doctor_id or not date_str:
            return Response(
                {"errors": {"detail": ["Both doctor_id and date parameters are required."]}},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            target_date = datetime.strptime(str(date_str)[:10], "%Y-%m-%d").date()
        except ValueError:
            return Response(
                {"errors": {"date": ["Invalid date format. Use YYYY-MM-DD."]}},
                status=status.HTTP_400_BAD_REQUEST
            )

        doctor = Doctor.objects.filter(Q(doctor_id=doctor_id) | Q(user_id=doctor_id)).first()
        if not doctor:
            return Response({"detail": "Doctor not found."}, status=status.HTTP_404_NOT_FOUND)

        active_consultations = get_active_consultations_query(doctor.doctor_id, target_date)

        slots = []
        for s in TELEMEDICINE_SLOTS:
            slot_start = time(int(s["start_time"][:2]), int(s["start_time"][3:5]))
            slot_end = time(int(s["end_time"][:2]), int(s["end_time"][3:5]))

            is_available = True
            for c in active_consultations:
                c_start = c.scheduled_start_time or c.requested_time
                if not c_start:
                    continue
                c_end = c.scheduled_end_time or (datetime.combine(target_date, c_start) + timedelta(minutes=30)).time()

                if is_time_overlapping(slot_start, slot_end, c_start, c_end):
                    is_available = False
                    break

            slots.append({
                "start_time": s["start_time"],
                "end_time": s["end_time"],
                "status": "available" if is_available else "booked",
                "is_available": is_available,
            })

        return Response({
            "date": target_date.strftime("%Y-%m-%d"),
            "doctor_id": doctor.doctor_id,
            "doctor_name": doctor.name,
            "slots": slots,
            "lunch_break": LUNCH_BREAK
        }, status=status.HTTP_200_OK)


# --- PATIENT CONSULTATION REQUEST & LIST VIEW ---

class PatientConsultationListCreateView(APIView):
    """
    Patient consultations handling:
    GET: List consultations for authenticated user (Patient, Caregiver, or Doctor).
    POST: Submit new consultation request with fixed slot & double-booking validation.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        if user.role == Role.PATIENT:
            patient = getattr(user, 'patient', None)
            if not patient:
                return Response({"detail": "Patient profile not found."}, status=status.HTTP_404_NOT_FOUND)
            consultations = TelemedicineConsultation.objects.filter(patient=patient).order_by('-created_at')
        elif user.role == Role.DOCTOR:
            doctor = getattr(user, 'doctor', None)
            if not doctor:
                return Response({"detail": "Doctor profile not found."}, status=status.HTTP_404_NOT_FOUND)
            consultations = TelemedicineConsultation.objects.filter(doctor=doctor).order_by('-created_at')
        elif user.role == Role.CAREGIVER:
            caregiver = getattr(user, 'caregiver', None)
            if caregiver:
                from care_coordination.models import CaregiverPatientAssignment, AssignmentStatus
                assigned_patient_ids = CaregiverPatientAssignment.objects.filter(
                    caregiver=caregiver, status=AssignmentStatus.ACTIVE
                ).values_list('patient_id', flat=True)
                consultations = TelemedicineConsultation.objects.filter(patient_id__in=assigned_patient_ids).order_by('-created_at')
            else:
                consultations = TelemedicineConsultation.objects.none()
        else:
            consultations = TelemedicineConsultation.objects.all().order_by('-created_at')

        serializer = TelemedicineConsultationSerializer(consultations, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        user = request.user

        # Determine patient from authenticated user or caregiver
        patient = None
        if user.role == Role.PATIENT:
            patient = getattr(user, 'patient', None)
            if not patient:
                return Response({"detail": "Patient profile not found."}, status=status.HTTP_404_NOT_FOUND)
        elif user.role == Role.CAREGIVER:
            caregiver = getattr(user, 'caregiver', None)
            patient_id = request.data.get('patient_id')
            if not caregiver or not patient_id:
                return Response({"detail": "Patient ID is required for caregiver request."}, status=status.HTTP_400_BAD_REQUEST)
            from care_coordination.models import CaregiverPatientAssignment, AssignmentStatus
            is_assigned = CaregiverPatientAssignment.objects.filter(
                caregiver=caregiver, patient_id=patient_id, status=AssignmentStatus.ACTIVE
            ).exists()
            if not is_assigned:
                return Response({"detail": "You are not assigned to this patient."}, status=status.HTTP_403_FORBIDDEN)
            patient = Patient.objects.filter(patient_id=patient_id).first()
            if not patient:
                return Response({"detail": "Patient not found."}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({"detail": "Only Patients or Caregivers can request consultations."}, status=status.HTTP_403_FORBIDDEN)

        serializer = ConsultationCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        doctor_id = data['doctor_id']
        requested_date = data['requested_date']
        requested_time = data['requested_time']

        doctor = Doctor.objects.filter(Q(doctor_id=doctor_id) | Q(user_id=doctor_id)).first()
        if not doctor:
            return Response({"detail": "Doctor not found."}, status=status.HTTP_404_NOT_FOUND)

        # Validate requested time against fixed 30-min slots
        is_valid_slot, req_start, req_end = is_valid_telemedicine_slot(requested_time)
        if not is_valid_slot:
            return Response(
                {"errors": {"requested_time": ["Invalid consultation slot. Please select one of the allowed 30-minute fixed time slots."]}},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Concurrency & Double-Booking Protection
        with transaction.atomic():
            Doctor.objects.select_for_update().get(doctor_id=doctor.doctor_id)

            # 1. Patient Double-Booking Rule across ALL doctors
            patient_conflicts = get_patient_active_consultations_query(patient.patient_id, requested_date)
            for pc in patient_conflicts:
                pc_start = pc.scheduled_start_time or pc.requested_time
                if not pc_start:
                    continue
                pc_end = pc.scheduled_end_time or (datetime.combine(requested_date, pc_start) + timedelta(minutes=30)).time()
                if is_time_overlapping(req_start, req_end, pc_start, pc_end):
                    return Response(
                        {"detail": "This time slot is no longer available for you because you already have a consultation scheduled at this time."},
                        status=status.HTTP_409_CONFLICT
                    )

            # 2. Doctor Double-Booking Rule
            doctor_conflicts = get_active_consultations_query(doctor.doctor_id, requested_date)
            for dc in doctor_conflicts:
                dc_start = dc.scheduled_start_time or dc.requested_time
                if not dc_start:
                    continue
                dc_end = dc.scheduled_end_time or (datetime.combine(requested_date, dc_start) + timedelta(minutes=30)).time()
                if is_time_overlapping(req_start, req_end, dc_start, dc_end):
                    return Response(
                        {"detail": "This time slot is no longer available for this doctor. Please select another consultation time."},
                        status=status.HTTP_409_CONFLICT
                    )

            consultation = TelemedicineConsultation.objects.create(
                patient=patient,
                doctor=doctor,
                requested_by=user,
                requested_date=requested_date,
                requested_time=req_start,
                reason=data['reason'],
                symptoms=data.get('symptoms', ''),
                priority=data.get('priority', UrgencyLevel.ROUTINE),
                patient_notes=data.get('patient_notes', ''),
                status=ConsultationStatus.PENDING
            )

        # Notify doctor of pending request
        Notification.objects.create(
            user=doctor.user,
            type='telemedicine',
            message=f"New {consultation.priority} telemedicine consultation request from Patient '{patient.name}' for {requested_date} at {req_start.strftime('%H:%M')}."
        )

        res_serializer = TelemedicineConsultationSerializer(consultation)
        return Response(res_serializer.data, status=status.HTTP_201_CREATED)


# --- DOCTOR PENDING CONSULTATIONS VIEW ---

class DoctorPendingConsultationsView(APIView):
    """
    GET /api/doctor/telemedicine/pending/
    Returns pending consultation requests for authenticated doctor.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        if user.role != Role.DOCTOR:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        doctor = getattr(user, 'doctor', None)
        if not doctor:
            return Response({"detail": "Doctor profile not found."}, status=status.HTTP_404_NOT_FOUND)

        pending = TelemedicineConsultation.objects.filter(
            doctor=doctor, status=ConsultationStatus.PENDING
        ).select_related('patient', 'doctor').order_by('-created_at')

        serializer = TelemedicineConsultationSerializer(pending, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


# --- DOCTOR UPCOMING CONSULTATIONS VIEW ---

class DoctorUpcomingConsultationsView(APIView):
    """
    GET /api/doctor/telemedicine/upcoming/
    Returns upcoming/scheduled/in-progress consultations for authenticated doctor.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        if user.role != Role.DOCTOR:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        doctor = getattr(user, 'doctor', None)
        if not doctor:
            return Response({"detail": "Doctor profile not found."}, status=status.HTTP_404_NOT_FOUND)

        upcoming = TelemedicineConsultation.objects.filter(
            doctor=doctor, status__in=ACTIVE_BOOKING_STATUSES
        ).select_related('patient', 'doctor').order_by('scheduled_date', 'scheduled_start_time')

        serializer = TelemedicineConsultationSerializer(upcoming, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


# --- DOCTOR CONSULTATION LIST VIEW ---

class DoctorConsultationListView(APIView):
    """
    GET /api/telemedicine/doctor/consultations/
    Lists consultations for authenticated doctor with optional status filter.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        if user.role != Role.DOCTOR:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        doctor = getattr(user, 'doctor', None)
        if not doctor:
            return Response({"detail": "Doctor profile not found."}, status=status.HTTP_404_NOT_FOUND)

        status_param = request.query_params.get('status')
        qs = TelemedicineConsultation.objects.filter(doctor=doctor).select_related('patient', 'doctor').order_by('-created_at')

        if status_param and status_param.lower() != 'all':
            qs = qs.filter(status__iexact=status_param)

        serializer = TelemedicineConsultationSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


# --- CONSULTATION DETAIL VIEW ---

class ConsultationDetailView(APIView):
    """
    GET /api/telemedicine/<pk>/
    Returns consultation record, notes, and followups with strict RBAC.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk, *args, **kwargs):
        consultation = TelemedicineConsultation.objects.filter(consultation_id=pk).select_related('patient', 'doctor').first()
        if not consultation:
            return Response({"detail": "Consultation record not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        is_authorized = False

        if user.role == Role.PATIENT and consultation.patient.user_id == user.user_id:
            is_authorized = True
        elif user.role == Role.DOCTOR and consultation.doctor.user_id == user.user_id:
            is_authorized = True
        elif user.role == Role.ADMIN or user.is_staff:
            is_authorized = True
        elif user.role == Role.CAREGIVER:
            caregiver = getattr(user, 'caregiver', None)
            if caregiver:
                from care_coordination.models import CaregiverPatientAssignment, AssignmentStatus
                is_authorized = CaregiverPatientAssignment.objects.filter(
                    caregiver=caregiver, patient=consultation.patient, status=AssignmentStatus.ACTIVE
                ).exists()

        if not is_authorized:
            return Response({"detail": "You are not authorized to access this consultation."}, status=status.HTTP_403_FORBIDDEN)

        serializer = TelemedicineConsultationSerializer(consultation)
        return Response(serializer.data, status=status.HTTP_200_OK)


# --- DOCTOR ACCEPT CONSULTATION ---

class DoctorAcceptConsultationView(APIView):
    """
    POST /api/doctor/telemedicine/<pk>/accept/
    Accepts pending consultation with concurrency-safe atomic locking, double-booking validation,
    and unique Jitsi meeting link generation.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        user = request.user
        if user.role != Role.DOCTOR:
            return Response({"detail": "Only Doctors can accept consultation requests."}, status=status.HTTP_403_FORBIDDEN)

        consultation = TelemedicineConsultation.objects.filter(consultation_id=pk).select_related('patient', 'doctor').first()
        if not consultation:
            return Response({"detail": "Consultation record not found."}, status=status.HTTP_404_NOT_FOUND)

        if consultation.doctor.user_id != user.user_id:
            return Response({"detail": "Access denied. You can only accept consultations assigned to you."}, status=status.HTTP_403_FORBIDDEN)

        # Allow doctor to confirm requested slot or provide another valid slot
        sched_date_raw = request.data.get('scheduled_date') or consultation.requested_date
        sched_time_raw = request.data.get('scheduled_start_time') or request.data.get('scheduled_time') or consultation.requested_time

        if isinstance(sched_date_raw, str):
            try:
                target_date = datetime.strptime(str(sched_date_raw)[:10], "%Y-%m-%d").date()
            except ValueError:
                return Response({"errors": {"scheduled_date": ["Invalid date format. Use YYYY-MM-DD."]}}, status=status.HTTP_400_BAD_REQUEST)
        else:
            target_date = sched_date_raw

        is_valid_slot, start_time, end_time = is_valid_telemedicine_slot(sched_time_raw)
        if not is_valid_slot:
            return Response(
                {"errors": {"scheduled_start_time": ["Invalid consultation slot. Please select one of the allowed 30-minute fixed time slots."]}},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ATOMIC DB TRANSACTION + SELECT_FOR_UPDATE ROW LOCKING
        with transaction.atomic():
            Doctor.objects.select_for_update().get(doctor_id=consultation.doctor.doctor_id)

            # 1. Re-check Doctor Availability
            doc_conflicts = get_active_consultations_query(consultation.doctor.doctor_id, target_date, exclude_id=consultation.consultation_id)
            for dc in doc_conflicts:
                c_start = dc.scheduled_start_time or dc.requested_time
                if not c_start:
                    continue
                c_end = dc.scheduled_end_time or (datetime.combine(target_date, c_start) + timedelta(minutes=30)).time()
                if is_time_overlapping(start_time, end_time, c_start, c_end):
                    return Response(
                        {"detail": "This time slot is no longer available. Please select another consultation time."},
                        status=status.HTTP_409_CONFLICT
                    )

            # 2. Re-check Patient Availability
            pat_conflicts = get_patient_active_consultations_query(consultation.patient.patient_id, target_date, exclude_id=consultation.consultation_id)
            for pc in pat_conflicts:
                c_start = pc.scheduled_start_time or pc.requested_time
                if not c_start:
                    continue
                c_end = pc.scheduled_end_time or (datetime.combine(target_date, c_start) + timedelta(minutes=30)).time()
                if is_time_overlapping(start_time, end_time, c_start, c_end):
                    return Response(
                        {"detail": "This time slot is no longer available for the patient because they already have another consultation scheduled at this time."},
                        status=status.HTTP_409_CONFLICT
                    )

            consultation.scheduled_date = target_date
            consultation.scheduled_start_time = start_time
            consultation.scheduled_end_time = end_time
            consultation.status = ConsultationStatus.SCHEDULED

            # Generate unique Jitsi meeting link upon scheduling
            if not consultation.meeting_link:
                consultation.meeting_link = generate_jitsi_meeting_link(consultation.consultation_id)

            consultation.save()

        Notification.objects.create(
            user=consultation.patient.user,
            type='telemedicine',
            message=f"Your telemedicine consultation with Dr. {consultation.doctor.name} has been scheduled for {target_date.strftime('%d %b %Y')} at {start_time.strftime('%H:%M')}."
        )

        serializer = TelemedicineConsultationSerializer(consultation)
        return Response({
            "message": "Consultation scheduled successfully.",
            "consultation": serializer.data
        }, status=status.HTTP_200_OK)


# --- DOCTOR REJECT CONSULTATION ---

class DoctorRejectConsultationView(APIView):
    """
    POST /api/doctor/telemedicine/<pk>/reject/
    Rejects consultation request with mandatory rejection reason and preserves historical record.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        user = request.user
        if user.role != Role.DOCTOR:
            return Response({"detail": "Only Doctors can reject consultation requests."}, status=status.HTTP_403_FORBIDDEN)

        consultation = TelemedicineConsultation.objects.filter(consultation_id=pk).select_related('patient', 'doctor').first()
        if not consultation:
            return Response({"detail": "Consultation record not found."}, status=status.HTTP_404_NOT_FOUND)

        if consultation.doctor.user_id != user.user_id:
            return Response({"detail": "Access denied. You can only reject consultations assigned to you."}, status=status.HTTP_403_FORBIDDEN)

        serializer = ConsultationRejectSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        rejection_reason = serializer.validated_data['rejection_reason'].strip()
        if not rejection_reason:
            return Response({"errors": {"rejection_reason": ["Rejection reason is required."]}}, status=status.HTTP_400_BAD_REQUEST)

        consultation.status = ConsultationStatus.REJECTED
        consultation.rejection_reason = rejection_reason
        consultation.save()

        Notification.objects.create(
            user=consultation.patient.user,
            type='telemedicine',
            message=f"Your telemedicine consultation request was not approved by Dr. {consultation.doctor.name}. Reason: {rejection_reason}"
        )

        res_serializer = TelemedicineConsultationSerializer(consultation)
        return Response({
            "message": "Consultation request rejected.",
            "consultation": res_serializer.data
        }, status=status.HTTP_200_OK)


# --- DOCTOR SCHEDULE / RESCHEDULE CONSULTATION ---

class DoctorScheduleConsultationView(APIView):
    """
    POST /api/doctor/telemedicine/<pk>/reschedule/
    Reschedules an active consultation to another valid fixed slot with concurrency locking.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        user = request.user
        if user.role != Role.DOCTOR:
            return Response({"detail": "Only Doctors can schedule or reschedule consultations."}, status=status.HTTP_403_FORBIDDEN)

        consultation = TelemedicineConsultation.objects.filter(consultation_id=pk).select_related('patient', 'doctor').first()
        if not consultation:
            return Response({"detail": "Consultation record not found."}, status=status.HTTP_404_NOT_FOUND)

        if consultation.doctor.user_id != user.user_id:
            return Response({"detail": "Access denied. You can only reschedule consultations assigned to you."}, status=status.HTTP_403_FORBIDDEN)

        serializer = ConsultationScheduleSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        sched_date = data['scheduled_date']
        start_time = data['scheduled_start_time']
        end_time = data['scheduled_end_time']
        custom_meeting_link = data.get('meeting_link', '').strip()

        # ATOMIC DB TRANSACTION + OVERLAP CHECK
        with transaction.atomic():
            Doctor.objects.select_for_update().get(doctor_id=consultation.doctor.doctor_id)

            # Check doctor conflicts
            doc_conflicts = get_active_consultations_query(consultation.doctor.doctor_id, sched_date, exclude_id=consultation.consultation_id)
            for c in doc_conflicts:
                c_start = c.scheduled_start_time or c.requested_time
                if not c_start:
                    continue
                c_end = c.scheduled_end_time or (datetime.combine(sched_date, c_start) + timedelta(minutes=30)).time()

                if is_time_overlapping(start_time, end_time, c_start, c_end):
                    return Response(
                        {"detail": "This time slot is no longer available. Please select another consultation time."},
                        status=status.HTTP_409_CONFLICT
                    )

            # Check patient conflicts
            pat_conflicts = get_patient_active_consultations_query(consultation.patient.patient_id, sched_date, exclude_id=consultation.consultation_id)
            for pc in pat_conflicts:
                c_start = pc.scheduled_start_time or pc.requested_time
                if not c_start:
                    continue
                c_end = pc.scheduled_end_time or (datetime.combine(sched_date, c_start) + timedelta(minutes=30)).time()
                if is_time_overlapping(start_time, end_time, c_start, c_end):
                    return Response(
                        {"detail": "This time slot is no longer available for the patient because they already have another consultation scheduled at this time."},
                        status=status.HTTP_409_CONFLICT
                    )

            is_reschedule = consultation.status in [ConsultationStatus.SCHEDULED, ConsultationStatus.RESCHEDULED]
            consultation.status = ConsultationStatus.RESCHEDULED if is_reschedule else ConsultationStatus.SCHEDULED
            consultation.scheduled_date = sched_date
            consultation.scheduled_start_time = start_time
            consultation.scheduled_end_time = end_time

            if custom_meeting_link:
                consultation.meeting_link = custom_meeting_link
            elif not consultation.meeting_link:
                consultation.meeting_link = generate_jitsi_meeting_link(consultation.consultation_id)

            consultation.save()

        action_text = "rescheduled" if is_reschedule else "scheduled"
        Notification.objects.create(
            user=consultation.patient.user,
            type='telemedicine',
            message=f"Your telemedicine consultation with Dr. {consultation.doctor.name} has been {action_text} for {sched_date.strftime('%d %b %Y')} at {start_time.strftime('%H:%M')}."
        )

        res_serializer = TelemedicineConsultationSerializer(consultation)
        return Response({
            "message": f"Consultation successfully {action_text}.",
            "consultation": res_serializer.data
        }, status=status.HTTP_200_OK)


# --- DOCTOR START CONSULTATION ---

class DoctorStartConsultationView(APIView):
    """
    POST /api/doctor/telemedicine/<pk>/start/
    Sets consultation status to In Progress.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        user = request.user
        if user.role != Role.DOCTOR:
            return Response({"detail": "Only Doctors can start consultations."}, status=status.HTTP_403_FORBIDDEN)

        consultation = TelemedicineConsultation.objects.filter(consultation_id=pk).select_related('patient', 'doctor').first()
        if not consultation:
            return Response({"detail": "Consultation record not found."}, status=status.HTTP_404_NOT_FOUND)

        if consultation.doctor.user_id != user.user_id:
            return Response({"detail": "Access denied. You can only start consultations assigned to you."}, status=status.HTTP_403_FORBIDDEN)

        consultation.status = ConsultationStatus.IN_PROGRESS
        if not consultation.meeting_link:
            consultation.meeting_link = generate_jitsi_meeting_link(consultation.consultation_id)
        consultation.save()

        Notification.objects.create(
            user=consultation.patient.user,
            type='telemedicine',
            message=f"Dr. {consultation.doctor.name} has started your telemedicine consultation. You can join now!"
        )

        serializer = TelemedicineConsultationSerializer(consultation)
        return Response({
            "message": "Consultation started.",
            "consultation": serializer.data
        }, status=status.HTTP_200_OK)


# --- DOCTOR COMPLETE CONSULTATION ---

class DoctorCompleteConsultationView(APIView):
    """
    POST /api/doctor/telemedicine/<pk>/complete/
    Marks consultation completed and optionally records structured clinical notes.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        user = request.user
        if user.role != Role.DOCTOR:
            return Response({"detail": "Only Doctors can complete consultations."}, status=status.HTTP_403_FORBIDDEN)

        consultation = TelemedicineConsultation.objects.filter(consultation_id=pk).select_related('patient', 'doctor').first()
        if not consultation:
            return Response({"detail": "Consultation record not found."}, status=status.HTTP_404_NOT_FOUND)

        if consultation.doctor.user_id != user.user_id:
            return Response({"detail": "Access denied. You can only complete consultations assigned to you."}, status=status.HTTP_403_FORBIDDEN)

        consultation.status = ConsultationStatus.COMPLETED
        consultation.completed_at = timezone.now()
        consultation.save()

        # If clinical notes data passed in request, create TelemedicineConsultationNote
        notes_text = request.data.get('notes', '').strip()
        symptoms_disc = request.data.get('symptoms_discussed', '').strip()
        clin_obs = request.data.get('clinical_observations', '').strip()
        advice_text = request.data.get('advice', '').strip()
        recs_text = request.data.get('recommendations', '').strip()

        if notes_text or symptoms_disc or clin_obs or advice_text or recs_text:
            TelemedicineConsultationNote.objects.create(
                consultation=consultation,
                doctor=consultation.doctor,
                patient=consultation.patient,
                notes=notes_text,
                symptoms_discussed=symptoms_disc,
                clinical_observations=clin_obs,
                advice=advice_text,
                recommendations=recs_text
            )

        Notification.objects.create(
            user=consultation.patient.user,
            type='telemedicine',
            message=f"Your telemedicine consultation with Dr. {consultation.doctor.name} has been marked as Completed."
        )

        serializer = TelemedicineConsultationSerializer(consultation)
        return Response({
            "message": "Consultation completed successfully.",
            "consultation": serializer.data
        }, status=status.HTTP_200_OK)


# --- CANCEL CONSULTATION ---

class PatientCancelConsultationView(APIView):
    """
    POST /api/telemedicine/<pk>/cancel/
    Cancels consultation.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        consultation = TelemedicineConsultation.objects.filter(consultation_id=pk).select_related('patient', 'doctor').first()
        if not consultation:
            return Response({"detail": "Consultation record not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == Role.PATIENT and consultation.patient.user_id != user.user_id:
            return Response({"detail": "Access denied."}, status=status.HTTP_403_FORBIDDEN)
        elif user.role == Role.DOCTOR and consultation.doctor.user_id != user.user_id:
            return Response({"detail": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

        consultation.status = ConsultationStatus.CANCELLED
        consultation.save()

        notify_user = consultation.doctor.user if user.role == Role.PATIENT else consultation.patient.user
        canceler_role = "Patient" if user.role == Role.PATIENT else f"Dr. {consultation.doctor.name}"
        Notification.objects.create(
            user=notify_user,
            type='telemedicine',
            message=f"Telemedicine consultation was cancelled by {canceler_role}."
        )

        serializer = TelemedicineConsultationSerializer(consultation)
        return Response({
            "message": "Consultation cancelled.",
            "consultation": serializer.data
        }, status=status.HTTP_200_OK)


# --- CONSULTATION NOTES VIEW ---

class ConsultationNotesView(APIView):
    """
    GET / POST /api/telemedicine/<pk>/notes/
    Doctor records structured TelemedicineConsultationNote.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk, *args, **kwargs):
        consultation = TelemedicineConsultation.objects.filter(consultation_id=pk).select_related('patient', 'doctor').first()
        if not consultation:
            return Response({"detail": "Consultation record not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == Role.PATIENT and consultation.patient.user_id != user.user_id:
            return Response({"detail": "Access denied."}, status=status.HTTP_403_FORBIDDEN)
        elif user.role == Role.DOCTOR and consultation.doctor.user_id != user.user_id:
            return Response({"detail": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

        notes = TelemedicineConsultationNote.objects.filter(consultation_id=pk).select_related('doctor', 'patient').order_by('-created_at')
        serializer = TelemedicineConsultationNoteSerializer(notes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, pk, *args, **kwargs):
        user = request.user
        if user.role != Role.DOCTOR:
            return Response({"detail": "Only Doctors can record consultation notes."}, status=status.HTTP_403_FORBIDDEN)

        consultation = TelemedicineConsultation.objects.filter(consultation_id=pk).select_related('patient', 'doctor').first()
        if not consultation:
            return Response({"detail": "Consultation record not found."}, status=status.HTTP_404_NOT_FOUND)

        if consultation.doctor.user_id != user.user_id:
            return Response({"detail": "Access denied. You can only record notes for consultations assigned to you."}, status=status.HTTP_403_FORBIDDEN)

        note = TelemedicineConsultationNote.objects.create(
            consultation=consultation,
            doctor=consultation.doctor,
            patient=consultation.patient,
            symptoms_discussed=request.data.get('symptoms_discussed', '').strip(),
            clinical_observations=request.data.get('clinical_observations', '').strip(),
            advice=request.data.get('advice', '').strip(),
            recommendations=request.data.get('recommendations', '').strip(),
            notes=request.data.get('notes', '').strip()
        )

        serializer = TelemedicineConsultationNoteSerializer(note)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# --- FOLLOW UP VIEW ---

class ConsultationFollowUpView(APIView):
    """
    GET / POST /api/telemedicine/<pk>/followups/
    Doctor schedules TelemedicineFollowUp.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk, *args, **kwargs):
        consultation = TelemedicineConsultation.objects.filter(consultation_id=pk).select_related('patient', 'doctor').first()
        if not consultation:
            return Response({"detail": "Consultation record not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == Role.PATIENT and consultation.patient.user_id != user.user_id:
            return Response({"detail": "Access denied."}, status=status.HTTP_403_FORBIDDEN)
        elif user.role == Role.DOCTOR and consultation.doctor.user_id != user.user_id:
            return Response({"detail": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

        followups = TelemedicineFollowUp.objects.filter(original_consultation_id=pk).select_related('doctor', 'patient').order_by('-created_at')
        serializer = TelemedicineFollowUpSerializer(followups, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, pk, *args, **kwargs):
        user = request.user
        if user.role != Role.DOCTOR:
            return Response({"detail": "Only Doctors can schedule follow-up consultations."}, status=status.HTTP_403_FORBIDDEN)

        consultation = TelemedicineConsultation.objects.filter(consultation_id=pk).select_related('patient', 'doctor').first()
        if not consultation:
            return Response({"detail": "Consultation record not found."}, status=status.HTTP_404_NOT_FOUND)

        if consultation.doctor.user_id != user.user_id:
            return Response({"detail": "Access denied. You can only schedule follow-ups for your consultations."}, status=status.HTTP_403_FORBIDDEN)

        followup_date = request.data.get('followup_date')
        followup_time = request.data.get('followup_time')

        if not followup_date or not followup_time:
            return Response(
                {"errors": {"detail": ["Both followup_date and followup_time are required."]}},
                status=status.HTTP_400_BAD_REQUEST
            )

        followup = TelemedicineFollowUp.objects.create(
            original_consultation=consultation,
            patient=consultation.patient,
            doctor=consultation.doctor,
            followup_date=followup_date,
            followup_time=followup_time,
            reason=request.data.get('reason', 'Routine Follow-up'),
            notes=request.data.get('notes', ''),
            followup_type=request.data.get('followup_type', 'Telemedicine')
        )

        Notification.objects.create(
            user=consultation.patient.user,
            type='telemedicine',
            message=f"Dr. {consultation.doctor.name} has scheduled a follow-up consultation for {followup_date} at {followup_time}."
        )

        serializer = TelemedicineFollowUpSerializer(followup)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ========================================================
# HOME VISIT / PATIENT VISIT TEAM VIEWS & LOGIC
# ========================================================

def get_authenticated_doctor(request):
    if request.user.role != Role.DOCTOR:
        return None
    return getattr(request.user, 'doctor', None) or Doctor.objects.filter(user=request.user).first()


def get_authenticated_nurse(request):
    if request.user.role != Role.NURSE:
        return None
    return getattr(request.user, 'nurse', None) or Nurse.objects.filter(user=request.user).first()


def get_authenticated_patient(request):
    if request.user.role != Role.PATIENT:
        return None
    return getattr(request.user, 'patient', None) or Patient.objects.filter(user=request.user).first()


def is_working_day(target_date):
    """
    Returns True if target_date is a working day (Monday through Saturday, weekday 0-5).
    Sunday (weekday 6) is a permanent non-working day for Home Visits.
    """
    return target_date.weekday() != 6


def generate_recurring_occurrences(schedule, num_occurrences=4, from_date=None):
    """
    Generates future recurring HomeVisitOccurrence records starting from schedule.start_date (or from_date).
    - Automatically assigns patient's reviewed_by_doctor as default visiting_doctor.
    - Obeys permanent Sunday non-working day rule.
    - Prevents duplicate occurrences on the same (patient, scheduled_date).
    - Never overwrites existing occurrences or explicitly reassigned doctors.
    """
    freq = schedule.frequency
    custom_days = schedule.custom_days or []
    curr_date = from_date or schedule.start_date

    # If start date lands on Sunday, shift to Monday (next working day)
    if curr_date.weekday() == 6:
        curr_date = curr_date + timedelta(days=1)

    created_count = 0
    default_doc = schedule.patient.reviewed_by_doctor if (
        schedule.patient.reviewed_by_doctor_id and
        schedule.patient.reviewed_by_doctor.verification_status == VerificationStatus.APPROVED and
        schedule.patient.reviewed_by_doctor.user.is_active
    ) else None

    if freq in [ScheduleFrequency.EVERY_DAY, 'Daily', 'Every Day']:
        # Every working day (Monday - Saturday), strictly skipping Sunday
        candidate_date = curr_date
        generated = 0
        while generated < num_occurrences:
            if is_working_day(candidate_date):
                if not HomeVisitOccurrence.objects.filter(patient=schedule.patient, scheduled_date=candidate_date).exists():
                    HomeVisitOccurrence.objects.create(
                        schedule=schedule,
                        patient=schedule.patient,
                        scheduled_date=candidate_date,
                        visit_type=VisitType.RECURRING,
                        urgency_level=UrgencyLevel.ROUTINE,
                        status=OccurrenceStatus.SCHEDULED,
                        allocated_nurse=None,
                        visiting_doctor=default_doc,
                        is_doctor_customized=False,
                        notes=f"Recurring Every Day home care visit"
                    )
                    created_count += 1
                generated += 1
            candidate_date += timedelta(days=1)

    elif freq in [ScheduleFrequency.CUSTOM, 'Custom']:
        # Custom selected working days of week (Mon-Sat)
        day_map = {
            'monday': 0, 'mon': 0, '0': 0, 0: 0,
            'tuesday': 1, 'tue': 1, '1': 1, 1: 1,
            'wednesday': 2, 'wed': 2, '2': 2, 2: 2,
            'thursday': 3, 'thu': 3, '3': 3, 3: 3,
            'friday': 4, 'fri': 4, '4': 4, 4: 4,
            'saturday': 5, 'sat': 5, '5': 5, 5: 5,
        }
        target_weekdays = set()
        for d in custom_days:
            clean_d = str(d).strip().lower()
            if clean_d in day_map:
                target_weekdays.add(day_map[clean_d])

        if not target_weekdays:
            target_weekdays = {curr_date.weekday() if curr_date.weekday() != 6 else 0}

        candidate_date = curr_date
        generated = 0
        max_search_days = 180
        days_searched = 0
        while generated < num_occurrences and days_searched < max_search_days:
            if candidate_date.weekday() in target_weekdays and is_working_day(candidate_date):
                if not HomeVisitOccurrence.objects.filter(patient=schedule.patient, scheduled_date=candidate_date).exists():
                    HomeVisitOccurrence.objects.create(
                        schedule=schedule,
                        patient=schedule.patient,
                        scheduled_date=candidate_date,
                        visit_type=VisitType.RECURRING,
                        urgency_level=UrgencyLevel.ROUTINE,
                        status=OccurrenceStatus.SCHEDULED,
                        allocated_nurse=None,
                        visiting_doctor=default_doc,
                        is_doctor_customized=False,
                        notes=f"Recurring Custom home care visit"
                    )
                    created_count += 1
                generated += 1
            candidate_date += timedelta(days=1)
            days_searched += 1

    elif freq in [ScheduleFrequency.EVERY_2_WEEKS, ScheduleFrequency.FORTNIGHTLY, 'Every 2 Weeks', 'Biweekly']:
        # Every 14 days
        for i in range(num_occurrences):
            occ_date = curr_date + timedelta(days=14 * i)
            if occ_date.weekday() == 6:  # Sunday -> adjust to Monday
                occ_date = occ_date + timedelta(days=1)
            if not HomeVisitOccurrence.objects.filter(patient=schedule.patient, scheduled_date=occ_date).exists():
                HomeVisitOccurrence.objects.create(
                    schedule=schedule,
                    patient=schedule.patient,
                    scheduled_date=occ_date,
                    visit_type=VisitType.RECURRING,
                    urgency_level=UrgencyLevel.ROUTINE,
                    status=OccurrenceStatus.SCHEDULED,
                    allocated_nurse=None,
                    visiting_doctor=default_doc,
                    is_doctor_customized=False,
                    notes=f"Recurring Every 2 Weeks home care visit"
                )
                created_count += 1

    elif freq in [ScheduleFrequency.MONTHLY, 'Monthly']:
        # Monthly cadence (28 days)
        for i in range(num_occurrences):
            occ_date = curr_date + timedelta(days=28 * i)
            if occ_date.weekday() == 6:  # Sunday -> adjust to Monday
                occ_date = occ_date + timedelta(days=1)
            if not HomeVisitOccurrence.objects.filter(patient=schedule.patient, scheduled_date=occ_date).exists():
                HomeVisitOccurrence.objects.create(
                    schedule=schedule,
                    patient=schedule.patient,
                    scheduled_date=occ_date,
                    visit_type=VisitType.RECURRING,
                    urgency_level=UrgencyLevel.ROUTINE,
                    status=OccurrenceStatus.SCHEDULED,
                    allocated_nurse=None,
                    visiting_doctor=default_doc,
                    is_doctor_customized=False,
                    notes=f"Recurring Monthly home care visit"
                )
                created_count += 1

    else:
        # Default Weekly (every 7 days)
        for i in range(num_occurrences):
            occ_date = curr_date + timedelta(days=7 * i)
            if occ_date.weekday() == 6:  # Sunday -> adjust to Monday
                occ_date = occ_date + timedelta(days=1)
            if not HomeVisitOccurrence.objects.filter(patient=schedule.patient, scheduled_date=occ_date).exists():
                HomeVisitOccurrence.objects.create(
                    schedule=schedule,
                    patient=schedule.patient,
                    scheduled_date=occ_date,
                    visit_type=VisitType.RECURRING,
                    urgency_level=UrgencyLevel.ROUTINE,
                    status=OccurrenceStatus.SCHEDULED,
                    allocated_nurse=None,
                    visiting_doctor=default_doc,
                    is_doctor_customized=False,
                    notes=f"Recurring Weekly home care visit"
                )
                created_count += 1

    return created_count


class HomeVisitCalendarView(APIView):
    """
    Central single-source-of-truth calendar for Patient, Nurse, and Doctor:
    GET /api/care-coordination/home-visits/calendar/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        role = user.role

        occurrences_qs = HomeVisitOccurrence.objects.select_related(
            'patient', 'allocated_nurse', 'visiting_doctor', 'schedule'
        ).prefetch_related('homevisitsummary__visitsymptom_set').order_by('scheduled_date')

        # RBAC Filtering
        if role == Role.PATIENT:
            patient = get_authenticated_patient(request)
            if not patient:
                return Response({"detail": "Patient profile not found."}, status=status.HTTP_403_FORBIDDEN)
            occurrences_qs = occurrences_qs.filter(patient=patient)

        elif role == Role.DOCTOR:
            doctor = get_authenticated_doctor(request)
            if not doctor:
                return Response({"detail": "Doctor profile not found."}, status=status.HTTP_403_FORBIDDEN)
            scope = request.query_params.get('scope')
            if scope != 'all':
                occurrences_qs = occurrences_qs.filter(
                    Q(visiting_doctor=doctor) | Q(patient__reviewed_by_doctor=doctor)
                ).distinct()

        elif role in [Role.NURSE, Role.ADMIN]:
            # Shared Nurse Team: All nurses see all visits across the service area
            pass
        elif role == Role.CAREGIVER:
            caregiver = getattr(user, 'caregiver', None)
            if caregiver:
                from care_coordination.models import CaregiverPatientAssignment, AssignmentStatus
                assigned_patient_ids = CaregiverPatientAssignment.objects.filter(
                    caregiver=caregiver, status=AssignmentStatus.ACTIVE
                ).values_list('patient_id', flat=True)
                occurrences_qs = occurrences_qs.filter(patient_id__in=assigned_patient_ids)
            else:
                occurrences_qs = occurrences_qs.none()
        else:
            return Response({"detail": "Access restricted."}, status=status.HTTP_403_FORBIDDEN)

        # Filters
        date_str = request.query_params.get('date')
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        status_filter = request.query_params.get('status')
        search_query = request.query_params.get('search', '').strip().lower()
        patient_id = request.query_params.get('patient_id')

        if date_str:
            try:
                d = datetime.strptime(date_str, '%Y-%m-%d').date()
                occurrences_qs = occurrences_qs.filter(scheduled_date=d)
            except ValueError:
                pass

        if patient_id and role != Role.PATIENT:
            occurrences_qs = occurrences_qs.filter(patient_id=patient_id)

        if start_date_str:
            try:
                sd = datetime.strptime(start_date_str, '%Y-%m-%d').date()
                occurrences_qs = occurrences_qs.filter(scheduled_date__gte=sd)
            except ValueError:
                pass

        if end_date_str:
            try:
                ed = datetime.strptime(end_date_str, '%Y-%m-%d').date()
                occurrences_qs = occurrences_qs.filter(scheduled_date__lte=ed)
            except ValueError:
                pass

        if year and year.isdigit():
            occurrences_qs = occurrences_qs.filter(scheduled_date__year=int(year))
        if month and month.isdigit():
            occurrences_qs = occurrences_qs.filter(scheduled_date__month=int(month))

        if status_filter:
            occurrences_qs = occurrences_qs.filter(status__iexact=status_filter)

        if search_query:
            occurrences_qs = occurrences_qs.filter(
                Q(patient__name__icontains=search_query) |
                Q(patient__registration_id__icontains=search_query) |
                Q(patient__place__icontains=search_query) |
                Q(patient__panchayath__icontains=search_query)
            )

        from care_coordination.serializers import HomeVisitOccurrenceSerializer
        serializer = HomeVisitOccurrenceSerializer(occurrences_qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class NurseHomeVisitScheduleView(APIView):
    """
    Recurring home visit schedules:
    GET: List recurring schedules.
    POST: Nurse creates recurring schedule for an approved patient.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        role = user.role

        schedules_qs = HomeVisitSchedule.objects.select_related('patient', 'nurse').all().order_by('-updated_at')

        if role == Role.PATIENT:
            patient = get_authenticated_patient(request)
            if not patient:
                return Response({"detail": "Patient profile not found."}, status=status.HTTP_403_FORBIDDEN)
            schedules_qs = schedules_qs.filter(patient=patient)
        elif role == Role.DOCTOR:
            doctor = get_authenticated_doctor(request)
            if not doctor:
                return Response({"detail": "Doctor profile not found."}, status=status.HTTP_403_FORBIDDEN)
            schedules_qs = schedules_qs.filter(
                Q(patient__reviewed_by_doctor=doctor) | Q(patient__homevisitoccurrence__visiting_doctor=doctor)
            ).distinct()
        elif role in [Role.NURSE, Role.ADMIN]:
            pass
        else:
            return Response({"detail": "Access restricted."}, status=status.HTTP_403_FORBIDDEN)

        from care_coordination.serializers import HomeVisitScheduleSerializer
        serializer = HomeVisitScheduleSerializer(schedules_qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        nurse = get_authenticated_nurse(request)
        if not nurse:
            return Response({"detail": "Only Nurses can create recurring home visit schedules."}, status=status.HTTP_403_FORBIDDEN)

        from care_coordination.serializers import HomeVisitScheduleCreateSerializer
        serializer = HomeVisitScheduleCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        patient_id = serializer.validated_data['patient_id']
        patient = Patient.objects.filter(patient_id=patient_id).first()

        from accounts.models import RegistrationStatus
        if patient.registration_status != RegistrationStatus.APPROVED:
            return Response({"detail": "Patient is not eligible for Home Visit scheduling. Patient must be clinically approved first."}, status=status.HTTP_400_BAD_REQUEST)

        frequency = serializer.validated_data.get('frequency', ScheduleFrequency.WEEKLY)
        custom_days = serializer.validated_data.get('custom_days', [])
        start_date = serializer.validated_data.get('start_date') or timezone.now().date()
        if start_date.weekday() == 6:  # Sunday
            return Response({"errors": {"start_date": ["Sunday is a non-working day and cannot be selected for Home Visits."]}}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            HomeVisitSchedule.objects.filter(patient=patient, status=ScheduleStatus.ACTIVE).update(status=ScheduleStatus.MODIFIED)

            schedule = HomeVisitSchedule.objects.create(
                patient=patient,
                nurse=nurse,
                frequency=frequency,
                custom_days=custom_days,
                start_date=start_date,
                status=ScheduleStatus.ACTIVE
            )

            created_count = generate_recurring_occurrences(schedule)

        return Response({
            "message": f"Recurring home visit schedule ({frequency}) created successfully for {patient.name}.",
            "schedule_id": schedule.schedule_id,
            "patient_id": patient.patient_id,
            "patient_name": patient.name,
            "frequency": schedule.frequency,
            "custom_days": schedule.custom_days,
            "start_date": schedule.start_date.strftime('%d %b %Y'),
            "occurrences_generated": created_count,
        }, status=status.HTTP_201_CREATED)


class NurseScheduleDetailView(APIView):
    """
    Update recurring schedule frequency and custom days:
    PATCH /api/care-coordination/home-visits/schedules/<int:pk>/
    PUT /api/care-coordination/home-visits/schedules/<int:pk>/
    Nurse updates frequency with effective date. Responsible Doctor is notified.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk, *args, **kwargs):
        return self._update_schedule(request, pk)

    def put(self, request, pk, *args, **kwargs):
        return self._update_schedule(request, pk)

    def _update_schedule(self, request, pk):
        nurse = get_authenticated_nurse(request)
        if not nurse:
            return Response({"detail": "Only Nurses can modify home visit schedules."}, status=status.HTTP_403_FORBIDDEN)

        schedule = HomeVisitSchedule.objects.filter(schedule_id=pk).first()
        if not schedule:
            return Response({"detail": "Schedule not found."}, status=status.HTTP_404_NOT_FOUND)

        from care_coordination.serializers import HomeVisitFrequencyChangeSerializer
        serializer = HomeVisitFrequencyChangeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        new_frequency = serializer.validated_data['frequency']
        new_custom_days = serializer.validated_data.get('custom_days', [])
        effective_date = serializer.validated_data.get('effective_date') or timezone.now().date()
        effective_date = max(effective_date, timezone.now().date())
        if effective_date.weekday() == 6:  # Sunday
            effective_date = effective_date + timedelta(days=1)
        reason = serializer.validated_data.get('reason', '').strip()
        old_frequency = schedule.frequency

        with transaction.atomic():
            schedule.frequency = new_frequency
            schedule.custom_days = new_custom_days
            schedule.save(update_fields=['frequency', 'custom_days', 'updated_at'])

            # Delete future uncompleted occurrences belonging to this schedule
            # PROTECT: completed/documented occurrences, past visits, and explicitly customized doctor visits
            HomeVisitOccurrence.objects.filter(
                schedule=schedule,
                scheduled_date__gte=effective_date,
                status=OccurrenceStatus.SCHEDULED,
                is_doctor_customized=False,
                homevisitsummary__isnull=True,
            ).delete()

            # Regenerate with new frequency from effective date
            generate_recurring_occurrences(schedule, from_date=effective_date)

            # In-app notification to responsible reviewing Doctor
            if schedule.patient.reviewed_by_doctor and schedule.patient.reviewed_by_doctor.user:
                doc_user = schedule.patient.reviewed_by_doctor.user
                reason_text = f" Reason: {reason}" if reason else ""
                Notification.objects.create(
                    user=doc_user,
                    type='home_visit',
                    message=(
                        f"Nurse {nurse.name} updated the recurring home visit frequency for patient "
                        f"{schedule.patient.name} ({schedule.patient.registration_id}) from {old_frequency} to "
                        f"{new_frequency} (effective {effective_date.strftime('%d %b %Y')}).{reason_text}"
                    )
                )

        from care_coordination.serializers import format_frequency_display
        freq_display = format_frequency_display(schedule.frequency, schedule.custom_days)

        return Response({
            "message": f"Recurring schedule frequency updated to {freq_display}. Responsible doctor has been notified.",
            "schedule_id": schedule.schedule_id,
            "old_frequency": old_frequency,
            "new_frequency": schedule.frequency,
            "custom_days": schedule.custom_days,
            "frequency_display": freq_display,
            "effective_date": effective_date.strftime('%d %b %Y'),
        }, status=status.HTTP_200_OK)


class HomeVisitOccurrenceListView(APIView):
    """
    List home visit occurrences:
    GET /api/care-coordination/home-visits/occurrences/
    Supports filtering by ?date=YYYY-MM-DD, ?status=Scheduled, ?search=
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        role = user.role

        occurrences_qs = HomeVisitOccurrence.objects.select_related(
            'patient', 'allocated_nurse', 'visiting_doctor', 'schedule'
        ).prefetch_related('homevisitsummary__visitsymptom_set').order_by('scheduled_date')

        if role == Role.PATIENT:
            patient = get_authenticated_patient(request)
            if not patient:
                return Response({"detail": "Patient profile not found."}, status=status.HTTP_403_FORBIDDEN)
            occurrences_qs = occurrences_qs.filter(patient=patient)
        elif role == Role.DOCTOR:
            doctor = get_authenticated_doctor(request)
            if not doctor:
                return Response({"detail": "Doctor profile not found."}, status=status.HTTP_403_FORBIDDEN)
            occurrences_qs = occurrences_qs.filter(
                Q(visiting_doctor=doctor) | Q(patient__reviewed_by_doctor=doctor)
            ).distinct()
        elif role in [Role.NURSE, Role.ADMIN]:
            # Shared team: all nurses see all visits
            pass
        elif role == Role.CAREGIVER:
            caregiver = getattr(user, 'caregiver', None)
            if caregiver:
                from care_coordination.models import CaregiverPatientAssignment, AssignmentStatus
                assigned_patient_ids = CaregiverPatientAssignment.objects.filter(
                    caregiver=caregiver, status=AssignmentStatus.ACTIVE
                ).values_list('patient_id', flat=True)
                occurrences_qs = occurrences_qs.filter(patient_id__in=assigned_patient_ids)
            else:
                occurrences_qs = occurrences_qs.none()
        else:
            return Response({"detail": "Access restricted."}, status=status.HTTP_403_FORBIDDEN)

        # Query Filters
        date_str = request.query_params.get('date')
        if date_str:
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                occurrences_qs = occurrences_qs.filter(scheduled_date=target_date)
            except ValueError:
                pass

        status_filter = request.query_params.get('status')
        if status_filter and status_filter.lower() != 'all':
            occurrences_qs = occurrences_qs.filter(status__iexact=status_filter)

        search_query = request.query_params.get('search', '').strip().lower()
        if search_query:
            occurrences_qs = occurrences_qs.filter(
                Q(patient__name__icontains=search_query) |
                Q(patient__registration_id__icontains=search_query) |
                Q(patient__place__icontains=search_query) |
                Q(patient__panchayath__icontains=search_query)
            )

        from care_coordination.serializers import HomeVisitOccurrenceSerializer
        serializer = HomeVisitOccurrenceSerializer(occurrences_qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class HomeVisitOccurrenceDetailView(APIView):
    """
    Get occurrence detail:
    GET /api/care-coordination/home-visits/occurrences/<int:pk>/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk, *args, **kwargs):
        user = request.user
        role = user.role

        occ = HomeVisitOccurrence.objects.select_related(
            'patient', 'allocated_nurse', 'visiting_doctor', 'schedule'
        ).prefetch_related('homevisitsummary__visitsymptom_set').filter(occurrence_id=pk).first()

        if not occ:
            return Response({"detail": "Occurrence not found."}, status=status.HTTP_404_NOT_FOUND)

        if role == Role.PATIENT:
            patient = get_authenticated_patient(request)
            if not patient or occ.patient_id != patient.patient_id:
                return Response({"detail": "You are not authorized to view this visit."}, status=status.HTTP_403_FORBIDDEN)
        elif role == Role.DOCTOR:
            doctor = get_authenticated_doctor(request)
            if not doctor or (occ.visiting_doctor_id != doctor.doctor_id and occ.patient.reviewed_by_doctor_id != doctor.doctor_id):
                return Response({"detail": "You are not authorized to view this visit."}, status=status.HTTP_403_FORBIDDEN)
        elif role in [Role.NURSE, Role.ADMIN]:
            pass
        elif role == Role.CAREGIVER:
            caregiver = getattr(user, 'caregiver', None)
            from care_coordination.models import CaregiverPatientAssignment, AssignmentStatus
            if not caregiver or not CaregiverPatientAssignment.objects.filter(caregiver=caregiver, patient=occ.patient, status=AssignmentStatus.ACTIVE).exists():
                return Response({"detail": "You are not authorized to view this visit."}, status=status.HTTP_403_FORBIDDEN)
        else:
            return Response({"detail": "Access restricted."}, status=status.HTTP_403_FORBIDDEN)

        from care_coordination.serializers import HomeVisitOccurrenceSerializer
        serializer = HomeVisitOccurrenceSerializer(occ)
        return Response(serializer.data, status=status.HTTP_200_OK)


class NurseAssignDoctorView(APIView):
    """
    Nurse assigns or changes visiting Doctor for an individual Home Visit Occurrence:
    POST /api/care-coordination/home-visits/occurrences/<int:pk>/assign-doctor/
    PATCH /api/care-coordination/home-visits/occurrences/<int:pk>/assign-doctor/
    Updates ONLY this occurrence. Does not modify recurring schedule or other dates.
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk=None, occurrence_id=None, *args, **kwargs):
        return self._assign_doctor(request, pk or occurrence_id)

    def post(self, request, pk=None, occurrence_id=None, *args, **kwargs):
        return self._assign_doctor(request, pk or occurrence_id)

    def _assign_doctor(self, request, occ_id):
        nurse = get_authenticated_nurse(request)
        if not nurse:
            return Response({"detail": "Only Nurses can assign visiting doctors to home visits."}, status=status.HTTP_403_FORBIDDEN)

        from care_coordination.serializers import NurseAssignDoctorSerializer
        serializer = NurseAssignDoctorSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        doctor_id = serializer.validated_data['doctor_id']

        with transaction.atomic():
            occ = HomeVisitOccurrence.objects.select_for_update().filter(occurrence_id=occ_id).first()
            if not occ:
                return Response({"detail": "Visit occurrence not found."}, status=status.HTTP_404_NOT_FOUND)

            if occ.status in [OccurrenceStatus.COMPLETED, OccurrenceStatus.SKIPPED]:
                return Response({"detail": "Completed or cancelled visits cannot be modified."}, status=status.HTTP_400_BAD_REQUEST)

            doctor = Doctor.objects.filter(
                doctor_id=doctor_id,
                verification_status=VerificationStatus.APPROVED,
                user__is_active=True
            ).first()
            if not doctor:
                return Response({"detail": "Active verified Doctor not found."}, status=status.HTTP_400_BAD_REQUEST)

            occ.visiting_doctor = doctor
            occ.is_doctor_customized = True
            occ.save(update_fields=['visiting_doctor', 'is_doctor_customized', 'updated_at'])

        if doctor.user:
            Notification.objects.create(
                user=doctor.user,
                type='home_visit',
                message=(
                    f"You have been assigned as visiting doctor for {occ.patient.name}'s "
                    f"home visit on {occ.scheduled_date.strftime('%d %b %Y')}."
                )
            )

        return Response({
            "message": f"Dr. {doctor.name} assigned as visiting doctor for {occ.patient.name}'s visit on {occ.scheduled_date.strftime('%d %b %Y')}.",
            "occurrence_id": occ.occurrence_id,
            "visiting_doctor_id": doctor.doctor_id,
            "visiting_doctor_name": f"Dr. {doctor.name}",
            "visiting_doctor_specialization": doctor.specialization or "Palliative Care",
            "status": occ.status,
        }, status=status.HTTP_200_OK)


class DoctorHomeVisitsView(APIView):
    """
    Home visits clinical overview for authenticated Doctor:
    GET: View authorized patient recurring schedules, occurrences, and visit summaries where assigned.
    POST: Forbidden (Doctors cannot create recurring schedules).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        doctor = get_authenticated_doctor(request)
        if not doctor:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        schedules_qs = HomeVisitSchedule.objects.filter(
            Q(patient__reviewed_by_doctor=doctor) | Q(patient__homevisitoccurrence__visiting_doctor=doctor)
        ).distinct().order_by('-updated_at')

        occurrences_qs = HomeVisitOccurrence.objects.select_related('patient', 'allocated_nurse', 'visiting_doctor', 'schedule').filter(
            Q(visiting_doctor=doctor) | Q(patient__reviewed_by_doctor=doctor)
        ).distinct().order_by('scheduled_date')

        patient_id = request.query_params.get('patient_id')
        if patient_id:
            schedules_qs = schedules_qs.filter(patient_id=patient_id)
            occurrences_qs = occurrences_qs.filter(patient_id=patient_id)

        from care_coordination.serializers import format_frequency_display

        schedules_data = [
            {
                "schedule_id": s.schedule_id,
                "patient_id": s.patient.patient_id,
                "patient_name": s.patient.name,
                "patient_reg_id": s.patient.registration_id,
                "frequency": s.frequency,
                "custom_days": s.custom_days,
                "frequency_display": format_frequency_display(s.frequency, s.custom_days),
                "start_date": s.start_date.strftime('%d %b %Y'),
                "status": s.status,
                "nurse_name": s.nurse.name if s.nurse else "Nurse Team",
            }
            for s in schedules_qs
        ]

        occurrences_data = []
        for occ in occurrences_qs:
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
                "patient_id": occ.patient.patient_id,
                "patient_name": occ.patient.name,
                "patient_reg_id": occ.patient.registration_id,
                "scheduled_date": occ.scheduled_date.strftime('%d %b %Y'),
                "raw_date": str(occ.scheduled_date),
                "visit_type": occ.visit_type,
                "urgency_level": occ.urgency_level or "Routine",
                "status": occ.status,
                "visiting_doctor_id": occ.visiting_doctor_id,
                "visiting_doctor": f"Dr. {occ.visiting_doctor.name}" if occ.visiting_doctor else "Unassigned",
                "visiting_doctor_name": f"Dr. {occ.visiting_doctor.name}" if occ.visiting_doctor else None,
                "visiting_doctor_specialization": occ.visiting_doctor.specialization if occ.visiting_doctor else None,
                "frequency": occ.schedule.frequency if occ.schedule else "One-Time",
                "frequency_display": format_frequency_display(occ.schedule.frequency, occ.schedule.custom_days) if occ.schedule else "One-Time Visit",
                "is_my_visit": occ.visiting_doctor_id == doctor.doctor_id,
                "completed_by_nurse_name": summary.nurse.name if summary and summary.nurse else None,
                "notes": occ.notes or "",
                "summary": summary_data,
            })

        return Response({
            "schedules": schedules_data,
            "occurrences": occurrences_data,
        }, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        return Response(
            {"detail": "Doctors cannot create recurring home visit schedules. Scheduling is managed by Nurses."},
            status=status.HTTP_403_FORBIDDEN
        )


class NurseHomeVisitsView(APIView):
    """
    Home visits daily work area & management for authenticated Nurse:
    GET: List home visits with filtering by date (date=YYYY-MM-DD), search, status.
    All nurses see all home visits (shared nurse team model).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        nurse = get_authenticated_nurse(request)
        if not nurse:
            return Response({"detail": "Access restricted to Nurses only."}, status=status.HTTP_403_FORBIDDEN)

        date_str = request.query_params.get('date')
        tab = request.query_params.get('tab', 'all').lower()
        search_query = request.query_params.get('search', '').strip().lower()
        patient_id = request.query_params.get('patient_id')
        status_filter = request.query_params.get('status')

        today = timezone.now().date()
        occurrences_qs = HomeVisitOccurrence.objects.select_related('patient', 'allocated_nurse', 'visiting_doctor', 'schedule').all().order_by('scheduled_date')

        if date_str:
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                occurrences_qs = occurrences_qs.filter(scheduled_date=target_date)
            except ValueError:
                pass

        if patient_id:
            occurrences_qs = occurrences_qs.filter(patient_id=patient_id)

        if status_filter and status_filter.lower() != 'all':
            occurrences_qs = occurrences_qs.filter(status__iexact=status_filter)

        if tab == 'completed':
            occurrences_qs = occurrences_qs.filter(status=OccurrenceStatus.COMPLETED)
        elif tab == 'upcoming':
            occurrences_qs = occurrences_qs.filter(
                scheduled_date__gte=today,
                status__in=[OccurrenceStatus.SCHEDULED, OccurrenceStatus.RESCHEDULED]
            )

        from care_coordination.serializers import format_frequency_display

        results = []
        for occ in occurrences_qs:
            p = occ.patient
            if search_query:
                match_name = search_query in p.name.lower()
                match_reg = search_query in p.registration_id.lower()
                match_place = search_query in (p.place or '').lower()
                if not (match_name or match_reg or match_place):
                    continue

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

            location_str = f"{p.house_name}, {p.place}" if p.house_name and p.place and p.house_name != 'N/A' and p.place != 'N/A' else (p.panchayath or "Community Care Area")
            freq_display = format_frequency_display(occ.schedule.frequency, occ.schedule.custom_days) if occ.schedule else "One-Time Visit"

            # Mock reasonable appointment time slot for orderly daily work list
            slot_times = ["09:00 AM", "10:30 AM", "11:45 AM", "02:00 PM", "03:30 PM", "04:45 PM"]
            assigned_time = slot_times[occ.occurrence_id % len(slot_times)]

            results.append({
                "occurrence_id": occ.occurrence_id,
                "patient_id": p.patient_id,
                "patient_name": p.name,
                "patient_reg_id": p.registration_id,
                "patient_phone": p.phone or "N/A",
                "patient_place": p.place or "N/A",
                "patient_panchayath": p.panchayath or "N/A",
                "location": location_str,
                "scheduled_date": occ.scheduled_date.strftime('%d %b %Y'),
                "raw_date": str(occ.scheduled_date),
                "time": assigned_time,
                "visit_type": occ.visit_type,
                "urgency_level": occ.urgency_level or "Routine",
                "status": occ.status,
                "visiting_doctor_id": occ.visiting_doctor_id,
                "visiting_doctor": f"Dr. {occ.visiting_doctor.name}" if occ.visiting_doctor else "Not Assigned",
                "visiting_doctor_name": f"Dr. {occ.visiting_doctor.name}" if occ.visiting_doctor else None,
                "visiting_doctor_specialization": occ.visiting_doctor.specialization if occ.visiting_doctor else None,
                "doctor_status": "Assigned" if occ.visiting_doctor else "Not Assigned",
                "is_doctor_customized": occ.is_doctor_customized,
                "frequency": occ.schedule.frequency if occ.schedule else "One-Time",
                "frequency_display": freq_display,
                "approved_by_nurse": occ.approved_by_nurse.name if occ.approved_by_nurse else None,
                "completed_by_nurse_name": summary.nurse.name if summary and summary.nurse else None,
                "notes": occ.notes or "",
                "summary": summary_data,
            })

        return Response(results, status=status.HTTP_200_OK)


class NurseVisitAllocationsView(APIView):
    """
    Deprecated allocation view maintained for backwards compatibility.
    Returns all scheduled visits.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        nurse = get_authenticated_nurse(request)
        if not nurse:
            return Response({"detail": "Access restricted to Nurses only."}, status=status.HTTP_403_FORBIDDEN)

        available_qs = HomeVisitOccurrence.objects.select_related('patient', 'visiting_doctor', 'schedule').filter(
            status__in=[OccurrenceStatus.SCHEDULED, OccurrenceStatus.RESCHEDULED]
        ).exclude(
            visit_type=VisitType.ADDITIONAL, approved_by_nurse__isnull=True
        ).order_by('scheduled_date')

        from care_coordination.serializers import format_frequency_display

        results = []
        for occ in available_qs:
            p = occ.patient
            location_str = f"{p.house_name}, {p.place}" if p.house_name and p.place and p.house_name != 'N/A' and p.place != 'N/A' else (p.panchayath or "Community Care Area")
            freq_display = format_frequency_display(occ.schedule.frequency, occ.schedule.custom_days) if occ.schedule else "One-Time Visit"
            results.append({
                "occurrence_id": occ.occurrence_id,
                "patient_id": p.patient_id,
                "patient_name": p.name,
                "patient_reg_id": p.registration_id,
                "patient_phone": p.phone or "N/A",
                "location": location_str,
                "scheduled_date": occ.scheduled_date.strftime('%d %b %Y'),
                "visit_type": occ.visit_type,
                "urgency_level": occ.urgency_level or "Routine",
                "status": occ.status,
                "visiting_doctor_id": occ.visiting_doctor_id,
                "visiting_doctor": f"Dr. {occ.visiting_doctor.name}" if occ.visiting_doctor else "Not Assigned",
                "visiting_doctor_name": f"Dr. {occ.visiting_doctor.name}" if occ.visiting_doctor else None,
                "frequency": occ.schedule.frequency if occ.schedule else "One-Time",
                "frequency_display": freq_display,
                "notes": occ.notes or "",
            })

        return Response(results, status=status.HTTP_200_OK)


class NurseSelfAllocateVisitView(APIView):
    """
    Deprecated self-allocate view: No longer required in shared nurse team model.
    Maintained for backward compatibility.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, occurrence_id=None, pk=None, *args, **kwargs):
        occ_id = pk or occurrence_id
        nurse = get_authenticated_nurse(request)
        if not nurse:
            return Response({"detail": "Access restricted to Nurses only."}, status=status.HTTP_403_FORBIDDEN)

        occ = HomeVisitOccurrence.objects.filter(occurrence_id=occ_id).first()
        if not occ:
            return Response({"detail": "Visit occurrence record not found."}, status=status.HTTP_404_NOT_FOUND)

        if occ.status in [OccurrenceStatus.COMPLETED, OccurrenceStatus.SKIPPED]:
            return Response({"detail": "Completed or cancelled visits cannot be modified."}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "message": f"Home visits are managed by the shared nurse team. Any nurse can complete this visit without individual claiming.",
            "occurrence_id": occ.occurrence_id,
            "status": occ.status,
        }, status=status.HTTP_200_OK)


class NurseAdditionalVisitRequestsView(APIView):
    """
    Queue of urgent/additional visit requests awaiting Nurse review:
    GET /api/care-coordination/nurse/additional-requests/
    All nurses see the shared queue of unhandled urgent requests.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        nurse = get_authenticated_nurse(request)
        if not nurse:
            return Response({"detail": "Access restricted to Nurses only."}, status=status.HTTP_403_FORBIDDEN)

        requests_qs = HomeVisitOccurrence.objects.filter(
            visit_type=VisitType.ADDITIONAL,
            approved_by_nurse__isnull=True,
            status__in=[OccurrenceStatus.SCHEDULED, OccurrenceStatus.RESCHEDULED]
        ).order_by('scheduled_date')

        results = []
        for req in requests_qs:
            p = req.patient
            results.append({
                "occurrence_id": req.occurrence_id,
                "patient_id": p.patient_id,
                "patient_name": p.name,
                "patient_reg_id": p.registration_id,
                "patient_phone": p.phone or "N/A",
                "patient_place": p.place or "N/A",
                "patient_panchayath": p.panchayath or "N/A",
                "requested_date": req.scheduled_date.strftime('%d %b %Y'),
                "raw_date": str(req.scheduled_date),
                "reason": req.notes or "Urgent palliative care visit requested",
                "priority": req.urgency_level or "Urgent",
                "urgency_level": req.urgency_level or "Urgent",
                "status": "Pending Nurse Review",
            })

        return Response(results, status=status.HTTP_200_OK)


class NurseApproveAdditionalVisitView(APIView):
    """
    Approve / Accept an urgent home visit request:
    POST /api/care-coordination/nurse/additional-requests/<int:occurrence_id>/approve/
    POST /api/care-coordination/nurse/additional-requests/<int:occurrence_id>/accept/
    Concurrency-safe atomic transaction prevents double acceptance.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, occurrence_id, *args, **kwargs):
        nurse = get_authenticated_nurse(request)
        if not nurse:
            return Response({"detail": "Access restricted to Nurses only."}, status=status.HTTP_403_FORBIDDEN)

        with transaction.atomic():
            occ = HomeVisitOccurrence.objects.select_for_update().filter(
                occurrence_id=occurrence_id, visit_type=VisitType.ADDITIONAL
            ).first()
            if not occ:
                return Response({"detail": "Additional visit request not found."}, status=status.HTTP_404_NOT_FOUND)

            if occ.approved_by_nurse is not None:
                return Response(
                    {"detail": f"This urgent request has already been accepted by Nurse {occ.approved_by_nurse.name}."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            occ.approved_by_nurse = nurse
            occ.status = OccurrenceStatus.SCHEDULED
            occ.save(update_fields=['approved_by_nurse', 'status', 'updated_at'])

        if occ.patient.user:
            Notification.objects.create(
                user=occ.patient.user,
                type='home_visit',
                message=f"Your urgent home visit request for {occ.scheduled_date.strftime('%d %b %Y')} has been accepted by Nurse {nurse.name}."
            )

        return Response({
            "message": f"Urgent home visit request for {occ.patient.name} accepted successfully.",
            "occurrence_id": occ.occurrence_id,
            "status": occ.status,
            "approved_by": nurse.name,
        }, status=status.HTTP_200_OK)


class NurseRescheduleAdditionalVisitView(APIView):
    """
    Reschedule an additional/urgent home visit request:
    POST /api/care-coordination/nurse/additional-requests/<int:occurrence_id>/reschedule/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, occurrence_id, *args, **kwargs):
        nurse = get_authenticated_nurse(request)
        if not nurse:
            return Response({"detail": "Access restricted to Nurses only."}, status=status.HTTP_403_FORBIDDEN)

        occ = HomeVisitOccurrence.objects.filter(occurrence_id=occurrence_id, visit_type=VisitType.ADDITIONAL).first()
        if not occ:
            return Response({"detail": "Additional visit request not found."}, status=status.HTTP_404_NOT_FOUND)

        new_date_str = request.data.get('new_date') or request.data.get('scheduled_date')
        if not new_date_str:
            return Response({"errors": {"new_date": ["New scheduled date is required."]}}, status=status.HTTP_400_BAD_REQUEST)

        try:
            new_date = datetime.strptime(new_date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({"errors": {"new_date": ["Invalid date format. Use YYYY-MM-DD."]}}, status=status.HTTP_400_BAD_REQUEST)

        if new_date.weekday() == 6:  # Sunday
            return Response({"errors": {"new_date": ["Sunday is a non-working day and cannot be selected for Home Visits."]}}, status=status.HTTP_400_BAD_REQUEST)

        nurse_notes = request.data.get('notes', '').strip()
        occ.scheduled_date = new_date
        if nurse_notes:
            occ.notes = f"{occ.notes or ''}\nRescheduled by Nurse {nurse.name}: {nurse_notes}".strip()
        occ.approved_by_nurse = nurse
        occ.status = OccurrenceStatus.RESCHEDULED
        occ.save(update_fields=['scheduled_date', 'notes', 'approved_by_nurse', 'status', 'updated_at'])

        if occ.patient.user:
            Notification.objects.create(
                user=occ.patient.user,
                type='home_visit',
                message=f"Your urgent home visit request has been rescheduled to {new_date.strftime('%d %b %Y')} by Nurse {nurse.name}."
            )

        return Response({
            "message": f"Home visit request for {occ.patient.name} rescheduled to {new_date.strftime('%d %b %Y')}.",
            "occurrence_id": occ.occurrence_id,
            "new_date": new_date.strftime('%d %b %Y'),
            "status": occ.status,
        }, status=status.HTTP_200_OK)


class PatientUrgentVisitRequestView(APIView):
    """
    Patient submits urgent/additional home visit request:
    POST /api/care-coordination/home-visits/urgent-requests/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        patient = get_authenticated_patient(request)
        if not patient:
            return Response({"detail": "Access restricted to Patients only."}, status=status.HTTP_403_FORBIDDEN)

        from care_coordination.serializers import UrgentVisitRequestSerializer
        serializer = UrgentVisitRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        urgency = serializer.validated_data.get('urgency_level', UrgencyLevel.ROUTINE)
        notes = serializer.validated_data.get('notes') or serializer.validated_data.get('reason') or "Urgent palliative care visit requested."
        target_date = serializer.validated_data.get('date')
        if not target_date:
            target_date = timezone.now().date() + timedelta(days=1)
            if target_date.weekday() == 6:  # If tomorrow is Sunday, skip to Monday
                target_date = target_date + timedelta(days=1)

        if target_date.weekday() == 6:  # Sunday
            return Response({"errors": {"date": ["Sunday is a non-working day and cannot be selected for Home Visits."]}}, status=status.HTTP_400_BAD_REQUEST)

        default_doc = patient.reviewed_by_doctor if (
            patient.reviewed_by_doctor_id and
            patient.reviewed_by_doctor.verification_status == VerificationStatus.APPROVED and
            patient.reviewed_by_doctor.user.is_active
        ) else None

        occ = HomeVisitOccurrence.objects.create(
            schedule=None,
            patient=patient,
            scheduled_date=target_date,
            visit_type=VisitType.ADDITIONAL,
            urgency_level=urgency,
            status=OccurrenceStatus.SCHEDULED,
            requested_by=request.user,
            approved_by_nurse=None,
            allocated_nurse=None,
            visiting_doctor=default_doc,
            is_doctor_customized=False,
            notes=notes
        )

        return Response({
            "message": "Urgent home visit request submitted successfully. It will be reviewed by the nursing team.",
            "occurrence_id": occ.occurrence_id,
            "scheduled_date": occ.scheduled_date.strftime('%d %b %Y'),
            "urgency_level": occ.urgency_level,
            "status": "Pending Nurse Review",
        }, status=status.HTTP_201_CREATED)


class NurseCompleteVisitView(APIView):
    """
    Complete any scheduled home visit & record official clinical documentation:
    POST /api/care-coordination/home-visits/occurrences/<int:pk>/complete/
    POST /api/care-coordination/nurse/visits/<int:occurrence_id>/complete/
    Any verified Nurse can complete any scheduled visit.
    Automatically records HomeVisitSummary.nurse_id = authenticated Nurse for audit.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, occurrence_id=None, pk=None, *args, **kwargs):
        occ_id = pk or occurrence_id
        nurse = get_authenticated_nurse(request)
        if not nurse:
            return Response({"detail": "Only Nurses can complete Home Visit documentation."}, status=status.HTTP_403_FORBIDDEN)

        occ = HomeVisitOccurrence.objects.filter(occurrence_id=occ_id).first()
        if not occ:
            return Response({"detail": "Visit occurrence not found."}, status=status.HTTP_404_NOT_FOUND)

        if occ.status == OccurrenceStatus.COMPLETED:
            return Response({"detail": "This visit has already been marked as completed."}, status=status.HTTP_400_BAD_REQUEST)

        from care_coordination.serializers import NurseCompleteVisitSerializer
        serializer = NurseCompleteVisitSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        blood_pressure = serializer.validated_data.get('blood_pressure', 'N/A')
        pulse = serializer.validated_data.get('pulse')
        temperature = serializer.validated_data.get('temperature')
        oxygen_level = serializer.validated_data.get('oxygen_level')
        treatment_notes = serializer.validated_data.get('treatment_notes', '')
        next_visit_date = serializer.validated_data.get('next_visit_recommendation')
        symptoms_list = serializer.validated_data.get('symptoms', [])

        doctor_id = request.data.get('visiting_doctor_id') or request.data.get('doctor_id')

        with transaction.atomic():
            occ = HomeVisitOccurrence.objects.select_for_update().filter(occurrence_id=occ_id).first()
            if not occ:
                return Response({"detail": "Visit occurrence not found."}, status=status.HTTP_404_NOT_FOUND)

            if occ.status == OccurrenceStatus.COMPLETED:
                return Response({"detail": "This visit has already been marked as completed."}, status=status.HTTP_400_BAD_REQUEST)

            # Any authorized nurse can complete any visit.
            # Record nurse on summary for audit trail.
            if doctor_id:
                doc = Doctor.objects.filter(doctor_id=doctor_id, verification_status=VerificationStatus.APPROVED).first()
                if doc:
                    occ.visiting_doctor = doc
                    occ.is_doctor_customized = True

            summary, created = HomeVisitSummary.objects.update_or_create(
                occurrence=occ,
                defaults={
                    "nurse": nurse,
                    "blood_pressure": blood_pressure or "N/A",
                    "pulse": pulse,
                    "temperature": temperature,
                    "oxygen_level": oxygen_level,
                    "treatment_notes": treatment_notes or "Routine palliative home care provided.",
                    "next_visit_recommendation": next_visit_date,
                }
            )

            if isinstance(symptoms_list, list):
                VisitSymptom.objects.filter(summary=summary).delete()
                for sym in symptoms_list:
                    s_name = str(sym.get('name') or sym.get('symptom_name', '')).strip()
                    s_sev = str(sym.get('severity', 'Mild')).strip()
                    if s_name:
                        VisitSymptom.objects.create(
                            summary=summary,
                            symptom_name=s_name,
                            severity=s_sev
                        )

            occ.status = OccurrenceStatus.COMPLETED
            occ.save(update_fields=['status', 'visiting_doctor', 'is_doctor_customized', 'updated_at'])

        # Notify Patient
        if occ.patient.user:
            team_text = f"by Nurse {nurse.name}" + (f" with Dr. {occ.visiting_doctor.name}" if occ.visiting_doctor else "")
            Notification.objects.create(
                user=occ.patient.user,
                type='home_visit',
                message=f"Your home visit has been completed {team_text}. Vitals and care summary recorded."
            )

        return Response({
            "message": f"Home visit for {occ.patient.name} completed successfully.",
            "occurrence_id": occ.occurrence_id,
            "status": occ.status,
            "completed_by_nurse": nurse.name,
            "visiting_doctor": f"Dr. {occ.visiting_doctor.name}" if occ.visiting_doctor else "Not Assigned",
            "summary_id": summary.summary_id,
        }, status=status.HTTP_200_OK)



class NurseVisitSummaryUploadView(APIView):
    """
    Upload Home Visit Summary Document:
    POST /api/care-coordination/nurse/visits/<int:occurrence_id>/summary-upload/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, occurrence_id, *args, **kwargs):
        from accounts.views import get_authenticated_nurse
        nurse = get_authenticated_nurse(request)
        if not nurse:
            return Response({"detail": "Access restricted to Nurses only."}, status=status.HTTP_403_FORBIDDEN)

        occ = HomeVisitOccurrence.objects.filter(occurrence_id=occurrence_id).first()
        if not occ:
            return Response({"detail": "Visit record not found."}, status=status.HTTP_404_NOT_FOUND)

        file_obj = request.FILES.get('summary_file') or request.FILES.get('file')
        if not file_obj:
            return Response({"errors": {"summary_file": ["Summary document file is required."]}}, status=status.HTTP_400_BAD_REQUEST)

        # Size check (< 10MB)
        if file_obj.size > 10 * 1024 * 1024:
            return Response({"errors": {"summary_file": ["File size exceeds 10MB limit."]}}, status=status.HTTP_400_BAD_REQUEST)

        # Extension check
        allowed_extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']
        ext = file_obj.name.lower()[file_obj.name.rfind('.'):]
        if ext not in allowed_extensions:
            return Response({"errors": {"summary_file": [f"Unsupported file type. Allowed: {', '.join(allowed_extensions)}"]}}, status=status.HTTP_400_BAD_REQUEST)

        from django.core.files.storage import default_storage
        file_path = default_storage.save(f"documents/home_visits/{uuid.uuid4().hex}_{file_obj.name}", file_obj)

        from medical_records.models import MedicalDocument
        doc = MedicalDocument.objects.create(
            patient=occ.patient,
            file_path=file_path,
            document_type='Home Visit Summary'
        )

        return Response({
            "message": "Home visit summary document uploaded successfully.",
            "document_id": doc.document_id,
            "file_path": file_path,
        }, status=status.HTTP_201_CREATED)


class NurseCaregiverAssignmentView(APIView):
    """
    Caregiver assignment management for Nurse:
    GET: List active & past caregiver assignments + verified caregivers list.
    POST: Assign verified caregiver to patient.
    POST (<int:assignment_id>/end/): End active assignment.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        from accounts.views import get_authenticated_nurse
        nurse = get_authenticated_nurse(request)
        if not nurse:
            return Response({"detail": "Access restricted to Nurses only."}, status=status.HTTP_403_FORBIDDEN)

        from care_coordination.models import CaregiverPatientAssignment, AssignmentStatus
        from accounts.models import Caregiver, VerificationStatus, Patient, RegistrationStatus

        assignments_qs = CaregiverPatientAssignment.objects.all().order_by('-assigned_at')
        assignments_data = [
            {
                "assignment_id": a.assignment_id,
                "caregiver_id": a.caregiver.caregiver_id,
                "caregiver_name": a.caregiver.name,
                "caregiver_phone": a.caregiver.phone or "N/A",
                "patient_id": a.patient.patient_id,
                "patient_name": a.patient.name,
                "patient_reg_id": a.patient.registration_id,
                "assigned_by_nurse": a.assigned_by_nurse.name,
                "status": a.status,
                "assigned_at": a.assigned_at.strftime('%d %b %Y, %H:%M'),
                "ended_at": a.ended_at.strftime('%d %b %Y, %H:%M') if a.ended_at else None,
            }
            for a in assignments_qs
        ]

        verified_caregivers = [
            {
                "caregiver_id": c.caregiver_id,
                "name": c.name,
                "phone": c.phone or "N/A",
                "specialization": c.specialization or "Palliative Care Assistant",
                "place": c.place or "N/A",
                "panchayath": c.panchayath or "N/A",
            }
            for c in Caregiver.objects.filter(verification_status=VerificationStatus.APPROVED)
        ]

        approved_patients = [
            {
                "patient_id": p.patient_id,
                "name": p.name,
                "registration_id": p.registration_id,
                "place": p.place or "N/A",
            }
            for p in Patient.objects.filter(registration_status=RegistrationStatus.APPROVED)
        ]

        return Response({
            "assignments": assignments_data,
            "caregivers": verified_caregivers,
            "patients": approved_patients,
        }, status=status.HTTP_200_OK)

    def post(self, request, assignment_id=None, *args, **kwargs):
        from accounts.views import get_authenticated_nurse
        nurse = get_authenticated_nurse(request)
        if not nurse:
            return Response({"detail": "Access restricted to Nurses only."}, status=status.HTTP_403_FORBIDDEN)

        from care_coordination.models import CaregiverPatientAssignment, AssignmentStatus
        from accounts.models import Caregiver, VerificationStatus, Patient, RegistrationStatus

        # End Assignment Action
        if assignment_id or request.data.get('action') == 'end':
            a_id = assignment_id or request.data.get('assignment_id')
            assignment = CaregiverPatientAssignment.objects.filter(assignment_id=a_id).first()
            if not assignment:
                return Response({"detail": "Assignment record not found."}, status=status.HTTP_404_NOT_FOUND)

            assignment.status = AssignmentStatus.ENDED
            assignment.ended_at = timezone.now()
            assignment.save(update_fields=['status', 'ended_at', 'updated_at'])

            return Response({
                "message": f"Caregiver assignment for {assignment.patient.name} has been ended.",
                "assignment_id": assignment.assignment_id,
                "status": assignment.status,
            }, status=status.HTTP_200_OK)

        # Create New Assignment Action
        caregiver_id = request.data.get('caregiver_id')
        patient_id = request.data.get('patient_id')

        if not caregiver_id or not patient_id:
            return Response(
                {"errors": {"detail": ["Both caregiver_id and patient_id are required."]}},
                status=status.HTTP_400_BAD_REQUEST
            )

        caregiver = Caregiver.objects.filter(caregiver_id=caregiver_id, verification_status=VerificationStatus.APPROVED).first()
        if not caregiver:
            return Response({"errors": {"caregiver_id": ["Verified caregiver not found."]}}, status=status.HTTP_404_NOT_FOUND)

        patient = Patient.objects.filter(patient_id=patient_id, registration_status=RegistrationStatus.APPROVED).first()
        if not patient:
            return Response({"errors": {"patient_id": ["Registered patient not found."]}}, status=status.HTTP_404_NOT_FOUND)

        # End any previous active assignment for this patient
        CaregiverPatientAssignment.objects.filter(patient=patient, status=AssignmentStatus.ACTIVE).update(
            status=AssignmentStatus.ENDED, ended_at=timezone.now()
        )

        new_assignment = CaregiverPatientAssignment.objects.create(
            caregiver=caregiver,
            patient=patient,
            assigned_by_nurse=nurse,
            status=AssignmentStatus.ACTIVE
        )

        Notification.objects.create(
            user=patient.user,
            type='caregiver',
            message=f"Nurse {nurse.name} has assigned certified caregiver {caregiver.name} to support your palliative care."
        )

        return Response({
            "message": f"Caregiver {caregiver.name} successfully assigned to {patient.name}.",
            "assignment_id": new_assignment.assignment_id,
            "status": new_assignment.status,
        }, status=status.HTTP_201_CREATED)


class AvailableDoctorsForVisitView(APIView):
    """
    Returns list of verified Doctors for assigning as visiting doctors.
    Only accessible by authenticated staff (Nurse / Doctor / Admin).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role not in [Role.NURSE, Role.DOCTOR, Role.ADMIN]:
            return Response({"detail": "Access restricted."}, status=status.HTTP_403_FORBIDDEN)
        
        doctors = Doctor.objects.filter(
            verification_status=VerificationStatus.APPROVED,
            user__is_active=True
        ).order_by('name')
        
        data = [
            {
                "doctor_id": doc.doctor_id,
                "doctor_name": f"Dr. {doc.name}",
                "specialization": doc.specialization or "General Palliative Care",
                "service_area": doc.service_area or "All Areas",
                "phone": doc.phone or "",
                "is_available_now": doc.is_available_now
            }
            for doc in doctors
        ]
        return Response(data, status=status.HTTP_200_OK)

