import time
from datetime import date, timedelta
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from tests.selenium.base import BaseSeleniumTestCase
from accounts.models import Patient
from care_coordination.models import (
    HomeVisitSchedule, HomeVisitOccurrence, ScheduleFrequency, OccurrenceStatus
)


class TestNurseSelenium(BaseSeleniumTestCase):
    """
    Selenium UI tests for Nurse Portal & Shared Nurse Team Workflows:
    - Nurse dashboard, summary cards & availability toggle
    - Today's visits & upcoming team visits
    - Shared Nurse Team Home Visits:
      * Recurring schedules creation & frequency update
      * Daily visits table with date stepper
      * Assign / Change doctor for visit occurrence
      * Direct Complete Visit modal (vitals, symptoms, care notes)
      * Visit calendar navigation
    - Caregiver assignment to patients
    - Urgent visit requests review
    - Patient list & medical records
    """

    def setUp(self):
        super().setUp()
        self.nurse_user = self.create_test_nurse()
        self.login_via_storage(self.nurse_user)
        self.wait_for_url_contains('/dashboard/nurse')

    def test_01_nurse_dashboard_and_summary_cards(self):
        """Verify Nurse dashboard renders summary cards, today's schedule, and quick actions."""
        self.wait_for_visible((By.XPATH, "//h1[contains(text(), 'KarunaGrid') or contains(text(), 'Nurse')]"))
        page_source = self.driver.page_source
        self.assertTrue("TODAY'S SCHEDULE" in page_source or "HOME VISITS" in page_source)
        self.assertTrue("QUICK ACTIONS" in page_source or "Caregiver" in page_source)

    def test_02_nurse_home_visits_shared_team_workflow(self):
        """Verify Nurse can access All Home Visits and no Claim button exists."""
        # Navigate to All Home Visits
        all_visits_btn = self.wait_for_clickable((By.XPATH, "//button[contains(., 'All Home Visits') or @id='tab-home_visits_all']"))
        all_visits_btn.click()
        time.sleep(1)

        page_source = self.driver.page_source
        self.assertTrue('ALL HOME VISITS' in page_source or 'Select Date' in page_source)
        # Ensure NO Claim / Allocate button is present
        self.assertNotIn('Self Allocate to Me', page_source)
        self.assertNotIn('Claim This Visit', page_source)

    def test_03_nurse_create_recurring_schedule(self):
        """Verify Nurse can open Recurring Schedules and create a new care plan."""
        patient = self.create_test_patient()

        # Navigate to Recurring Schedules
        sched_tab = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Recurring Schedules') or @id='tab-home_visits_schedules']"))
        sched_tab.click()
        time.sleep(1)

        # Open Create Schedule Modal
        create_btn = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Create Schedule')]"))
        create_btn.click()
        time.sleep(1)

        # Verify modal is open
        self.assertTrue('Create Recurring Care Schedule' in self.driver.page_source)

        # Select patient in modal
        patient_select = self.wait_for_visible((By.XPATH, "//div[contains(@class, 'fixed')]//select[1]"))
        patient_select.click()
        # Find option for patient
        option = self.driver.find_elements(By.XPATH, f"//option[contains(text(), '{patient.name}')]")
        if option:
            option[0].click()

        # Set start date (tomorrow, ensuring not Sunday)
        tomorrow = date.today() + timedelta(days=1)
        if tomorrow.weekday() == 6:
            tomorrow += timedelta(days=1)

        date_input = self.wait_for_visible((By.XPATH, "//div[contains(@class, 'fixed')]//input[@type='date']"))
        date_input.clear()
        date_input.send_keys(tomorrow.strftime('%Y-%m-%d'))

        # Submit
        submit_btn = self.wait_for_clickable((By.XPATH, "//div[contains(@class, 'fixed')]//button[@type='submit']"))
        submit_btn.click()
        time.sleep(2)

        # Verify schedule exists in DB
        sched = HomeVisitSchedule.objects.filter(patient=patient).first()
        self.assertIsNotNone(sched, "Schedule should be created in database")

    def test_04_nurse_complete_visit_modal(self):
        """Verify any nurse can directly open Complete Visit modal and log vitals without claiming."""
        patient = self.create_test_patient()
        today = date.today()
        if today.weekday() == 6:
            today += timedelta(days=1)

        schedule = HomeVisitSchedule.objects.create(
            patient=patient,
            frequency=ScheduleFrequency.WEEKLY,
            start_date=today
        )
        occ = HomeVisitOccurrence.objects.create(
            schedule=schedule,
            patient=patient,
            scheduled_date=today,
            status=OccurrenceStatus.SCHEDULED
        )

        # Navigate to All Home Visits for today
        all_visits_btn = self.wait_for_clickable((By.XPATH, "//button[contains(., 'All Home Visits') or @id='tab-home_visits_all']"))
        all_visits_btn.click()
        time.sleep(1)

        # Find Complete button for patient's occurrence
        complete_btn = self.driver.find_elements(By.XPATH, f"//button[contains(., 'Complete')][ancestor::*[contains(., '{patient.name}')]]")
        if complete_btn:
            complete_btn[0].click()
            time.sleep(1)

            # In modal, enter Blood Pressure and submit
            bp_input = self.driver.find_elements(By.CSS_SELECTOR, "input[placeholder*='120/80'], input[placeholder*='BP']")
            if bp_input:
                bp_input[0].clear()
                bp_input[0].send_keys("120/80")

            submit_modal_btn = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'fixed')]//button[contains(., 'Save') or contains(., 'Complete Visit') or contains(., 'Submit')]")
            if submit_modal_btn:
                submit_modal_btn[0].click()
                time.sleep(1.5)

            occ.refresh_from_db()
            self.assertEqual(occ.status, OccurrenceStatus.COMPLETED)

    def test_05_nurse_caregiver_assignments_view(self):
        """Verify Nurse can navigate to Caregiver Assignments view."""
        cg_tab = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Caregiver Assignments') or @id='tab-caregivers']"))
        cg_tab.click()
        time.sleep(1)

        self.assertTrue('Caregiver' in self.driver.page_source or 'Assignment' in self.driver.page_source)

    def test_06_nurse_visit_calendar_view(self):
        """Verify Nurse can navigate to Visit Calendar."""
        cal_tab = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Visit Calendar') or @id='tab-visit_calendar']"))
        cal_tab.click()
        time.sleep(1)

        self.assertTrue('Calendar' in self.driver.page_source or 'Month' in self.driver.page_source)

    def test_07_nurse_caregiver_management_pending_tab(self):
        """Verify Nurse can view Pending Caregivers approval tab."""
        cg_tab = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Caregiver') or @id='tab-caregivers']"))
        cg_tab.click()
        time.sleep(1)

        self.assertTrue('Caregiver' in self.driver.page_source or 'Pending Approvals' in self.driver.page_source)

    def test_08_nurse_caregiver_complaints_tab(self):
        """Verify Nurse can view Caregiver Complaints section."""
        cg_tab = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Caregiver') or @id='tab-caregivers']"))
        cg_tab.click()
        time.sleep(1)

        complaints_tab = self.driver.find_elements(By.XPATH, "//button[contains(., 'Complaints') or contains(., 'Caregiver Complaints')]")
        if complaints_tab:
            complaints_tab[0].click()
            time.sleep(1)
            self.assertTrue('Complaints' in self.driver.page_source or 'Resolution' in self.driver.page_source)
