import uuid
from datetime import time, datetime, timedelta
from rest_framework import serializers
from care_coordination.models import (
    TelemedicineConsultation,
    TelemedicineConsultationNote,
    TelemedicineFollowUp,
    ConsultationStatus,
    UrgencyLevel
)
from accounts.models import Patient, Doctor


# Predefined 30-minute fixed consultation slots
TELEMEDICINE_SLOTS = [
    {"start_time": "09:30", "end_time": "10:00"},
    {"start_time": "10:00", "end_time": "10:30"},
    {"start_time": "10:30", "end_time": "11:00"},
    {"start_time": "11:00", "end_time": "11:30"},
    {"start_time": "11:30", "end_time": "12:00"},
    {"start_time": "12:00", "end_time": "12:30"},
    {"start_time": "12:30", "end_time": "13:00"},
    {"start_time": "14:00", "end_time": "14:30"},
    {"start_time": "14:30", "end_time": "15:00"},
    {"start_time": "15:00", "end_time": "15:30"},
    {"start_time": "15:30", "end_time": "16:00"},
]

ALLOWED_START_TIMES = {s["start_time"] for s in TELEMEDICINE_SLOTS}


def get_slot_end_time(start_time_str):
    for slot in TELEMEDICINE_SLOTS:
        if slot["start_time"] == start_time_str:
            return slot["end_time"]
    return None


def is_valid_telemedicine_slot(start_time_val, end_time_val=None):
    """
    Validates whether start_time (and optional end_time) matches one of the 11 valid slots.
    """
    if isinstance(start_time_val, time):
        st_str = start_time_val.strftime("%H:%M")
    elif isinstance(start_time_val, str):
        st_str = start_time_val[:5]
    else:
        return False, None, None

    if st_str not in ALLOWED_START_TIMES:
        return False, None, None

    expected_end_str = get_slot_end_time(st_str)
    if end_time_val:
        if isinstance(end_time_val, time):
            et_str = end_time_val.strftime("%H:%M")
        elif isinstance(end_time_val, str):
            et_str = end_time_val[:5]
        else:
            return False, None, None
        if et_str != expected_end_str:
            return False, None, None

    st_time = time(int(st_str[:2]), int(st_str[3:5]))
    et_time = time(int(expected_end_str[:2]), int(expected_end_str[3:5]))
    return True, st_time, et_time


class TelemedicineConsultationNoteSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.name', read_only=True)

    class Meta:
        model = TelemedicineConsultationNote
        fields = [
            'note_id', 'consultation', 'doctor', 'patient', 'doctor_name',
            'symptoms_discussed', 'clinical_observations', 'advice',
            'recommendations', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['note_id', 'doctor', 'patient', 'created_at', 'updated_at']


class TelemedicineFollowUpSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.name', read_only=True)
    patient_name = serializers.CharField(source='patient.name', read_only=True)

    class Meta:
        model = TelemedicineFollowUp
        fields = [
            'followup_id', 'original_consultation', 'patient', 'doctor',
            'patient_name', 'doctor_name', 'followup_date', 'followup_time',
            'reason', 'notes', 'followup_type', 'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['followup_id', 'patient', 'doctor', 'created_at', 'updated_at']


class TelemedicineConsultationSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    patient_registration_id = serializers.CharField(source='patient.registration_id', read_only=True)
    doctor_name = serializers.CharField(source='doctor.name', read_only=True)
    doctor_specialization = serializers.CharField(source='doctor.specialization', read_only=True)
    consultation_notes = TelemedicineConsultationNoteSerializer(many=True, read_only=True)
    followups = TelemedicineFollowUpSerializer(many=True, read_only=True)

    class Meta:
        model = TelemedicineConsultation
        fields = [
            'consultation_id', 'patient', 'doctor', 'requested_by',
            'patient_name', 'patient_registration_id', 'doctor_name', 'doctor_specialization',
            'requested_date', 'requested_time', 'scheduled_date',
            'scheduled_start_time', 'scheduled_end_time', 'reason', 'symptoms',
            'priority', 'patient_notes', 'status', 'meeting_link',
            'rejection_reason', 'notes', 'completed_at', 'created_at', 'updated_at',
            'consultation_notes', 'followups'
        ]
        read_only_fields = [
            'consultation_id', 'requested_by', 'created_at', 'updated_at', 'completed_at'
        ]


class ConsultationCreateSerializer(serializers.Serializer):
    doctor_id = serializers.IntegerField(required=True)
    requested_date = serializers.DateField(required=True)
    requested_time = serializers.TimeField(required=True)
    reason = serializers.CharField(required=True, allow_blank=False)
    symptoms = serializers.CharField(required=False, allow_blank=True, default='')
    priority = serializers.ChoiceField(choices=UrgencyLevel.choices, default=UrgencyLevel.ROUTINE)
    patient_notes = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_doctor_id(self, value):
        doctor = Doctor.objects.filter(doctor_id=value).first()
        if not doctor:
            raise serializers.ValidationError("Invalid Doctor selected.")
        return value

    def validate_requested_time(self, value):
        valid, st, _ = is_valid_telemedicine_slot(value)
        if not valid:
            raise serializers.ValidationError(
                "Invalid consultation slot. Please select one of the allowed 30-minute fixed time slots."
            )
        return st


class ConsultationScheduleSerializer(serializers.Serializer):
    scheduled_date = serializers.DateField(required=True)
    scheduled_start_time = serializers.TimeField(required=True)
    scheduled_end_time = serializers.TimeField(required=False)
    meeting_link = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, data):
        valid, st, et = is_valid_telemedicine_slot(data['scheduled_start_time'], data.get('scheduled_end_time'))
        if not valid:
            raise serializers.ValidationError(
                {"scheduled_start_time": ["Invalid consultation slot. Please select one of the allowed 30-minute fixed time slots."]}
            )
        data['scheduled_start_time'] = st
        data['scheduled_end_time'] = et
        return data


class ConsultationRejectSerializer(serializers.Serializer):
    rejection_reason = serializers.CharField(required=True, allow_blank=False)


# ========================================================
# HOME VISIT / PATIENT VISIT TEAM SERIALIZERS
# ========================================================

from care_coordination.models import (
    HomeVisitSchedule,
    HomeVisitOccurrence,
    HomeVisitSummary,
    VisitSymptom,
    ScheduleFrequency,
    ScheduleStatus,
    VisitType,
    OccurrenceStatus,
)
from accounts.models import Nurse, RegistrationStatus


def is_working_day(target_date):
    """
    Returns True if target_date is a working day (Monday through Saturday, weekday 0-5).
    Sunday (weekday 6) is a permanent non-working day for Home Visits.
    """
    return target_date.weekday() != 6


def format_custom_days_display(custom_days):
    """
    Formats custom days list, e.g. ['Monday', 'Wednesday', 'Friday'] -> 'Mon, Wed & Fri'
    """
    if not custom_days:
        return ""
    day_abbrevs = {
        'monday': 'Mon', 'mon': 'Mon',
        'tuesday': 'Tue', 'tue': 'Tue',
        'wednesday': 'Wed', 'wed': 'Wed',
        'thursday': 'Thu', 'thu': 'Thu',
        'friday': 'Fri', 'fri': 'Fri',
        'saturday': 'Sat', 'sat': 'Sat',
        'sunday': 'Sun', 'sun': 'Sun',
    }
    day_order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    formatted = []
    for d in custom_days:
        clean_d = str(d).strip().lower()
        abbrev = day_abbrevs.get(clean_d, str(d))
        if abbrev in day_order and abbrev not in formatted:
            formatted.append(abbrev)
    formatted.sort(key=lambda x: day_order.index(x) if x in day_order else 99)
    if not formatted:
        return ", ".join([str(d) for d in custom_days])
    if len(formatted) == 1:
        return formatted[0]
    if len(formatted) == 2:
        return f"{formatted[0]} & {formatted[1]}"
    return f"{', '.join(formatted[:-1])} & {formatted[-1]}"


def format_frequency_display(frequency, custom_days=None):
    if frequency == ScheduleFrequency.CUSTOM or frequency == 'Custom':
        if custom_days:
            return f"Custom — {format_custom_days_display(custom_days)}"
        return "Custom"
    if frequency in [ScheduleFrequency.EVERY_DAY, 'Daily', 'Every Day']:
        return "Every Day"
    if frequency in [ScheduleFrequency.EVERY_2_WEEKS, ScheduleFrequency.FORTNIGHTLY, 'Every 2 Weeks', 'Biweekly']:
        return "Every 2 Weeks"
    return frequency


def validate_custom_days_selection(custom_days):
    """
    Validates custom_days array:
    - At least one working day must be selected.
    - Sunday is strictly disallowed.
    """
    if not custom_days or len(custom_days) == 0:
        raise serializers.ValidationError("At least one working day must be selected for Custom frequency.")

    valid_days = {'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 0, 1, 2, 3, 4, 5, '0', '1', '2', '3', '4', '5'}
    normalized_days = []
    for day in custom_days:
        clean_day = str(day).strip().lower()
        if clean_day in ['sunday', 'sun', '6', 6]:
            raise serializers.ValidationError("Sunday is a non-working day and cannot be selected for Home Visits.")
        if clean_day not in valid_days:
            raise serializers.ValidationError(f"Invalid weekday: '{day}'. Please select Monday through Saturday.")
        if clean_day not in normalized_days:
            normalized_days.append(clean_day)

    if len(normalized_days) == 0:
        raise serializers.ValidationError("At least one working day must be selected for Custom frequency.")
    return custom_days


class VisitSymptomSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='symptom_name')

    class Meta:
        model = VisitSymptom
        fields = ['symptom_id', 'name', 'symptom_name', 'severity']


class HomeVisitSummarySerializer(serializers.ModelSerializer):
    nurse_name = serializers.CharField(source='nurse.name', read_only=True)
    symptoms = VisitSymptomSerializer(source='visitsymptom_set', many=True, read_only=True)

    class Meta:
        model = HomeVisitSummary
        fields = [
            'summary_id', 'occurrence', 'nurse', 'nurse_name',
            'blood_pressure', 'pulse', 'temperature', 'oxygen_level',
            'treatment_notes', 'next_visit_recommendation',
            'recorded_at', 'updated_at', 'symptoms'
        ]
        read_only_fields = ['summary_id', 'nurse', 'recorded_at', 'updated_at']


class HomeVisitOccurrenceSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    patient_reg_id = serializers.CharField(source='patient.registration_id', read_only=True)
    patient_phone = serializers.CharField(source='patient.phone', read_only=True)
    patient_place = serializers.CharField(source='patient.place', read_only=True)
    patient_panchayath = serializers.CharField(source='patient.panchayath', read_only=True)
    location = serializers.SerializerMethodField()
    allocated_nurse_name = serializers.SerializerMethodField()
    visiting_doctor_name = serializers.SerializerMethodField()
    team_status = serializers.SerializerMethodField()
    is_team_assigned = serializers.SerializerMethodField()
    team_summary = serializers.SerializerMethodField()
    frequency = serializers.SerializerMethodField()
    frequency_display = serializers.SerializerMethodField()
    summary = HomeVisitSummarySerializer(source='homevisitsummary', read_only=True)

    class Meta:
        model = HomeVisitOccurrence
        fields = [
            'occurrence_id', 'schedule', 'patient', 'patient_name',
            'patient_reg_id', 'patient_phone', 'patient_place', 'patient_panchayath',
            'location', 'scheduled_date', 'visit_type', 'urgency_level', 'status',
            'allocated_nurse', 'allocated_nurse_name',
            'visiting_doctor', 'visiting_doctor_name',
            'is_doctor_customized',
            'frequency', 'frequency_display',
            'team_status', 'is_team_assigned', 'team_summary',
            'notes', 'summary', 'updated_at'
        ]
        read_only_fields = ['occurrence_id', 'schedule', 'updated_at']

    def get_location(self, obj):
        p = obj.patient
        if p.house_name and p.place and p.house_name != 'N/A' and p.place != 'N/A':
            return f"{p.house_name}, {p.place}"
        return p.panchayath or "Community Care Area"

    def get_allocated_nurse_name(self, obj):
        return obj.allocated_nurse.name if obj.allocated_nurse else None

    def get_visiting_doctor_name(self, obj):
        return f"Dr. {obj.visiting_doctor.name}" if obj.visiting_doctor else None

    def get_frequency(self, obj):
        return obj.schedule.frequency if obj.schedule else "One-Time"

    def get_frequency_display(self, obj):
        if obj.schedule:
            return format_frequency_display(obj.schedule.frequency, obj.schedule.custom_days)
        return "One-Time Visit"

    def get_team_status(self, obj):
        if obj.allocated_nurse and obj.visiting_doctor:
            return "Team Assigned"
        elif obj.allocated_nurse and not obj.visiting_doctor:
            return "Nurse Assigned (Doctor Pending)"
        elif not obj.allocated_nurse and obj.visiting_doctor:
            return "Doctor Assigned (Nurse Pending)"
        else:
            return "Unassigned"

    def get_is_team_assigned(self, obj):
        return bool(obj.allocated_nurse and obj.visiting_doctor)

    def get_team_summary(self, obj):
        nurse_part = f"Nurse: {obj.allocated_nurse.name}" if obj.allocated_nurse else "Nurse: Unallocated"
        doctor_part = f"Doctor: Dr. {obj.visiting_doctor.name}" if obj.visiting_doctor else "Doctor: Unassigned"
        return f"{nurse_part} | {doctor_part}"


class HomeVisitScheduleSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    patient_reg_id = serializers.CharField(source='patient.registration_id', read_only=True)
    nurse_name = serializers.CharField(source='nurse.name', read_only=True)
    default_visiting_doctor_name = serializers.SerializerMethodField()
    frequency_display = serializers.SerializerMethodField()

    class Meta:
        model = HomeVisitSchedule
        fields = [
            'schedule_id', 'patient', 'patient_name', 'patient_reg_id',
            'nurse', 'nurse_name', 'frequency', 'custom_days', 'frequency_display',
            'default_visiting_doctor_name', 'start_date', 'status', 'updated_at'
        ]
        read_only_fields = ['schedule_id', 'nurse', 'updated_at']

    def get_default_visiting_doctor_name(self, obj):
        if obj.patient.reviewed_by_doctor:
            return f"Dr. {obj.patient.reviewed_by_doctor.name}"
        return None

    def get_frequency_display(self, obj):
        return format_frequency_display(obj.frequency, obj.custom_days)


class HomeVisitScheduleCreateSerializer(serializers.Serializer):
    patient_id = serializers.IntegerField(required=True)
    frequency = serializers.ChoiceField(choices=ScheduleFrequency.choices, default=ScheduleFrequency.WEEKLY)
    custom_days = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list
    )
    start_date = serializers.DateField(required=False)

    def validate_patient_id(self, value):
        patient = Patient.objects.filter(patient_id=value).first()
        if not patient:
            raise serializers.ValidationError("Patient not found.")
        if patient.registration_status != RegistrationStatus.APPROVED:
            raise serializers.ValidationError("Patient is not eligible for Home Visit scheduling. Only approved patients can be scheduled.")
        return value

    def validate_start_date(self, value):
        if value and value.weekday() == 6:  # Sunday
            raise serializers.ValidationError("Sunday is a non-working day and cannot be selected for Home Visits.")
        return value

    def validate(self, data):
        freq = data.get('frequency', ScheduleFrequency.WEEKLY)
        custom_days = data.get('custom_days', [])
        if freq == ScheduleFrequency.CUSTOM or freq == 'Custom':
            data['custom_days'] = validate_custom_days_selection(custom_days)
        return data


class HomeVisitFrequencyChangeSerializer(serializers.Serializer):
    frequency = serializers.ChoiceField(choices=ScheduleFrequency.choices, required=True)
    custom_days = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list
    )
    effective_date = serializers.DateField(required=False)
    reason = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_effective_date(self, value):
        if value and value.weekday() == 6:  # Sunday
            raise serializers.ValidationError("Sunday is a non-working day and cannot be selected for Home Visits.")
        return value

    def validate(self, data):
        freq = data.get('frequency')
        custom_days = data.get('custom_days', [])
        if freq == ScheduleFrequency.CUSTOM or freq == 'Custom':
            data['custom_days'] = validate_custom_days_selection(custom_days)
        return data


class NurseAssignDoctorSerializer(serializers.Serializer):
    doctor_id = serializers.IntegerField(required=True)

    def validate_doctor_id(self, value):
        from accounts.models import Doctor, VerificationStatus
        doctor = Doctor.objects.filter(doctor_id=value).first()
        if not doctor:
            raise serializers.ValidationError("Selected Doctor does not exist.")
        if not doctor.user.is_active:
            raise serializers.ValidationError("Selected Doctor account is inactive.")
        if doctor.verification_status != VerificationStatus.APPROVED:
            raise serializers.ValidationError("Selected Doctor is not approved.")
        return value


class NurseCompleteVisitSerializer(serializers.Serializer):
    blood_pressure = serializers.CharField(required=False, allow_blank=True, default='N/A')
    pulse = serializers.IntegerField(required=False, allow_null=True)
    temperature = serializers.FloatField(required=False, allow_null=True)
    oxygen_level = serializers.IntegerField(required=False, allow_null=True)
    treatment_notes = serializers.CharField(required=False, allow_blank=True, default='')
    next_visit_recommendation = serializers.DateField(required=False, allow_null=True)
    symptoms = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list
    )


class UrgentVisitRequestSerializer(serializers.Serializer):
    date = serializers.DateField(required=False)
    urgency_level = serializers.ChoiceField(choices=UrgencyLevel.choices, default=UrgencyLevel.ROUTINE)
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    reason = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_date(self, value):
        if value and value.weekday() == 6:  # Sunday
            raise serializers.ValidationError("Sunday is a non-working day and cannot be selected for Home Visits.")
        return value


