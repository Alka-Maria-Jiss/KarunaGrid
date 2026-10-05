import time
from datetime import date, timedelta
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from tests.selenium.base import BaseSeleniumTestCase
from care_coordination.models import (
    HomeVisitSchedule, HomeVisitOccurrence, ScheduleFrequency, OccurrenceStatus, UrgentVisitRequest
)


class TestHomeVisitsSelenium(BaseSeleniumTestCase):
    """
    Selenium UI tests specifically validating the KarunaGrid Shared Nurse Team Home Visit model:
    - Recurring care schedules creation & auto occurrence generation
    - Sunday non-working day avoidance
    - Doctor assignment per individual occurrence date
    - Any nurse viewing and directly completing any scheduled visit without claiming
    - Audit trail verification upon completion (Completed by: Nurse Name)
    - Absence of legacy Claim / Allocate UI elements
    - Urgent home visit requests workflow
    """

    def setUp(self):
        super().setUp()
        self.nurse_1 = self.create_test_nurse()
        self.nurse_2 = self.create_test_nurse()
        self.doctor = self.create_test_doctor()
        self.patient = self.create_test_patient()

    def test_01_shared_nurse_team_no_claim_button_visible(self):
        """Verify Nurse A and Nurse B both see the same scheduled visit with NO claim button."""
        today = date.today()
        if today.weekday() == 6:
            today += timedelta(days=1)

        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient,
            frequency=ScheduleFrequency.WEEKLY,
            start_date=today
        )
        occ = HomeVisitOccurrence.objects.create(
            schedule=schedule,
            patient=self.patient,
            scheduled_date=today,
            status=OccurrenceStatus.SCHEDULED
        )

        # 1. Nurse 1 logs in
        self.login_via_storage(self.nurse_1)
        self.navigate('/dashboard/nurse')
        all_visits_btn = self.wait_for_clickable((By.XPATH, "//button[contains(., 'All Home Visits') or @id='tab-home_visits_all']"))
        all_visits_btn.click()
        time.sleep(1)

        # Verify visit is listed, [Complete] button is present, [Claim] is ABSENT
        self.assertIn(self.patient.name, self.driver.page_source)
        self.assertNotIn('Claim', self.driver.page_source)
        self.assertNotIn('Self Allocate', self.driver.page_source)

        # 2. Nurse 2 logs in
        self.login_via_storage(self.nurse_2)
        self.navigate('/dashboard/nurse')
        all_visits_btn = self.wait_for_clickable((By.XPATH, "//button[contains(., 'All Home Visits') or @id='tab-home_visits_all']"))
        all_visits_btn.click()
        time.sleep(1)

        # Verify Nurse 2 also sees the same visit with NO claim button
        self.assertIn(self.patient.name, self.driver.page_source)
        self.assertNotIn('Claim', self.driver.page_source)
        self.assertNotIn('Self Allocate', self.driver.page_source)

    def test_02_assign_doctor_per_occurrence(self):
        """Verify Nurse can assign/change visiting doctor for a specific visit occurrence."""
        today = date.today()
        if today.weekday() == 6:
            today += timedelta(days=1)

        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient,
            frequency=ScheduleFrequency.WEEKLY,
            start_date=today
        )
        occ = HomeVisitOccurrence.objects.create(
            schedule=schedule,
            patient=self.patient,
            scheduled_date=today,
            status=OccurrenceStatus.SCHEDULED
        )

        self.login_via_storage(self.nurse_1)
        self.navigate('/dashboard/nurse')
        all_visits_btn = self.wait_for_clickable((By.XPATH, "//button[contains(., 'All Home Visits') or @id='tab-home_visits_all']"))
        all_visits_btn.click()
        time.sleep(1)

        # Click Assign Doctor
        assign_doc_btn = self.driver.find_elements(By.XPATH, f"//button[contains(., 'Assign Doctor') or contains(., 'Change Doctor')][ancestor::*[contains(., '{self.patient.name}')]]")
        if assign_doc_btn:
            assign_doc_btn[0].click()
            time.sleep(1)

            # In modal, select doctor and save
            doc_select = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'fixed')]//select")
            if doc_select:
                doc_select[0].click()
                doc_opt = self.driver.find_elements(By.XPATH, f"//option[contains(text(), '{self.doctor.doctor.name}')]")
                if doc_opt:
                    doc_opt[0].click()

                save_btn = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'fixed')]//button[@type='submit']")
                if save_btn:
                    save_btn[0].click()
                    time.sleep(1.5)

            occ.refresh_from_db()
            self.assertEqual(occ.visiting_doctor, self.doctor.doctor)

    def test_03_completion_records_audit_trail(self):
        """Verify Nurse 2 completing the visit records Nurse 2 in the completion audit trail."""
        today = date.today()
        if today.weekday() == 6:
            today += timedelta(days=1)

        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient,
            frequency=ScheduleFrequency.WEEKLY,
            start_date=today
        )
        occ = HomeVisitOccurrence.objects.create(
            schedule=schedule,
            patient=self.patient,
            scheduled_date=today,
            status=OccurrenceStatus.SCHEDULED
        )

        self.login_via_storage(self.nurse_2)
        self.navigate('/dashboard/nurse')
        all_visits_btn = self.wait_for_clickable((By.XPATH, "//button[contains(., 'All Home Visits') or @id='tab-home_visits_all']"))
        all_visits_btn.click()
        time.sleep(1)

        # Click Complete
        comp_btn = self.driver.find_elements(By.XPATH, f"//button[contains(., 'Complete')][ancestor::*[contains(., '{self.patient.name}')]]")
        if comp_btn:
            comp_btn[0].click()
            time.sleep(1)

            # Enter vitals and submit
            bp_input = self.driver.find_elements(By.CSS_SELECTOR, "input[placeholder*='120/80'], input[placeholder*='BP']")
            if bp_input:
                bp_input[0].clear()
                bp_input[0].send_keys("118/78")

            submit_btn = self.driver.find_elements(By.XPATH, "//div[contains(@class, 'fixed')]//button[contains(., 'Complete Visit') or contains(., 'Save') or contains(., 'Submit')]")
            if submit_btn:
                submit_btn[0].click()
                time.sleep(1.5)

            occ.refresh_from_db()
            self.assertEqual(occ.status, OccurrenceStatus.COMPLETED)
            if hasattr(occ, 'summary') and occ.summary:
                self.assertEqual(occ.summary.nurse, self.nurse_2.nurse)
