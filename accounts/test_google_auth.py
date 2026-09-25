from unittest.mock import patch
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import (
    User,
    Doctor,
    Nurse,
    Caregiver,
    Patient,
    Administrator,
    PatientRegistrationApplication,
    Role,
    RegistrationStatus,
    VerificationStatus,
)


@override_settings(GOOGLE_CLIENT_ID='test-google-client-id')
class GoogleAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.google_auth_url = '/api/auth/google/'
        self.login_url = '/api/auth/login/'

        # Setup an Approved Doctor
        self.doctor_user = User.objects.create_user(
            email='doctor@karunagrid.org',
            password='DoctorPassword123!',
            role=Role.DOCTOR,
            is_active=True,
        )
        self.doctor = Doctor.objects.create(
            user=self.doctor_user,
            name='Anil Kumar',
            specialization='Palliative Care',
            phone='9876543210',
            verification_status=VerificationStatus.APPROVED,
        )

        # Setup an Approved Nurse
        self.nurse_user = User.objects.create_user(
            email='nurse@karunagrid.org',
            password='NursePassword123!',
            role=Role.NURSE,
            is_active=True,
        )
        self.nurse = Nurse.objects.create(
            user=self.nurse_user,
            name='Priya Nair',
            phone='9876543211',
            verification_status=VerificationStatus.APPROVED,
        )

        # Setup an Approved Caregiver
        self.caregiver_user = User.objects.create_user(
            email='caregiver@karunagrid.org',
            password='CaregiverPassword123!',
            role=Role.CAREGIVER,
            is_active=True,
        )
        self.caregiver = Caregiver.objects.create(
            user=self.caregiver_user,
            name='Joseph Mathew',
            phone='9876543212',
            verification_status=VerificationStatus.APPROVED,
        )

        # Setup an Approved Patient
        self.patient_user = User.objects.create_user(
            email='patient@karunagrid.org',
            password='PatientPassword123!',
            role=Role.PATIENT,
            is_active=True,
        )
        self.patient = Patient.objects.create(
            user=self.patient_user,
            name='Rosamma Francis',
            registration_id='KG-P-TEST0001',
            phone='9876543213',
            registration_status=RegistrationStatus.APPROVED,
        )

        # Setup an Admin
        self.admin_user = User.objects.create_user(
            email='admin@karunagrid.org',
            password='AdminPassword123!',
            role=Role.ADMIN,
            is_active=True,
            is_staff=True,
        )
        self.administrator = Administrator.objects.create(
            user=self.admin_user,
            name='System Administrator',
            phone='9876543214',
        )

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_google_auth_success_patient(self, mock_verify):
        mock_verify.return_value = {
            'email': 'patient@karunagrid.org',
            'email_verified': True,
            'iss': 'accounts.google.com',
            'aud': 'test-google-client-id',
        }

        response = self.client.post(self.google_auth_url, {'credential': 'valid-patient-id-token'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['email'], 'patient@karunagrid.org')
        self.assertEqual(response.data['user']['role'], Role.PATIENT)
        self.assertEqual(response.data['user']['name'], 'Rosamma Francis')

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_google_auth_success_doctor(self, mock_verify):
        mock_verify.return_value = {
            'email': 'doctor@karunagrid.org',
            'email_verified': True,
            'iss': 'https://accounts.google.com',
            'aud': 'test-google-client-id',
        }

        response = self.client.post(self.google_auth_url, {'credential': 'valid-doctor-id-token'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['role'], Role.DOCTOR)
        self.assertEqual(response.data['user']['name'], 'Dr. Anil Kumar')

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_google_auth_success_nurse(self, mock_verify):
        mock_verify.return_value = {
            'email': 'nurse@karunagrid.org',
            'email_verified': True,
            'iss': 'accounts.google.com',
            'aud': 'test-google-client-id',
        }

        response = self.client.post(self.google_auth_url, {'credential': 'valid-nurse-id-token'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['role'], Role.NURSE)
        self.assertEqual(response.data['user']['name'], 'Nurse Priya Nair')

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_google_auth_success_caregiver(self, mock_verify):
        mock_verify.return_value = {
            'email': 'caregiver@karunagrid.org',
            'email_verified': True,
            'iss': 'accounts.google.com',
            'aud': 'test-google-client-id',
        }

        response = self.client.post(self.google_auth_url, {'credential': 'valid-caregiver-id-token'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['role'], Role.CAREGIVER)
        self.assertEqual(response.data['user']['name'], 'Joseph Mathew')

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_google_auth_success_admin(self, mock_verify):
        mock_verify.return_value = {
            'email': 'admin@karunagrid.org',
            'email_verified': True,
            'iss': 'accounts.google.com',
            'aud': 'test-google-client-id',
        }

        response = self.client.post(self.google_auth_url, {'credential': 'valid-admin-id-token'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['role'], Role.ADMIN)
        self.assertEqual(response.data['user']['name'], 'System Administrator')

    def test_google_auth_missing_credential(self):
        response = self.client.post(self.google_auth_url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('errors', response.data)
        self.assertIn('credential', response.data['errors'])

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_google_auth_invalid_token(self, mock_verify):
        mock_verify.side_effect = ValueError('Token expired or invalid signature')

        response = self.client.post(self.google_auth_url, {'credential': 'invalid-token'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'Google authentication failed. Please try again.')

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_google_auth_invalid_issuer(self, mock_verify):
        mock_verify.return_value = {
            'email': 'doctor@karunagrid.org',
            'email_verified': True,
            'iss': 'malicious-issuer.com',
            'aud': 'test-google-client-id',
        }

        response = self.client.post(self.google_auth_url, {'credential': 'tampered-issuer-token'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'Google authentication failed. Invalid token issuer.')

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_google_auth_unverified_email(self, mock_verify):
        mock_verify.return_value = {
            'email': 'doctor@karunagrid.org',
            'email_verified': False,
            'iss': 'accounts.google.com',
            'aud': 'test-google-client-id',
        }

        response = self.client.post(self.google_auth_url, {'credential': 'unverified-email-token'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'],
            'Google account email is not verified. Please verify your email with Google.'
        )

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_google_auth_unknown_user_rejected(self, mock_verify):
        mock_verify.return_value = {
            'email': 'unknown.stranger@example.com',
            'email_verified': True,
            'iss': 'accounts.google.com',
            'aud': 'test-google-client-id',
        }

        response = self.client.post(self.google_auth_url, {'credential': 'valid-unknown-token'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['detail'],
            'No eligible KarunaGrid account was found for this Google account. Please use the registration process first.'
        )

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_google_auth_pending_patient_application(self, mock_verify):
        PatientRegistrationApplication.objects.create(
            application_id='KG-APP-PENDING1',
            name='Pending Applicant',
            email='applicant.pending@example.com',
            dob='1980-01-01',
            phone='9876543215',
            discharge_summary_path='uploads/doc.pdf',
            registration_status=RegistrationStatus.PENDING,
        )

        mock_verify.return_value = {
            'email': 'applicant.pending@example.com',
            'email_verified': True,
            'iss': 'accounts.google.com',
            'aud': 'test-google-client-id',
        }

        response = self.client.post(self.google_auth_url, {'credential': 'valid-pending-app-token'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            response.data['detail'],
            'Your KarunaGrid account is not available for Google Sign-In yet. Please complete the existing registration and approval process.'
        )

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_google_auth_rejected_patient_application(self, mock_verify):
        PatientRegistrationApplication.objects.create(
            application_id='KG-APP-REJECTED1',
            name='Rejected Applicant',
            email='applicant.rejected@example.com',
            dob='1980-01-01',
            phone='9876543216',
            discharge_summary_path='uploads/doc.pdf',
            registration_status=RegistrationStatus.REJECTED,
            rejection_reason='Ineligible location',
        )

        mock_verify.return_value = {
            'email': 'applicant.rejected@example.com',
            'email_verified': True,
            'iss': 'accounts.google.com',
            'aud': 'test-google-client-id',
        }

        response = self.client.post(self.google_auth_url, {'credential': 'valid-rejected-app-token'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            response.data['detail'],
            'Your KarunaGrid account is not available for Google Sign-In yet. Please complete the existing registration and approval process.'
        )

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_google_auth_pending_caregiver_rejected(self, mock_verify):
        self.caregiver.verification_status = VerificationStatus.PENDING
        self.caregiver.save()

        mock_verify.return_value = {
            'email': 'caregiver@karunagrid.org',
            'email_verified': True,
            'iss': 'accounts.google.com',
            'aud': 'test-google-client-id',
        }

        response = self.client.post(self.google_auth_url, {'credential': 'valid-token'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data['detail'], 'Your account is pending administrator approval.')

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_google_auth_rejected_doctor_rejected(self, mock_verify):
        self.doctor.verification_status = VerificationStatus.REJECTED
        self.doctor.rejection_reason = 'Invalid medical license submitted.'
        self.doctor.save()

        mock_verify.return_value = {
            'email': 'doctor@karunagrid.org',
            'email_verified': True,
            'iss': 'accounts.google.com',
            'aud': 'test-google-client-id',
        }

        response = self.client.post(self.google_auth_url, {'credential': 'valid-token'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            response.data['detail'],
            'Your account verification was rejected by an administrator.'
        )
        self.assertEqual(response.data['rejection_reason'], 'Invalid medical license submitted.')

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_google_auth_inactive_user_rejected(self, mock_verify):
        self.doctor_user.is_active = False
        self.doctor_user.save()

        mock_verify.return_value = {
            'email': 'doctor@karunagrid.org',
            'email_verified': True,
            'iss': 'accounts.google.com',
            'aud': 'test-google-client-id',
        }

        response = self.client.post(self.google_auth_url, {'credential': 'valid-token'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data['detail'], 'Your account has been disabled. Please contact support.')

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_google_auth_role_injection_ignored(self, mock_verify):
        # Patient attempts to send role=Admin in request body
        mock_verify.return_value = {
            'email': 'patient@karunagrid.org',
            'email_verified': True,
            'iss': 'accounts.google.com',
            'aud': 'test-google-client-id',
        }

        response = self.client.post(
            self.google_auth_url,
            {'credential': 'valid-patient-id-token', 'role': 'Admin'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['role'], Role.PATIENT)
        self.assertNotEqual(response.data['user']['role'], Role.ADMIN)

    @patch('google.oauth2.id_token.verify_oauth2_token')
    def test_google_auth_cannot_create_privileged_account(self, mock_verify):
        mock_verify.return_value = {
            'email': 'unknown.attacker@example.com',
            'email_verified': True,
            'iss': 'accounts.google.com',
            'aud': 'test-google-client-id',
        }

        response = self.client.post(
            self.google_auth_url,
            {'credential': 'valid-token', 'role': 'Admin'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email='unknown.attacker@example.com').exists())

    def test_normal_password_login_regression(self):
        response = self.client.post(
            self.login_url,
            {'email': 'doctor@karunagrid.org', 'password': 'DoctorPassword123!'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['role'], Role.DOCTOR)
        self.assertEqual(response.data['user']['name'], 'Dr. Anil Kumar')
