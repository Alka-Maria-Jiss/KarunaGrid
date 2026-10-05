from datetime import date, timedelta
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import (
    User,
    Role,
    Patient,
    PatientRegistrationApplication,
    Doctor,
    Nurse,
    Caregiver,
    Administrator,
    RegistrationStatus,
    VerificationStatus,
)
from care_coordination.models import (
    HomeVisitOccurrence,
    HomeVisitSchedule,
    TelemedicineConsultation,
    CaregiverPatientAssignment,
    OccurrenceStatus,
    ConsultationStatus,
    UrgencyLevel,
    VisitType,
    ScheduleFrequency,
    ScheduleStatus,
    AssignmentStatus,
)
from resources.models import (
    EquipmentType,
    EquipmentUnit,
    EquipmentRequest,
    WelfareScheme,
    EquipmentUnitStatus,
    DoctorApprovalStatus,
    DeliveryStatus,
    WelfareSchemeStatus,
)


class AdminReportsAndAnalyticsTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create Admin
        self.admin_user = User.objects.create_user(
            email='admin@karunagrid.org',
            password='AdminPassword123!',
            role=Role.ADMIN,
            is_active=True,
        )
        self.admin = Administrator.objects.create(
            user=self.admin_user,
            name='Master Admin',
        )

        # Create Doctor
        self.doc_user = User.objects.create_user(
            email='doctor@karunagrid.org',
            password='DoctorPassword123!',
            role=Role.DOCTOR,
            is_active=True,
        )
        self.doctor = Doctor.objects.create(
            user=self.doc_user,
            name='Dr. Smith',
            specialization='Palliative Care',
            is_available_now=True,
            verification_status=VerificationStatus.APPROVED,
        )

        # Create Nurse
        self.nurse_user = User.objects.create_user(
            email='nurse@karunagrid.org',
            password='NursePassword123!',
            role=Role.NURSE,
            is_active=True,
        )
        self.nurse = Nurse.objects.create(
            user=self.nurse_user,
            name='Sister Mary',
            specialization='Field Nursing',
            is_available_now=False,
            verification_status=VerificationStatus.APPROVED,
        )

        # Create Patient & Application
        self.pat_user = User.objects.create_user(
            email='patient@karunagrid.org',
            password='PatientPassword123!',
            role=Role.PATIENT,
            is_active=True,
        )
        self.patient = Patient.objects.create(
            user=self.pat_user,
            registration_id='KG-2026-0001',
            name='Anand Francis',
            registration_status=RegistrationStatus.APPROVED,
            reviewed_by_doctor=self.doctor,
        )
        self.app = PatientRegistrationApplication.objects.create(
            application_id='APP-0001',
            name='Anand Francis',
            email='patient@karunagrid.org',
            dob='1970-01-01',
            phone='9876543210',
            discharge_summary_path='/path/to/summary.pdf',
            registration_status=RegistrationStatus.APPROVED,
            reviewed_by_doctor=self.doctor,
            created_patient=self.patient,
        )

        # Create Caregiver
        self.cg_user = User.objects.create_user(
            email='caregiver@karunagrid.org',
            password='CaregiverPassword123!',
            role=Role.CAREGIVER,
            is_active=True,
        )
        self.caregiver = Caregiver.objects.create(
            user=self.cg_user,
            name='Geetha K',
            phone='9876543211',
            verification_status=VerificationStatus.APPROVED,
        )
        self.assignment = CaregiverPatientAssignment.objects.create(
            caregiver=self.caregiver,
            patient=self.patient,
            assigned_by_nurse=self.nurse,
            status=AssignmentStatus.ACTIVE,
        )

        # Create Home Visit
        self.schedule = HomeVisitSchedule.objects.create(
            patient=self.patient,
            nurse=self.nurse,
            frequency=ScheduleFrequency.WEEKLY,
            start_date=date.today(),
            status=ScheduleStatus.ACTIVE,
        )
        self.visit = HomeVisitOccurrence.objects.create(
            schedule=self.schedule,
            patient=self.patient,
            scheduled_date=date.today(),
            visit_type=VisitType.RECURRING,
            urgency_level=UrgencyLevel.ROUTINE,
            status=OccurrenceStatus.SCHEDULED,
            allocated_nurse=self.nurse,
            visiting_doctor=self.doctor,
        )

        # Create Telemedicine
        self.consultation = TelemedicineConsultation.objects.create(
            patient=self.patient,
            doctor=self.doctor,
            requested_by=self.pat_user,
            scheduled_date=date.today(),
            status=ConsultationStatus.COMPLETED,
            priority=UrgencyLevel.ROUTINE,
        )

        # Create Equipment
        self.eq_type = EquipmentType.objects.create(
            name='Wheelchair',
            description='Standard mobility wheelchair'
        )
        self.eq_unit = EquipmentUnit.objects.create(
            equipment_type=self.eq_type,
            serial_number='WC-101',
            status=EquipmentUnitStatus.AVAILABLE,
        )

        # Create Welfare Scheme
        self.scheme = WelfareScheme.objects.create(
            name='Kerala Karunya Relief Fund',
            category='Financial Aid',
            status=WelfareSchemeStatus.PUBLISHED,
            created_by_admin=self.admin,
        )

    def test_admin_reports_authorization(self):
        # Unauthenticated
        res = self.client.get('/api/admin/reports/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # Non-admin (Patient)
        self.client.force_authenticate(user=self.pat_user)
        res = self.client.get('/api/admin/reports/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Admin
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get('/api/admin/reports/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_admin_reports_all_categories(self):
        self.client.force_authenticate(user=self.admin_user)

        # 1. Patients report
        res = self.client.get('/api/admin/reports/?type=patients')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['category'], 'patients')
        self.assertGreaterEqual(res.data['summary']['total_patients'], 1)
        self.assertGreaterEqual(len(res.data['records']), 1)

        # 2. Staff report
        res = self.client.get('/api/admin/reports/?type=staff')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res.data['summary']['total_doctors'], 1)
        self.assertGreaterEqual(res.data['summary']['total_nurses'], 1)
        self.assertGreaterEqual(len(res.data['records']), 2)

        # 3. Home Visits report
        res = self.client.get('/api/admin/reports/?type=home_visits')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res.data['summary']['total_visits'], 1)
        self.assertEqual(res.data['records'][0]['status'], 'Scheduled')

        # 4. Telemedicine report
        res = self.client.get('/api/admin/reports/?type=telemedicine')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res.data['summary']['total_consultations'], 1)
        self.assertEqual(res.data['summary']['completed'], 1)

        # 5. Caregivers report
        res = self.client.get('/api/admin/reports/?type=caregivers')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res.data['summary']['total_caregivers'], 1)
        self.assertGreaterEqual(res.data['summary']['patients_with_caregivers'], 1)

        # 6. Equipment report
        res = self.client.get('/api/admin/reports/?type=equipment')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res.data['summary']['total_equipment_units'], 1)
        self.assertEqual(res.data['records'][0]['serial_number'], 'WC-101')

        # 7. Welfare Schemes report
        res = self.client.get('/api/admin/reports/?type=welfare_schemes')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res.data['summary']['total_schemes'], 1)
        self.assertEqual(res.data['summary']['published_schemes'], 1)

    def test_admin_reports_filters(self):
        self.client.force_authenticate(user=self.admin_user)

        # Filter by status
        res = self.client.get('/api/admin/reports/?type=patients&status=Approved')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        for r in res.data['records']:
            self.assertEqual(r['status'], 'Approved')

        # Filter by date range
        today_str = date.today().strftime('%Y-%m-%d')
        res = self.client.get(f'/api/admin/reports/?type=home_visits&from_date={today_str}&to_date={today_str}')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data['records']), 1)

    def test_admin_analytics_authorization_and_data(self):
        # Non-admin
        self.client.force_authenticate(user=self.doc_user)
        res = self.client.get('/api/admin/analytics/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Admin
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get('/api/admin/analytics/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        data = res.data
        # Overview KPIs
        self.assertIn('overview_kpis', data)
        self.assertEqual(data['overview_kpis']['total_patients'], 1)
        self.assertEqual(data['overview_kpis']['total_doctors'], 1)
        self.assertEqual(data['overview_kpis']['total_nurses'], 1)
        self.assertEqual(data['overview_kpis']['total_caregivers'], 1)
        self.assertEqual(data['overview_kpis']['total_home_visits'], 1)
        self.assertEqual(data['overview_kpis']['total_telemedicine'], 1)

        # Patient analytics
        self.assertIn('patient_analytics', data)
        self.assertIn('registration_trend', data['patient_analytics'])
        self.assertEqual(data['patient_analytics']['status_distribution']['approved'], 1)

        # Staff availability
        self.assertEqual(data['staff_availability']['doctors']['available'], 1)
        self.assertEqual(data['staff_availability']['nurses']['available'], 0)
        self.assertEqual(data['staff_availability']['nurses']['unavailable'], 1)

        # Equipment analytics
        self.assertEqual(data['equipment_analytics']['utilization']['available'], 1)
        self.assertGreaterEqual(len(data['equipment_analytics']['by_type']), 1)

        # Caregiver coverage
        self.assertEqual(data['caregiver_coverage']['patients_with_caregiver'], 1)
        self.assertEqual(data['caregiver_coverage']['coverage_percentage'], 100.0)
