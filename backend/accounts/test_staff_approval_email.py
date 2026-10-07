import re
from unittest.mock import patch
from django.test import TestCase, override_settings
from django.core import mail
from django.contrib.auth.hashers import check_password
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import (
    User,
    Doctor,
    Nurse,
    Administrator,
    Role,
    VerificationStatus,
)


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    DEFAULT_FROM_EMAIL='karunagrid@gmail.com'
)
class StaffApprovalEmailTests(TestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.client = APIClient()
        self.login_url = '/api/login/'
        mail.outbox = []

        # Create Admin
        self.admin_user = User.objects.create_user(
            email='admin@karunagrid.org',
            password='AdminPassword123!',
            role=Role.ADMIN,
            is_active=True,
        )
        self.admin_profile = Administrator.objects.create(
            user=self.admin_user,
            name='Super Admin',
        )

    def test_01_doctor_onboard_creates_user_and_sends_email(self):
        """Admin onboards doctor -> User created, approved, and email sent."""
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            'name': 'Thomas Paul',
            'email': 'dr.thomas@example.com',
            'password': 'TempDoctorPass123!',
            'specialization': 'Palliative Medicine',
            'service_area': 'Ernakulam Ward 4',
        }
        res = self.client.post('/api/admin/onboard-doctor/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data.get('email_sent'))
        self.assertIn('Doctor approved successfully', res.data.get('message', ''))

        # Check User & Doctor created
        user = User.objects.get(email='dr.thomas@example.com')
        self.assertTrue(user.is_active)
        self.assertEqual(user.role, Role.DOCTOR)
        doctor = Doctor.objects.get(user=user)
        self.assertEqual(doctor.verification_status, VerificationStatus.APPROVED)

        # Verify email sent
        self.assertEqual(len(mail.outbox), 1)
        email_msg = mail.outbox[0]
        self.assertEqual(email_msg.to, ['dr.thomas@example.com'])
        self.assertEqual(email_msg.subject, 'Your KarunaGrid Doctor Account Has Been Approved')

        body = email_msg.body
        self.assertIn('Dear Dr. Thomas Paul,', body)
        self.assertIn('approved by the Administrator', body)
        self.assertIn('Role: Doctor', body)
        self.assertIn('Username: dr.thomas@example.com', body)
        self.assertIn('Temporary Password: TempDoctorPass123!', body)
        self.assertIn('log in to KarunaGrid using the above credentials', body)
        self.assertIn('update/change your password after your first login', body)

    def test_02_nurse_onboard_creates_user_and_sends_email(self):
        """Admin onboards nurse -> User created, approved, and email sent."""
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            'name': 'Mary Joseph',
            'email': 'nurse.mary@example.com',
            'password': 'TempNursePass123!',
            'service_area': 'Kochi North',
        }
        res = self.client.post('/api/admin/onboard-nurse/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data.get('email_sent'))
        self.assertIn('Nurse approved successfully', res.data.get('message', ''))

        # Check User & Nurse created
        user = User.objects.get(email='nurse.mary@example.com')
        self.assertTrue(user.is_active)
        self.assertEqual(user.role, Role.NURSE)
        nurse = Nurse.objects.get(user=user)
        self.assertEqual(nurse.verification_status, VerificationStatus.APPROVED)

        # Verify email sent
        self.assertEqual(len(mail.outbox), 1)
        email_msg = mail.outbox[0]
        self.assertEqual(email_msg.to, ['nurse.mary@example.com'])
        self.assertEqual(email_msg.subject, 'Your KarunaGrid Nurse Account Has Been Approved')

        body = email_msg.body
        self.assertIn('Dear Nurse Mary Joseph,', body)
        self.assertIn('Role: Nurse', body)
        self.assertIn('Username: nurse.mary@example.com', body)
        self.assertIn('Temporary Password: TempNursePass123!', body)
        self.assertIn('log in to KarunaGrid using the above credentials', body)
        self.assertIn('update/change your password after your first login', body)

    def test_03_doctor_admin_approve_endpoint(self):
        """Admin approves pending doctor -> status APPROVED and email sent."""
        doc_user = User.objects.create_user(
            email='pending.doctor@example.com',
            role=Role.DOCTOR,
            is_active=False
        )
        doctor = Doctor.objects.create(
            user=doc_user,
            name='Sarah Jenkins',
            verification_status=VerificationStatus.PENDING
        )

        self.client.force_authenticate(user=self.admin_user)
        res = self.client.post(f'/api/admin/doctors/{doctor.doctor_id}/approve/', format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data.get('email_sent'))

        doctor.refresh_from_db()
        doc_user.refresh_from_db()
        self.assertEqual(doctor.verification_status, VerificationStatus.APPROVED)
        self.assertTrue(doc_user.is_active)

        self.assertEqual(len(mail.outbox), 1)
        email_msg = mail.outbox[0]
        self.assertEqual(email_msg.to, ['pending.doctor@example.com'])
        self.assertIn('Dear Dr. Sarah Jenkins,', email_msg.body)
        self.assertIn('Role: Doctor', email_msg.body)
        self.assertIn('Username: pending.doctor@example.com', email_msg.body)
        self.assertIn('Temporary Password:', email_msg.body)

    def test_04_nurse_admin_approve_endpoint(self):
        """Admin approves pending nurse -> status APPROVED and email sent."""
        nurse_user = User.objects.create_user(
            email='pending.nurse@example.com',
            role=Role.NURSE,
            is_active=False
        )
        nurse = Nurse.objects.create(
            user=nurse_user,
            name='David Kurian',
            verification_status=VerificationStatus.PENDING
        )

        self.client.force_authenticate(user=self.admin_user)
        res = self.client.post(f'/api/admin/nurses/{nurse.nurse_id}/approve/', format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data.get('email_sent'))

        nurse.refresh_from_db()
        nurse_user.refresh_from_db()
        self.assertEqual(nurse.verification_status, VerificationStatus.APPROVED)
        self.assertTrue(nurse_user.is_active)

        self.assertEqual(len(mail.outbox), 1)
        email_msg = mail.outbox[0]
        self.assertEqual(email_msg.to, ['pending.nurse@example.com'])
        self.assertIn('Dear Nurse David Kurian,', email_msg.body)
        self.assertIn('Role: Nurse', email_msg.body)
        self.assertIn('Username: pending.nurse@example.com', email_msg.body)
        self.assertIn('Temporary Password:', email_msg.body)

    def test_05_rejected_applications_do_not_send_approval_emails(self):
        """Rejected doctor or nurse applications must NOT send approval email."""
        doc_user = User.objects.create_user(
            email='rejected.doc@example.com',
            role=Role.DOCTOR,
            is_active=False
        )
        doctor = Doctor.objects.create(
            user=doc_user,
            name='Rejected Doc',
            verification_status=VerificationStatus.PENDING
        )

        self.client.force_authenticate(user=self.admin_user)
        res = self.client.post(
            f'/api/admin/doctors/{doctor.doctor_id}/reject/',
            {'rejection_reason': 'Invalid medical license number.'},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

        doctor.refresh_from_db()
        self.assertEqual(doctor.verification_status, VerificationStatus.REJECTED)
        self.assertEqual(doctor.rejection_reason, 'Invalid medical license number.')

        # Also test Nurse rejection
        nurse_user = User.objects.create_user(
            email='rejected.nurse@example.com',
            role=Role.NURSE,
            is_active=False
        )
        nurse = Nurse.objects.create(
            user=nurse_user,
            name='Rejected Nurse',
            verification_status=VerificationStatus.PENDING
        )
        res_nurse = self.client.post(
            f'/api/admin/nurses/{nurse.nurse_id}/reject/',
            {'rejection_reason': 'Documents incomplete.'},
            format='json'
        )
        self.assertEqual(res_nurse.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

    def test_06_duplicate_approval_protection(self):
        """Already-approved staff cannot be re-approved and no duplicate email is sent."""
        self.client.force_authenticate(user=self.admin_user)

        # 1. Onboard doctor once
        payload = {
            'name': 'Unique Doctor',
            'email': 'unique.doc@example.com',
            'password': 'Password123!',
        }
        res1 = self.client.post('/api/admin/onboard-doctor/', payload, format='json')
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(mail.outbox), 1)

        # 2. Attempt duplicate onboarding with same email
        res2 = self.client.post('/api/admin/onboard-doctor/', payload, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already exists', str(res2.data))
        # No extra email sent
        self.assertEqual(len(mail.outbox), 1)

        # 3. Direct approve endpoint on already-approved doctor
        doc = Doctor.objects.get(user__email='unique.doc@example.com')
        res3 = self.client.post(f'/api/admin/doctors/{doc.doctor_id}/approve/', format='json')
        self.assertEqual(res3.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already been approved', str(res3.data))
        self.assertEqual(len(mail.outbox), 1)

    def test_07_password_stored_as_hash_never_plaintext(self):
        """Password must never be saved in plaintext in the database."""
        self.client.force_authenticate(user=self.admin_user)
        raw_password = 'SuperSecretStaffPassword123!'
        payload = {
            'name': 'Hash Check Doctor',
            'email': 'hashcheck.doc@example.com',
            'password': raw_password,
        }
        res = self.client.post('/api/admin/onboard-doctor/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        user = User.objects.get(email='hashcheck.doc@example.com')
        # Check DB value is hashed
        self.assertNotEqual(user.password, raw_password)
        self.assertTrue(user.password.startswith('pbkdf2_') or user.password.startswith('md5$'))
        self.assertTrue(check_password(raw_password, user.password))

    def test_08_temporary_password_login_and_subsequent_password_change(self):
        """Doctor can log in with temporary password and change password afterwards."""
        self.client.force_authenticate(user=self.admin_user)
        temp_password = 'InitialTempPassword123!'
        payload = {
            'name': 'Lifecycle Doctor',
            'email': 'lifecycle.doc@example.com',
            'password': temp_password,
        }
        res = self.client.post('/api/admin/onboard-doctor/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # 1. Unauthenticate client and log in with temporary password
        self.client.force_authenticate(user=None)
        login_res = self.client.post(self.login_url, {
            'username': 'lifecycle.doc@example.com',
            'password': temp_password,
        }, format='json')
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        self.assertIn('access', login_res.data)
        access_token = login_res.data['access']

        # 2. Authenticated Doctor updates password via profile endpoint
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        new_password = 'NewUpdatedPassword123!'
        change_res = self.client.put('/api/doctor/profile/', {
            'name': 'Lifecycle Doctor',
            'current_password': temp_password,
            'new_password': new_password,
            'confirm_password': new_password,
        }, format='json')
        self.assertEqual(change_res.status_code, status.HTTP_200_OK)

        # 3. Old password should now fail
        self.client.credentials()  # Clear auth headers
        old_login_res = self.client.post(self.login_url, {
            'username': 'lifecycle.doc@example.com',
            'password': temp_password,
        }, format='json')
        self.assertEqual(old_login_res.status_code, status.HTTP_400_BAD_REQUEST)

        # 4. New password should succeed
        new_login_res = self.client.post(self.login_url, {
            'username': 'lifecycle.doc@example.com',
            'password': new_password,
        }, format='json')
        self.assertEqual(new_login_res.status_code, status.HTTP_200_OK)
        self.assertIn('access', new_login_res.data)

    def test_09_nurse_login_and_password_change(self):
        """Nurse can log in with temporary password and change password afterwards."""
        self.client.force_authenticate(user=self.admin_user)
        temp_password = 'InitialNurseTemp123!'
        payload = {
            'name': 'Lifecycle Nurse',
            'email': 'lifecycle.nurse@example.com',
            'password': temp_password,
        }
        res = self.client.post('/api/admin/onboard-nurse/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # 1. Log in with temporary password
        self.client.force_authenticate(user=None)
        login_res = self.client.post(self.login_url, {
            'username': 'lifecycle.nurse@example.com',
            'password': temp_password,
        }, format='json')
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        access_token = login_res.data['access']

        # 2. Update password via Nurse profile
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        new_password = 'NewNurseUpdatedPassword123!'
        change_res = self.client.put('/api/nurse/profile/', {
            'name': 'Lifecycle Nurse',
            'current_password': temp_password,
            'new_password': new_password,
            'confirm_password': new_password,
        }, format='json')
        self.assertEqual(change_res.status_code, status.HTTP_200_OK)

        # 3. Old password should fail
        self.client.credentials()
        old_login_res = self.client.post(self.login_url, {
            'username': 'lifecycle.nurse@example.com',
            'password': temp_password,
        }, format='json')
        self.assertEqual(old_login_res.status_code, status.HTTP_400_BAD_REQUEST)

        # 4. Verify new password login
        new_login_res = self.client.post(self.login_url, {
            'username': 'lifecycle.nurse@example.com',
            'password': new_password,
        }, format='json')
        self.assertEqual(new_login_res.status_code, status.HTTP_200_OK)

    def test_10_admin_staff_create_view_sends_email(self):
        """AdminCreateStaffView sends approval email with credentials."""
        self.client.force_authenticate(user=self.admin_user)

        # Create doctor via admin/staff/create/
        res_doc = self.client.post('/api/admin/staff/create/', {
            'role': 'doctor',
            'name': 'Staff Doc',
            'email': 'staff.doc@example.com',
            'password': 'StaffDocPassword123!',
        }, format='json')
        self.assertEqual(res_doc.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['staff.doc@example.com'])
        self.assertIn('Doctor', mail.outbox[0].subject)

        # Create nurse via admin/staff/create/
        res_nurse = self.client.post('/api/admin/staff/create/', {
            'role': 'nurse',
            'name': 'Staff Nurse',
            'email': 'staff.nurse@example.com',
            'password': 'StaffNursePassword123!',
        }, format='json')
        self.assertEqual(res_nurse.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(mail.outbox), 2)
        self.assertEqual(mail.outbox[1].to, ['staff.nurse@example.com'])
        self.assertIn('Nurse', mail.outbox[1].subject)

    @patch('accounts.notifications.robust_send_mail')
    def test_11_email_delivery_failure_handled_gracefully(self, mock_robust_send_mail):
        """If robust_send_mail fails, API still completes creation but reports email_sent=False without crashing."""
        mock_robust_send_mail.side_effect = Exception("SMTP Connection Timeout")
        self.client.force_authenticate(user=self.admin_user)

        res = self.client.post('/api/admin/onboard-doctor/', {
            'name': 'Fail Mail Doctor',
            'email': 'failmail.doc@example.com',
            'password': 'Password123!',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertFalse(res.data.get('email_sent'))
        self.assertIn('could not be delivered', res.data.get('message', ''))

    def test_12_non_admin_cannot_approve_or_onboard(self):
        """Non-admin users cannot access approval or onboarding endpoints."""
        normal_user = User.objects.create_user(
            email='normal.doctor@example.com',
            password='Password123!',
            role=Role.DOCTOR,
            is_active=True
        )
        self.client.force_authenticate(user=normal_user)

        res1 = self.client.post('/api/admin/onboard-doctor/', {
            'name': 'Unauthorized',
            'email': 'unauth@example.com',
            'password': 'Password123!',
        }, format='json')
        self.assertEqual(res1.status_code, status.HTTP_403_FORBIDDEN)

        res2 = self.client.post('/api/admin/doctors/1/approve/', format='json')
        self.assertEqual(res2.status_code, status.HTTP_403_FORBIDDEN)
