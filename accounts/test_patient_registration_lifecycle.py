import io
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import authenticate
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import (
    User,
    Doctor,
    Patient,
    PatientRegistrationApplication,
    Role,
    RegistrationStatus,
)


class PatientRegistrationLifecycleTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create a reviewing doctor
        self.doc_user = User.objects.create_user(
            email='doctor.reviewer@karunagrid.org',
            password='DoctorPassword123!',
            role=Role.DOCTOR,
            is_active=True,
        )
        self.doctor = Doctor.objects.create(
            user=self.doc_user,
            name='Dr. Anil Kumar',
            specialization='Palliative Oncology',
            phone='9876543210',
        )

        # Sample discharge summary PDF
        self.pdf_content = b"%PDF-1.4 test discharge summary document content"

    def _submit_registration(self, email, name='Rosamma Francis', password='PatientPass123!'):
        pdf_file = SimpleUploadedFile(
            'discharge_summary.pdf',
            self.pdf_content,
            content_type='application/pdf'
        )
        data = {
            'role': 'patient',
            'name': name,
            'email': email,
            'password': password,
            'confirm_password': password,
            'dob': '1965-05-15',
            'gender': 'Female',
            'phone': '9876543210',
            'house_name': 'Karuna Villa',
            'place': 'Chevayur',
            'panchayath': 'Kozhikode',
            'ward_no': 12,
            'pincode': '673017',
            'discharge_summary': pdf_file,
            'emergency_contact_name': 'Francis Joseph',
            'emergency_contact_phone': '9876543211',
        }
        return self.client.post('/api/auth/register/', data, format='multipart')

    # TEST 1: First registration -> creates application, NO User, NO Patient
    def test_01_first_registration_creates_application_only(self):
        email = 'rosamma@example.com'
        res = self._submit_registration(email)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn('application_id', res.data)
        app_id = res.data['application_id']

        # Verify application created as PENDING
        app = PatientRegistrationApplication.objects.filter(application_id=app_id).first()
        self.assertIsNotNone(app)
        self.assertEqual(app.email, email)
        self.assertEqual(app.registration_status, RegistrationStatus.PENDING)
        self.assertIsNotNone(app.password_hash)

        # Verify NO User exists
        self.assertFalse(User.objects.filter(email__iexact=email).exists())

        # Verify NO Patient exists
        self.assertFalse(Patient.objects.filter(name='Rosamma Francis').exists())

    # TEST 2: Duplicate Pending application -> Blocked
    def test_02_duplicate_pending_application_is_blocked(self):
        email = 'duplicate.pending@example.com'
        res1 = self._submit_registration(email)
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        # Try submitting again while first application is Pending
        res2 = self._submit_registration(email)
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', res2.data.get('errors', {}))
        self.assertIn('pending', str(res2.data['errors']['email'][0]).lower())

        # Verify only 1 application exists
        self.assertEqual(PatientRegistrationApplication.objects.filter(email=email).count(), 1)

    # TEST 3: Reapply after rejection -> Allowed, creates APP-002, keeps APP-001
    def test_03_reapply_after_rejection_creates_new_application_and_preserves_old(self):
        email = 'reapply.patient@example.com'
        res1 = self._submit_registration(email)
        app1_id = res1.data['application_id']
        app1 = PatientRegistrationApplication.objects.get(application_id=app1_id)

        # Doctor rejects app1
        self.client.force_authenticate(user=self.doc_user)
        reject_res = self.client.post(
            f'/api/doctor/patients/{app1.id}/reject/',
            {'rejection_reason': 'Incomplete medical history details in discharge summary.'},
            format='json'
        )
        self.assertEqual(reject_res.status_code, status.HTTP_200_OK)
        self.client.force_authenticate(user=None)

        # Verify app1 is REJECTED and password_hash is cleared
        app1.refresh_from_db()
        self.assertEqual(app1.registration_status, RegistrationStatus.REJECTED)
        self.assertIsNone(app1.password_hash)

        # Patient reapplies with same email
        res2 = self._submit_registration(email, name='Rosamma Francis Reapplication')
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        app2_id = res2.data['application_id']
        self.assertNotEqual(app1_id, app2_id)

        # Verify BOTH applications exist in database
        app1.refresh_from_db()
        app2 = PatientRegistrationApplication.objects.get(application_id=app2_id)

        self.assertEqual(app1.registration_status, RegistrationStatus.REJECTED)
        self.assertEqual(app1.rejection_reason, 'Incomplete medical history details in discharge summary.')
        self.assertEqual(app2.registration_status, RegistrationStatus.PENDING)
        self.assertEqual(PatientRegistrationApplication.objects.filter(email=email).count(), 2)

    # TEST 4: Multiple rejected applications preserved
    def test_04_multiple_rejected_applications_history_preserved(self):
        email = 'multi.reject@example.com'
        
        # App 1
        res1 = self._submit_registration(email)
        app1 = PatientRegistrationApplication.objects.get(application_id=res1.data['application_id'])
        self.client.force_authenticate(user=self.doc_user)
        self.client.post(f'/api/doctor/patients/{app1.id}/reject/', {'rejection_reason': 'Reason 1'}, format='json')
        self.client.force_authenticate(user=None)

        # App 2
        res2 = self._submit_registration(email)
        app2 = PatientRegistrationApplication.objects.get(application_id=res2.data['application_id'])
        self.client.force_authenticate(user=self.doc_user)
        self.client.post(f'/api/doctor/patients/{app2.id}/reject/', {'rejection_reason': 'Reason 2'}, format='json')
        self.client.force_authenticate(user=None)

        # App 3 (Pending)
        res3 = self._submit_registration(email)
        self.assertEqual(res3.status_code, status.HTTP_201_CREATED)

        # Verify all 3 rows exist with correct statuses
        apps = PatientRegistrationApplication.objects.filter(email=email).order_by('created_at')
        self.assertEqual(apps.count(), 3)
        self.assertEqual(apps[0].registration_status, RegistrationStatus.REJECTED)
        self.assertEqual(apps[1].registration_status, RegistrationStatus.REJECTED)
        self.assertEqual(apps[2].registration_status, RegistrationStatus.PENDING)

    # TEST 5: Doctor approval -> Creates User + Patient, links them, clears password hash
    def test_05_doctor_approval_creates_user_and_patient(self):
        email = 'approved.patient@example.com'
        raw_pass = 'SecurePassword456!'
        res = self._submit_registration(email, password=raw_pass)
        app = PatientRegistrationApplication.objects.get(application_id=res.data['application_id'])

        # Doctor approves
        self.client.force_authenticate(user=self.doc_user)
        approve_res = self.client.post(f'/api/doctor/patients/{app.id}/approve/', format='json')
        self.assertEqual(approve_res.status_code, status.HTTP_200_OK)

        # Verify User created
        user = User.objects.filter(email__iexact=email).first()
        self.assertIsNotNone(user)
        self.assertEqual(user.role, Role.PATIENT)
        self.assertTrue(user.check_password(raw_pass))

        # Verify Patient created and linked
        patient = Patient.objects.filter(user=user).first()
        self.assertIsNotNone(patient)
        self.assertEqual(patient.name, 'Rosamma Francis')
        self.assertEqual(patient.registration_status, RegistrationStatus.APPROVED)
        self.assertEqual(patient.reviewed_by_doctor, self.doctor)

        # Verify Application updated and password_hash cleared
        app.refresh_from_db()
        self.assertEqual(app.registration_status, RegistrationStatus.APPROVED)
        self.assertEqual(app.created_patient, patient)
        self.assertIsNone(app.password_hash)

        # Verify patient can now log in
        login_res = self.client.post('/api/auth/login/', {'email': email, 'password': raw_pass}, format='json')
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.assertIn('access', login_res.data)

    # TEST 6: Registration after approval is blocked
    def test_06_registration_after_approval_is_blocked(self):
        email = 'already.approved@example.com'
        res1 = self._submit_registration(email)
        app = PatientRegistrationApplication.objects.get(application_id=res1.data['application_id'])

        self.client.force_authenticate(user=self.doc_user)
        self.client.post(f'/api/doctor/patients/{app.id}/approve/', format='json')
        self.client.force_authenticate(user=None)

        # Attempt to register again with approved email
        res2 = self._submit_registration(email)
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', res2.data.get('errors', {}))
        self.assertIn('already exists', str(res2.data['errors']['email'][0]).lower())

    # TEST 7: Public status check (Pending)
    def test_07_public_status_check_pending(self):
        email = 'status.pending@example.com'
        res = self._submit_registration(email)
        app_id = res.data['application_id']

        status_res = self.client.post(
            '/api/auth/application-status/',
            {'application_id': app_id, 'email': email},
            format='json'
        )
        self.assertEqual(status_res.status_code, status.HTTP_200_OK)
        self.assertEqual(status_res.data['application_id'], app_id)
        self.assertEqual(status_res.data['registration_status'], 'Pending')
        self.assertIsNone(status_res.data['rejection_reason'])
        self.assertNotIn('password', str(status_res.data))
        self.assertNotIn('password_hash', str(status_res.data))

    # TEST 8: Public status check (Rejected)
    def test_08_public_status_check_rejected(self):
        email = 'status.rejected@example.com'
        res = self._submit_registration(email)
        app = PatientRegistrationApplication.objects.get(application_id=res.data['application_id'])

        # Doctor rejects
        self.client.force_authenticate(user=self.doc_user)
        self.client.post(
            f'/api/doctor/patients/{app.id}/reject/',
            {'rejection_reason': 'Discharge summary illegible.'},
            format='json'
        )
        self.client.force_authenticate(user=None)

        status_res = self.client.post(
            '/api/auth/application-status/',
            {'application_id': app.application_id, 'email': email},
            format='json'
        )
        self.assertEqual(status_res.status_code, status.HTTP_200_OK)
        self.assertEqual(status_res.data['registration_status'], 'Rejected')
        self.assertEqual(status_res.data['rejection_reason'], 'Discharge summary illegible.')

    # TEST 9: Public status check (Approved)
    def test_09_public_status_check_approved(self):
        email = 'status.approved@example.com'
        res = self._submit_registration(email)
        app = PatientRegistrationApplication.objects.get(application_id=res.data['application_id'])

        # Doctor approves
        self.client.force_authenticate(user=self.doc_user)
        self.client.post(f'/api/doctor/patients/{app.id}/approve/', format='json')
        self.client.force_authenticate(user=None)

        status_res = self.client.post(
            '/api/auth/application-status/',
            {'application_id': app.application_id, 'email': email},
            format='json'
        )
        self.assertEqual(status_res.status_code, status.HTTP_200_OK)
        self.assertEqual(status_res.data['registration_status'], 'Approved')

    # TEST 10: Wrong email -> generic 404 (no leak)
    def test_10_public_status_check_wrong_email(self):
        res = self._submit_registration('real.email@example.com')
        app_id = res.data['application_id']

        status_res = self.client.post(
            '/api/auth/application-status/',
            {'application_id': app_id, 'email': 'wrong.email@example.com'},
            format='json'
        )
        self.assertEqual(status_res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('not find', str(status_res.data))

    # TEST 11: Wrong application ID -> generic 404 (no leak)
    def test_11_public_status_check_wrong_application_id(self):
        self._submit_registration('check.wrong.id@example.com')

        status_res = self.client.post(
            '/api/auth/application-status/',
            {'application_id': 'APP-9999-FAKE00', 'email': 'check.wrong.id@example.com'},
            format='json'
        )
        self.assertEqual(status_res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('not find', str(status_res.data))

    # TEST 12: Simultaneous approval / duplicate approval protection
    def test_12_simultaneous_approval_protection(self):
        email = 'race.condition@example.com'
        res = self._submit_registration(email)
        app = PatientRegistrationApplication.objects.get(application_id=res.data['application_id'])

        self.client.force_authenticate(user=self.doc_user)
        
        # First approval succeeds
        res1 = self.client.post(f'/api/doctor/patients/{app.id}/approve/', format='json')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # Second approval attempt is blocked (already approved)
        res2 = self.client.post(f'/api/doctor/patients/{app.id}/approve/', format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already been approved', str(res2.data).lower())

        # Verify only 1 user created
        self.assertEqual(User.objects.filter(email=email).count(), 1)
