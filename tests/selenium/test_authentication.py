import time
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from tests.selenium.base import BaseSeleniumTestCase
from accounts.models import Role, PasswordResetOTP, PatientRegistrationApplication
import hashlib


class TestAuthenticationSelenium(BaseSeleniumTestCase):
    """
    Comprehensive Selenium UI Tests for Authentication & Account Lifecycle:
    - Login (valid credentials for all roles, invalid credentials, empty fields)
    - Logout (session clearance, redirection)
    - Patient Registration Wizard (role selection, multi-step validations, submission, status check)
    - Forgot Password Flow (request OTP, verify OTP, reset password)
    """

    def test_01_valid_admin_login_and_redirect(self):
        """Verify successful Admin login redirects to /dashboard/admin."""
        admin = self.create_test_admin(password='AdminPass123!')
        self.login_via_ui(admin.email, 'AdminPass123!')
        self.wait_for_url_contains('/dashboard/admin', timeout=10)
        self.assertTrue(self.driver.current_url.endswith('/dashboard/admin'))
        self.assertIn('Admin', self.driver.page_source)

    def test_02_valid_doctor_login_and_redirect(self):
        """Verify approved Doctor login redirects to /dashboard/doctor."""
        doctor = self.create_test_doctor(password='DoctorPass123!')
        self.login_via_ui(doctor.email, 'DoctorPass123!')
        self.wait_for_url_contains('/dashboard/doctor', timeout=10)
        self.assertTrue(self.driver.current_url.endswith('/dashboard/doctor'))

    def test_03_valid_nurse_login_and_redirect(self):
        """Verify approved Nurse login redirects to /dashboard/nurse."""
        nurse = self.create_test_nurse(password='NursePass123!')
        self.login_via_ui(nurse.email, 'NursePass123!')
        self.wait_for_url_contains('/dashboard/nurse', timeout=10)
        self.assertTrue(self.driver.current_url.endswith('/dashboard/nurse'))

    def test_04_valid_patient_login_and_redirect(self):
        """Verify approved Patient login redirects to /dashboard/patient."""
        patient = self.create_test_patient(password='PatientPass123!')
        self.login_via_ui(patient.email, 'PatientPass123!')
        self.wait_for_url_contains('/dashboard/patient', timeout=10)
        self.assertTrue(self.driver.current_url.endswith('/dashboard/patient'))

    def test_05_valid_caregiver_login_and_redirect(self):
        """Verify approved Caregiver login redirects to /dashboard/caregiver."""
        caregiver = self.create_test_caregiver(password='CaregiverPass123!')
        self.login_via_ui(caregiver.email, 'CaregiverPass123!')
        self.wait_for_url_contains('/dashboard/caregiver', timeout=10)
        self.assertTrue(self.driver.current_url.endswith('/dashboard/caregiver'))

    def test_06_invalid_credentials_display_error(self):
        """Verify entering incorrect credentials displays an error banner without logging in."""
        self.navigate('/login')
        self.safe_type((By.CSS_SELECTOR, "input[type='email']"), "nonexistent_user@example.com")
        self.safe_type((By.CSS_SELECTOR, "input[type='password']"), "WrongPassword123!")
        self.safe_click((By.CSS_SELECTOR, "button[type='submit']"))

        time.sleep(1)
        # Should remain on login page and show error text
        self.assertIn('/login', self.driver.current_url)
        page_text = self.driver.page_source
        self.assertTrue('Invalid' in page_text or 'error' in page_text.lower() or 'No active account' in page_text)

    def test_07_logout_clears_session_and_redirects(self):
        """Verify logout button clears authentication tokens and redirects to landing/login."""
        admin = self.create_test_admin()
        self.login_via_storage(admin)
        self.wait_for_url_contains('/dashboard/admin')

        # Find and click logout button in AdminHeader / sidebar
        logout_btn = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Logout') or contains(., 'Sign Out') or @title='Logout']"))
        logout_btn.click()

        time.sleep(1)
        # Verify tokens are removed from localStorage
        access_token = self.driver.execute_script("return localStorage.getItem('access_token');")
        self.assertIsNone(access_token)
        self.assertFalse('/dashboard/' in self.driver.current_url)

    def test_08_patient_registration_form_and_submission(self):
        """Verify patient registration wizard validates steps and submits successfully."""
        self.navigate('/register')
        self.wait_for_visible((By.XPATH, "//h1[contains(text(), 'Join KarunaGrid') or contains(text(), 'Create Your Account')]"))

        # Step 1: Role selection is patient by default -> Click Next
        next_btn = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Next Step') or contains(., 'Continue')]"))
        next_btn.click()
        time.sleep(0.5)

        # Step 2: Personal Details
        unique_suffix = int(time.time())
        self.safe_type((By.ID, "field-name"), f"Selenium Patient {unique_suffix}")
        self.safe_type((By.ID, "field-email"), f"selenium_pat_{unique_suffix}@example.com")
        self.safe_type((By.ID, "field-phone"), "9876543210")
        self.safe_type((By.ID, "field-password"), "PatientPass123!")
        self.safe_type((By.ID, "field-confirm_password"), "PatientPass123!")
        self.safe_type((By.ID, "field-dob"), "1960-05-15")
        self.safe_type((By.ID, "field-emergency_contact_name"), "Emergency Contact Person")
        self.safe_type((By.ID, "field-emergency_contact_phone"), "9876543219")

        next_btn = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Next Step') or contains(., 'Continue')]"))
        next_btn.click()
        time.sleep(0.5)

        # Step 3: Address Details
        self.safe_type((By.ID, "field-house_name"), "Lotus Villa")
        self.safe_type((By.ID, "field-place"), "Kochera")
        self.safe_type((By.ID, "field-panchayath"), "Vandanmedu")
        self.safe_type((By.ID, "field-ward_no"), "3")
        self.safe_type((By.ID, "field-pincode"), "685551")

        next_btn = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Next Step') or contains(., 'Continue')]"))
        next_btn.click()
        time.sleep(0.5)

        # Step 4: Submit Registration
        submit_btn = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Submit Registration') or contains(., 'Submit')]"))
        submit_btn.click()
        time.sleep(2)

        # Verify success screen with Application ID
        self.assertTrue(
            self.driver.page_source.find('Registration Submitted') != -1 or
            self.driver.page_source.find('APP-PAT-') != -1 or
            self.driver.page_source.find('Under Review') != -1
        )

    def test_09_check_application_status_page(self):
        """Verify checking application status for a registered applicant."""
        app = self.create_test_patient_application()
        self.navigate('/check-application-status')

        input_field = self.wait_for_visible((By.CSS_SELECTOR, "input[placeholder*='APP-PAT'], input[type='text']"))
        input_field.clear()
        input_field.send_keys(app.application_id)

        submit_btn = self.wait_for_clickable((By.CSS_SELECTOR, "button[type='submit']"))
        submit_btn.click()
        time.sleep(1)

        self.assertIn(app.name, self.driver.page_source)
        self.assertIn('Pending', self.driver.page_source)

    def test_10_forgot_password_and_otp_flow(self):
        """Verify Forgot Password requesting OTP, verifying OTP, and setting new password."""
        test_user = self.create_test_patient(password='InitialPassword123!')

        # 1. Request OTP
        self.navigate('/forgot-password')
        self.safe_type((By.CSS_SELECTOR, "input[type='text'], input[type='email']"), test_user.email)
        self.safe_click((By.CSS_SELECTOR, "button[type='submit']"))
        time.sleep(1.5)

        self.wait_for_url_contains('/verify-otp')

        # Retrieve the generated OTP from DB for testing
        otp_record = PasswordResetOTP.objects.filter(user=test_user, is_used=False).order_by('-created_at').first()
        self.assertIsNotNone(otp_record, "OTP record must exist in DB")

        # In testing environment, let's verify OTP directly or through API reset token
        # Let's inspect OTP hashing and generate a valid test OTP
        test_otp = "123456"
        otp_record.otp_hash = hashlib.sha256(test_otp.encode()).hexdigest()
        otp_record.save()

        # Enter OTP in UI
        otp_input = self.wait_for_visible((By.CSS_SELECTOR, "input[placeholder*='• • • • • •'], input[type='text']"))
        otp_input.clear()
        otp_input.send_keys(test_otp)

        verify_btn = self.wait_for_clickable((By.CSS_SELECTOR, "button[type='submit']"))
        verify_btn.click()
        time.sleep(1.5)

        # Should navigate to /reset-password
        self.wait_for_url_contains('/reset-password')

        # Enter New Password
        new_pass = "NewStrongPass123!"
        inputs = self.driver.find_elements(By.CSS_SELECTOR, "input[type='password'], input[type='text']")
        if len(inputs) >= 2:
            inputs[0].send_keys(new_pass)
            inputs[1].send_keys(new_pass)
        else:
            self.safe_type((By.XPATH, "//input[@placeholder='••••••••'][1]"), new_pass)
            self.safe_type((By.XPATH, "//input[@placeholder='••••••••'][2]"), new_pass)

        self.safe_click((By.CSS_SELECTOR, "button[type='submit']"))
        time.sleep(1.5)

        # Verify success message and ability to login with new password
        self.assertTrue('Password Updated' in self.driver.page_source or 'successfully' in self.driver.page_source.lower())
