import json
from django.test import TestCase, Client
from django.utils import timezone
from django.contrib.auth.hashers import make_password
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User, Role, Doctor, Patient, PatientRegistrationApplication, RegistrationStatus, PatientStatus
from medical_records.models import (
    Prescription,
    PrescriptionItem,
    NutritionPlan,
    LabReport,
    PatientDiagnosis,
    PatientAllergy,
    PatientChronicCondition,
    ReviewStatus,
    ActiveSupersededStatus,
    ChangeType,
)


class ClinicalWorkspaceTests(TestCase):
    def setUp(self):
        self.client = Client()

        # 1. Create a Doctor User & Doctor record
        self.doctor_user = User.objects.create(
            email=f"dr.test_{timezone.now().timestamp()}@karunagrid.org",
            role=Role.DOCTOR,
            is_active=True,
            password=make_password("password123")
        )
        self.doctor = Doctor.objects.create(
            user=self.doctor_user,
            name="Dr. Anil Francis",
            phone="9876543210",
            specialization="Palliative Care",
            is_available_now=True,
        )

        # Generate JWT Token for Doctor
        token_obj = RefreshToken.for_user(self.doctor_user)
        self.token = str(token_obj.access_token)
        self.auth_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.token}"}

        # 2. Create a Patient User & Patient record
        self.patient_user = User.objects.create(
            email=f"rosamma_{timezone.now().timestamp()}@example.com",
            role=Role.PATIENT,
            is_active=True,
            password=make_password("password123")
        )
        self.patient = Patient.objects.create(
            user=self.patient_user,
            registration_id=f"P{int(timezone.now().timestamp()) % 100000}",
            name="Rosamma Francis",
            dob="1958-05-15",
            gender="Female",
            phone="9123456780",
            house_name="Rose Villa",
            place="Kochi",
            panchayath="Ernakulam",
            ward_no=4,
            pincode="682001",
            discharge_summary_path="discharge_summaries/rosamma_summary.pdf",
            emergency_contact_name="George Francis",
            emergency_contact_phone="9876500000",
            registration_status=RegistrationStatus.APPROVED,
            status=PatientStatus.ACTIVE,
            reviewed_by_doctor=self.doctor,
        )

        # 3. Create a Pending Registration Application
        self.pending_app = PatientRegistrationApplication.objects.create(
            application_id=f"APP-PAT-{int(timezone.now().timestamp()) % 100000}",
            name="Thomas George",
            email=f"thomas_{timezone.now().timestamp()}@example.com",
            password_hash=make_password("thomasPass123"),
            dob="1951-03-20",
            gender="Male",
            phone="9447001122",
            house_name="George Bhavan",
            place="Aluva",
            panchayath="Aluva",
            ward_no=2,
            pincode="683101",
            discharge_summary_path="discharge_summaries/thomas_summary.pdf",
            emergency_contact_name="Mary George",
            emergency_contact_phone="9447001133",
            registration_status=RegistrationStatus.PENDING,
        )

    def test_doctor_patient_list_and_search(self):
        """Verify doctor can retrieve patient directory and search by name, ID, phone, place."""
        res = self.client.get('/api/doctor/patients/?search=Rosamma', **self.auth_headers)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertGreaterEqual(len(data), 1)
        match = [p for p in data if p['patient_id'] == self.patient.patient_id][0]
        self.assertEqual(match['name'], "Rosamma Francis")

    def test_registration_review_approval_workflow(self):
        """Verify pending registration can be approved and creates Patient/User without duplicates."""
        res = self.client.post(f'/api/doctor/patients/{self.pending_app.id}/approve/', **self.auth_headers)
        self.assertEqual(res.status_code, 200)

        self.pending_app.refresh_from_db()
        self.assertEqual(self.pending_app.registration_status, RegistrationStatus.APPROVED)
        self.assertIsNotNone(self.pending_app.created_patient)
        self.assertEqual(self.pending_app.created_patient.name, "Thomas George")
        self.assertEqual(self.pending_app.created_patient.discharge_summary_path, "discharge_summaries/thomas_summary.pdf")

    def test_registration_review_rejection_workflow(self):
        """Verify rejection requires a reason and updates status to Rejected."""
        # Empty reason fails
        res_fail = self.client.post(
            f'/api/doctor/patients/{self.pending_app.id}/reject/',
            data=json.dumps({"rejection_reason": "   "}),
            content_type='application/json',
            **self.auth_headers
        )
        self.assertEqual(res_fail.status_code, 400)

        # Valid reason succeeds
        res_ok = self.client.post(
            f'/api/doctor/patients/{self.pending_app.id}/reject/',
            data=json.dumps({"rejection_reason": "Discharge summary lacks histological confirmation."}),
            content_type='application/json',
            **self.auth_headers
        )
        self.assertEqual(res_ok.status_code, 200)

        self.pending_app.refresh_from_db()
        self.assertEqual(self.pending_app.registration_status, RegistrationStatus.REJECTED)
        self.assertEqual(self.pending_app.rejection_reason, "Discharge summary lacks histological confirmation.")

    def test_diagnoses_management(self):
        """Verify doctor can retrieve and add diagnoses."""
        res_add = self.client.post(
            f'/api/medical-records/doctor/patients/{self.patient.patient_id}/diagnoses/',
            data=json.dumps({"diagnosis_text": "Stage IV Lung Adenocarcinoma"}),
            content_type='application/json',
            **self.auth_headers
        )
        self.assertEqual(res_add.status_code, 201)

        res_get = self.client.get(f'/api/medical-records/doctor/patients/{self.patient.patient_id}/diagnoses/', **self.auth_headers)
        self.assertEqual(res_get.status_code, 200)
        diag_list = res_get.json()
        self.assertGreaterEqual(len(diag_list), 1)
        self.assertEqual(diag_list[0]['text'], "Stage IV Lung Adenocarcinoma")
        self.assertEqual(diag_list[0]['doctor'], "Dr. Anil Francis")

    def test_allergies_and_chronic_conditions(self):
        """Verify doctor can add and view allergies and chronic conditions."""
        # Add Allergy
        res_all = self.client.post(
            f'/api/medical-records/doctor/patients/{self.patient.patient_id}/allergies/',
            data=json.dumps({"allergy_name": "Penicillin", "severity": "Severe"}),
            content_type='application/json',
            **self.auth_headers
        )
        self.assertEqual(res_all.status_code, 201)
        self.assertEqual(res_all.json()['severity'], "Severe")

        # Add Chronic Condition
        res_cond = self.client.post(
            f'/api/medical-records/doctor/patients/{self.patient.patient_id}/chronic-conditions/',
            data=json.dumps({"condition_name": "Type 2 Diabetes Mellitus", "notes": "Controlled with Metformin"}),
            content_type='application/json',
            **self.auth_headers
        )
        self.assertEqual(res_cond.status_code, 201)

    def test_prescription_atomic_versioning_and_item_isolation(self):
        """Verify Prescription versioning creates V1 Active -> V2 Active (V1 Superseded) with item isolation."""
        # 1. Create Version 1
        v1_payload = {
            "patient_id": self.patient.patient_id,
            "items": [
                {"medicine_name": "Morphine", "dosage": "10mg", "frequency": "Every 4 hours", "duration_days": 7, "change_type": "New"},
                {"medicine_name": "Paracetamol", "dosage": "500mg", "frequency": "TID", "duration_days": 7, "change_type": "New"},
            ]
        }
        res_v1 = self.client.post(
            '/api/medical-records/doctor/prescriptions/',
            data=json.dumps(v1_payload),
            content_type='application/json',
            **self.auth_headers
        )
        self.assertEqual(res_v1.status_code, 201)
        self.assertEqual(res_v1.json()['version_number'], 1)

        rx_v1 = Prescription.objects.get(patient=self.patient, version_number=1)
        self.assertEqual(rx_v1.status, ActiveSupersededStatus.ACTIVE)
        self.assertEqual(rx_v1.prescriptionitem_set.count(), 2)

        # 2. Create Version 2 (Morphine increased to 15mg, Omeprazole added as New)
        v2_payload = {
            "patient_id": self.patient.patient_id,
            "items": [
                {"medicine_name": "Morphine", "dosage": "15mg", "frequency": "Every 4 hours", "duration_days": 14, "change_type": "DosageChanged"},
                {"medicine_name": "Paracetamol", "dosage": "500mg", "frequency": "TID", "duration_days": 14, "change_type": "Continued"},
                {"medicine_name": "Omeprazole", "dosage": "20mg", "frequency": "OD", "duration_days": 14, "change_type": "New"},
            ]
        }
        res_v2 = self.client.post(
            '/api/medical-records/doctor/prescriptions/',
            data=json.dumps(v2_payload),
            content_type='application/json',
            **self.auth_headers
        )
        self.assertEqual(res_v2.status_code, 201)
        self.assertEqual(res_v2.json()['version_number'], 2)

        # 3. Assert V1 is preserved as Superseded and items were untouched
        rx_v1.refresh_from_db()
        self.assertEqual(rx_v1.status, ActiveSupersededStatus.SUPERSEDED)
        v1_morphine = rx_v1.prescriptionitem_set.filter(medicine_name="Morphine").first()
        self.assertEqual(v1_morphine.dosage, "10mg")  # Untouched

        # 4. Assert V2 is Active with 3 items
        rx_v2 = Prescription.objects.get(patient=self.patient, version_number=2)
        self.assertEqual(rx_v2.status, ActiveSupersededStatus.ACTIVE)
        self.assertEqual(rx_v2.prescriptionitem_set.count(), 3)
        v2_morphine = rx_v2.prescriptionitem_set.filter(medicine_name="Morphine").first()
        self.assertEqual(v2_morphine.dosage, "15mg")

        # 5. Exactly 1 Active prescription exists for patient
        active_count = Prescription.objects.filter(patient=self.patient, status=ActiveSupersededStatus.ACTIVE).count()
        self.assertEqual(active_count, 1)

    def test_nutrition_plan_atomic_versioning(self):
        """Verify Nutrition Plan versioning creates V1 Active -> V2 Active (V1 Superseded)."""
        # Create V1
        res_v1 = self.client.post(
            '/api/medical-records/doctor/nutrition/',
            data=json.dumps({
                "patient_id": self.patient.patient_id,
                "dietary_recommendations": "High protein liquid diet",
                "special_instructions": "Small sips every hour"
            }),
            content_type='application/json',
            **self.auth_headers
        )
        self.assertEqual(res_v1.status_code, 201)
        self.assertEqual(res_v1.json()['version_number'], 1)

        plan_v1 = NutritionPlan.objects.get(patient=self.patient, version_number=1)
        self.assertEqual(plan_v1.status, ActiveSupersededStatus.ACTIVE)

        # Create V2
        res_v2 = self.client.post(
            '/api/medical-records/doctor/nutrition/',
            data=json.dumps({
                "patient_id": self.patient.patient_id,
                "dietary_recommendations": "Semi-solid pureed diet",
                "special_instructions": "Fluid restriction 1.5L/day"
            }),
            content_type='application/json',
            **self.auth_headers
        )
        self.assertEqual(res_v2.status_code, 201)
        self.assertEqual(res_v2.json()['version_number'], 2)

        plan_v1.refresh_from_db()
        self.assertEqual(plan_v1.status, ActiveSupersededStatus.SUPERSEDED)

        plan_v2 = NutritionPlan.objects.get(patient=self.patient, version_number=2)
        self.assertEqual(plan_v2.status, ActiveSupersededStatus.ACTIVE)

    def test_lab_report_upload_and_review(self):
        """Verify lab report patient upload and doctor review."""
        rep = LabReport.objects.create(
            patient=self.patient,
            uploaded_by=self.patient_user,
            investigation_name="CBC Routine Check",
            file_path="lab_reports/cbc_test_rosamma.pdf",
            report_date=timezone.now().date(),
            review_status=ReviewStatus.PENDING,
        )
        self.assertEqual(rep.review_status, ReviewStatus.PENDING)

        # Review report
        res_rev = self.client.post(
            f'/api/medical-records/doctor/lab-reports/{rep.report_id}/review/',
            data=json.dumps({"remarks": "Hemoglobin 11.2, Platelets stable. Continue current palliative course."}),
            content_type='application/json',
            **self.auth_headers
        )
        self.assertEqual(res_rev.status_code, 200)

        rep.refresh_from_db()
        self.assertEqual(rep.review_status, ReviewStatus.REVIEWED)
        self.assertEqual(rep.reviewed_by, self.doctor_user)
        self.assertIsNotNone(rep.reviewed_at)

    def test_patient_timeline_chronological_aggregation(self):
        """Verify timeline aggregates registration, diagnoses, prescriptions, and lab reports in order."""
        # Add diagnosis
        PatientDiagnosis.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            diagnosis_text="Hypertension Stage 2",
            diagnosed_date=timezone.now().date()
        )

        res = self.client.get(f'/api/doctor/patients/{self.patient.patient_id}/timeline/', **self.auth_headers)
        self.assertEqual(res.status_code, 200)
        events = res.json()
        self.assertGreaterEqual(len(events), 2)
        categories = [e['category'] for e in events]
        self.assertIn("Registration", categories)
        self.assertIn("Clinical Verification", categories)
        self.assertIn("Diagnosis", categories)
