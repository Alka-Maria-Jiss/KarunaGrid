from rest_framework import serializers
from care_coordination.models import (
    TelemedicineConsultation,
    TelemedicineConsultationNote,
    TelemedicineFollowUp,
    ConsultationStatus,
    UrgencyLevel
)
from accounts.models import Patient, Doctor


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


class ConsultationScheduleSerializer(serializers.Serializer):
    scheduled_date = serializers.DateField(required=True)
    scheduled_start_time = serializers.TimeField(required=True)
    scheduled_end_time = serializers.TimeField(required=True)
    meeting_link = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, data):
        if data['scheduled_end_time'] <= data['scheduled_start_time']:
            raise serializers.ValidationError({"scheduled_end_time": ["End time must be strictly after start time."]})
        return data


class ConsultationRejectSerializer(serializers.Serializer):
    rejection_reason = serializers.CharField(required=True, allow_blank=False)
