import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

os.environ['DJANGO_SETTINGS_MODULE'] = 'karunagrid.settings'

import django
django.setup()

from django.conf import settings
settings.DATABASES['default'] = {
    'ENGINE': 'django.db.backends.sqlite3',
    'NAME': ':memory:',
}

from django.test.utils import get_runner

def run_lifecycle_tests():
    TestRunner = get_runner(settings)
    test_runner = TestRunner(verbosity=2, interactive=False)
    failures = test_runner.run_tests(['accounts.test_patient_registration_lifecycle'])
    return failures

if __name__ == '__main__':
    failures = run_lifecycle_tests()
    sys.exit(bool(failures))
