import json
import io
from django.test import TestCase, Client
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth.hashers import make_password
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User, Role, Doctor, Patient, RegistrationStatus, PatientStatus
from medical_records.models import LabReport, ReviewStatus


class LabReportWorkflowTests(TestCase):
    def setUp(self):
        self.client = Client()

        # 1. Create Doctor
        self.doctor_user = User.objects.create(
            email=f"dr.labtest_{timezone.now().timestamp()}@karunagrid.org",
            role=Role.DOCTOR,
            is_active=True,
            password=make_password("password123")
        )
        self.doctor = Doctor.objects.create(
            user=self.doctor_user,
            name="Dr. Sarah Varghese",
            phone="9876543211",
            specialization="Palliative Medicine",
            is_available_now=True,
        )
        self.doctor_token = str(RefreshToken.for_user(self.doctor_user).access_token)
        self.doctor_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.doctor_token}"}

        # 2. Create Patient 1 (Rosamma Francis)
        self.patient1_user = User.objects.create(
            email=f"rosamma_{timezone.now().timestamp()}@example.com",
            role=Role.PATIENT,
            is_active=True,
            password=make_password("password123")
        )
        self.patient1 = Patient.objects.create(
            user=self.patient1_user,
            registration_id="P00125",
            name="Rosamma Francis",
            dob="1958-05-15",
            gender="Female",
            phone="9123456780",
            house_name="Rose Villa",
            place="Kochi",
            panchayath="Ernakulam",
            ward_no=4,
            pincode="682001",
            registration_status=RegistrationStatus.APPROVED,
            status=PatientStatus.ACTIVE,
            reviewed_by_doctor=self.doctor,
        )
        self.patient1_token = str(RefreshToken.for_user(self.patient1_user).access_token)
        self.patient1_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.patient1_token}"}

        # 3. Create Patient 2 (George Mathew)
        self.patient2_user = User.objects.create(
            email=f"george_{timezone.now().timestamp()}@example.com",
            role=Role.PATIENT,
            is_active=True,
            password=make_password("password123")
        )
        self.patient2 = Patient.objects.create(
            user=self.patient2_user,
            registration_id="P00126",
            name="George Mathew",
            dob="1960-08-20",
            gender="Male",
            phone="9123456781",
            registration_status=RegistrationStatus.APPROVED,
            status=PatientStatus.ACTIVE,
        )
        self.patient2_token = str(RefreshToken.for_user(self.patient2_user).access_token)
        self.patient2_headers = {"HTTP_AUTHORIZATION": f"Bearer {self.patient2_token}"}

    def test_01_patient_upload_lab_report_success(self):
        """Test 1: Patient uploads laboratory report; verified server-side ownership and Pending review status."""
        dummy_pdf = SimpleUploadedFile("cbc_report.pdf", b"%PDF-1.4 dummy pdf content", content_type="application/pdf")
        payload = {
            "investigation_name": "Complete Blood Count",
            "report_date": "2026-08-28",
            "file": dummy_pdf,
        }

        res = self.client.post('/api/patient/lab-reports/', data=payload, **self.patient1_headers)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data['investigation_name'], "Complete Blood Count")
        self.assertEqual(data['review_status'], ReviewStatus.PENDING)

        report = LabReport.objects.get(report_id=data['report_id'])
        self.assertEqual(report.patient, self.patient1)
        self.assertEqual(report.uploaded_by, self.patient1_user)
        self.assertEqual(report.review_status, ReviewStatus.PENDING)
        self.assertIsNone(report.reviewed_by)
        self.assertIsNone(report.remarks)
        self.assertIsNone(report.reviewed_at)
        self.assertEqual(report.investigation_name, "Complete Blood Count")

    def test_02_patient_cannot_upload_for_another_patient(self):
        """Test 2: Patient cannot spoof patient_id to upload for another patient."""
        dummy_pdf = SimpleUploadedFile("lft_report.pdf", b"%PDF-1.4 dummy pdf content", content_type="application/pdf")
        payload = {
            "investigation_name": "Liver Function Test",
            "patient_id": self.patient2.patient_id,  # Attempting to spoof
            "file": dummy_pdf,
        }

        res = self.client.post('/api/patient/lab-reports/', data=payload, **self.patient1_headers)
        self.assertEqual(res.status_code, 201)
        report = LabReport.objects.get(report_id=res.json()['report_id'])
        # Must be assigned to authenticated patient1, not spoofed patient2!
        self.assertEqual(report.patient, self.patient1)
        self.assertNotEqual(report.patient, self.patient2)

    def test_03_patient_retrieves_own_reports(self):
        """Test 3: Patient can retrieve own reports list."""
        LabReport.objects.create(
            patient=self.patient1,
            uploaded_by=self.patient1_user,
            investigation_name="Serum Creatinine",
            file_path="lab_reports/test_creat.pdf",
            report_date=timezone.now().date(),
            review_status=ReviewStatus.PENDING,
        )

        res = self.client.get('/api/patient/lab-reports/', **self.patient1_headers)
        self.assertEqual(res.status_code, 200)
        reports = res.json()
        self.assertEqual(len(reports), 1)
        self.assertEqual(reports[0]['investigation_name'], "Serum Creatinine")
        self.assertEqual(reports[0]['review_status'], "Pending")

    def test_04_patient_cannot_retrieve_other_patients_reports(self):
        """Test 4: Patient cannot see reports belonging to another patient."""
        LabReport.objects.create(
            patient=self.patient2,
            uploaded_by=self.patient2_user,
            investigation_name="Patient 2 Secret Test",
            file_path="lab_reports/test_secret.pdf",
            report_date=timezone.now().date(),
        )

        res = self.client.get('/api/patient/lab-reports/', **self.patient1_headers)
        self.assertEqual(res.status_code, 200)
        reports = res.json()
        self.assertEqual(len(reports), 0)

    def test_05_doctor_retrieves_patient_reports(self):
        """Test 5: Doctor retrieves reports for authorized patient."""
        LabReport.objects.create(
            patient=self.patient1,
            uploaded_by=self.patient1_user,
            investigation_name="Lipid Profile",
            file_path="lab_reports/lipid.pdf",
            report_date=timezone.now().date(),
        )

        res = self.client.get(f'/api/medical-records/doctor/lab-reports/?patient_id={self.patient1.patient_id}', **self.doctor_headers)
        self.assertEqual(res.status_code, 200)
        reports = res.json()
        self.assertEqual(len(reports), 1)
        self.assertEqual(reports[0]['investigation_name'], "Lipid Profile")

    def test_06_secure_document_view_access(self):
        """Test 6: Secure document access allows owning patient and doctor to access original document."""
        # Create a real file in storage
        from django.core.files.storage import default_storage
        file_path = default_storage.save("lab_reports/test_cbc.pdf", io.BytesIO(b"%PDF-1.4 test document content"))

        report = LabReport.objects.create(
            patient=self.patient1,
            uploaded_by=self.patient1_user,
            investigation_name="Complete Blood Count",
            file_path=file_path,
            report_date=timezone.now().date(),
        )

        # Patient 1 can view
        res_p1 = self.client.get(f'/api/auth/documents/view/?type=lab_report&id={report.report_id}', **self.patient1_headers)
        self.assertEqual(res_p1.status_code, 200)

        # Doctor can view
        res_doc = self.client.get(f'/api/auth/documents/view/?type=lab_report&id={report.report_id}', **self.doctor_headers)
        self.assertEqual(res_doc.status_code, 200)

        # Patient 2 (unauthorized) cannot view
        res_p2 = self.client.get(f'/api/auth/documents/view/?type=lab_report&id={report.report_id}', **self.patient2_headers)
        self.assertEqual(res_p2.status_code, 403)

    def test_07_doctor_reviews_report_with_remarks(self):
        """Test 7 & 8: Doctor reviews Pending report, adds remarks; status changes to Reviewed."""
        report = LabReport.objects.create(
            patient=self.patient1,
            uploaded_by=self.patient1_user,
            investigation_name="Liver Function Test",
            file_path="lab_reports/lft.pdf",
            report_date=timezone.now().date(),
            review_status=ReviewStatus.PENDING,
        )

        payload = {
            "report_id": report.report_id,
            "remarks": "Liver enzymes mildly elevated. Recommend clinical follow-up in 2 weeks."
        }
        res = self.client.post('/api/medical-records/doctor/lab-reports/', data=json.dumps(payload), content_type='application/json', **self.doctor_headers)
        self.assertEqual(res.status_code, 200)

        report.refresh_from_db()
        self.assertEqual(report.review_status, ReviewStatus.REVIEWED)
        self.assertEqual(report.reviewed_by, self.doctor_user)
        self.assertIsNotNone(report.reviewed_at)
        self.assertEqual(report.remarks, "Liver enzymes mildly elevated. Recommend clinical follow-up in 2 weeks.")

    def test_08_doctor_reviews_report_without_remarks(self):
        """Test 9: Doctor reviews report without optional remarks; status changes to Reviewed."""
        report = LabReport.objects.create(
            patient=self.patient1,
            uploaded_by=self.patient1_user,
            investigation_name="Chest X-Ray PA View",
            file_path="lab_reports/cxr.pdf",
            report_date=timezone.now().date(),
            review_status=ReviewStatus.PENDING,
        )

        payload = {
            "report_id": report.report_id,
            "remarks": ""
        }
        res = self.client.post('/api/medical-records/doctor/lab-reports/', data=json.dumps(payload), content_type='application/json', **self.doctor_headers)
        self.assertEqual(res.status_code, 200)

        report.refresh_from_db()
        self.assertEqual(report.review_status, ReviewStatus.REVIEWED)
        self.assertIsNone(report.remarks)
        self.assertIsNotNone(report.reviewed_at)

    def test_09_patient_cannot_modify_doctor_review(self):
        """Test 10: Patient cannot mark report as reviewed or modify doctor review."""
        report = LabReport.objects.create(
            patient=self.patient1,
            uploaded_by=self.patient1_user,
            investigation_name="Thyroid Panel",
            file_path="lab_reports/tsh.pdf",
            report_date=timezone.now().date(),
            review_status=ReviewStatus.PENDING,
        )

        # Attempt review as patient
        res = self.client.post(
            f'/api/medical-records/doctor/lab-reports/{report.report_id}/review/',
            data=json.dumps({"remarks": "I am reviewing myself"}),
            content_type='application/json',
            **self.patient1_headers
        )
        self.assertEqual(res.status_code, 403)

        report.refresh_from_db()
        self.assertEqual(report.review_status, ReviewStatus.PENDING)
        self.assertIsNone(report.reviewed_by)

    def test_10_doctor_review_preserves_original_file_and_patient(self):
        """Test 11: Doctor review modifies only review metadata; original file and upload data remain unchanged."""
        report = LabReport.objects.create(
            patient=self.patient1,
            uploaded_by=self.patient1_user,
            investigation_name="Ultrasound Abdomen",
            file_path="lab_reports/original_usg.pdf",
            report_date=timezone.now().date(),
            review_status=ReviewStatus.PENDING,
        )

        res = self.client.post(
            f'/api/medical-records/doctor/lab-reports/{report.report_id}/review/',
            data=json.dumps({"remarks": "No hydronephrosis seen."}),
            content_type='application/json',
            **self.doctor_headers
        )
        self.assertEqual(res.status_code, 200)

        report.refresh_from_db()
        self.assertEqual(report.file_path, "lab_reports/original_usg.pdf")
        self.assertEqual(report.patient, self.patient1)
        self.assertEqual(report.uploaded_by, self.patient1_user)

    def test_11_patient_multiple_reports_are_independent(self):
        """Test 12: Patient uploading multiple reports creates separate records without overwriting."""
        dummy_1 = SimpleUploadedFile("cbc.pdf", b"%PDF-1.4 cbc", content_type="application/pdf")
        dummy_2 = SimpleUploadedFile("lft.pdf", b"%PDF-1.4 lft", content_type="application/pdf")

        res1 = self.client.post('/api/patient/lab-reports/', data={"investigation_name": "CBC", "file": dummy_1}, **self.patient1_headers)
        res2 = self.client.post('/api/patient/lab-reports/', data={"investigation_name": "LFT", "file": dummy_2}, **self.patient1_headers)

        self.assertEqual(res1.status_code, 201)
        self.assertEqual(res2.status_code, 201)

        rep1 = LabReport.objects.get(report_id=res1.json()['report_id'])
        rep2 = LabReport.objects.get(report_id=res2.json()['report_id'])

        self.assertNotEqual(rep1.report_id, rep2.report_id)
        self.assertEqual(rep1.investigation_name, "CBC")
        self.assertEqual(rep2.investigation_name, "LFT")

    def test_12_timeline_includes_upload_and_review_events(self):
        """Test 14: Timeline includes both upload event and review event."""
        report = LabReport.objects.create(
            patient=self.patient1,
            uploaded_by=self.patient1_user,
            investigation_name="Biopsy Report",
            file_path="lab_reports/biopsy.pdf",
            report_date=timezone.now().date(),
            review_status=ReviewStatus.REVIEWED,
            reviewed_by=self.doctor_user,
            reviewed_at=timezone.now(),
            remarks="Confirmed benign lesion."
        )

        res = self.client.get(f'/api/doctor/patients/{self.patient1.patient_id}/timeline/', **self.doctor_headers)
        self.assertEqual(res.status_code, 200)
        events = res.json()

        event_names = [e['event'] for e in events]
        self.assertTrue(any("Laboratory Report Uploaded" in ev for ev in event_names))
        self.assertTrue(any("Laboratory Report Reviewed" in ev for ev in event_names))
