from django.contrib import admin
from .models import (
    CaregiverPatientAssignment,
    TelemedicineConsultation,
    HomeVisitSchedule,
    HomeVisitOccurrence,
    HomeVisitSummary,
    VisitSymptom,
)


@admin.register(CaregiverPatientAssignment)
class CaregiverPatientAssignmentAdmin(admin.ModelAdmin):
    list_display = ('assignment_id', 'caregiver', 'patient', 'assigned_by_nurse', 'status', 'assigned_at', 'ended_at')
    list_filter = ('status',)
    search_fields = ('caregiver__name', 'patient__name', 'assigned_by_nurse__name')


@admin.register(TelemedicineConsultation)
class TelemedicineConsultationAdmin(admin.ModelAdmin):
    list_display = ('consultation_id', 'patient', 'doctor', 'requested_by', 'requested_datetime', 'scheduled_datetime', 'status')
    list_filter = ('status',)
    search_fields = ('patient__name', 'doctor__name', 'requested_by__email')


@admin.register(HomeVisitSchedule)
class HomeVisitScheduleAdmin(admin.ModelAdmin):
    list_display = ('schedule_id', 'patient', 'doctor', 'frequency', 'start_date', 'status', 'updated_at')
    list_filter = ('frequency', 'status')
    search_fields = ('patient__name', 'doctor__name')


@admin.register(HomeVisitOccurrence)
class HomeVisitOccurrenceAdmin(admin.ModelAdmin):
    list_display = ('occurrence_id', 'schedule', 'patient', 'scheduled_date', 'visit_type', 'urgency_level', 'status', 'allocated_nurse')
    list_filter = ('visit_type', 'urgency_level', 'status')
    search_fields = ('patient__name', 'allocated_nurse__name')


@admin.register(HomeVisitSummary)
class HomeVisitSummaryAdmin(admin.ModelAdmin):
    list_display = ('summary_id', 'occurrence', 'nurse', 'blood_pressure', 'pulse', 'temperature', 'oxygen_level', 'recorded_at')
    search_fields = ('nurse__name', 'occurrence__patient__name')


@admin.register(VisitSymptom)
class VisitSymptomAdmin(admin.ModelAdmin):
    list_display = ('symptom_id', 'summary', 'symptom_name', 'severity')
    search_fields = ('symptom_name',)
