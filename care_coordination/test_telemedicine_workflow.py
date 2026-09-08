import json
from datetime import date, time, timedelta, datetime
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User, Role, Patient, Doctor
from care_coordination.models import (
    TelemedicineConsultation,
    TelemedicineConsultationNote,
    TelemedicineFollowUp,
    ConsultationStatus,
    UrgencyLevel
)
from care_coordination.serializers import TELEMEDICINE_SLOTS, is_valid_telemedicine_slot


class TelemedicineWorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create Doctor 1
        self.doc1_user = User.objects.create_user(
            email='doctor1@example.com',
            password='DocPassword123!',
            role=Role.DOCTOR,
            is_active=True
        )
        self.doctor1 = Doctor.objects.create(
            user=self.doc1_user,
            name='Dr. Sarah Varghese',
            specialization='Palliative Care',
            phone='9876543210',
            verification_status='Approved'
        )

        # Create Doctor 2
        self.doc2_user = User.objects.create_user(
            email='doctor2@example.com',
            password='DocPassword123!',
            role=Role.DOCTOR,
            is_active=True
        )
        self.doctor2 = Doctor.objects.create(
            user=self.doc2_user,
            name='Dr. Rajesh Kumar',
            specialization='Oncology Palliative',
            phone='9876543211',
            verification_status='Approved'
        )

        # Create Patient 1
        self.pat1_user = User.objects.create_user(
            email='patient1@example.com',
            password='PatPassword123!',
            role=Role.PATIENT,
            is_active=True
        )
        self.patient1 = Patient.objects.create(
            user=self.pat1_user,
            name='Anoop Menon',
            phone='9876543220',
            registration_id='PAT-101',
            reviewed_by_doctor=self.doctor1
        )

        # Create Patient 2
        self.pat2_user = User.objects.create_user(
            email='patient2@example.com',
            password='PatPassword123!',
            role=Role.PATIENT,
            is_active=True
        )
        self.patient2 = Patient.objects.create(
            user=self.pat2_user,
            name='Bindu Thomas',
            phone='9876543221',
            registration_id='PAT-102',
            reviewed_by_doctor=self.doctor1
        )

        self.test_date = (timezone.now() + timedelta(days=2)).date()

    # 1. All 11 valid slots accepted
    def test_all_11_valid_slots_accepted(self):
        self.assertEqual(len(TELEMEDICINE_SLOTS), 11)
        for s in TELEMEDICINE_SLOTS:
            valid, st, et = is_valid_telemedicine_slot(s["start_time"])
            self.assertTrue(valid, f"Slot {s['start_time']} should be valid")
            self.assertEqual(st.strftime("%H:%M"), s["start_time"])
            self.assertEqual(et.strftime("%H:%M"), s["end_time"])

    # 2. Arbitrary times rejected
    def test_invalid_slots_rejected(self):
        invalid_times = ["10:15", "10:45", "13:00", "13:30", "13:45", "16:00", "16:30", "08:30", "12:15"]
        for inv in invalid_times:
            valid, _, _ = is_valid_telemedicine_slot(inv)
            self.assertFalse(valid, f"Time {inv} should be invalid")

    # 3. Lunch break is completely unavailable
    def test_lunch_break_unavailable(self):
        self.client.force_authenticate(user=self.pat1_user)
        response = self.client.post('/api/telemedicine/request/', {
            'doctor_id': self.doctor1.doctor_id,
            'requested_date': self.test_date.strftime("%Y-%m-%d"),
            'requested_time': '13:00',
            'reason': 'Checkup during lunch',
            'priority': 'Routine'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        response2 = self.client.post('/api/telemedicine/request/', {
            'doctor_id': self.doctor1.doctor_id,
            'requested_date': self.test_date.strftime("%Y-%m-%d"),
            'requested_time': '13:30',
            'reason': 'Checkup second half lunch',
            'priority': 'Routine'
        })
        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST)

    # 4. Patient can view available slots
    def test_available_slots_api(self):
        self.client.force_authenticate(user=self.pat1_user)
        response = self.client.get(f'/api/telemedicine/available-slots/?doctor_id={self.doctor1.doctor_id}&date={self.test_date.strftime("%Y-%m-%d")}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data['slots']), 11)
        self.assertIn('lunch_break', data)
        for s in data['slots']:
            self.assertEqual(s['status'], 'available')
            self.assertTrue(s['is_available'])

    # 5. Patient consultation request creates Pending status
    def test_patient_consultation_request_pending(self):
        self.client.force_authenticate(user=self.pat1_user)
        response = self.client.post('/api/telemedicine/request/', {
            'doctor_id': self.doctor1.doctor_id,
            'requested_date': self.test_date.strftime("%Y-%m-%d"),
            'requested_time': '10:00',
            'reason': 'Severe pain in knee joints',
            'symptoms': 'Swelling, tenderness',
            'priority': 'Urgent',
            'patient_notes': 'Please advise pain medication adjustment'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = response.json()
        self.assertEqual(data['status'], ConsultationStatus.PENDING)
        self.assertEqual(data['priority'], 'Urgent')
        self.assertEqual(data['patient_name'], 'Anoop Menon')
        self.assertIsNone(data['meeting_link'])

    # 6. Doctor double-booking prevention
    def test_doctor_double_booking_prevention(self):
        # Create an accepted/scheduled consultation for Doctor 1 at 10:00 on test_date with Patient 1
        c1 = TelemedicineConsultation.objects.create(
            patient=self.patient1,
            doctor=self.doctor1,
            requested_by=self.pat1_user,
            requested_date=self.test_date,
            requested_time=time(10, 0),
            scheduled_date=self.test_date,
            scheduled_start_time=time(10, 0),
            scheduled_end_time=time(10, 30),
            reason='Initial consult',
            status=ConsultationStatus.SCHEDULED,
            meeting_link='https://meet.jit.si/karunagrid-test-1'
        )

        # Available slots API should show 10:00 as booked
        self.client.force_authenticate(user=self.pat2_user)
        res_slots = self.client.get(f'/api/telemedicine/available-slots/?doctor_id={self.doctor1.doctor_id}&date={self.test_date.strftime("%Y-%m-%d")}')
        data = res_slots.json()
        slot_10 = next(s for s in data['slots'] if s['start_time'] == '10:00')
        self.assertEqual(slot_10['status'], 'booked')
        self.assertFalse(slot_10['is_available'])

        # Patient 2 trying to book Doctor 1 at 10:00 should receive HTTP 409 Conflict
        res_book = self.client.post('/api/telemedicine/request/', {
            'doctor_id': self.doctor1.doctor_id,
            'requested_date': self.test_date.strftime("%Y-%m-%d"),
            'requested_time': '10:00',
            'reason': 'Patient 2 trying same slot'
        })
        self.assertEqual(res_book.status_code, status.HTTP_409_CONFLICT)

    # 7. Patient double-booking prevention across ALL doctors
    def test_patient_double_booking_across_doctors(self):
        # Patient 1 has a scheduled consultation with Doctor 1 at 10:00
        TelemedicineConsultation.objects.create(
            patient=self.patient1,
            doctor=self.doctor1,
            requested_by=self.pat1_user,
            requested_date=self.test_date,
            requested_time=time(10, 0),
            scheduled_date=self.test_date,
            scheduled_start_time=time(10, 0),
            scheduled_end_time=time(10, 30),
            reason='Consult with Doc 1',
            status=ConsultationStatus.SCHEDULED
        )

        # Patient 1 now tries to request Doctor 2 at the same 10:00 slot
        self.client.force_authenticate(user=self.pat1_user)
        res = self.client.post('/api/telemedicine/request/', {
            'doctor_id': self.doctor2.doctor_id,
            'requested_date': self.test_date.strftime("%Y-%m-%d"),
            'requested_time': '10:00',
            'reason': 'Patient 1 trying second doctor at same time'
        })
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("already have a consultation scheduled at this time", res.json()['detail'])

    # 8. Same doctor can have consecutive non-overlapping slots
    def test_same_doctor_consecutive_slots(self):
        # Doctor 1 has 10:00-10:30 booked with Patient 1
        TelemedicineConsultation.objects.create(
            patient=self.patient1,
            doctor=self.doctor1,
            requested_by=self.pat1_user,
            requested_date=self.test_date,
            requested_time=time(10, 0),
            scheduled_date=self.test_date,
            scheduled_start_time=time(10, 0),
            scheduled_end_time=time(10, 30),
            status=ConsultationStatus.SCHEDULED,
            reason='Slot 1'
        )

        # Patient 2 books Doctor 1 at 10:30-11:00 -> SUCCESS
        self.client.force_authenticate(user=self.pat2_user)
        res = self.client.post('/api/telemedicine/request/', {
            'doctor_id': self.doctor1.doctor_id,
            'requested_date': self.test_date.strftime("%Y-%m-%d"),
            'requested_time': '10:30',
            'reason': 'Slot 2'
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    # 9. Same doctor can have same slot on different dates
    def test_same_doctor_same_slot_different_dates(self):
        date2 = self.test_date + timedelta(days=1)
        TelemedicineConsultation.objects.create(
            patient=self.patient1,
            doctor=self.doctor1,
            requested_by=self.pat1_user,
            requested_date=self.test_date,
            requested_time=time(10, 0),
            scheduled_date=self.test_date,
            scheduled_start_time=time(10, 0),
            scheduled_end_time=time(10, 30),
            status=ConsultationStatus.SCHEDULED,
            reason='Day 1'
        )

        # Patient 2 books Doctor 1 at 10:00 on date2 -> SUCCESS
        self.client.force_authenticate(user=self.pat2_user)
        res = self.client.post('/api/telemedicine/request/', {
            'doctor_id': self.doctor1.doctor_id,
            'requested_date': date2.strftime("%Y-%m-%d"),
            'requested_time': '10:00',
            'reason': 'Day 2'
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    # 10. Inactive statuses (Rejected, Cancelled, Completed) do NOT block future slots
    def test_inactive_statuses_do_not_block(self):
        # Create rejected consultation at 11:00
        TelemedicineConsultation.objects.create(
            patient=self.patient1,
            doctor=self.doctor1,
            requested_by=self.pat1_user,
            requested_date=self.test_date,
            requested_time=time(11, 0),
            status=ConsultationStatus.REJECTED,
            reason='Rejected one'
        )

        # Available slots should show 11:00 as available
        self.client.force_authenticate(user=self.pat2_user)
        res_slots = self.client.get(f'/api/telemedicine/available-slots/?doctor_id={self.doctor1.doctor_id}&date={self.test_date.strftime("%Y-%m-%d")}')
        data = res_slots.json()
        slot_11 = next(s for s in data['slots'] if s['start_time'] == '11:00')
        self.assertEqual(slot_11['status'], 'available')
        self.assertTrue(slot_11['is_available'])

        # Booking 11:00 succeeds
        res_book = self.client.post('/api/telemedicine/request/', {
            'doctor_id': self.doctor1.doctor_id,
            'requested_date': self.test_date.strftime("%Y-%m-%d"),
            'requested_time': '11:00',
            'reason': 'New booking at 11'
        })
        self.assertEqual(res_book.status_code, status.HTTP_201_CREATED)

    # 11. Doctor accepts consultation: generates Jitsi link and sets Scheduled status
    def test_doctor_accept_consultation_flow(self):
        c = TelemedicineConsultation.objects.create(
            patient=self.patient1,
            doctor=self.doctor1,
            requested_by=self.pat1_user,
            requested_date=self.test_date,
            requested_time=time(11, 30),
            status=ConsultationStatus.PENDING,
            reason='Pain management'
        )

        self.client.force_authenticate(user=self.doc1_user)
        res = self.client.post(f'/api/doctor/telemedicine/{c.consultation_id}/accept/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        c.refresh_from_db()
        self.assertEqual(c.status, ConsultationStatus.SCHEDULED)
        self.assertEqual(c.scheduled_date, self.test_date)
        self.assertEqual(c.scheduled_start_time, time(11, 30))
        self.assertEqual(c.scheduled_end_time, time(12, 0))
        self.assertIsNotNone(c.meeting_link)
        self.assertTrue(c.meeting_link.startswith('https://meet.jit.si/karunagrid-'))

    # 12. Doctor rejects consultation with mandatory reason
    def test_doctor_reject_consultation_flow(self):
        c = TelemedicineConsultation.objects.create(
            patient=self.patient1,
            doctor=self.doctor1,
            requested_by=self.pat1_user,
            requested_date=self.test_date,
            requested_time=time(12, 0),
            status=ConsultationStatus.PENDING,
            reason='Medication review'
        )

        self.client.force_authenticate(user=self.doc1_user)
        # Empty reason fails
        res_fail = self.client.post(f'/api/doctor/telemedicine/{c.consultation_id}/reject/', {
            'rejection_reason': '   '
        })
        self.assertEqual(res_fail.status_code, status.HTTP_400_BAD_REQUEST)

        # Valid reason succeeds
        res_ok = self.client.post(f'/api/doctor/telemedicine/{c.consultation_id}/reject/', {
            'rejection_reason': 'Doctor on emergency duty at that hour. Please request afternoon.'
        })
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)

        c.refresh_from_db()
        self.assertEqual(c.status, ConsultationStatus.REJECTED)
        self.assertEqual(c.rejection_reason, 'Doctor on emergency duty at that hour. Please request afternoon.')

    # 13. Doctor reschedules consultation to valid fixed slot
    def test_doctor_reschedule_consultation(self):
        c = TelemedicineConsultation.objects.create(
            patient=self.patient1,
            doctor=self.doctor1,
            requested_by=self.pat1_user,
            requested_date=self.test_date,
            requested_time=time(12, 0),
            scheduled_date=self.test_date,
            scheduled_start_time=time(12, 0),
            scheduled_end_time=time(12, 30),
            status=ConsultationStatus.SCHEDULED,
            meeting_link='https://meet.jit.si/karunagrid-test-resched'
        )

        self.client.force_authenticate(user=self.doc1_user)
        # Reschedule to 14:00 (afternoon slot)
        res = self.client.post(f'/api/doctor/telemedicine/{c.consultation_id}/reschedule/', {
            'scheduled_date': self.test_date.strftime("%Y-%m-%d"),
            'scheduled_start_time': '14:00'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        c.refresh_from_db()
        self.assertEqual(c.status, ConsultationStatus.RESCHEDULED)
        self.assertEqual(c.scheduled_start_time, time(14, 0))
        self.assertEqual(c.scheduled_end_time, time(14, 30))

    # 14. Doctor starts consultation -> In Progress
    def test_doctor_start_consultation(self):
        c = TelemedicineConsultation.objects.create(
            patient=self.patient1,
            doctor=self.doctor1,
            requested_by=self.pat1_user,
            requested_date=self.test_date,
            requested_time=time(14, 0),
            scheduled_date=self.test_date,
            scheduled_start_time=time(14, 0),
            scheduled_end_time=time(14, 30),
            status=ConsultationStatus.SCHEDULED
        )

        self.client.force_authenticate(user=self.doc1_user)
        res = self.client.post(f'/api/doctor/telemedicine/{c.consultation_id}/start/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        c.refresh_from_db()
        self.assertEqual(c.status, ConsultationStatus.IN_PROGRESS)

    # 15. Doctor records clinical notes & completes consultation
    def test_doctor_clinical_notes_and_complete(self):
        c = TelemedicineConsultation.objects.create(
            patient=self.patient1,
            doctor=self.doctor1,
            requested_by=self.pat1_user,
            requested_date=self.test_date,
            requested_time=time(14, 30),
            scheduled_date=self.test_date,
            scheduled_start_time=time(14, 30),
            scheduled_end_time=time(15, 0),
            status=ConsultationStatus.IN_PROGRESS
        )

        self.client.force_authenticate(user=self.doc1_user)
        # Record clinical note
        res_note = self.client.post(f'/api/telemedicine/{c.consultation_id}/notes/', {
            'symptoms_discussed': 'Severe neuropathic pain in lower extremities',
            'clinical_observations': 'Patient comfortable, mild swelling noted',
            'advice': 'Increase hydration, apply warm compress',
            'recommendations': 'Gabapentin dosage titration',
            'notes': 'Follow up in 2 weeks'
        })
        self.assertEqual(res_note.status_code, status.HTTP_201_CREATED)
        self.assertEqual(TelemedicineConsultationNote.objects.filter(consultation=c).count(), 1)

        # Complete consultation
        res_comp = self.client.post(f'/api/doctor/telemedicine/{c.consultation_id}/complete/')
        self.assertEqual(res_comp.status_code, status.HTTP_200_OK)

        c.refresh_from_db()
        self.assertEqual(c.status, ConsultationStatus.COMPLETED)
        self.assertIsNotNone(c.completed_at)

    # 16. Doctor schedules follow-up
    def test_doctor_schedule_followup(self):
        c = TelemedicineConsultation.objects.create(
            patient=self.patient1,
            doctor=self.doctor1,
            requested_by=self.pat1_user,
            requested_date=self.test_date,
            requested_time=time(15, 0),
            scheduled_date=self.test_date,
            scheduled_start_time=time(15, 0),
            scheduled_end_time=time(15, 30),
            status=ConsultationStatus.COMPLETED
        )

        self.client.force_authenticate(user=self.doc1_user)
        res_fu = self.client.post(f'/api/doctor/telemedicine/{c.consultation_id}/schedule-followup/', {
            'followup_date': (self.test_date + timedelta(days=7)).strftime("%Y-%m-%d"),
            'followup_time': '10:00',
            'reason': 'Review gabapentin effectiveness',
            'followup_type': 'Telemedicine'
        })
        self.assertEqual(res_fu.status_code, status.HTTP_201_CREATED)
        self.assertEqual(TelemedicineFollowUp.objects.filter(original_consultation=c).count(), 1)

    # 17. Role-Based Authorization & Security
    def test_role_based_security_isolation(self):
        c = TelemedicineConsultation.objects.create(
            patient=self.patient1,
            doctor=self.doctor1,
            requested_by=self.pat1_user,
            requested_date=self.test_date,
            requested_time=time(15, 30),
            scheduled_date=self.test_date,
            scheduled_start_time=time(15, 30),
            scheduled_end_time=time(16, 0),
            status=ConsultationStatus.SCHEDULED,
            meeting_link='https://meet.jit.si/karunagrid-private'
        )

        # Patient 2 CANNOT access Patient 1's consultation
        self.client.force_authenticate(user=self.pat2_user)
        res_unauth = self.client.get(f'/api/telemedicine/{c.consultation_id}/')
        self.assertEqual(res_unauth.status_code, status.HTTP_403_FORBIDDEN)

        # Doctor 2 CANNOT accept Doctor 1's consultation
        self.client.force_authenticate(user=self.doc2_user)
        res_doc_unauth = self.client.post(f'/api/doctor/telemedicine/{c.consultation_id}/accept/')
        self.assertEqual(res_doc_unauth.status_code, status.HTTP_403_FORBIDDEN)

        # Patient 1 CAN view their own consultation
        self.client.force_authenticate(user=self.pat1_user)
        res_auth = self.client.get(f'/api/telemedicine/{c.consultation_id}/')
        self.assertEqual(res_auth.status_code, status.HTTP_200_OK)

    # 18. Doctors List API for Patients & Caregivers
    def test_telemedicine_doctors_list_api(self):
        # Create unapproved doctor
        doc3_user = User.objects.create_user(
            email='doctor3@example.com',
            password='DocPassword123!',
            role=Role.DOCTOR,
            is_active=True
        )
        Doctor.objects.create(
            user=doc3_user,
            name='Dr. Unapproved Doctor',
            specialization='General Medicine',
            verification_status='Rejected'
        )

        # Authenticated Patient gets verified active doctors
        self.client.force_authenticate(user=self.pat1_user)
        res = self.client.get('/api/telemedicine/doctors/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertTrue(len(data) >= 2)
        doc_names = [d['name'] for d in data]
        self.assertIn('Dr. Sarah Varghese', doc_names)
        self.assertIn('Dr. Rajesh Kumar', doc_names)
        self.assertNotIn('Dr. Unapproved Doctor', doc_names)

        # Unauthenticated receives 401
        self.client.logout()
        res_unauth = self.client.get('/api/telemedicine/doctors/')
        self.assertEqual(res_unauth.status_code, status.HTTP_401_UNAUTHORIZED)
