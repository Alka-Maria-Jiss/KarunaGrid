from datetime import timedelta
from unittest.mock import patch
from django.test import TestCase, override_settings
from django.utils import timezone
from django.core import mail
from django.contrib.auth.hashers import check_password
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
    PasswordResetOTP,
    Role,
    RegistrationStatus,
    VerificationStatus,
)


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    GOOGLE_CLIENT_ID='test-google-client-id'
)
class ForgotPasswordTests(TestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.client = APIClient()
        self.request_otp_url = '/api/auth/forgot-password/request-otp/'
        self.resend_otp_url = '/api/auth/forgot-password/resend-otp/'
        self.verify_otp_url = '/api/auth/forgot-password/verify-otp/'
        self.reset_url = '/api/auth/forgot-password/reset/'
        self.login_url = '/api/auth/login/'

        # 1. Admin User
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

        # 2. Doctor User
        self.doctor_user = User.objects.create_user(
            email='doctor@karunagrid.org',
            password='DoctorPassword123!',
            role=Role.DOCTOR,
            is_active=True,
        )
        self.doctor_profile = Doctor.objects.create(
            user=self.doctor_user,
            name='Dr. Anil Kumar',
            specialization='Palliative Care',
            verification_status=VerificationStatus.APPROVED,
        )

        # 3. Nurse User
        self.nurse_user = User.objects.create_user(
            email='nurse@karunagrid.org',
            password='NursePassword123!',
            role=Role.NURSE,
            is_active=True,
        )
        self.nurse_profile = Nurse.objects.create(
            user=self.nurse_user,
            name='Priya Nair',
            verification_status=VerificationStatus.APPROVED,
        )

        # 4. Caregiver User
        self.caregiver_user = User.objects.create_user(
            email='caregiver@karunagrid.org',
            password='CaregiverPassword123!',
            role=Role.CAREGIVER,
            is_active=True,
        )
        self.caregiver_profile = Caregiver.objects.create(
            user=self.caregiver_user,
            name='Suresh Babu',
            phone='9876543210',
            verification_status=VerificationStatus.APPROVED,
        )

        # 5. Patient User
        self.patient_user = User.objects.create_user(
            email='patient@karunagrid.org',
            password='PatientPassword123!',
            role=Role.PATIENT,
            is_active=True,
        )
        self.patient_profile = Patient.objects.create(
            user=self.patient_user,
            registration_id='PAT-2026-0001',
            name='Radha Amma',
            phone='9876543212',
            registration_status=RegistrationStatus.APPROVED,
        )

        # Clear mailbox
        mail.outbox = []

    def test_01_existing_user_can_request_otp(self):
        """1. Existing username can request OTP and receives an email."""
        response = self.client.post(self.request_otp_url, {'username': 'doctor@karunagrid.org'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("If an account exists", response.data['message'])
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("KarunaGrid Password Reset OTP", mail.outbox[0].subject)
        self.assertEqual(mail.outbox[0].to, ['doctor@karunagrid.org'])

        # Check DB record
        otp_rec = PasswordResetOTP.objects.filter(user=self.doctor_user).first()
        self.assertIsNotNone(otp_rec)
        self.assertFalse(otp_rec.is_used)
        self.assertFalse(otp_rec.is_verified)
        self.assertEqual(otp_rec.attempt_count, 0)

    def test_02_non_existing_username_returns_same_generic_response(self):
        """2. Non-existing username returns identical generic response without sending email."""
        response = self.client.post(self.request_otp_url, {'username': 'nonexistent@example.com'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("If an account exists", response.data['message'])
        self.assertEqual(len(mail.outbox), 0)

    def test_03_otp_is_secure_6_digit_and_hashed(self):
        """3. OTP is a 6-digit number and is hashed in database."""
        self.client.post(self.request_otp_url, {'username': 'nurse@karunagrid.org'}, format='json')
        self.assertEqual(len(mail.outbox), 1)
        email_body = mail.outbox[0].body
        # Extract 6-digit OTP from email
        import re
        match = re.search(r'\b\d{6}\b', email_body)
        self.assertIsNotNone(match)
        raw_otp = match.group(0)

        otp_rec = PasswordResetOTP.objects.filter(user=self.nurse_user).first()
        self.assertTrue(check_password(raw_otp, otp_rec.otp_hash))
        self.assertNotEqual(raw_otp, otp_rec.otp_hash)

    def test_04_otp_expires_correctly(self):
        """4. Expired OTP is rejected."""
        self.client.post(self.request_otp_url, {'username': 'nurse@karunagrid.org'}, format='json')
        import re
        raw_otp = re.search(r'\b\d{6}\b', mail.outbox[0].body).group(0)

        # Fast forward time beyond 10 mins
        otp_rec = PasswordResetOTP.objects.filter(user=self.nurse_user).first()
        otp_rec.expires_at = timezone.now() - timedelta(seconds=1)
        otp_rec.save()

        response = self.client.post(self.verify_otp_url, {'username': 'nurse@karunagrid.org', 'otp': raw_otp}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("expired", response.data['detail'].lower())

    def test_05_correct_otp_is_accepted_and_returns_reset_token(self):
        """5. Correct OTP verification succeeds and returns secure reset token."""
        self.client.post(self.request_otp_url, {'username': 'caregiver@karunagrid.org'}, format='json')
        import re
        raw_otp = re.search(r'\b\d{6}\b', mail.outbox[0].body).group(0)

        response = self.client.post(self.verify_otp_url, {'username': 'caregiver@karunagrid.org', 'otp': raw_otp}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('reset_token', response.data)
        reset_token = response.data['reset_token']
        self.assertTrue(len(reset_token) > 20)

        otp_rec = PasswordResetOTP.objects.filter(user=self.caregiver_user).first()
        self.assertTrue(otp_rec.is_verified)
        self.assertTrue(check_password(reset_token, otp_rec.reset_token_hash))

    def test_06_incorrect_otp_is_rejected(self):
        """6. Incorrect OTP is rejected."""
        self.client.post(self.request_otp_url, {'username': 'caregiver@karunagrid.org'}, format='json')
        response = self.client.post(self.verify_otp_url, {'username': 'caregiver@karunagrid.org', 'otp': '000000'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid OTP", response.data['detail'])

        otp_rec = PasswordResetOTP.objects.filter(user=self.caregiver_user).first()
        self.assertEqual(otp_rec.attempt_count, 1)

    def test_07_verified_otp_cannot_be_verified_again(self):
        """7. Already verified OTP cannot be verified a second time."""
        self.client.post(self.request_otp_url, {'username': 'caregiver@karunagrid.org'}, format='json')
        import re
        raw_otp = re.search(r'\b\d{6}\b', mail.outbox[0].body).group(0)

        res1 = self.client.post(self.verify_otp_url, {'username': 'caregiver@karunagrid.org', 'otp': raw_otp}, format='json')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        res2 = self.client.post(self.verify_otp_url, {'username': 'caregiver@karunagrid.org', 'otp': raw_otp}, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already been verified", res2.data['detail'])

    def test_08_maximum_otp_attempts_are_enforced(self):
        """8. Maximum 5 incorrect attempts invalidate the OTP."""
        self.client.post(self.request_otp_url, {'username': 'patient@karunagrid.org'}, format='json')
        import re
        raw_otp = re.search(r'\b\d{6}\b', mail.outbox[0].body).group(0)

        # 4 incorrect attempts
        for i in range(4):
            res = self.client.post(self.verify_otp_url, {'username': 'patient@karunagrid.org', 'otp': f'11111{i}'}, format='json')
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # 5th incorrect attempt -> locks/invalidates OTP
        res5 = self.client.post(self.verify_otp_url, {'username': 'patient@karunagrid.org', 'otp': '999999'}, format='json')
        self.assertEqual(res5.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Too many incorrect attempts", res5.data['detail'])

        # Even correct OTP is now rejected because OTP is invalidated
        res_correct = self.client.post(self.verify_otp_url, {'username': 'patient@karunagrid.org', 'otp': raw_otp}, format='json')
        self.assertEqual(res_correct.status_code, status.HTTP_400_BAD_REQUEST)

    def test_09_resend_invalidates_old_otp(self):
        """9. Resending OTP invalidates previous OTP."""
        self.client.post(self.request_otp_url, {'username': 'doctor@karunagrid.org'}, format='json')
        import re
        old_otp = re.search(r'\b\d{6}\b', mail.outbox[0].body).group(0)

        # Fast forward past 60s cooldown
        old_otp_rec = PasswordResetOTP.objects.filter(user=self.doctor_user).first()
        old_otp_rec.created_at = timezone.now() - timedelta(seconds=65)
        old_otp_rec.save()

        # Resend OTP
        res_resend = self.client.post(self.resend_otp_url, {'username': 'doctor@karunagrid.org'}, format='json')
        self.assertEqual(res_resend.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 2)
        new_otp = re.search(r'\b\d{6}\b', mail.outbox[1].body).group(0)

        # Try to verify with old OTP -> should fail
        res_old = self.client.post(self.verify_otp_url, {'username': 'doctor@karunagrid.org', 'otp': old_otp}, format='json')
        self.assertEqual(res_old.status_code, status.HTTP_400_BAD_REQUEST)

        # Verify with new OTP -> succeeds
        res_new = self.client.post(self.verify_otp_url, {'username': 'doctor@karunagrid.org', 'otp': new_otp}, format='json')
        self.assertEqual(res_new.status_code, status.HTTP_200_OK)

    def test_10_resend_cooldown_enforced(self):
        """10. Resend requests within 60 seconds return 429 Too Many Requests."""
        self.client.post(self.request_otp_url, {'username': 'doctor@karunagrid.org'}, format='json')
        # Immediate resend attempt
        res = self.client.post(self.resend_otp_url, {'username': 'doctor@karunagrid.org'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn("wait", res.data['detail'].lower())

    def test_11_weak_password_is_rejected(self):
        """11. Weak passwords (missing uppercase, number, symbol, or too short) are rejected."""
        self.client.post(self.request_otp_url, {'username': 'admin@karunagrid.org'}, format='json')
        import re
        raw_otp = re.search(r'\b\d{6}\b', mail.outbox[0].body).group(0)
        verify_res = self.client.post(self.verify_otp_url, {'username': 'admin@karunagrid.org', 'otp': raw_otp}, format='json')
        reset_token = verify_res.data['reset_token']

        weak_passwords = [
            'short1!',          # too short
            'nouppercase123!',  # no uppercase
            'NOLOWERCASE123!',  # no lowercase
            'NoNumbersHere!',   # no digit
            'NoSpecial1234',    # no special char
        ]

        for weak_pwd in weak_passwords:
            res = self.client.post(self.reset_url, {
                'reset_token': reset_token,
                'new_password': weak_pwd,
                'confirm_password': weak_pwd,
            }, format='json')
            self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_12_password_mismatch_is_rejected(self):
        """12. Password mismatch is rejected."""
        self.client.post(self.request_otp_url, {'username': 'admin@karunagrid.org'}, format='json')
        import re
        raw_otp = re.search(r'\b\d{6}\b', mail.outbox[0].body).group(0)
        verify_res = self.client.post(self.verify_otp_url, {'username': 'admin@karunagrid.org', 'otp': raw_otp}, format='json')
        reset_token = verify_res.data['reset_token']

        res = self.client.post(self.reset_url, {
            'reset_token': reset_token,
            'new_password': 'BrandNewPassword123!',
            'confirm_password': 'DifferentPassword123!',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('confirm_password', res.data['errors'])

    def test_13_valid_password_successfully_resets_and_allows_login(self):
        """13. Valid password updates user password; old password fails, new password succeeds."""
        self.client.post(self.request_otp_url, {'username': 'doctor@karunagrid.org'}, format='json')
        import re
        raw_otp = re.search(r'\b\d{6}\b', mail.outbox[0].body).group(0)
        verify_res = self.client.post(self.verify_otp_url, {'username': 'doctor@karunagrid.org', 'otp': raw_otp}, format='json')
        reset_token = verify_res.data['reset_token']

        new_password = 'BrandNewDoctorPass999$'
        reset_res = self.client.post(self.reset_url, {
            'reset_token': reset_token,
            'new_password': new_password,
            'confirm_password': new_password,
        }, format='json')
        self.assertEqual(reset_res.status_code, status.HTTP_200_OK)
        self.assertIn("Password updated successfully", reset_res.data['message'])

        # 16. Login with new password succeeds
        login_new = self.client.post(self.login_url, {'email': 'doctor@karunagrid.org', 'password': new_password}, format='json')
        self.assertEqual(login_new.status_code, status.HTTP_200_OK)
        self.assertIn('access', login_new.data)

        # 17. Login with old password fails
        login_old = self.client.post(self.login_url, {'email': 'doctor@karunagrid.org', 'password': 'DoctorPassword123!'}, format='json')
        self.assertEqual(login_old.status_code, status.HTTP_400_BAD_REQUEST)

    def test_14_reset_token_cannot_be_reused(self):
        """14. Reset token cannot be reused after password update."""
        self.client.post(self.request_otp_url, {'username': 'doctor@karunagrid.org'}, format='json')
        import re
        raw_otp = re.search(r'\b\d{6}\b', mail.outbox[0].body).group(0)
        verify_res = self.client.post(self.verify_otp_url, {'username': 'doctor@karunagrid.org', 'otp': raw_otp}, format='json')
        reset_token = verify_res.data['reset_token']

        new_password = 'BrandNewDoctorPass999$'
        res1 = self.client.post(self.reset_url, {
            'reset_token': reset_token,
            'new_password': new_password,
            'confirm_password': new_password,
        }, format='json')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # Attempt to use same token again
        res2 = self.client.post(self.reset_url, {
            'reset_token': reset_token,
            'new_password': 'AnotherPass123!',
            'confirm_password': 'AnotherPass123!',
        }, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid or expired reset token", res2.data['detail'])

    def test_15_reset_token_expires(self):
        """15. Expired reset token is rejected."""
        self.client.post(self.request_otp_url, {'username': 'doctor@karunagrid.org'}, format='json')
        import re
        raw_otp = re.search(r'\b\d{6}\b', mail.outbox[0].body).group(0)
        verify_res = self.client.post(self.verify_otp_url, {'username': 'doctor@karunagrid.org', 'otp': raw_otp}, format='json')
        reset_token = verify_res.data['reset_token']

        # Fast forward token expiry
        otp_rec = PasswordResetOTP.objects.filter(user=self.doctor_user).first()
        otp_rec.token_expires_at = timezone.now() - timedelta(seconds=1)
        otp_rec.save()

        res = self.client.post(self.reset_url, {
            'reset_token': reset_token,
            'new_password': 'BrandNewDoctorPass999$',
            'confirm_password': 'BrandNewDoctorPass999$',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid or expired reset token", res.data['detail'])

    def test_20_all_user_roles_can_reset_password(self):
        """20. Test password reset flow works for Admin, Doctor, Nurse, Caregiver, Patient."""
        roles_users = [
            (self.admin_user, 'AdminNewPass123!'),
            (self.doctor_user, 'DoctorNewPass123!'),
            (self.nurse_user, 'NurseNewPass123!'),
            (self.caregiver_user, 'CaregiverNewPass123!'),
            (self.patient_user, 'PatientNewPass123!'),
        ]

        for user, new_pw in roles_users:
            mail.outbox = []
            res_req = self.client.post(self.request_otp_url, {'username': user.email}, format='json')
            self.assertEqual(res_req.status_code, status.HTTP_200_OK)

            import re
            raw_otp = re.search(r'\b\d{6}\b', mail.outbox[0].body).group(0)
            res_ver = self.client.post(self.verify_otp_url, {'username': user.email, 'otp': raw_otp}, format='json')
            self.assertEqual(res_ver.status_code, status.HTTP_200_OK)
            reset_token = res_ver.data['reset_token']

            res_rst = self.client.post(self.reset_url, {
                'reset_token': reset_token,
                'new_password': new_pw,
                'confirm_password': new_pw,
            }, format='json')
            self.assertEqual(res_rst.status_code, status.HTTP_200_OK)

            # Test login
            res_log = self.client.post(self.login_url, {'email': user.email, 'password': new_pw}, format='json')
            self.assertEqual(res_log.status_code, status.HTTP_200_OK)

    def test_20b_patient_can_use_registration_id_as_username(self):
        """20b. Patient can input their registration_id as username."""
        res_req = self.client.post(self.request_otp_url, {'username': 'PAT-2026-0001'}, format='json')
        self.assertEqual(res_req.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['patient@karunagrid.org'])

        import re
        raw_otp = re.search(r'\b\d{6}\b', mail.outbox[0].body).group(0)
        res_ver = self.client.post(self.verify_otp_url, {'username': 'PAT-2026-0001', 'otp': raw_otp}, format='json')
        self.assertEqual(res_ver.status_code, status.HTTP_200_OK)

    def test_21_pending_patient_registration_application_cannot_reset_password(self):
        """21. Pending PatientRegistrationApplication that is not yet a User cannot reset password."""
        app = PatientRegistrationApplication.objects.create(
            application_id='APP-2026-9999',
            name='Unapproved Applicant',
            email='unapproved.applicant@gmail.com',
            dob='1980-01-01',
            phone='9876543299',
            discharge_summary_path='test.pdf',
            registration_status=RegistrationStatus.PENDING,
        )

        res = self.client.post(self.request_otp_url, {'username': 'unapproved.applicant@gmail.com'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("If an account exists", res.data['message'])
        # No email should be sent because no User account exists
        self.assertEqual(len(mail.outbox), 0)

        # Cannot verify
        res_ver = self.client.post(self.verify_otp_url, {'username': 'unapproved.applicant@gmail.com', 'otp': '123456'}, format='json')
        self.assertEqual(res_ver.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('accounts.views.robust_send_mail')
    def test_22_email_sending_failure_handled_safely(self, mock_send_mail):
        """22. Email sending failure is handled safely without leaking internals."""
        mock_send_mail.side_effect = Exception("SMTP Connection timed out")

        res = self.client.post(self.request_otp_url, {'username': 'doctor@karunagrid.org'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn("We couldn't send the verification email right now", res.data['detail'])
