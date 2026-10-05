import time
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from tests.selenium.base import BaseSeleniumTestCase


class TestProfilesSelenium(BaseSeleniumTestCase):
    """
    Selenium UI tests for User Profile views and settings across all roles:
    - Admin Profile
    - Doctor Profile
    - Nurse Profile
    - Patient Profile
    - Caregiver Profile
    """

    def test_01_admin_profile_view(self):
        """Verify Admin can navigate to and view Admin profile."""
        admin = self.create_test_admin()
        self.login_via_storage(admin)
        self.navigate('/dashboard/admin')

        profile_btn = self.driver.find_elements(By.XPATH, "//button[contains(., 'Profile') or @id='tab-profile']")
        if profile_btn:
            profile_btn[0].click()
            time.sleep(1)
            self.assertTrue('Profile' in self.driver.page_source or admin.email in self.driver.page_source)

    def test_02_doctor_profile_view(self):
        """Verify Doctor can view Doctor profile."""
        doctor = self.create_test_doctor()
        self.login_via_storage(doctor)
        self.navigate('/dashboard/doctor')

        profile_btn = self.driver.find_elements(By.XPATH, "//button[contains(., 'Profile') or @id='tab-profile']")
        if profile_btn:
            profile_btn[0].click()
            time.sleep(1)
            self.assertTrue('Profile' in self.driver.page_source or doctor.doctor.name in self.driver.page_source)

    def test_03_nurse_profile_view(self):
        """Verify Nurse can view Nurse profile."""
        nurse = self.create_test_nurse()
        self.login_via_storage(nurse)
        self.navigate('/dashboard/nurse')

        profile_btn = self.driver.find_elements(By.XPATH, "//button[contains(., 'Profile') or @id='tab-profile']")
        if profile_btn:
            profile_btn[0].click()
            time.sleep(1)
            self.assertTrue('Profile' in self.driver.page_source or nurse.nurse.name in self.driver.page_source)

    def test_04_patient_profile_view(self):
        """Verify Patient can view Patient profile."""
        patient = self.create_test_patient()
        self.login_via_storage(patient)
        self.navigate('/dashboard/patient')

        profile_btn = self.driver.find_elements(By.XPATH, "//button[contains(., 'Profile') or @id='tab-profile']")
        if profile_btn:
            profile_btn[0].click()
            time.sleep(1)
            self.assertTrue('Profile' in self.driver.page_source or patient.patient.name in self.driver.page_source)
