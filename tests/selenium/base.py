import os
import sys
import time
import uuid
import unittest
from pathlib import Path
from datetime import datetime, date, timedelta

# Ensure backend directory is on sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent / 'backend'
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Ensure Django is initialized
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'karunagrid.settings')
import django
django.setup()

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import (
    Role, Administrator, Doctor, Nurse, Patient, Caregiver,
    PatientRegistrationApplication, VerificationStatus, RegistrationStatus,
    PasswordResetOTP
)

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, StaleElementReferenceException


class BaseSeleniumTestCase(unittest.TestCase):
    """
    Base test case for KarunaGrid Selenium testing.
    Provides WebDriver lifecycle management, explicit wait helpers,
    test data factories, screenshot-on-failure, and authentication utilities.
    """
    FRONTEND_URL = os.environ.get('SELENIUM_FRONTEND_URL', 'http://localhost:5173')
    BACKEND_URL = os.environ.get('SELENIUM_BACKEND_URL', 'http://127.0.0.1:8000')
    HEADLESS = os.environ.get('SELENIUM_HEADLESS', '1') not in ('0', 'false', 'False', 'no')
    SCREENSHOT_DIR = Path(__file__).resolve().parent.parent.parent / 'test-results' / 'screenshots'

    driver = None
    created_users = []
    created_apps = []

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)

    def setUp(self):
        super().setUp()
        self.created_users = []
        self.created_apps = []

        options = Options()
        if self.HEADLESS:
            options.add_argument('--headless=new')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-gpu')
        options.add_argument('--window-size=1440,900')
        options.add_argument('--disable-extensions')
        options.add_argument('--disable-notifications')
        options.add_argument('--remote-allow-origins=*')
        options.add_argument('--log-level=3')

        self.driver = webdriver.Chrome(options=options)
        self.driver.set_page_load_timeout(30)
        self.wait = WebDriverWait(self.driver, 10)

    def tearDown(self):
        # Capture screenshot if test failed
        if hasattr(self, '_outcome'):
            errors = self._outcome.errors
            for test, exc_info in errors:
                if exc_info is not None and self.driver:
                    self.take_screenshot(f"FAILED_{self._testMethodName}")
                    break

        if self.driver:
            try:
                self.driver.quit()
            except Exception:
                pass

        # Clean up database records created during this test
        self.cleanup_test_data()
        super().tearDown()

    def take_screenshot(self, name):
        """Save a timestamped screenshot of current browser window."""
        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"{name}_{timestamp}.png"
            filepath = self.SCREENSHOT_DIR / filename
            self.driver.save_screenshot(str(filepath))
            print(f"[Screenshot saved: {filepath}]")
            return str(filepath)
        except Exception as e:
            print(f"Error saving screenshot: {e}")
            return None

    def cleanup_test_data(self):
        """Delete test entities created during the test run."""
        for app in self.created_apps:
            try:
                PatientRegistrationApplication.objects.filter(application_id=app.application_id).delete()
            except Exception:
                pass

        for user in self.created_users:
            try:
                User = get_user_model()
                User.objects.filter(email=user.email).delete()
            except Exception:
                pass

    # -------------------------------------------------------------------------
    # Navigation and UI Interaction Helpers
    # -------------------------------------------------------------------------

    def navigate(self, path=''):
        """Navigate to a specific path relative to the frontend URL."""
        if path.startswith('http'):
            url = path
        else:
            clean_path = path if path.startswith('/') else f"/{path}"
            url = f"{self.FRONTEND_URL}{clean_path}"
        self.driver.get(url)
        time.sleep(0.3)

    def wait_for_element(self, locator, timeout=10):
        """Wait for an element to be present in DOM and return it."""
        return WebDriverWait(self.driver, timeout).until(
            EC.presence_of_element_located(locator)
        )

    def wait_for_visible(self, locator, timeout=10):
        """Wait for an element to be visible on page."""
        return WebDriverWait(self.driver, timeout).until(
            EC.visibility_of_element_located(locator)
        )

    def wait_for_clickable(self, locator, timeout=10):
        """Wait for an element to be clickable."""
        return WebDriverWait(self.driver, timeout).until(
            EC.element_to_be_clickable(locator)
        )

    def safe_click(self, locator, timeout=10):
        """Click an element once it is clickable, using JS click fallback if intercepted."""
        element = self.wait_for_clickable(locator, timeout)
        try:
            element.click()
        except Exception:
            self.driver.execute_script("arguments[0].click();", element)
        time.sleep(0.2)
        return element

    def safe_type(self, locator, text, clear=True, timeout=10):
        """Type text into an input field safely."""
        element = self.wait_for_visible(locator, timeout)
        if clear:
            element.clear()
        element.send_keys(text)
        return element

    def wait_for_url_contains(self, snippet, timeout=10):
        """Wait until browser URL contains a specific substring."""
        return WebDriverWait(self.driver, timeout).until(
            EC.url_contains(snippet)
        )

    def wait_for_text_present(self, text, timeout=10):
        """Wait until text appears anywhere inside document body."""
        return WebDriverWait(self.driver, timeout).until(
            EC.text_to_be_present_in_element((By.TAG_NAME, 'body'), text)
        )

    # -------------------------------------------------------------------------
    # Authentication Helpers
    # -------------------------------------------------------------------------

    def login_via_ui(self, email, password):
        """Perform a standard full UI login through /login form."""
        self.navigate('/login')
        self.safe_type((By.CSS_SELECTOR, "input[type='email']"), email)
        self.safe_type((By.CSS_SELECTOR, "input[type='password']"), password)
        self.safe_click((By.CSS_SELECTOR, "button[type='submit']"))
        time.sleep(0.5)

    def login_via_storage(self, user):
        """
        Fast-forward authentication by setting JWT access token, refresh token,
        and user_info JSON directly in browser localStorage, then navigating to role dashboard.
        """
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        # Build user_info payload matching backend serialization
        user_info = {
            'user_id': user.user_id,
            'email': user.email,
            'role': user.role,
            'name': getattr(user, 'name', user.email.split('@')[0]),
        }

        # First navigate to origin to allow setting localStorage
        self.navigate('/')
        js_script = f"""
        localStorage.setItem('access_token', '{access_token}');
        localStorage.setItem('refresh_token', '{refresh_token}');
        localStorage.setItem('user_info', JSON.stringify({django.core.serializers.json.DjangoJSONEncoder().encode(user_info)}));
        """
        self.driver.execute_script(js_script)

        # Navigate to role dashboard
        role_path = f"/dashboard/{user.role.lower()}"
        self.navigate(role_path)
        time.sleep(0.5)

    # -------------------------------------------------------------------------
    # Test Data Factories
    # -------------------------------------------------------------------------

    def create_test_admin(self, email=None, password='AdminPassword123!'):
        """Create a verified Administrator test user."""
        User = get_user_model()
        unique_suffix = uuid.uuid4().hex[:6]
        user_email = email or f"admin_{unique_suffix}@karunagrid.test"

        user = User.objects.create_user(
            email=user_email,
            password=password,
            role=Role.ADMIN,
            is_staff=True,
            is_active=True
        )
        admin_profile = Administrator.objects.create(
            user=user,
            name=f"Admin Test {unique_suffix}",
            phone="9876543210"
        )
        self.created_users.append(user)
        user.admin_profile = admin_profile
        return user

    def create_test_doctor(self, email=None, password='DoctorPassword123!', is_verified=True):
        """Create a Doctor test user."""
        User = get_user_model()
        unique_suffix = uuid.uuid4().hex[:6]
        user_email = email or f"doctor_{unique_suffix}@karunagrid.test"

        user = User.objects.create_user(
            email=user_email,
            password=password,
            role=Role.DOCTOR,
            is_active=True
        )
        doc = Doctor.objects.create(
            user=user,
            name=f"Dr. Abraham Test {unique_suffix}",
            phone="9876543211",
            specialization="Palliative Medicine",
            service_area="Kochera",
            verification_status=VerificationStatus.APPROVED if is_verified else VerificationStatus.PENDING,
            is_available_now=True
        )
        self.created_users.append(user)
        user.doctor_profile = doc
        return user

    def create_test_nurse(self, email=None, password='NursePassword123!', is_verified=True):
        """Create a Nurse test user."""
        User = get_user_model()
        unique_suffix = uuid.uuid4().hex[:6]
        user_email = email or f"nurse_{unique_suffix}@karunagrid.test"

        user = User.objects.create_user(
            email=user_email,
            password=password,
            role=Role.NURSE,
            is_active=True
        )
        nurse = Nurse.objects.create(
            user=user,
            name=f"Nurse Binu Test {unique_suffix}",
            phone="9876543212",
            specialization="Community Palliative Care",
            service_area="Kochera",
            verification_status=VerificationStatus.APPROVED if is_verified else VerificationStatus.PENDING,
            is_available_now=True
        )
        self.created_users.append(user)
        user.nurse_profile = nurse
        return user

    def create_test_caregiver(self, email=None, password='CaregiverPassword123!', is_verified=True):
        """Create a Caregiver test user."""
        User = get_user_model()
        unique_suffix = uuid.uuid4().hex[:6]
        user_email = email or f"caregiver_{unique_suffix}@karunagrid.test"

        user = User.objects.create_user(
            email=user_email,
            password=password,
            role=Role.CAREGIVER,
            is_active=True
        )
        cg = Caregiver.objects.create(
            user=user,
            name=f"Caregiver Mary Test {unique_suffix}",
            phone="9876543213",
            house_name="Mary Villa",
            place="Kochera",
            panchayath="Vandanmedu",
            ward_no=4,
            pincode="685551",
            qualifications="Certified Palliative Assistant",
            verification_status=VerificationStatus.APPROVED if is_verified else VerificationStatus.PENDING
        )
        self.created_users.append(user)
        user.caregiver_profile = cg
        return user

    def create_test_patient(self, email=None, password='PatientPassword123!', is_approved=True):
        """Create an approved Patient test user."""
        User = get_user_model()
        unique_suffix = uuid.uuid4().hex[:6]
        user_email = email or f"patient_{unique_suffix}@karunagrid.test"

        user = User.objects.create_user(
            email=user_email,
            password=password,
            role=Role.PATIENT,
            is_active=True
        )
        reg_id = f"KG-P-{unique_suffix.upper()}"
        patient = Patient.objects.create(
            user=user,
            registration_id=reg_id,
            name=f"Thankamma Joseph {unique_suffix}",
            dob=date(1955, 5, 12),
            gender="Female",
            phone="9876543214",
            house_name="Thayyil House",
            place="Kochera",
            panchayath="Vandanmedu",
            ward_no=2,
            pincode="685551",
            registration_status=RegistrationStatus.APPROVED if is_approved else RegistrationStatus.PENDING
        )
        self.created_users.append(user)
        user.patient_profile = patient
        return user

    def create_test_patient_application(self, email=None):
        """Create a pending Patient Registration Application."""
        unique_suffix = uuid.uuid4().hex[:6]
        user_email = email or f"applicant_{unique_suffix}@karunagrid.test"
        app_id = f"APP-PAT-{unique_suffix.upper()}"

        app = PatientRegistrationApplication.objects.create(
            application_id=app_id,
            name=f"Applicant Test {unique_suffix}",
            email=user_email,
            dob=date(1960, 8, 20),
            gender="Male",
            phone="9876543215",
            house_name="Kalloor House",
            place="Kochera",
            panchayath="Vandanmedu",
            ward_no=3,
            pincode="685551",
            discharge_summary_path="/media/documents/test_discharge.pdf",
            emergency_contact_name="George Test",
            emergency_contact_phone="9876543216",
            registration_status=RegistrationStatus.PENDING
        )
        self.created_apps.append(app)
        return app
