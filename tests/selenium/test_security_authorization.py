import time
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from tests.selenium.base import BaseSeleniumTestCase


class TestSecurityAuthorizationSelenium(BaseSeleniumTestCase):
    """
    Selenium UI tests for Role-Based Access Control (RBAC) & Route Security:
    - Direct access without token redirects to /login
    - Patient trying to access /dashboard/admin is redirected to /dashboard/patient
    - Nurse trying to access /dashboard/admin is redirected to /dashboard/nurse
    - Doctor trying to access /dashboard/admin is redirected to /dashboard/doctor
    - Caregiver trying to access /dashboard/admin is redirected to /dashboard/caregiver
    """

    def test_01_unauthenticated_user_redirected_to_login(self):
        """Verify unauthenticated user cannot access protected dashboard routes."""
        protected_routes = [
            '/dashboard/admin',
            '/dashboard/doctor',
            '/dashboard/nurse',
            '/dashboard/patient',
            '/dashboard/caregiver'
        ]

        for route in protected_routes:
            self.navigate(route)
            time.sleep(0.5)
            self.assertTrue(
                self.driver.current_url.endswith('/login') or
                self.driver.current_url.endswith('/') or
                '/login' in self.driver.current_url,
                f"Route {route} did not redirect unauthenticated user to /login"
            )

    def test_02_patient_cannot_access_admin_dashboard(self):
        """Verify Patient cannot access Admin dashboard (role mismatch auto-redirection)."""
        patient = self.create_test_patient()
        self.login_via_storage(patient)

        # Attempt navigating to admin dashboard
        self.navigate('/dashboard/admin')
        time.sleep(1)

        # Should be redirected to patient dashboard or login
        self.assertNotIn('/dashboard/admin', self.driver.current_url)
        self.assertIn('/dashboard/patient', self.driver.current_url)

    def test_03_nurse_cannot_access_doctor_dashboard(self):
        """Verify Nurse cannot access Doctor dashboard."""
        nurse = self.create_test_nurse()
        self.login_via_storage(nurse)

        self.navigate('/dashboard/doctor')
        time.sleep(1)

        self.assertNotIn('/dashboard/doctor', self.driver.current_url)
        self.assertIn('/dashboard/nurse', self.driver.current_url)

    def test_04_doctor_cannot_access_admin_dashboard(self):
        """Verify Doctor cannot access Admin dashboard."""
        doctor = self.create_test_doctor()
        self.login_via_storage(doctor)

        self.navigate('/dashboard/admin')
        time.sleep(1)

        self.assertNotIn('/dashboard/admin', self.driver.current_url)
        self.assertIn('/dashboard/doctor', self.driver.current_url)

    def test_05_caregiver_cannot_access_admin_dashboard(self):
        """Verify Caregiver cannot access Admin dashboard."""
        cg = self.create_test_caregiver()
        self.login_via_storage(cg)

        self.navigate('/dashboard/admin')
        time.sleep(1)

        self.assertNotIn('/dashboard/admin', self.driver.current_url)
        self.assertIn('/dashboard/caregiver', self.driver.current_url)
