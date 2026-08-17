import uuid
from datetime import datetime, timedelta, time
from django.db import transaction
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from accounts.models import Role, Doctor, Patient
from notifications.models import Notification
from care_coordination.models import (
    TelemedicineConsultation,
    TelemedicineConsultationNote,
    TelemedicineFollowUp,
    ConsultationStatus,
    UrgencyLevel
)
from care_coordination.serializers import (
    TelemedicineConsultationSerializer,
    TelemedicineConsultationNoteSerializer,
    TelemedicineFollowUpSerializer,
    ConsultationCreateSerializer,
    ConsultationScheduleSerializer,
    ConsultationRejectSerializer
)


def is_time_overlapping(start1, end1, start2, end2):
    """
    Returns True if interval (start1, end1) overlaps with (start2, end2).
    Condition: start1 < end2 AND end1 > start2
    """
    return start1 < end2 and end1 > start2


def get_active_consultations_query(doctor_id, target_date, exclude_id=None):
    """
    Active consultations that reserve doctor's schedule: PENDING, ACCEPTED, SCHEDULED, IN_PROGRESS.
    """
    active_statuses = [
        ConsultationStatus.PENDING,
        ConsultationStatus.ACCEPTED,
        ConsultationStatus.SCHEDULED,
        ConsultationStatus.IN_PROGRESS
    ]
    qs = TelemedicineConsultation.objects.filter(
        doctor_id=doctor_id,
        status__in=active_statuses
    )
    if exclude_id:
        qs = qs.exclude(consultation_id=exclude_id)

    # Filter consultations on target_date considering both scheduled_date and requested_date
    return [
        c for c in qs
        if (c.scheduled_date == target_date or (not c.scheduled_date and c.requested_date == target_date))
    ]


def generate_jitsi_meeting_link(consultation_id):
    return f"https://meet.jit.si/KarunaGrid-Consult-{consultation_id}-{uuid.uuid4().hex[:8]}"


# --- AVAILABLE SLOTS API ---

class AvailableSlotsView(APIView):
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
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response(
                {"errors": {"date": ["Invalid date format. Use YYYY-MM-DD."]}},
                status=status.HTTP_400_BAD_REQUEST
            )

        doctor = Doctor.objects.filter(doctor_id=doctor_id).first()
        if not doctor:
            return Response({"detail": "Doctor not found."}, status=status.HTTP_404_NOT_FOUND)

        # Standard 30-min slot generation from 09:00 to 17:00
        slots = []
        start_hour = 9
        end_hour = 17
        slot_duration = timedelta(minutes=30)

        active_consultations = get_active_consultations_query(doctor_id, target_date)

        current_dt = datetime.combine(target_date, time(start_hour, 0))
        end_dt = datetime.combine(target_date, time(end_hour, 0))

        while current_dt + slot_duration <= end_dt:
            slot_start = current_dt.time()
            slot_end = (current_dt + slot_duration).time()

            is_available = True
            for c in active_consultations:
                # Get consultation start and end times
                c_start = c.scheduled_start_time or c.requested_time
                if not c_start:
                    continue

                if c.scheduled_end_time:
                    c_end = c.scheduled_end_time
                else:
                    c_end = (datetime.combine(target_date, c_start) + slot_duration).time()

                if is_time_overlapping(slot_start, slot_end, c_start, c_end):
                    is_available = False
                    break

            slots.append({
                "start_time": slot_start.strftime("%H:%M"),
                "end_time": slot_end.strftime("%H:%M"),
                "is_available": is_available
            })

            current_dt += slot_duration

        return Response(slots, status=status.HTTP_200_OK)


# --- PATIENT CONSULTATION LIST & CREATE VIEW ---

class PatientConsultationListCreateView(APIView):
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
        else:
            consultations = TelemedicineConsultation.objects.all().order_by('-created_at')

        serializer = TelemedicineConsultationSerializer(consultations, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        user = request.user
        if user.role != Role.PATIENT:
            return Response({"detail": "Only Patients can request telemedicine consultations."}, status=status.HTTP_403_FORBIDDEN)

        patient = getattr(user, 'patient', None)
        if not patient:
            return Response({"detail": "Patient profile not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = ConsultationCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        doctor_id = data['doctor_id']
        requested_date = data['requested_date']
        requested_time = data['requested_time']

        doctor = Doctor.objects.filter(doctor_id=doctor_id).first()
        if not doctor:
            return Response({"detail": "Doctor not found."}, status=status.HTTP_404_NOT_FOUND)

        # Check assigned doctor constraint: must match reviewed_by_doctor or verified doctor
        if patient.reviewed_by_doctor and patient.reviewed_by_doctor.doctor_id != doctor.doctor_id:
            return Response(
                {"errors": {"doctor_id": ["You can only request consultations with your assigned doctor."]}},
                status=status.HTTP_403_FORBIDDEN
            )

        requested_start = requested_time
        requested_end = (datetime.combine(requested_date, requested_time) + timedelta(minutes=30)).time()

        # ATOMIC DB TRANSACTION + ROW LOCKING
        with transaction.atomic():
            Doctor.objects.select_for_update().get(doctor_id=doctor.doctor_id)

            active_consultations = get_active_consultations_query(doctor.doctor_id, requested_date)
            for c in active_consultations:
                c_start = c.scheduled_start_time or c.requested_time
                if not c_start:
                    continue
                c_end = c.scheduled_end_time or (datetime.combine(requested_date, c_start) + timedelta(minutes=30)).time()

                if is_time_overlapping(requested_start, requested_end, c_start, c_end):
                    return Response(
                        {"detail": "This time slot is no longer available. Please select another time."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            consultation = TelemedicineConsultation.objects.create(
                patient=patient,
                doctor=doctor,
                requested_by=user,
                requested_date=requested_date,
                requested_time=requested_time,
                reason=data['reason'],
                symptoms=data.get('symptoms', ''),
                priority=data.get('priority', UrgencyLevel.ROUTINE),
                patient_notes=data.get('patient_notes', ''),
                status=ConsultationStatus.PENDING
            )

        # Send notification to doctor
        Notification.objects.create(
            user=doctor.user,
            type='telemedicine',
            message=f"New telemedicine consultation request from Patient '{patient.name}' for {requested_date} at {requested_time.strftime('%H:%M')}."
        )

        res_serializer = TelemedicineConsultationSerializer(consultation)
        return Response(res_serializer.data, status=status.HTTP_201_CREATED)


# --- DOCTOR CONSULTATION LIST VIEW ---

class DoctorConsultationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        if user.role != Role.DOCTOR:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        doctor = getattr(user, 'doctor', None)
        if not doctor:
            return Response({"detail": "Doctor profile not found."}, status=status.HTTP_404_NOT_FOUND)

        consultations = TelemedicineConsultation.objects.filter(doctor=doctor).order_by('-created_at')
        serializer = TelemedicineConsultationSerializer(consultations, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


# --- CONSULTATION DETAIL VIEW ---

class ConsultationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk, *args, **kwargs):
        consultation = TelemedicineConsultation.objects.filter(consultation_id=pk).first()
        if not consultation:
            return Response({"detail": "Consultation record not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if user.role == Role.PATIENT and consultation.patient.user_id != user.user_id:
            return Response({"detail": "Access denied."}, status=status.HTTP_403_FORBIDDEN)
        elif user.role == Role.DOCTOR and consultation.doctor.user_id != user.user_id:
            return Response({"detail": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

        serializer = TelemedicineConsultationSerializer(consultation)
        return Response(serializer.data, status=status.HTTP_200_OK)


# --- DOCTOR ACCEPT CONSULTATION ---

class DoctorAcceptConsultationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        user = request.user
        if user.role != Role.DOCTOR:
            return Response({"detail": "Only Doctors can accept consultation requests."}, status=status.HTTP_403_FORBIDDEN)

        consultation = TelemedicineConsultation.objects.filter(consultation_id=pk).first()
        if not consultation:
            return Response({"detail": "Consultation record not found."}, status=status.HTTP_404_NOT_FOUND)

        if consultation.doctor.user_id != user.user_id:
            return Response({"detail": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

        consultation.status = ConsultationStatus.ACCEPTED
        if not consultation.meeting_link:
            consultation.meeting_link = generate_jitsi_meeting_link(consultation.consultation_id)
        consultation.save()

        Notification.objects.create(
            user=consultation.patient.user,
            type='telemedicine',
            message=f"Your telemedicine consultation request with Dr. {consultation.doctor.name} has been accepted."
        )

        serializer = TelemedicineConsultationSerializer(consultation)
        return Response(serializer.data, status=status.HTTP_200_OK)


# --- DOCTOR REJECT CONSULTATION ---

class DoctorRejectConsultationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        user = request.user
        if user.role != Role.DOCTOR:
            return Response({"detail": "Only Doctors can reject consultation requests."}, status=status.HTTP_403_FORBIDDEN)

        consultation = TelemedicineConsultation.objects.filter(consultation_id=pk).first()
        if not consultation:
            return Response({"detail": "Consultation record not found."}, status=status.HTTP_404_NOT_FOUND)

        if consultation.doctor.user_id != user.user_id:
            return Response({"detail": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

        serializer = ConsultationRejectSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        rejection_reason = serializer.validated_data['rejection_reason']
        consultation.status = ConsultationStatus.REJECTED
        consultation.rejection_reason = rejection_reason
        consultation.save()

        Notification.objects.create(
            user=consultation.patient.user,
            type='telemedicine',
            message=f"Your telemedicine consultation request was not approved. Reason: {rejection_reason}"
        )

        res_serializer = TelemedicineConsultationSerializer(consultation)
        return Response(res_serializer.data, status=status.HTTP_200_OK)


# --- DOCTOR SCHEDULE CONSULTATION ---

class DoctorScheduleConsultationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        user = request.user
        if user.role != Role.DOCTOR:
            return Response({"detail": "Only Doctors can schedule consultations."}, status=status.HTTP_403_FORBIDDEN)

        consultation = TelemedicineConsultation.objects.filter(consultation_id=pk).first()
        if not consultation:
            return Response({"detail": "Consultation record not found."}, status=status.HTTP_404_NOT_FOUND)

        if consultation.doctor.user_id != user.user_id:
            return Response({"detail": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

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

            active_consultations = get_active_consultations_query(consultation.doctor.doctor_id, sched_date, exclude_id=consultation.consultation_id)
            for c in active_consultations:
                c_start = c.scheduled_start_time or c.requested_time
                if not c_start:
                    continue
                c_end = c.scheduled_end_time or (datetime.combine(sched_date, c_start) + timedelta(minutes=30)).time()

                if is_time_overlapping(start_time, end_time, c_start, c_end):
                    return Response(
                        {"detail": "This time slot conflicts with another scheduled consultation for this doctor."},
                        status=status.HTTP_400_BAD_REQUEST
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
            message=f"Your telemedicine consultation with Dr. {consultation.doctor.name} has been {action_text} for {sched_date} at {start_time.strftime('%H:%M')}."
        )

        res_serializer = TelemedicineConsultationSerializer(consultation)
        return Response(res_serializer.data, status=status.HTTP_200_OK)


# --- DOCTOR START CONSULTATION ---

class DoctorStartConsultationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        user = request.user
        if user.role != Role.DOCTOR:
            return Response({"detail": "Only Doctors can start consultations."}, status=status.HTTP_403_FORBIDDEN)

        consultation = TelemedicineConsultation.objects.filter(consultation_id=pk).first()
        if not consultation:
            return Response({"detail": "Consultation record not found."}, status=status.HTTP_404_NOT_FOUND)

        if consultation.doctor.user_id != user.user_id:
            return Response({"detail": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

        consultation.status = ConsultationStatus.IN_PROGRESS
        consultation.save()

        Notification.objects.create(
            user=consultation.patient.user,
            type='telemedicine',
            message=f"Dr. {consultation.doctor.name} has started your telemedicine consultation. You can join now!"
        )

        serializer = TelemedicineConsultationSerializer(consultation)
        return Response(serializer.data, status=status.HTTP_200_OK)


# --- DOCTOR COMPLETE CONSULTATION ---

class DoctorCompleteConsultationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        user = request.user
        if user.role != Role.DOCTOR:
            return Response({"detail": "Only Doctors can complete consultations."}, status=status.HTTP_403_FORBIDDEN)

        consultation = TelemedicineConsultation.objects.filter(consultation_id=pk).first()
        if not consultation:
            return Response({"detail": "Consultation record not found."}, status=status.HTTP_404_NOT_FOUND)

        if consultation.doctor.user_id != user.user_id:
            return Response({"detail": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

        consultation.status = ConsultationStatus.COMPLETED
        consultation.completed_at = timezone.now()
        consultation.save()

        # Create note if optional text provided
        notes_text = request.data.get('notes', '').strip()
        if notes_text:
            TelemedicineConsultationNote.objects.create(
                consultation=consultation,
                doctor=consultation.doctor,
                patient=consultation.patient,
                notes=notes_text,
                symptoms_discussed=request.data.get('symptoms_discussed', ''),
                clinical_observations=request.data.get('clinical_observations', ''),
                advice=request.data.get('advice', ''),
                recommendations=request.data.get('recommendations', '')
            )

        Notification.objects.create(
            user=consultation.patient.user,
            type='telemedicine',
            message=f"Your telemedicine consultation with Dr. {consultation.doctor.name} has been completed."
        )

        serializer = TelemedicineConsultationSerializer(consultation)
        return Response(serializer.data, status=status.HTTP_200_OK)


# --- CANCEL CONSULTATION ---

class PatientCancelConsultationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        consultation = TelemedicineConsultation.objects.filter(consultation_id=pk).first()
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
            message=f"Telemedicine consultation #{consultation.consultation_id} was cancelled by {canceler_role}."
        )

        serializer = TelemedicineConsultationSerializer(consultation)
        return Response(serializer.data, status=status.HTTP_200_OK)


# --- CONSULTATION NOTES VIEW ---

class ConsultationNotesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk, *args, **kwargs):
        notes = TelemedicineConsultationNote.objects.filter(consultation_id=pk).order_by('-created_at')
        serializer = TelemedicineConsultationNoteSerializer(notes, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, pk, *args, **kwargs):
        user = request.user
        if user.role != Role.DOCTOR:
            return Response({"detail": "Only Doctors can record consultation notes."}, status=status.HTTP_403_FORBIDDEN)

        consultation = TelemedicineConsultation.objects.filter(consultation_id=pk).first()
        if not consultation:
            return Response({"detail": "Consultation record not found."}, status=status.HTTP_404_NOT_FOUND)

        if consultation.doctor.user_id != user.user_id:
            return Response({"detail": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

        note = TelemedicineConsultationNote.objects.create(
            consultation=consultation,
            doctor=consultation.doctor,
            patient=consultation.patient,
            symptoms_discussed=request.data.get('symptoms_discussed', ''),
            clinical_observations=request.data.get('clinical_observations', ''),
            advice=request.data.get('advice', ''),
            recommendations=request.data.get('recommendations', ''),
            notes=request.data.get('notes', '')
        )

        serializer = TelemedicineConsultationNoteSerializer(note)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# --- FOLLOW UP VIEW ---

class ConsultationFollowUpView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk, *args, **kwargs):
        followups = TelemedicineFollowUp.objects.filter(original_consultation_id=pk).order_by('-created_at')
        serializer = TelemedicineFollowUpSerializer(followups, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, pk, *args, **kwargs):
        user = request.user
        if user.role != Role.DOCTOR:
            return Response({"detail": "Only Doctors can schedule follow-up consultations."}, status=status.HTTP_403_FORBIDDEN)

        consultation = TelemedicineConsultation.objects.filter(consultation_id=pk).first()
        if not consultation:
            return Response({"detail": "Consultation record not found."}, status=status.HTTP_404_NOT_FOUND)

        if consultation.doctor.user_id != user.user_id:
            return Response({"detail": "Access denied."}, status=status.HTTP_403_FORBIDDEN)

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
