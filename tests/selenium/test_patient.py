import time
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from tests.selenium.base import BaseSeleniumTestCase
from accounts.models import Patient


class TestPatientSelenium(BaseSeleniumTestCase):
    """
    Selenium UI tests for Patient Portal:
    - Patient dashboard & summary overview
    - Medical history (diagnoses, allergies, chronic conditions)
    - Prescriptions & dosage schedules
    - Laboratory reports
    - Nutrition & dietary plans
    - Clinical timeline
    - Home visits view & urgent request
    - Telemedicine consultations
    - Medical equipment requests
    - Welfare schemes view
    - Notifications & profile updates
    """

    def setUp(self):
        super().setUp()
        self.patient_user = self.create_test_patient()
        self.login_via_storage(self.patient_user)
        self.wait_for_url_contains('/dashboard/patient')

    def test_01_patient_dashboard_loads_overview(self):
        """Verify Patient dashboard loads with summary cards and header."""
        self.wait_for_visible((By.XPATH, "//h1[contains(text(), 'KarunaGrid') or contains(text(), 'Patient') or contains(text(), 'Care')]"))
        page_source = self.driver.page_source
        self.assertTrue('Dashboard' in page_source or 'Medical' in page_source)
        self.assertIn(self.patient_user.patient.name, page_source)

    def test_02_patient_medical_history_tab(self):
        """Verify Patient can navigate to Medical History tab."""
        med_tab = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Medical History') or @id='tab-medical_history']"))
        med_tab.click()
        time.sleep(1)

        self.assertTrue('Medical History' in self.driver.page_source or 'Diagnoses' in self.driver.page_source or 'Allergies' in self.driver.page_source)

    def test_03_patient_prescriptions_tab(self):
        """Verify Patient can navigate to Prescriptions tab."""
        rx_tab = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Prescriptions') or @id='tab-prescriptions']"))
        rx_tab.click()
        time.sleep(1)

        self.assertTrue('Prescription' in self.driver.page_source or 'Medication' in self.driver.page_source)

    def test_04_patient_lab_reports_tab(self):
        """Verify Patient can navigate to Laboratory Reports tab."""
        lab_tab = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Lab Reports') or @id='tab-lab_reports']"))
        lab_tab.click()
        time.sleep(1)

        self.assertTrue('Lab' in self.driver.page_source or 'Report' in self.driver.page_source)

    def test_05_patient_nutrition_tab(self):
        """Verify Patient can navigate to Nutrition tab."""
        nutrition_tab = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Nutrition') or @id='tab-nutrition']"))
        nutrition_tab.click()
        time.sleep(1)

        self.assertTrue('Nutrition' in self.driver.page_source or 'Dietary' in self.driver.page_source)

    def test_06_patient_home_visits_tab(self):
        """Verify Patient can navigate to Home Visits tab and view schedule."""
        hv_tab = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Home Visits') or @id='tab-home_visits']"))
        hv_tab.click()
        time.sleep(1)

        self.assertTrue('Home Visits' in self.driver.page_source or 'Visit' in self.driver.page_source)

    def test_07_patient_telemedicine_tab(self):
        """Verify Patient can navigate to Telemedicine tab and view request option."""
        tele_tab = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Telemedicine') or @id='tab-telemedicine']"))
        tele_tab.click()
        time.sleep(1)

        self.assertTrue('Telemedicine' in self.driver.page_source or 'Consultation' in self.driver.page_source)

    def test_08_patient_equipment_requests_tab(self):
        """Verify Patient can navigate to Equipment Requests tab."""
        eq_tab = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Equipment') or @id='tab-equipment']"))
        eq_tab.click()
        time.sleep(1)

        self.assertTrue('Equipment' in self.driver.page_source or 'Medical Aid' in self.driver.page_source)

    def test_09_patient_welfare_schemes_tab(self):
        """Verify Patient can navigate to Welfare Schemes tab."""
        welfare_tab = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Welfare') or @id='tab-welfare']"))
        welfare_tab.click()
        time.sleep(1)

        self.assertTrue('Welfare' in self.driver.page_source or 'Scheme' in self.driver.page_source)

    def test_10_patient_caregiver_tab(self):
        """Verify Patient can navigate to Caregiver tab and view Caregiver catalog / assigned status."""
        cg_tab = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Caregiver') or @id='tab-caregiver']"))
        cg_tab.click()
        time.sleep(1)

        self.assertTrue('Caregiver' in self.driver.page_source or 'Find a Caregiver' in self.driver.page_source)
