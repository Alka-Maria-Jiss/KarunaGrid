import time
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from tests.selenium.base import BaseSeleniumTestCase
from notifications.models import Notification


class TestNotificationsSelenium(BaseSeleniumTestCase):
    """
    Selenium UI tests for Real-time Notifications:
    - Notification badge counts
    - Viewing notifications list
    - Mark as read / mark all as read
    """

    def setUp(self):
        super().setUp()
        self.nurse = self.create_test_nurse()

    def test_01_nurse_receives_and_views_notifications(self):
        """Verify Nurse sees notifications in Notifications tab and dropdown."""
        notif = Notification.objects.create(
            user=self.nurse,
            title="New Home Visit Scheduled",
            message="A new recurring palliative home visit was scheduled.",
            notification_type="system",
            is_read=False
        )

        self.login_via_storage(self.nurse)
        self.navigate('/dashboard/nurse')

        notif_tab = self.wait_for_clickable((By.XPATH, "//button[contains(., 'Notifications') or @id='tab-notifications']"))
        notif_tab.click()
        time.sleep(1)

        self.assertIn("New Home Visit Scheduled", self.driver.page_source)
