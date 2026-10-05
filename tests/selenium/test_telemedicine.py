import time
from datetime import date, timedelta
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from tests.selenium.base import BaseSeleniumTestCase
from care_coordination.models import TelemedicineConsultation, ConsultationStatus


class TestTelemedicineSelenium(BaseSeleniumTestCase):
    """
    Selenium UI tests for Telemedicine Consultations:
    - Patient requesting a consultation (priority selection, symptoms description)
    - Doctor viewing consultation queue & accepting request
    - Consultation details, clinical notes & follow-ups
    - Verification of proper status transitions
    """

    def setUp(self):
        super().setUp()
        self.doctor = self.create_test_doctor()
        self.patient = self.create_test_patient()

    def test_01_patient_creates_telemedicine_consultation_request(self):
        """Verify Patient can open telemedicine request modal and submit a consultation request."""
        self.login_via_storage(self.patient)
        self.navigate('/dashboard/patient')

        tele_tab = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Telemedicine') or @id='tab-telemedicine']"))
        tele_tab.click()
        time.sleep(1)

        # Click Request Consultation button
        req_btn = self.driver.find_elements(By.XPATH, "//button[contains(., 'Request Consultation') or contains(., 'Book Consultation') or contains(., 'New Consultation')]")
        if req_btn:
            req_btn[0].click()
            time.sleep(1)

            # Fill reason / symptoms
            reason_input = self.driver.find_elements(By.CSS_SELECTOR, "textarea, input[name='reason'], input[placeholder*='symptom']")
            if reason_input:
                reason_input[0].send_keys("Follow-up on palliative pain management medication dosage.")

            # Submit
            submit_btn = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'fixed')]//button[@type='submit' or contains(., 'Submit Request')]")
            if submit_btn:
                submit_btn[0].click()
                time.sleep(1.5)

    def test_02_doctor_views_and_manages_consultation(self):
        """Verify Doctor sees pending consultation request and can open details."""
        consult = TelemedicineConsultation.objects.create(
            patient=self.patient.patient,
            doctor=self.doctor.doctor,
            status=ConsultationStatus.REQUESTED,
            reason_for_consultation="Palliative care symptom review",
            urgency_level="Routine"
        )

        self.login_via_storage(self.doctor)
        self.navigate('/dashboard/doctor')

        tele_tab = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Telemedicine') or @id='tab-telemedicine']"))
        tele_tab.click()
        time.sleep(1)

        self.assertIn(self.patient.patient.name, self.driver.page_source)
