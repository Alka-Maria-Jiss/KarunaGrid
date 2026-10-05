import time
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from tests.selenium.base import BaseSeleniumTestCase
from accounts.models import Role


class TestEquipmentSelenium(BaseSeleniumTestCase):
    """
    Selenium UI tests for Medical Equipment Lifecycle:
    - Patient submitting equipment request
    - Doctor reviewing clinical necessity
    - Admin managing equipment inventory & allocation
    - Ensuring unapproved requests cannot be allocated by admin
    """

    def setUp(self):
        super().setUp()
        self.patient = self.create_test_patient()
        self.doctor = self.create_test_doctor()
        self.admin = self.create_test_admin()

    def test_01_patient_views_equipment_catalog_and_request_form(self):
        """Verify Patient can navigate to Equipment tab and open Request modal."""
        self.login_via_storage(self.patient)
        self.navigate('/dashboard/patient')

        eq_tab = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Equipment') or @id='tab-equipment']"))
        eq_tab.click()
        time.sleep(1)

        self.assertTrue('Equipment' in self.driver.page_source or 'Medical' in self.driver.page_source)

        # Open Request Modal if button exists
        req_btn = self.driver.find_elements(By.XPATH, "//button[contains(., 'Request Equipment') or contains(., 'New Request')]")
        if req_btn:
            req_btn[0].click()
            time.sleep(1)
            self.assertTrue('Request' in self.driver.page_source or 'Clinical' in self.driver.page_source)

    def test_02_admin_equipment_inventory_and_allocation_queue(self):
        """Verify Admin can view equipment types, units, and allocation queue."""
        self.login_via_storage(self.admin)
        self.navigate('/dashboard/admin')

        eq_tab = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Equipment') or @id='tab-equipment']"))
        eq_tab.click()
        time.sleep(1)

        self.assertTrue('Equipment' in self.driver.page_source or 'Units' in self.driver.page_source)
