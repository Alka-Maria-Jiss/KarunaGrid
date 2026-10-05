from django.urls import path
from .views import (
    DoctorPrescriptionsView,
    DoctorLabReportsView,
    DoctorNutritionView,
    DoctorPatientDiagnosesView,
    DoctorPatientAllergiesView,
    DoctorPatientConditionsView,
    NurseLabReportsView,
)

urlpatterns = [
    path('doctor/prescriptions/', DoctorPrescriptionsView.as_view(), name='medical_records_doctor_prescriptions'),
    path('doctor/nutrition/', DoctorNutritionView.as_view(), name='medical_records_doctor_nutrition'),
    path('doctor/lab-reports/', DoctorLabReportsView.as_view(), name='medical_records_doctor_lab_reports'),
    path('doctor/lab-reports/<int:report_id>/review/', DoctorLabReportsView.as_view(), name='medical_records_doctor_lab_reports_review'),
    path('doctor/lab-reports/upload/', DoctorLabReportsView.as_view(), name='medical_records_doctor_lab_reports_upload'),
    path('doctor/patients/<int:patient_id>/diagnoses/', DoctorPatientDiagnosesView.as_view(), name='medical_records_doctor_patient_diagnoses'),
    path('doctor/patients/<int:patient_id>/allergies/', DoctorPatientAllergiesView.as_view(), name='medical_records_doctor_patient_allergies'),
    path('doctor/patients/<int:patient_id>/chronic-conditions/', DoctorPatientConditionsView.as_view(), name='medical_records_doctor_patient_conditions'),

    # Phase 1 Nurse Lab Reports
    path('nurse/lab-reports/', NurseLabReportsView.as_view(), name='medical_records_nurse_lab_reports'),
    path('nurse/lab-reports/<int:report_id>/review/', NurseLabReportsView.as_view(), name='medical_records_nurse_lab_reports_review'),
]
