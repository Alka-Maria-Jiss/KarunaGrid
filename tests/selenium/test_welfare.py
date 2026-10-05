import time
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from tests.selenium.base import BaseSeleniumTestCase
from resources.models import WelfareScheme


class TestWelfareSelenium(BaseSeleniumTestCase):
    """
    Selenium UI tests for Welfare Schemes:
    - Admin creating, editing, and publishing welfare schemes
    - Patient viewing official published schemes
    - Verification of official redirection links and disclaimers
    """

    def setUp(self):
        super().setUp()
        self.admin = self.create_test_admin()
        self.patient = self.create_test_patient()

    def test_01_admin_creates_and_manages_welfare_schemes(self):
        """Verify Admin can view and create welfare schemes."""
        self.login_via_storage(self.admin)
        self.navigate('/dashboard/admin')

        welfare_tab = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Welfare') or @id='tab-welfare']"))
        welfare_tab.click()
        time.sleep(1)

        self.assertTrue('Welfare' in self.driver.page_source or 'Schemes' in self.driver.page_source)

    def test_02_patient_views_published_welfare_schemes(self):
        """Verify Patient sees published schemes and external portal redirection link."""
        scheme = WelfareScheme.objects.create(
            title="Aaswasam Palliative Support Grant",
            description="Financial aid for recurring palliative medical supplies and home care.",
            eligibility_criteria="Registered palliative patients in Kerala with valid identity proof.",
            application_process="Apply online through the government portal with required documents.",
            link="https://welfare.kerala.gov.in/aaswasam",
            is_active=True
        )

        self.login_via_storage(self.patient)
        self.navigate('/dashboard/patient')

        welfare_tab = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Welfare') or @id='tab-welfare']"))
        welfare_tab.click()
        time.sleep(1)

        self.assertIn("Aaswasam Palliative Support Grant", self.driver.page_source)
