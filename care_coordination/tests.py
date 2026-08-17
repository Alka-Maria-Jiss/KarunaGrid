from datetime import date, time, timedelta
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import Role, Patient, Doctor, VerificationStatus, RegistrationStatus
from care_coordination.models import (
    TelemedicineConsultation,
    TelemedicineConsultationNote,
    TelemedicineFollowUp,
    ConsultationStatus,
    UrgencyLevel
)
from notifications.models import Notification

User = get_user_model()


class TelemedicineModuleTests(TestCase):
    def setUp(self):
        # Create Doctor user and profile
        self.doctor_user = User.objects.create_user(
            email='dr.thomas@karunagrid.org',
            password='password123',
            role=Role.DOCTOR
        )
        self.doctor = Doctor.objects.create(
            user=self.doctor_user,
            name='Dr. Thomas',
            specialization='Palliative Medicine',
            verification_status=VerificationStatus.APPROVED,
            is_available_now=True
        )

        # Create Doctor 2 (Unassigned Doctor)
        self.doctor2_user = User.objects.create_user(
            email='dr.smith@karunagrid.org',
            password='password123',
            role=Role.DOCTOR
        )
        self.doctor2 = Doctor.objects.create(
            user=self.doctor2_user,
            name='Dr. Smith',
            specialization='General Medicine',
            verification_status=VerificationStatus.APPROVED
        )

        # Create Patient A user and profile (Assigned to Dr. Thomas)
        self.patient_a_user = User.objects.create_user(
            email='patient.a@example.com',
            password='password123',
            role=Role.PATIENT
        )
        self.patient_a = Patient.objects.create(
            user=self.patient_a_user,
            registration_id='PAT-A101',
            name='Patient A',
            registration_status=RegistrationStatus.APPROVED,
            reviewed_by_doctor=self.doctor
        )

        # Create Patient B user and profile (Assigned to Dr. Thomas)
        self.patient_b_user = User.objects.create_user(
            email='patient.b@example.com',
            password='password123',
            role=Role.PATIENT
        )
        self.patient_b = Patient.objects.create(
            user=self.patient_b_user,
            registration_id='PAT-B102',
            name='Patient B',
            registration_status=RegistrationStatus.APPROVED,
            reviewed_by_doctor=self.doctor
        )

        self.client_a = APIClient()
        self.client_a.force_authenticate(user=self.patient_a_user)

        self.client_b = APIClient()
        self.client_b.force_authenticate(user=self.patient_b_user)

        self.client_doc = APIClient()
        self.client_doc.force_authenticate(user=self.doctor_user)

        self.test_date = date(2026, 8, 20)

    def test_01_patient_can_request_consultation(self):
        url = '/api/telemedicine/consultations/'
        payload = {
            'doctor_id': self.doctor.doctor_id,
            'requested_date': str(self.test_date),
            'requested_time': '10:00',
            'reason': 'Routine Pain Management',
            'symptoms': 'Mild back pain',
            'priority': UrgencyLevel.ROUTINE,
            'patient_notes': 'Please call morning'
        }
        response = self.client_a.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], ConsultationStatus.PENDING)
        self.assertEqual(response.data['doctor_name'], 'Dr. Thomas')

        # Check notification sent to doctor
        doc_notif = Notification.objects.filter(user=self.doctor_user, type='telemedicine').first()
        self.assertIsNotNone(doc_notif)
        self.assertIn('Patient A', doc_notif.message)

    def test_02_unauthorized_doctor_request_rejected(self):
        url = '/api/telemedicine/consultations/'
        payload = {
            'doctor_id': self.doctor2.doctor_id, # Unassigned doctor
            'requested_date': str(self.test_date),
            'requested_time': '10:00',
            'reason': 'Checkup'
        }
        response = self.client_a.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_03_available_slots_and_exact_double_booking_rejected(self):
        # Patient A books 10:00 - 10:30
        c1 = TelemedicineConsultation.objects.create(
            patient=self.patient_a,
            doctor=self.doctor,
            requested_by=self.patient_a_user,
            requested_date=self.test_date,
            requested_time=time(10, 0),
            reason='Consultation A',
            status=ConsultationStatus.PENDING
        )

        # Patient B attempts to book exact same slot (10:00 AM - 10:30 AM)
        url = '/api/telemedicine/consultations/'
        payload = {
            'doctor_id': self.doctor.doctor_id,
            'requested_date': str(self.test_date),
            'requested_time': '10:00',
            'reason': 'Consultation B'
        }
        response = self.client_b.post(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('no longer available', response.data['detail'])

    def test_04_overlapping_slots_rejected(self):
        # Existing booking at 10:00 - 10:30
        TelemedicineConsultation.objects.create(
            patient=self.patient_a,
            doctor=self.doctor,
            requested_by=self.patient_a_user,
            requested_date=self.test_date,
            requested_time=time(10, 0),
            reason='Consultation A',
            status=ConsultationStatus.PENDING
        )

        url = '/api/telemedicine/consultations/'

        # Overlapping attempts: 09:45 (09:45 - 10:15) should fail
        res1 = self.client_b.post(url, {
            'doctor_id': self.doctor.doctor_id,
            'requested_date': str(self.test_date),
            'requested_time': '09:45',
            'reason': 'Overlap test 1'
        }, format='json')
        self.assertEqual(res1.status_code, status.HTTP_400_BAD_REQUEST)

        # Overlapping attempts: 10:15 (10:15 - 10:45) should fail
        res2 = self.client_b.post(url, {
            'doctor_id': self.doctor.doctor_id,
            'requested_date': str(self.test_date),
            'requested_time': '10:15',
            'reason': 'Overlap test 2'
        }, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_05_adjacent_slot_allowed(self):
        # Existing booking at 10:00 - 10:30
        TelemedicineConsultation.objects.create(
            patient=self.patient_a,
            doctor=self.doctor,
            requested_by=self.patient_a_user,
            requested_date=self.test_date,
            requested_time=time(10, 0),
            reason='Consultation A',
            status=ConsultationStatus.PENDING
        )

        # Adjacent slot at 10:30 (10:30 - 11:00) should be allowed!
        url = '/api/telemedicine/consultations/'
        res = self.client_b.post(url, {
            'doctor_id': self.doctor.doctor_id,
            'requested_date': str(self.test_date),
            'requested_time': '10:30',
            'reason': 'Adjacent test'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_06_cancelled_and_rejected_consultations_release_slot(self):
        # Rejected consultation at 10:00
        c1 = TelemedicineConsultation.objects.create(
            patient=self.patient_a,
            doctor=self.doctor,
            requested_by=self.patient_a_user,
            requested_date=self.test_date,
            requested_time=time(10, 0),
            reason='Consultation A',
            status=ConsultationStatus.REJECTED
        )

        # Patient B can now book 10:00!
        url = '/api/telemedicine/consultations/'
        res = self.client_b.post(url, {
            'doctor_id': self.doctor.doctor_id,
            'requested_date': str(self.test_date),
            'requested_time': '10:00',
            'reason': 'New Booking after rejection'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_07_doctor_accept_reject_schedule_flow(self):
        c = TelemedicineConsultation.objects.create(
            patient=self.patient_a,
            doctor=self.doctor,
            requested_by=self.patient_a_user,
            requested_date=self.test_date,
            requested_time=time(10, 0),
            reason='Initial request',
            status=ConsultationStatus.PENDING
        )

        # Doctor accepts
        accept_url = f'/api/telemedicine/consultations/{c.consultation_id}/accept/'
        res_acc = self.client_doc.post(accept_url)
        self.assertEqual(res_acc.status_code, status.HTTP_200_OK)
        self.assertEqual(res_acc.data['status'], ConsultationStatus.ACCEPTED)
        self.assertTrue('meet.jit.si' in res_acc.data['meeting_link'])

        # Doctor schedules
        sched_url = f'/api/telemedicine/consultations/{c.consultation_id}/schedule/'
        payload_sched = {
            'scheduled_date': str(self.test_date),
            'scheduled_start_time': '10:00',
            'scheduled_end_time': '10:30'
        }
        res_sched = self.client_doc.post(sched_url, payload_sched, format='json')
        self.assertEqual(res_sched.status_code, status.HTTP_200_OK)
        self.assertEqual(res_sched.data['status'], ConsultationStatus.SCHEDULED)

        # Doctor starts & completes
        start_url = f'/api/telemedicine/consultations/{c.consultation_id}/start/'
        self.client_doc.post(start_url)

        complete_url = f'/api/telemedicine/consultations/{c.consultation_id}/complete/'
        payload_comp = {
            'notes': 'Patient responded well to palliative medication',
            'symptoms_discussed': 'Pain management',
            'advice': 'Rest and drink fluids'
        }
        res_comp = self.client_doc.post(complete_url, payload_comp, format='json')
        self.assertEqual(res_comp.status_code, status.HTTP_200_OK)
        self.assertEqual(res_comp.data['status'], ConsultationStatus.COMPLETED)

        # Doctor schedules follow-up
        followup_url = f'/api/telemedicine/consultations/{c.consultation_id}/followups/'
        payload_fu = {
            'followup_date': str(self.test_date + timedelta(days=7)),
            'followup_time': '11:00',
            'reason': '7-day checkup'
        }
        res_fu = self.client_doc.post(followup_url, payload_fu, format='json')
        self.assertEqual(res_fu.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_fu.data['reason'], '7-day checkup')

    def test_08_rejection_requires_reason(self):
        c = TelemedicineConsultation.objects.create(
            patient=self.patient_a,
            doctor=self.doctor,
            requested_by=self.patient_a_user,
            requested_date=self.test_date,
            requested_time=time(10, 0),
            reason='Initial request',
            status=ConsultationStatus.PENDING
        )

        reject_url = f'/api/telemedicine/consultations/{c.consultation_id}/reject/'

        # Empty reason fails
        res_empty = self.client_doc.post(reject_url, {'rejection_reason': ''}, format='json')
        self.assertEqual(res_empty.status_code, status.HTTP_400_BAD_REQUEST)

        # Valid reason succeeds
        res = self.client_doc.post(reject_url, {'rejection_reason': 'Doctor unavailable'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['status'], ConsultationStatus.REJECTED)
        self.assertEqual(res.data['rejection_reason'], 'Doctor unavailable')
