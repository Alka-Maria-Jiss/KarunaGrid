# Selenium test package for KarunaGrid
import os
import sys
from pathlib import Path

# Add backend directory to path and initialize Django
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent / 'backend'
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'karunagrid.settings')
try:
    import django
    django.setup()
except Exception as e:
    print(f"Notice: Django setup in __init__: {e}")
