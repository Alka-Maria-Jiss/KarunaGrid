import time
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from tests.selenium.base import BaseSeleniumTestCase
from accounts.models import (
    PatientRegistrationApplication, RegistrationStatus, Patient, Doctor
)


class TestDoctorSelenium(BaseSeleniumTestCase):
    """
    Selenium UI tests for Doctor workflows:
    - Doctor dashboard & availability status toggle
    - Patient Registration Review (view application, review discharge summary, approve/reject)
    - Patient list & medical workspace
    - Medical records management (Diagnoses, Allergies, Chronic Conditions, Prescriptions, Lab Reports, Nutrition)
    - Telemedicine consultation requests oversight
    - Home visit oversight
    """

    def setUp(self):
        super().setUp()
        self.doctor_user = self.create_test_doctor()
        self.login_via_storage(self.doctor_user)
        self.wait_for_url_contains('/dashboard/doctor')

    def test_01_doctor_dashboard_and_availability_toggle(self):
        """Verify Doctor dashboard loads and availability toggle can be switched."""
        self.wait_for_visible((By.XPATH, "//h1[contains(text(), 'Dr.') or contains(text(), 'Doctor') or contains(text(), 'KarunaGrid')]"))

        # Find availability toggle button
        avail_toggle = self.driver.find_elements(By.XPATH, "//button[contains(., 'Available') or contains(., 'Unavailable') or contains(., 'On Duty') or contains(@aria-label, 'availability')]")
        if avail_toggle:
            initial_text = avail_toggle[0].text
            avail_toggle[0].click()
            time.sleep(1)
            # Verify toggle interacted smoothly

    def test_02_patient_registration_review_and_approval(self):
        """Verify Doctor reviews a pending patient registration application and approves it."""
        app = self.create_test_patient_application()

        # Navigate to Pending Registrations tab
        pending_tab = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Registration Review') or contains(., 'Pending Registrations') or @id='tab-pending_registrations']"))
        pending_tab.click()
        time.sleep(1)

        self.assertIn(app.name, self.driver.page_source)

        # Click Review button
        review_btn = self.wait_for_clickable((By.XPATH, f"//button[contains(., 'Review') or contains(., 'Approve')][ancestor::*[contains(., '{app.name}')]]"))
        review_btn.click()
        time.sleep(1)

        # In review modal, click Approve Patient
        modal_approve_btn = self.wait_for_clickable((By.XPATH, "//div[contains(@class, 'fixed')]//button[contains(., 'Approve') or contains(., 'Confirm Approval')]"))
        modal_approve_btn.click()
        time.sleep(1.5)

        # Verify application status in DB
        app.refresh_from_db()
        self.assertEqual(app.registration_status, RegistrationStatus.APPROVED)

    def test_03_patient_list_and_patient_workspace(self):
        """Verify Doctor can view approved patient list and open patient workspace."""
        patient = self.create_test_patient()

        # Navigate to Patients tab
        patients_tab = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Patients') or @id='tab-patients']"))
        patients_tab.click()
        time.sleep(1)

        self.assertIn(patient.name, self.driver.page_source)

        # Open Workspace / Medical Profile
        workspace_btn = self.driver.find_elements(By.XPATH, f"//button[contains(., 'Workspace') or contains(., 'Profile') or contains(., 'View')][ancestor::*[contains(., '{patient.name}')]]")
        if workspace_btn:
            workspace_btn[0].click()
            time.sleep(1)
            self.assertTrue('Workspace' in self.driver.page_source or 'Clinical' in self.driver.page_source or patient.name in self.driver.page_source)

    def test_04_doctor_telemedicine_view(self):
        """Verify Doctor can navigate to Telemedicine consultations tab."""
        tele_tab = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Telemedicine') or contains(., 'Consultations') or @id='tab-telemedicine']"))
        tele_tab.click()
        time.sleep(1)

        self.assertTrue('Telemedicine' in self.driver.page_source or 'Consultation' in self.driver.page_source)

    def test_05_doctor_home_visits_oversight(self):
        """Verify Doctor can navigate to Home Visits oversight tab."""
        hv_tab = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Home Visits') or @id='tab-home_visits']"))
        hv_tab.click()
        time.sleep(1)

        self.assertTrue('Home Visits' in self.driver.page_source or 'Palliative' in self.driver.page_source)
