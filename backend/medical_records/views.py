import os
import uuid
from django.conf import settings
from django.core.files.storage import default_storage
from django.db import transaction
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from accounts.models import Role, Doctor, Patient
from medical_records.models import (
    Prescription,
    PrescriptionItem,
    LabReport,
    NutritionPlan,
    ReviewStatus,
    ActiveSupersededStatus,
    ChangeType,
    PatientDiagnosis,
    PatientAllergy,
    PatientChronicCondition
)


def get_authenticated_doctor(request):
    if request.user.role != Role.DOCTOR:
        return None
    return getattr(request.user, 'doctor', None) or Doctor.objects.filter(user=request.user).first()


class DoctorPrescriptionsView(APIView):
    """
    Prescription management for authenticated Doctor:
    GET: List prescriptions (can filter by patient_id or status).
    POST: Atomically create a new prescription version with concurrency protection.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        doctor = get_authenticated_doctor(request)
        if not doctor:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        patient_id = request.query_params.get('patient_id')
        status_param = request.query_params.get('status')

        qs = Prescription.objects.all().order_by('-created_at')
        if patient_id:
            qs = qs.filter(patient_id=patient_id)
        if status_param and status_param.lower() != 'all':
            qs = qs.filter(status__iexact=status_param)

        results = []
        for rx in qs:
            items_data = [
                {
                    "item_id": it.item_id,
                    "medicine_name": it.medicine_name,
                    "dosage": it.dosage,
                    "frequency": it.frequency,
                    "duration_days": it.duration_days,
                    "change_type": it.change_type,
                }
                for it in rx.prescriptionitem_set.all()
            ]
            results.append({
                "prescription_id": rx.prescription_id,
                "patient_id": rx.patient.patient_id,
                "patient_name": rx.patient.name,
                "patient_reg_id": rx.patient.registration_id,
                "doctor_name": rx.doctor.name if rx.doctor else doctor.name,
                "version_number": rx.version_number,
                "status": rx.status,
                "created_at": rx.created_at.strftime('%d %b %Y, %H:%M'),
                "items": items_data,
            })

        return Response(results, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        doctor = get_authenticated_doctor(request)
        if not doctor:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        patient_id = request.data.get('patient_id')
        if not patient_id:
            return Response({"errors": {"patient_id": ["Patient ID is required."]}}, status=status.HTTP_400_BAD_REQUEST)

        patient = Patient.objects.filter(patient_id=patient_id).first()
        if not patient:
            return Response({"errors": {"patient_id": ["Patient not found."]}}, status=status.HTTP_404_NOT_FOUND)

        items = request.data.get('items', [])
        if not items or not isinstance(items, list):
            return Response({"errors": {"items": ["At least one prescription medicine item is required."]}}, status=status.HTTP_400_BAD_REQUEST)

        # Validate items and change types
        valid_change_types = [c[0] for c in ChangeType.choices]
        processed_items = []
        for it in items:
            med_name = str(it.get('medicine_name', '')).strip()
            if not med_name:
                continue
            dosage = str(it.get('dosage', '')).strip()
            frequency = str(it.get('frequency', '')).strip()
            duration_days = it.get('duration_days')
            try:
                duration_days = int(duration_days) if duration_days is not None and str(duration_days).strip() != '' else None
            except (ValueError, TypeError):
                duration_days = None

            change_type = it.get('change_type', ChangeType.NEW)
            if change_type not in valid_change_types:
                change_type = ChangeType.NEW

            processed_items.append({
                "medicine_name": med_name,
                "dosage": dosage,
                "frequency": frequency,
                "duration_days": duration_days,
                "change_type": change_type,
            })

        if not processed_items:
            return Response({"errors": {"items": ["At least one valid medicine name is required."]}}, status=status.HTTP_400_BAD_REQUEST)

        # Concurrency-safe atomic transaction
        with transaction.atomic():
            # Lock patient's existing prescriptions
            list(Prescription.objects.select_for_update().filter(patient=patient))

            # Determine next version safely server-side
            latest_rx = Prescription.objects.filter(patient=patient).order_by('-version_number').first()
            new_version = (latest_rx.version_number + 1) if latest_rx else 1

            # Mark all currently Active prescriptions as Superseded
            Prescription.objects.filter(
                patient=patient,
                status=ActiveSupersededStatus.ACTIVE
            ).update(status=ActiveSupersededStatus.SUPERSEDED, updated_at=timezone.now())

            # Create new Active prescription
            new_rx = Prescription.objects.create(
                patient=patient,
                doctor=doctor,
                version_number=new_version,
                status=ActiveSupersededStatus.ACTIVE,
            )

            # Create isolated prescription items for this new version
            for it in processed_items:
                PrescriptionItem.objects.create(
                    prescription=new_rx,
                    medicine_name=it["medicine_name"],
                    dosage=it["dosage"],
                    frequency=it["frequency"],
                    duration_days=it["duration_days"],
                    change_type=it["change_type"],
                )

        return Response({
            "message": f"Prescription v{new_version} created successfully for {patient.name}.",
            "prescription_id": new_rx.prescription_id,
            "version_number": new_version,
            "status": new_rx.status,
        }, status=status.HTTP_201_CREATED)


class DoctorNutritionView(APIView):
    """
    Nutrition & Meal plans management for Doctor:
    GET: List nutrition plans (can filter by patient_id).
    POST: Atomically create a new nutrition plan version with concurrency protection.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        doctor = get_authenticated_doctor(request)
        if not doctor:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        patient_id = request.query_params.get('patient_id')
        qs = NutritionPlan.objects.all().order_by('-created_at')
        if patient_id:
            qs = qs.filter(patient_id=patient_id)

        results = [
            {
                "plan_id": np.plan_id,
                "patient_id": np.patient.patient_id,
                "patient_name": np.patient.name,
                "patient_reg_id": np.patient.registration_id,
                "version_number": np.version_number,
                "dietary_recommendations": np.dietary_recommendations,
                "special_instructions": np.special_instructions,
                "status": np.status,
                "created_at": np.created_at.strftime('%d %b %Y, %H:%M'),
                "doctor_name": np.doctor.name if np.doctor else doctor.name,
            }
            for np in qs
        ]
        return Response(results, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        doctor = get_authenticated_doctor(request)
        if not doctor:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        patient_id = request.data.get('patient_id')
        if not patient_id:
            return Response({"errors": {"patient_id": ["Patient ID is required."]}}, status=status.HTTP_400_BAD_REQUEST)

        patient = Patient.objects.filter(patient_id=patient_id).first()
        if not patient:
            return Response({"errors": {"patient_id": ["Patient not found."]}}, status=status.HTTP_404_NOT_FOUND)

        dietary_recommendations = request.data.get('dietary_recommendations', '').strip()
        special_instructions = request.data.get('special_instructions', '').strip()

        if not dietary_recommendations and not special_instructions:
            return Response({"errors": {"dietary_recommendations": ["At least dietary recommendations or special instructions are required."]}}, status=status.HTTP_400_BAD_REQUEST)

        # Concurrency-safe atomic transaction
        with transaction.atomic():
            # Lock patient's existing nutrition plans
            list(NutritionPlan.objects.select_for_update().filter(patient=patient))

            latest_np = NutritionPlan.objects.filter(patient=patient).order_by('-version_number').first()
            new_version = (latest_np.version_number + 1) if latest_np else 1

            # Mark all currently Active plans as Superseded
            NutritionPlan.objects.filter(
                patient=patient,
                status=ActiveSupersededStatus.ACTIVE
            ).update(status=ActiveSupersededStatus.SUPERSEDED, updated_at=timezone.now())

            new_plan = NutritionPlan.objects.create(
                patient=patient,
                doctor=doctor,
                version_number=new_version,
                dietary_recommendations=dietary_recommendations,
                special_instructions=special_instructions,
                status=ActiveSupersededStatus.ACTIVE,
            )

        return Response({
            "message": f"Nutrition plan v{new_version} created successfully for {patient.name}.",
            "plan_id": new_plan.plan_id,
            "version_number": new_version,
            "status": new_plan.status,
        }, status=status.HTTP_201_CREATED)


class DoctorLabReportsView(APIView):
    """
    Diagnostic laboratory reports review for Doctor:
    GET: List lab reports with review statuses.
    POST / review: Add clinical remarks and mark as Reviewed.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        doctor = get_authenticated_doctor(request)
        if not doctor:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        patient_id = request.query_params.get('patient_id')
        status_param = request.query_params.get('status')

        qs = LabReport.objects.select_related('patient', 'reviewed_by', 'reviewed_by__doctor').all().order_by('-uploaded_at')
        if patient_id:
            qs = qs.filter(patient_id=patient_id)
        if status_param and status_param.lower() != 'all':
            qs = qs.filter(review_status__iexact=status_param)

        results = []
        for lr in qs:
            doc_name = None
            if lr.reviewed_by:
                if hasattr(lr.reviewed_by, 'doctor') and lr.reviewed_by.doctor:
                    doc_name = lr.reviewed_by.doctor.name
                else:
                    doc_name = lr.reviewed_by.email

            results.append({
                "report_id": lr.report_id,
                "patient_id": lr.patient.patient_id,
                "patient_name": lr.patient.name,
                "patient_reg_id": lr.patient.registration_id,
                "investigation_name": lr.investigation_name or "Diagnostic Laboratory Report",
                "report_date": lr.report_date.strftime('%d %b %Y') if lr.report_date else (lr.uploaded_at.strftime('%d %b %Y') if lr.uploaded_at else "N/A"),
                "review_status": lr.review_status,
                "reviewed_by": doc_name,
                "reviewed_at": lr.reviewed_at.strftime('%d %b %Y, %H:%M') if lr.reviewed_at else None,
                "remarks": lr.remarks,
                "file_path": lr.file_path,
                "uploaded_at": lr.uploaded_at.strftime('%d %b %Y, %H:%M') if lr.uploaded_at else "N/A",
                "view_url": f"/api/auth/documents/view/?type=lab_report&id={lr.report_id}",
            })

        return Response(results, status=status.HTTP_200_OK)

    def post(self, request, report_id=None, *args, **kwargs):
        doctor = get_authenticated_doctor(request)
        if not doctor:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        rep_id = report_id or request.data.get('report_id')
        if not rep_id:
            return Response({"errors": {"report_id": ["Report ID is required for review."]}}, status=status.HTTP_400_BAD_REQUEST)

        report = LabReport.objects.filter(report_id=rep_id).first()
        if not report:
            return Response({"detail": "Laboratory report not found."}, status=status.HTTP_404_NOT_FOUND)

        remarks_input = request.data.get('remarks')
        remarks = remarks_input.strip() if (remarks_input and isinstance(remarks_input, str)) else None

        report.review_status = ReviewStatus.REVIEWED
        report.remarks = remarks
        report.reviewed_by = request.user
        report.reviewed_at = timezone.now()
        report.save(update_fields=['review_status', 'remarks', 'reviewed_by', 'reviewed_at', 'updated_at'])

        doc_name = doctor.name or request.user.email

        return Response({
            "message": f"Laboratory report ({report.investigation_name or 'Investigation'}) reviewed successfully.",
            "report_id": report.report_id,
            "investigation_name": report.investigation_name,
            "review_status": report.review_status,
            "reviewed_by": doc_name,
            "reviewed_at": report.reviewed_at.strftime('%d %b %Y, %H:%M'),
            "remarks": report.remarks,
        }, status=status.HTTP_200_OK)


class DoctorPatientDiagnosesView(APIView):
    """
    Diagnoses management for selected patient:
    GET: List all diagnoses for patient.
    POST: Add new diagnosis (storing diagnosing doctor and date).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, patient_id, *args, **kwargs):
        doctor = get_authenticated_doctor(request)
        if not doctor:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        patient = Patient.objects.filter(patient_id=patient_id).first()
        if not patient:
            return Response({"detail": "Patient record not found."}, status=status.HTTP_404_NOT_FOUND)

        diagnoses = [
            {
                "id": d.diagnosis_id,
                "text": d.diagnosis_text.lstrip(': ').strip() if d.diagnosis_text else "",
                "doctor": d.doctor.name if d.doctor else "Doctor",
                "date": d.diagnosed_date.strftime('%d %b %Y') if d.diagnosed_date else d.updated_at.strftime('%d %b %Y'),
            }
            for d in PatientDiagnosis.objects.filter(patient=patient).order_by('-diagnosed_date', '-updated_at')
        ]
        return Response(diagnoses, status=status.HTTP_200_OK)

    def post(self, request, patient_id, *args, **kwargs):
        doctor = get_authenticated_doctor(request)
        if not doctor:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        patient = Patient.objects.filter(patient_id=patient_id).first()
        if not patient:
            return Response({"detail": "Patient record not found."}, status=status.HTTP_404_NOT_FOUND)

        diagnosis_text = request.data.get('diagnosis_text', '').lstrip(': ').strip()
        if not diagnosis_text:
            return Response({"errors": {"diagnosis_text": ["Diagnosis text is required."]}}, status=status.HTTP_400_BAD_REQUEST)

        diagnosed_date_raw = request.data.get('diagnosed_date')
        diagnosed_date = timezone.now().date()
        if diagnosed_date_raw:
            try:
                from datetime import datetime
                diagnosed_date = datetime.strptime(str(diagnosed_date_raw)[:10], '%Y-%m-%d').date()
            except (ValueError, TypeError):
                diagnosed_date = timezone.now().date()

        diagnosis = PatientDiagnosis.objects.create(
            patient=patient,
            doctor=doctor,
            diagnosis_text=diagnosis_text,
            diagnosed_date=diagnosed_date,
        )

        return Response({
            "message": f"Diagnosis recorded successfully for {patient.name}.",
            "id": diagnosis.diagnosis_id,
            "text": diagnosis.diagnosis_text.lstrip(': ').strip(),
            "doctor": doctor.name,
            "date": diagnosis.diagnosed_date.strftime('%d %b %Y'),
        }, status=status.HTTP_201_CREATED)


class DoctorPatientAllergiesView(APIView):
    """
    Allergies management for selected patient:
    GET: List all allergies for patient.
    POST: Add new allergy with severity validation ('Mild', 'Moderate', 'Severe').
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, patient_id, *args, **kwargs):
        doctor = get_authenticated_doctor(request)
        if not doctor:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        patient = Patient.objects.filter(patient_id=patient_id).first()
        if not patient:
            return Response({"detail": "Patient record not found."}, status=status.HTTP_404_NOT_FOUND)

        allergies = [
            {
                "id": a.allergy_id,
                "name": a.allergy_name,
                "severity": a.severity or "Moderate",
                "updated_at": a.updated_at.strftime('%d %b %Y'),
            }
            for a in PatientAllergy.objects.filter(patient=patient).order_by('-updated_at')
        ]
        return Response(allergies, status=status.HTTP_200_OK)

    def post(self, request, patient_id, *args, **kwargs):
        doctor = get_authenticated_doctor(request)
        if not doctor:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        patient = Patient.objects.filter(patient_id=patient_id).first()
        if not patient:
            return Response({"detail": "Patient record not found."}, status=status.HTTP_404_NOT_FOUND)

        allergy_name = request.data.get('allergy_name', '').strip()
        if not allergy_name:
            return Response({"errors": {"allergy_name": ["Allergy name is required."]}}, status=status.HTTP_400_BAD_REQUEST)

        severity = request.data.get('severity', 'Moderate').strip().capitalize()
        if severity not in ['Mild', 'Moderate', 'Severe']:
            severity = 'Moderate'

        allergy = PatientAllergy.objects.create(
            patient=patient,
            allergy_name=allergy_name,
            severity=severity,
        )

        return Response({
            "message": f"Allergy '{allergy.allergy_name}' added for {patient.name}.",
            "id": allergy.allergy_id,
            "name": allergy.allergy_name,
            "severity": allergy.severity,
            "updated_at": allergy.updated_at.strftime('%d %b %Y'),
        }, status=status.HTTP_201_CREATED)


class DoctorPatientConditionsView(APIView):
    """
    Chronic conditions management for selected patient:
    GET: List all chronic conditions for patient.
    POST: Add new chronic condition with notes.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, patient_id, *args, **kwargs):
        doctor = get_authenticated_doctor(request)
        if not doctor:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        patient = Patient.objects.filter(patient_id=patient_id).first()
        if not patient:
            return Response({"detail": "Patient record not found."}, status=status.HTTP_404_NOT_FOUND)

        conditions = [
            {
                "id": c.condition_id,
                "name": c.condition_name,
                "notes": c.notes,
                "updated_at": c.updated_at.strftime('%d %b %Y'),
            }
            for c in PatientChronicCondition.objects.filter(patient=patient).order_by('-updated_at')
        ]
        return Response(conditions, status=status.HTTP_200_OK)

    def post(self, request, patient_id, *args, **kwargs):
        doctor = get_authenticated_doctor(request)
        if not doctor:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        patient = Patient.objects.filter(patient_id=patient_id).first()
        if not patient:
            return Response({"detail": "Patient record not found."}, status=status.HTTP_404_NOT_FOUND)

        condition_name = request.data.get('condition_name', '').strip()
        if not condition_name:
            return Response({"errors": {"condition_name": ["Condition name is required."]}}, status=status.HTTP_400_BAD_REQUEST)

        notes = request.data.get('notes', '').strip()

        cond = PatientChronicCondition.objects.create(
            patient=patient,
            condition_name=condition_name,
            notes=notes if notes else None,
        )

        return Response({
            "message": f"Chronic condition '{cond.condition_name}' added for {patient.name}.",
            "id": cond.condition_id,
            "name": cond.condition_name,
            "notes": cond.notes,
            "updated_at": cond.updated_at.strftime('%d %b %Y'),
        }, status=status.HTTP_201_CREATED)


class NurseLabReportsView(APIView):
    """
    Diagnostic laboratory reports for Nurse:
    GET: List lab reports with optional status and search filters.
    POST: Review lab report and add Nurse clinical remarks.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        from accounts.views import get_authenticated_nurse
        nurse = get_authenticated_nurse(request)
        if not nurse:
            return Response({"detail": "Access restricted to Nurses only."}, status=status.HTTP_403_FORBIDDEN)

        patient_id = request.query_params.get('patient_id')
        status_param = request.query_params.get('status')

        qs = LabReport.objects.all().order_by('-uploaded_at')
        if patient_id:
            qs = qs.filter(patient_id=patient_id)
        if status_param and status_param.lower() != 'all':
            qs = qs.filter(review_status__iexact=status_param)

        results = []
        for lr in qs:
            results.append({
                "report_id": lr.report_id,
                "patient_id": lr.patient.patient_id,
                "patient_name": lr.patient.name,
                "patient_reg_id": lr.patient.registration_id,
                "report_date": lr.report_date.strftime('%d %b %Y') if lr.report_date else lr.uploaded_at.strftime('%d %b %Y'),
                "review_status": lr.review_status,
                "remarks": lr.remarks,
                "file_path": lr.file_path,
                "uploaded_at": lr.uploaded_at.strftime('%d %b %Y, %H:%M'),
                "reviewed_by": lr.reviewed_by.email if lr.reviewed_by else None,
            })

        return Response(results, status=status.HTTP_200_OK)

    def post(self, request, report_id=None, *args, **kwargs):
        from accounts.views import get_authenticated_nurse
        nurse = get_authenticated_nurse(request)
        if not nurse:
            return Response({"detail": "Access restricted to Nurses only."}, status=status.HTTP_403_FORBIDDEN)

        rep_id = report_id or request.data.get('report_id')
        if not rep_id:
            return Response({"errors": {"report_id": ["Report ID is required."]}}, status=status.HTTP_400_BAD_REQUEST)

        report = LabReport.objects.filter(report_id=rep_id).first()
        if not report:
            return Response({"detail": "Laboratory report not found."}, status=status.HTTP_404_NOT_FOUND)

        nurse_remarks = request.data.get('remarks', '').strip()
        report.review_status = ReviewStatus.REVIEWED
        report.remarks = f"Nurse {nurse.name}: {nurse_remarks}" if nurse_remarks else (report.remarks or "Reviewed by Nurse")
        report.reviewed_by = request.user
        report.save(update_fields=['review_status', 'remarks', 'reviewed_by', 'updated_at'])

        return Response({
            "message": f"Laboratory report ({report.investigation_name or 'Investigation'}) reviewed successfully by Nurse {nurse.name}.",
            "report_id": report.report_id,
            "review_status": report.review_status,
            "remarks": report.remarks,
        }, status=status.HTTP_200_OK)
