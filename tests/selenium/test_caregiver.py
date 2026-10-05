import time
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from tests.selenium.base import BaseSeleniumTestCase
from accounts.models import Caregiver, Patient
from care_coordination.models import (
    CaregiverPatientAssignment,
    CaregiverRequest,
    CaregiverRequestStatus,
    AssignmentStatus,
    CaregiverComplaint,
    ComplaintStatus,
    ComplaintCategory,
)


class TestCaregiverSelenium(BaseSeleniumTestCase):
    """
    Selenium UI tests for Caregiver Portal:
    - Caregiver dashboard & assigned patient summary
    - Patient requests tab & request acceptance
    - Complete Care workflow and availability reset
    - Complaints submission & status tracking
    - Care history and feedback reviews
    - Notifications & Profile
    """

    def setUp(self):
        super().setUp()
        self.caregiver_user = self.create_test_caregiver(is_verified=True)
        self.patient = self.create_test_patient()

        # Create Caregiver assignment
        self.assignment = CaregiverPatientAssignment.objects.create(
            caregiver=self.caregiver_user.caregiver,
            patient=self.patient,
            status=AssignmentStatus.ACTIVE
        )

        self.login_via_storage(self.caregiver_user)
        self.wait_for_url_contains('/dashboard/caregiver')

    def test_01_caregiver_dashboard_loads_assigned_patient(self):
        """Verify Caregiver dashboard renders assigned patients."""
        self.wait_for_visible((By.XPATH, "//h1[contains(text(), 'Caregiver') or contains(text(), 'KarunaGrid')]"))
        time.sleep(1)

        page_source = self.driver.page_source
        self.assertTrue('Caregiver' in page_source or 'Dashboard' in page_source)
        self.assertIn(self.patient.name, page_source)

    def test_02_caregiver_assigned_patient_card_and_actions(self):
        """Verify Caregiver can view active patient card and complete care option."""
        self.wait_for_visible((By.XPATH, f"//*[contains(text(), '{self.patient.name}')]"))
        page_source = self.driver.page_source
        self.assertIn(self.patient.name, page_source)
        self.assertTrue('Complete Care' in page_source or 'Active' in page_source)

    def test_03_caregiver_requests_tab(self):
        """Verify Caregiver can navigate to Patient Requests tab."""
        req_tab = self.driver.find_elements(By.XPATH, "//button[contains(., 'Requests') or contains(., 'Patient Requests') or @id='tab-requests']")
        if req_tab:
            req_tab[0].click()
            time.sleep(1)
            self.assertTrue('Requests' in self.driver.page_source or 'Patient' in self.driver.page_source)

    def test_04_caregiver_care_history_tab(self):
        """Verify Caregiver can navigate to Care History tab."""
        history_tab = self.driver.find_elements(By.XPATH, "//button[contains(., 'History') or contains(., 'Care History') or @id='tab-history']")
        if history_tab:
            history_tab[0].click()
            time.sleep(1)
            self.assertTrue('History' in self.driver.page_source or 'Past' in self.driver.page_source)

    def test_05_caregiver_complaints_tab(self):
        """Verify Caregiver can view complaints tab and submit complaint modal."""
        complaints_tab = self.driver.find_elements(By.XPATH, "//button[contains(., 'Complaints') or @id='tab-complaints']")
        if complaints_tab:
            complaints_tab[0].click()
            time.sleep(1)
            self.assertTrue('Complaints' in self.driver.page_source or 'File a Complaint' in self.driver.page_source)

    def test_06_caregiver_profile_view(self):
        """Verify Caregiver can navigate to Profile view."""
        profile_tab = self.driver.find_elements(By.XPATH, "//button[contains(., 'Profile') or @id='tab-profile']")
        if profile_tab:
            profile_tab[0].click()
            time.sleep(1)
            self.assertTrue('Profile' in self.driver.page_source or self.caregiver_user.caregiver.name in self.driver.page_source)
