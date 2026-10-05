from django.contrib import admin
from .models import (
    PatientDiagnosis,
    PatientAllergy,
    PatientChronicCondition,
    MedicalDocument,
    LabReport,
    Prescription,
    PrescriptionItem,
    NutritionPlan,
)


@admin.register(PatientDiagnosis)
class PatientDiagnosisAdmin(admin.ModelAdmin):
    list_display = ('diagnosis_id', 'patient', 'doctor', 'diagnosed_date', 'updated_at')
    search_fields = ('patient__name', 'doctor__name', 'diagnosis_text')


@admin.register(PatientAllergy)
class PatientAllergyAdmin(admin.ModelAdmin):
    list_display = ('allergy_id', 'patient', 'allergy_name', 'severity', 'updated_at')
    search_fields = ('patient__name', 'allergy_name')


@admin.register(PatientChronicCondition)
class PatientChronicConditionAdmin(admin.ModelAdmin):
    list_display = ('condition_id', 'patient', 'condition_name', 'updated_at')
    search_fields = ('patient__name', 'condition_name')


@admin.register(MedicalDocument)
class MedicalDocumentAdmin(admin.ModelAdmin):
    list_display = ('document_id', 'patient', 'document_type', 'uploaded_at', 'updated_at')
    search_fields = ('patient__name', 'document_type')


@admin.register(LabReport)
class LabReportAdmin(admin.ModelAdmin):
    list_display = ('report_id', 'patient', 'uploaded_by', 'review_status', 'reviewed_by', 'uploaded_at')
    list_filter = ('review_status',)
    search_fields = ('patient__name', 'uploaded_by__email')


@admin.register(Prescription)
class PrescriptionAdmin(admin.ModelAdmin):
    list_display = ('prescription_id', 'patient', 'doctor', 'version_number', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('patient__name', 'doctor__name')


@admin.register(PrescriptionItem)
class PrescriptionItemAdmin(admin.ModelAdmin):
    list_display = ('item_id', 'prescription', 'medicine_name', 'dosage', 'frequency', 'duration_days', 'change_type')
    list_filter = ('change_type',)
    search_fields = ('medicine_name',)


@admin.register(NutritionPlan)
class NutritionPlanAdmin(admin.ModelAdmin):
    list_display = ('plan_id', 'patient', 'doctor', 'version_number', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('patient__name', 'doctor__name')
