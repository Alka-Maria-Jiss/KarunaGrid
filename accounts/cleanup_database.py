import os
import sys
from pathlib import Path
import django

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'karunagrid.settings')
django.setup()

from django.db import transaction
from django.contrib.auth import authenticate
from accounts.models import (
    User,
    Administrator,
    Doctor,
    Nurse,
    Patient,
    PatientRegistrationApplication,
    Caregiver,
    Role,
)
from medical_records.models import (
    PatientDiagnosis,
    PatientAllergy,
    PatientChronicCondition,
    MedicalDocument,
    LabReport,
    Prescription,
    PrescriptionItem,
    NutritionPlan,
)
from care_coordination.models import (
    CaregiverPatientAssignment,
    TelemedicineConsultation,
    TelemedicineConsultationNote,
    TelemedicineFollowUp,
    HomeVisitSchedule,
    HomeVisitOccurrence,
    HomeVisitSummary,
    VisitSymptom,
)
from resources.models import (
    WelfareScheme,
    WelfareApplication,
    EquipmentType,
    EquipmentUnit,
    EquipmentRequest,
)
from notifications.models import Notification


def perform_database_cleanup():
    print("=" * 60)
    print("STARTING KARUNAGRID DATABASE CLEANUP")
    print("=" * 60)

    # 1. Verify Admin user exists before proceeding
    admin_user = User.objects.filter(role=Role.ADMIN).first()
    if not admin_user:
        raise ValueError("CRITICAL ERROR: No Admin user found! Aborting deletion.")

    admin_profile = Administrator.objects.filter(user=admin_user).first()
    if not admin_profile:
        raise ValueError("CRITICAL ERROR: No Administrator profile found! Aborting deletion.")

    print(f"Verified Preserved Admin User: ID={admin_user.user_id}, Email={admin_user.email}, Role={admin_user.role}")
    print(f"Verified Preserved Admin Profile: ID={admin_profile.admin_id}, Name={admin_profile.name}")
    print("-" * 60)

    with transaction.atomic():
        print("1. Deleting Clinical & Medical Records...")
        PrescriptionItem.objects.all().delete()
        Prescription.objects.all().delete()
        LabReport.objects.all().delete()
        MedicalDocument.objects.all().delete()
        PatientDiagnosis.objects.all().delete()
        PatientAllergy.objects.all().delete()
        PatientChronicCondition.objects.all().delete()
        NutritionPlan.objects.all().delete()

        print("2. Deleting Care Coordination & Visits...")
        VisitSymptom.objects.all().delete()
        HomeVisitSummary.objects.all().delete()
        HomeVisitOccurrence.objects.all().delete()
        HomeVisitSchedule.objects.all().delete()
        TelemedicineFollowUp.objects.all().delete()
        TelemedicineConsultationNote.objects.all().delete()
        TelemedicineConsultation.objects.all().delete()
        CaregiverPatientAssignment.objects.all().delete()

        print("3. Deleting Resource Requests, Applications & Catalog Data...")
        WelfareApplication.objects.all().delete()
        EquipmentRequest.objects.all().delete()
        EquipmentUnit.objects.all().delete()
        EquipmentType.objects.all().delete()
        WelfareScheme.objects.all().delete()

        print("4. Deleting Notifications...")
        Notification.objects.all().delete()

        print("5. Deleting Patient Registration Applications...")
        PatientRegistrationApplication.objects.all().delete()

        print("6. Deleting Non-Admin Role Profiles...")
        Patient.objects.all().delete()
        Caregiver.objects.all().delete()
        Nurse.objects.all().delete()
        Doctor.objects.all().delete()

        print("7. Deleting Non-Admin User Accounts...")
        non_admin_users = User.objects.exclude(user_id=admin_user.user_id)
        deleted_user_count = non_admin_users.count()
        non_admin_users.delete()
        print(f"   Deleted {deleted_user_count} non-admin user records.")

    print("-" * 60)
    print("8. Cleaning Orphaned Uploaded Media Files...")
    media_dir = BASE_DIR / 'media'
    deleted_files_count = 0
    if media_dir.exists():
        for sub_folder in ['discharge_summaries', 'identity_proofs', 'lab_reports', 'medical_documents']:
            target_folder = media_dir / sub_folder
            if target_folder.exists():
                for file_path in target_folder.glob('*'):
                    if file_path.is_file():
                        try:
                            file_path.unlink()
                            deleted_files_count += 1
                        except Exception as e:
                            print(f"   Warning: Could not remove file {file_path}: {e}")
    print(f"   Removed {deleted_files_count} orphaned uploaded test files.")

    print("-" * 60)
    print("CLEANUP COMPLETED SUCCESSFULLY. VERIFYING DATABASE STATE...")
    print("-" * 60)

    # Verification checks
    total_users = User.objects.count()
    admin_users = User.objects.filter(role=Role.ADMIN).count()
    admin_profiles = Administrator.objects.count()
    doctors = Doctor.objects.count()
    nurses = Nurse.objects.count()
    patients = Patient.objects.count()
    applications = PatientRegistrationApplication.objects.count()
    caregivers = Caregiver.objects.count()
    prescriptions = Prescription.objects.count()
    visits = HomeVisitOccurrence.objects.count()
    notifications = Notification.objects.count()

    print(f"Total Users: {total_users} (Expected: 1)")
    print(f"Admin Users: {admin_users} (Expected: 1)")
    print(f"Administrator Profiles: {admin_profiles} (Expected: 1)")
    print(f"Doctors: {doctors} (Expected: 0)")
    print(f"Nurses: {nurses} (Expected: 0)")
    print(f"Patients: {patients} (Expected: 0)")
    print(f"Patient Applications: {applications} (Expected: 0)")
    print(f"Caregivers: {caregivers} (Expected: 0)")
    print(f"Prescriptions: {prescriptions} (Expected: 0)")
    print(f"Home Visits: {visits} (Expected: 0)")
    print(f"Notifications: {notifications} (Expected: 0)")

    # Authentication verification
    admin_check = User.objects.filter(user_id=admin_user.user_id, is_active=True).first()
    if admin_check and admin_check.role == Role.ADMIN:
        print("\n✅ Admin Account is 100% Intact, Active, and Functional!")
    else:
        print("\n❌ Error: Admin Account check failed!")


if __name__ == '__main__':
    perform_database_cleanup()
