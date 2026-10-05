from datetime import date
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import (
    User,
    Role,
    Doctor,
    Patient,
    PatientRegistrationApplication,
    RegistrationStatus,
    VerificationStatus,
)
from resources.models import (
    EquipmentType,
    EquipmentUnit,
    EquipmentRequest,
    DoctorApprovalStatus,
)
from notifications.models import Notification


class DoctorPendingRegistrationsCountTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # 1. Create Doctor
        self.doc_user = User.objects.create_user(
            email='doctor@karunagrid.org',
            password='DoctorPassword123!',
            role=Role.DOCTOR,
            is_active=True,
        )
        self.doctor = Doctor.objects.create(
            user=self.doc_user,
            name='Dr. Anil Kumar',
            specialization='Palliative Oncology',
            verification_status=VerificationStatus.APPROVED,
            is_available_now=True,
        )

        # 2. Create 1 Pending Patient Registration Application
        self.app_pending = PatientRegistrationApplication.objects.create(
            application_id='APP-PENDING-001',
            name='Rosamma Francis',
            email='rosamma@example.com',
            dob='1965-05-15',
            phone='9876543210',
            discharge_summary_path='/path/to/summary1.pdf',
            registration_status=RegistrationStatus.PENDING,
        )

        # 3. Create 1 Approved Application (should NOT be counted)
        self.pat_user = User.objects.create_user(
            email='approved.patient@example.com',
            password='PatientPass123!',
            role=Role.PATIENT,
            is_active=True,
        )
        self.patient = Patient.objects.create(
            user=self.pat_user,
            registration_id='KG-P-0001',
            name='Joseph K',
            registration_status=RegistrationStatus.APPROVED,
        )
        self.app_approved = PatientRegistrationApplication.objects.create(
            application_id='APP-APPROVED-001',
            name='Joseph K',
            email='approved.patient@example.com',
            dob='1950-01-01',
            phone='9876543211',
            discharge_summary_path='/path/to/summary2.pdf',
            registration_status=RegistrationStatus.APPROVED,
            created_patient=self.patient,
        )

        # 4. Create 1 Rejected Application (should NOT be counted)
        self.app_rejected = PatientRegistrationApplication.objects.create(
            application_id='APP-REJECTED-001',
            name='Rejected Applicant',
            email='rejected@example.com',
            dob='1980-01-01',
            phone='9876543212',
            discharge_summary_path='/path/to/summary3.pdf',
            registration_status=RegistrationStatus.REJECTED,
            rejection_reason='Incomplete clinical documentation',
        )

        # 5. Create 1 Pending Equipment Request (to verify it does not inflate pending_registrations)
        self.eq_type = EquipmentType.objects.create(name='Wheelchair')
        self.eq_request = EquipmentRequest.objects.create(
            patient=self.patient,
            equipment_type=self.eq_type,
            requested_by=self.pat_user,
            doctor_approval_status=DoctorApprovalStatus.PENDING,
        )

        # 6. Create 5 Unread Notifications (to verify they do not inflate pending_registrations)
        for i in range(5):
            Notification.objects.create(
                user=self.doc_user,
                message=f"Test notification {i}",
                is_read=False,
            )

    def test_single_source_of_truth_pending_count(self):
        """
        Verify that Doctor Dashboard pending_registrations count matches
        the length of items returned by DoctorPendingPatientsView exactly.
        """
        self.client.force_authenticate(user=self.doc_user)

        # 1. Doctor Dashboard API
        dash_res = self.client.get('/api/doctor/dashboard/')
        self.assertEqual(dash_res.status_code, status.HTTP_200_OK)
        summary = dash_res.data.get('summary_cards', {})

        # pending_registrations MUST be exactly 1
        self.assertEqual(summary.get('pending_registrations'), 1)
        # pending_equipment is 1
        self.assertEqual(summary.get('pending_equipment'), 1)
        # pending_actions is 2 (registrations + equipment)
        self.assertEqual(summary.get('pending_actions'), 2)

        # 2. Doctor Pending Patients API (Patient Registration Review queue)
        pending_res = self.client.get('/api/doctor/patients/pending/')
        self.assertEqual(pending_res.status_code, status.HTTP_200_OK)
        pending_list = pending_res.data
        self.assertEqual(len(pending_list), 1)
        self.assertEqual(pending_list[0]['id'], self.app_pending.id)
        self.assertEqual(pending_list[0]['name'], 'Rosamma Francis')

        # 3. Equality between dashboard pending registrations count and queue list length
        self.assertEqual(summary.get('pending_registrations'), len(pending_list))

    def test_approve_registration_decrements_count_to_zero(self):
        self.client.force_authenticate(user=self.doc_user)

        # Approve the only pending application
        approve_res = self.client.post(f'/api/doctor/patients/{self.app_pending.id}/approve/')
        self.assertEqual(approve_res.status_code, status.HTTP_200_OK)

        # Dashboard pending_registrations should now be 0
        dash_res = self.client.get('/api/doctor/dashboard/')
        summary = dash_res.data.get('summary_cards', {})
        self.assertEqual(summary.get('pending_registrations'), 0)

        # Queue list length should now be 0
        pending_res = self.client.get('/api/doctor/patients/pending/')
        self.assertEqual(len(pending_res.data), 0)

    def test_reject_registration_decrements_count_to_zero(self):
        self.client.force_authenticate(user=self.doc_user)

        # Reject the only pending application
        reject_res = self.client.post(
            f'/api/doctor/patients/{self.app_pending.id}/reject/',
            data={'rejection_reason': 'Out of service area coverage'},
            format='json',
        )
        self.assertEqual(reject_res.status_code, status.HTTP_200_OK)

        # Dashboard pending_registrations should now be 0
        dash_res = self.client.get('/api/doctor/dashboard/')
        summary = dash_res.data.get('summary_cards', {})
        self.assertEqual(summary.get('pending_registrations'), 0)

        # Queue list length should now be 0
        pending_res = self.client.get('/api/doctor/patients/pending/')
        self.assertEqual(len(pending_res.data), 0)

    def test_two_pending_registrations_shows_count_two(self):
        # Add second pending application
        app2 = PatientRegistrationApplication.objects.create(
            application_id='APP-PENDING-002',
            name='Second Patient',
            email='patient2@example.com',
            dob='1975-08-20',
            phone='9876543219',
            discharge_summary_path='/path/to/summary4.pdf',
            registration_status=RegistrationStatus.PENDING,
        )

        self.client.force_authenticate(user=self.doc_user)

        dash_res = self.client.get('/api/doctor/dashboard/')
        summary = dash_res.data.get('summary_cards', {})
        self.assertEqual(summary.get('pending_registrations'), 2)

        pending_res = self.client.get('/api/doctor/patients/pending/')
        self.assertEqual(len(pending_res.data), 2)
