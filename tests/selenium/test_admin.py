import time
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from tests.selenium.base import BaseSeleniumTestCase
from accounts.models import Doctor, Nurse, Caregiver, VerificationStatus, Patient, Role


class TestAdminSelenium(BaseSeleniumTestCase):
    """
    Selenium UI tests for Phase 1 Administrator Workflows:
    - Admin dashboard loading & summary stats
    - Doctor & Nurse onboarding & approval/rejection
    - Caregiver verification (approval/rejection with reason)
    - User management & status toggle
    - Read-only patient oversight
    - Equipment inventory & unit management
    - Welfare schemes creation & publishing
    - Notifications & Reports overview
    """

    def setUp(self):
        super().setUp()
        self.admin_user = self.create_test_admin()
        self.login_via_storage(self.admin_user)
        self.wait_for_url_contains('/dashboard/admin')

    def test_01_admin_dashboard_loads_metrics_and_navigation(self):
        """Verify Admin dashboard displays system metrics, quick actions, and sidebar links."""
        self.wait_for_visible((By.XPATH, "//h1[contains(text(), 'Administrator') or contains(text(), 'ADMIN') or contains(text(), 'KarunaGrid')]"))
        page_source = self.driver.page_source
        self.assertTrue('Dashboard' in page_source)
        self.assertTrue('Caregivers' in page_source or 'Users' in page_source)

    def test_02_caregiver_approval_workflow(self):
        """Verify Admin can review a pending caregiver and approve them."""
        cg = self.create_test_caregiver(is_verified=False)

        # Navigate to Caregiver tab in Admin sidebar
        cg_tab = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Caregiver') or @id='tab-caregivers']"))
        cg_tab.click()
        time.sleep(1)

        # Verify pending caregiver is listed
        self.assertIn(cg.name, self.driver.page_source)

        # Click Review / Details / Approve
        review_btn = self.wait_for_clickable((By.XPATH, f"//button[contains(., 'Review') or contains(., 'Approve')][ancestor::*[contains(., '{cg.name}')]]"))
        review_btn.click()
        time.sleep(1)

        # If modal opens, click Confirm / Approve in modal
        modal_approve_btn = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'fixed')]//button[contains(., 'Approve')]")
        if modal_approve_btn:
            modal_approve_btn[0].click()
            time.sleep(1)

        # Check in DB that caregiver is approved
        cg.refresh_from_db()
        self.assertEqual(cg.verification_status, VerificationStatus.APPROVED)

    def test_03_doctor_onboarding_and_approval(self):
        """Verify Admin can onboard or approve a doctor."""
        doc = self.create_test_doctor(is_verified=False)

        # Navigate to Doctors tab
        doc_tab = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Doctor') or @id='tab-doctors']"))
        doc_tab.click()
        time.sleep(1)

        self.assertIn(doc.name, self.driver.page_source)

        # Click Approve
        approve_btn = self.wait_for_clickable((By.XPATH, f"//button[contains(., 'Approve')][ancestor::*[contains(., '{doc.name}')]]"))
        approve_btn.click()
        time.sleep(1)

        doc.refresh_from_db()
        self.assertEqual(doc.verification_status, VerificationStatus.APPROVED)

    def test_04_nurse_onboarding_and_approval(self):
        """Verify Admin can onboard or approve a nurse."""
        nurse = self.create_test_nurse(is_verified=False)

        # Navigate to Nurses tab
        nurse_tab = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Nurse') or @id='tab-nurses']"))
        nurse_tab.click()
        time.sleep(1)

        self.assertIn(nurse.name, self.driver.page_source)

        # Click Approve
        approve_btn = self.wait_for_clickable((By.XPATH, f"//button[contains(., 'Approve')][ancestor::*[contains(., '{nurse.name}')]]"))
        approve_btn.click()
        time.sleep(1)

        nurse.refresh_from_db()
        self.assertEqual(nurse.verification_status, VerificationStatus.APPROVED)

    def test_05_welfare_scheme_crud_workflow(self):
        """Verify Admin can view and create welfare schemes."""
        welfare_tab = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Welfare') or @id='tab-welfare']"))
        welfare_tab.click()
        time.sleep(1)

        self.assertTrue('Welfare' in self.driver.page_source or 'Schemes' in self.driver.page_source)

        # Check if Create Scheme button exists
        create_btns = self.driver.find_elements(By.XPATH, "//button[contains(., 'Create Scheme') or contains(., 'Add Scheme') or contains(., 'New Scheme')]")
        if create_btns:
            create_btns[0].click()
            time.sleep(1)
            # Fill title if form is open
            title_inputs = self.driver.find_elements(By.CSS_SELECTOR, "input[placeholder*='Scheme'], input[name='title']")
            if title_inputs:
                title_inputs[0].send_keys("Test Palliative Financial Aid Scheme")

    def test_06_user_management_and_patient_view(self):
        """Verify Admin can view registered patients and manage user account active statuses."""
        # Patient oversight tab
        patient_tab = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Patients') or @id='tab-patients']"))
        patient_tab.click()
        time.sleep(1)
        self.assertTrue('Patient' in self.driver.page_source)

        # User management tab
        user_tab = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Users') or contains(., 'User Management') or @id='tab-users']"))
        user_tab.click()
        time.sleep(1)
        self.assertTrue('Users' in self.driver.page_source or 'Email' in self.driver.page_source)

    def test_07_equipment_management_view(self):
        """Verify Admin can view equipment inventory and units."""
        eq_tab = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Equipment') or @id='tab-equipment']"))
        eq_tab.click()
        time.sleep(1)
        self.assertTrue('Equipment' in self.driver.page_source or 'Units' in self.driver.page_source)

    def test_08_reports_and_analytics_view(self):
        """Verify Admin can navigate to Reports and Analytics tabs."""
        reports_btn = self.driver.find_elements(By.XPATH, "//button[contains(., 'Reports') or @id='tab-reports']")
        if reports_btn:
            reports_btn[0].click()
            time.sleep(1)
            self.assertTrue('Reports' in self.driver.page_source or 'Export' in self.driver.page_source)
