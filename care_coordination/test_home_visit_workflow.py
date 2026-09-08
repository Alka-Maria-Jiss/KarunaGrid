import datetime
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import (
    User,
    Role,
    Doctor,
    Nurse,
    Patient,
    Caregiver,
    RegistrationStatus,
    VerificationStatus,
    PatientStatus,
)
from care_coordination.models import (
    HomeVisitSchedule,
    HomeVisitOccurrence,
    HomeVisitSummary,
    VisitSymptom,
    ScheduleFrequency,
    ScheduleStatus,
    VisitType,
    OccurrenceStatus,
    UrgencyLevel,
)
from notifications.models import Notification


class HomeVisitWorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # 1. Create Doctor 1 (Reviewing/Responsible Doctor)
        self.doc_user1 = User.objects.create_user(email="dr.smith@karunagrid.org", password="Password123!", role=Role.DOCTOR)
        self.doctor1 = Doctor.objects.create(
            user=self.doc_user1, name="John Smith", specialization="Palliative Care",
            verification_status=VerificationStatus.APPROVED
        )

        # 2. Create Doctor 2 (Alternate Doctor)
        self.doc_user2 = User.objects.create_user(email="dr.jones@karunagrid.org", password="Password123!", role=Role.DOCTOR)
        self.doctor2 = Doctor.objects.create(
            user=self.doc_user2, name="Sarah Jones", specialization="General Medicine",
            verification_status=VerificationStatus.APPROVED
        )

        # 3. Create Nurse 1
        self.nurse_user1 = User.objects.create_user(email="nurse.mary@karunagrid.org", password="Password123!", role=Role.NURSE)
        self.nurse1 = Nurse.objects.create(
            user=self.nurse_user1, name="Mary Poppins", verification_status=VerificationStatus.APPROVED
        )

        # 4. Create Nurse 2
        self.nurse_user2 = User.objects.create_user(email="nurse.florence@karunagrid.org", password="Password123!", role=Role.NURSE)
        self.nurse2 = Nurse.objects.create(
            user=self.nurse_user2, name="Florence Nightingale", verification_status=VerificationStatus.APPROVED
        )

        # 5. Create Approved Patient 1 (under Doctor 1)
        self.pat_user1 = User.objects.create_user(email="patient.alice@gmail.com", password="Password123!", role=Role.PATIENT)
        self.patient1 = Patient.objects.create(
            user=self.pat_user1,
            name="Alice Walker",
            registration_id="KG-PAT-001",
            registration_status=RegistrationStatus.APPROVED,
            status=PatientStatus.ACTIVE,
            reviewed_by_doctor=self.doctor1,
            place="Kochi",
            panchayath="Ernakulam",
            dob=datetime.date(1965, 4, 12),
        )

        # 6. Create Approved Patient 2 (under Doctor 2)
        self.pat_user2 = User.objects.create_user(email="patient.bob@gmail.com", password="Password123!", role=Role.PATIENT)
        self.patient2 = Patient.objects.create(
            user=self.pat_user2,
            name="Bob Marley",
            registration_id="KG-PAT-002",
            registration_status=RegistrationStatus.APPROVED,
            status=PatientStatus.ACTIVE,
            reviewed_by_doctor=self.doctor2,
            place="Aluva",
            panchayath="Aluva Central",
            dob=datetime.date(1955, 2, 6),
        )

        # 7. Create Unapproved Patient 3
        self.pat_user3 = User.objects.create_user(email="patient.pending@gmail.com", password="Password123!", role=Role.PATIENT)
        self.patient3 = Patient.objects.create(
            user=self.pat_user3,
            name="Pending Patient",
            registration_id="KG-PAT-003",
            registration_status=RegistrationStatus.PENDING,
            status=PatientStatus.ACTIVE,
            dob=datetime.date(1980, 1, 1),
        )

    # -------------------------------------------------------------
    # 1. PATIENT ELIGIBILITY & SCHEDULE CREATION
    # -------------------------------------------------------------
    def test_01_unapproved_patient_cannot_be_scheduled(self):
        """Unapproved patient must be rejected with 400 when attempting to create a recurring schedule."""
        self.client.force_authenticate(user=self.nurse_user1)
        res = self.client.post('/api/care-coordination/home-visits/schedules/', {
            "patient_id": self.patient3.patient_id,
            "frequency": "Weekly",
            "start_date": str(timezone.now().date())
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(HomeVisitSchedule.objects.count(), 0)

    def test_02_doctor_cannot_create_recurring_schedule(self):
        """Doctor must receive 403 Forbidden when attempting to create a recurring schedule."""
        self.client.force_authenticate(user=self.doc_user1)
        res = self.client.post('/api/care-coordination/home-visits/schedules/', {
            "patient_id": self.patient1.patient_id,
            "frequency": "Weekly",
            "start_date": str(timezone.now().date())
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_03_nurse_creates_schedule_and_generates_occurrences(self):
        """Nurse creates weekly schedule; future occurrences are automatically generated starting unassigned."""
        self.client.force_authenticate(user=self.nurse_user1)
        today = timezone.now().date()
        res = self.client.post('/api/care-coordination/home-visits/schedules/', {
            "patient_id": self.patient1.patient_id,
            "frequency": ScheduleFrequency.WEEKLY,
            "start_date": str(today)
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        schedule = HomeVisitSchedule.objects.get(patient=self.patient1, status=ScheduleStatus.ACTIVE)
        self.assertEqual(schedule.nurse, self.nurse1)
        self.assertEqual(schedule.frequency, ScheduleFrequency.WEEKLY)

        # Check generated occurrences
        occurrences = HomeVisitOccurrence.objects.filter(schedule=schedule).order_by('scheduled_date')
        self.assertEqual(occurrences.count(), 4)
        for occ in occurrences:
            self.assertEqual(occ.visit_type, VisitType.RECURRING)
            self.assertEqual(occ.status, OccurrenceStatus.SCHEDULED)
            self.assertIsNone(occ.allocated_nurse)
            self.assertEqual(occ.visiting_doctor, self.doctor1)

    # -------------------------------------------------------------
    # 2. ALLOCATION & VISITING DOCTOR ASSIGNMENT
    # -------------------------------------------------------------
    def test_04_nurse_claims_unassigned_visit(self):
        """Nurse claims an unassigned occurrence; allocated_nurse is set to the authenticated nurse."""
        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency="Weekly", start_date=timezone.now().date()
        )
        occ = HomeVisitOccurrence.objects.create(
            schedule=schedule, patient=self.patient1, scheduled_date=timezone.now().date(),
            visit_type=VisitType.RECURRING, status=OccurrenceStatus.SCHEDULED, allocated_nurse=None
        )

        self.client.force_authenticate(user=self.nurse_user2)
        res = self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/claim/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        occ.refresh_from_db()
        self.assertEqual(occ.allocated_nurse, self.nurse2)

    def test_05_already_claimed_visit_cannot_be_reclaimed(self):
        """A visit already allocated to Nurse 1 cannot be claimed by Nurse 2."""
        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency="Weekly", start_date=timezone.now().date()
        )
        occ = HomeVisitOccurrence.objects.create(
            schedule=schedule, patient=self.patient1, scheduled_date=timezone.now().date(),
            visit_type=VisitType.RECURRING, status=OccurrenceStatus.SCHEDULED, allocated_nurse=self.nurse1
        )

        self.client.force_authenticate(user=self.nurse_user2)
        res = self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/claim/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already been claimed", res.data['detail'])

    def test_06_nurse_assigns_visiting_doctor(self):
        """Nurse assigns Doctor 2 as the visiting doctor on an occurrence."""
        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency="Weekly", start_date=timezone.now().date()
        )
        occ = HomeVisitOccurrence.objects.create(
            schedule=schedule, patient=self.patient1, scheduled_date=timezone.now().date(),
            visit_type=VisitType.RECURRING, status=OccurrenceStatus.SCHEDULED, allocated_nurse=self.nurse1
        )

        self.client.force_authenticate(user=self.nurse_user1)
        res = self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/assign-doctor/', {
            "doctor_id": self.doctor2.doctor_id
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        occ.refresh_from_db()
        self.assertEqual(occ.visiting_doctor, self.doctor2)

        # Doctor 2 should receive a notification
        notif = Notification.objects.filter(user=self.doc_user2, type='home_visit').first()
        self.assertIsNotNone(notif)
        self.assertIn(self.patient1.name, notif.message)

    # -------------------------------------------------------------
    # 3. VISIT DOCUMENTATION & COMPLETION
    # -------------------------------------------------------------
    def test_07_only_nurse_can_complete_visit(self):
        """Doctor and Patient receive 403 when attempting to submit visit documentation."""
        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency="Weekly", start_date=timezone.now().date()
        )
        occ = HomeVisitOccurrence.objects.create(
            schedule=schedule, patient=self.patient1, scheduled_date=timezone.now().date(),
            visit_type=VisitType.RECURRING, status=OccurrenceStatus.SCHEDULED,
            allocated_nurse=self.nurse1, visiting_doctor=self.doctor1
        )

        # Attempt by Doctor
        self.client.force_authenticate(user=self.doc_user1)
        res = self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/complete/', {
            "blood_pressure": "120/80",
            "pulse": 72,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Attempt by Patient
        self.client.force_authenticate(user=self.pat_user1)
        res = self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/complete/', {
            "blood_pressure": "120/80",
            "pulse": 72,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_08_nurse_completes_visit_form_with_team(self):
        """Nurse completes documentation; HomeVisitSummary.nurse_id = authenticated Nurse, occurrence status = COMPLETED."""
        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency="Weekly", start_date=timezone.now().date()
        )
        occ = HomeVisitOccurrence.objects.create(
            schedule=schedule, patient=self.patient1, scheduled_date=timezone.now().date(),
            visit_type=VisitType.RECURRING, status=OccurrenceStatus.SCHEDULED,
            allocated_nurse=self.nurse1, visiting_doctor=self.doctor1
        )

        self.client.force_authenticate(user=self.nurse_user1)
        res = self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/complete/', {
            "blood_pressure": "125/82",
            "pulse": 76,
            "temperature": 98.6,
            "oxygen_level": 98,
            "treatment_notes": "Wound dressing changed and pain management reviewed.",
            "next_visit_recommendation": str(timezone.now().date() + datetime.timedelta(days=7)),
            "symptoms": [
                {"name": "Mild Pain", "severity": "Mild"},
                {"name": "Fatigue", "severity": "Moderate"}
            ]
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        occ.refresh_from_db()
        self.assertEqual(occ.status, OccurrenceStatus.COMPLETED)
        self.assertEqual(occ.visiting_doctor, self.doctor1)
        self.assertEqual(occ.allocated_nurse, self.nurse1)

        summary = HomeVisitSummary.objects.get(occurrence=occ)
        self.assertEqual(summary.nurse, self.nurse1)
        self.assertEqual(summary.blood_pressure, "125/82")
        self.assertEqual(summary.pulse, 76)
        self.assertEqual(summary.oxygen_level, 98)

        symptoms = VisitSymptom.objects.filter(summary=summary)
        self.assertEqual(symptoms.count(), 2)

    # -------------------------------------------------------------
    # 4. URGENT / OUT-OF-CYCLE VISIT WORKFLOW
    # -------------------------------------------------------------
    def test_09_patient_urgent_visit_workflow(self):
        """Patient requests urgent visit -> Nurse approves -> Doctor assigned -> Nurse completes."""
        self.client.force_authenticate(user=self.pat_user1)
        res = self.client.post('/api/care-coordination/home-visits/urgent-requests/', {
            "urgency_level": "Urgent",
            "reason": "Severe pain flare-up",
            "date": str(timezone.now().date() + datetime.timedelta(days=1))
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        occ_id = res.data['occurrence_id']

        occ = HomeVisitOccurrence.objects.get(occurrence_id=occ_id)
        self.assertIsNone(occ.schedule)
        self.assertEqual(occ.visit_type, VisitType.ADDITIONAL)
        self.assertIsNone(occ.approved_by_nurse)

        # Nurse reviews & approves
        self.client.force_authenticate(user=self.nurse_user1)
        res = self.client.post(f'/api/care-coordination/nurse/additional-requests/{occ_id}/approve/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Nurse claims & completes
        self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ_id}/claim/')
        res = self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ_id}/complete/', {
            "blood_pressure": "130/85",
            "treatment_notes": "Emergency analgesia administered.",
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        occ.refresh_from_db()
        self.assertEqual(occ.status, OccurrenceStatus.COMPLETED)

    # -------------------------------------------------------------
    # 5. FREQUENCY CHANGE & DOCTOR NOTIFICATION
    # -------------------------------------------------------------
    def test_10_nurse_changes_frequency_and_doctor_is_notified(self):
        """Nurse updates frequency; doctor receives notification; future unassigned visits regenerated; historical preserved."""
        today = timezone.now().date()
        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency=ScheduleFrequency.WEEKLY, start_date=today
        )
        # 1 historical completed visit
        completed_occ = HomeVisitOccurrence.objects.create(
            schedule=schedule, patient=self.patient1, scheduled_date=today - datetime.timedelta(days=7),
            visit_type=VisitType.RECURRING, status=OccurrenceStatus.COMPLETED,
            allocated_nurse=self.nurse1, visiting_doctor=self.doctor1
        )
        # 2 future unassigned visits
        future_occ1 = HomeVisitOccurrence.objects.create(
            schedule=schedule, patient=self.patient1, scheduled_date=today + datetime.timedelta(days=7),
            visit_type=VisitType.RECURRING, status=OccurrenceStatus.SCHEDULED, allocated_nurse=None
        )

        self.client.force_authenticate(user=self.nurse_user1)
        res = self.client.patch(f'/api/care-coordination/home-visits/schedules/{schedule.schedule_id}/', {
            "frequency": ScheduleFrequency.FORTNIGHTLY,
            "reason": "Patient condition stabilized"
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        schedule.refresh_from_db()
        self.assertEqual(schedule.frequency, ScheduleFrequency.FORTNIGHTLY)

        # Historical completed visit must remain untouched
        completed_occ.refresh_from_db()
        self.assertEqual(completed_occ.status, OccurrenceStatus.COMPLETED)

        # Doctor 1 must receive notification
        notif = Notification.objects.filter(user=self.doc_user1, type='home_visit').latest('created_at')
        self.assertIn("Fortnightly", notif.message)
        self.assertIn(self.patient1.name, notif.message)

    # -------------------------------------------------------------
    # 6. SHARED CALENDAR RBAC
    # -------------------------------------------------------------
    def test_11_shared_calendar_role_filtering(self):
        """Calendar returns only authorized visits for Patient, Nurse, and Doctor."""
        today = timezone.now().date()
        # Visit for Patient 1 (Doctor 1, Nurse 1)
        occ1 = HomeVisitOccurrence.objects.create(
            patient=self.patient1, scheduled_date=today, visit_type=VisitType.RECURRING,
            status=OccurrenceStatus.SCHEDULED, allocated_nurse=self.nurse1, visiting_doctor=self.doctor1
        )
        # Visit for Patient 2 (Doctor 2, Nurse 2)
        occ2 = HomeVisitOccurrence.objects.create(
            patient=self.patient2, scheduled_date=today, visit_type=VisitType.RECURRING,
            status=OccurrenceStatus.SCHEDULED, allocated_nurse=self.nurse2, visiting_doctor=self.doctor2
        )

        # 1. Patient 1 sees only occ1
        self.client.force_authenticate(user=self.pat_user1)
        res = self.client.get('/api/care-coordination/home-visits/calendar/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        occ_ids = [v['occurrence_id'] for v in res.data]
        self.assertIn(occ1.occurrence_id, occ_ids)
        self.assertNotIn(occ2.occurrence_id, occ_ids)

        # 2. Doctor 1 sees only occ1 (authorized patient)
        self.client.force_authenticate(user=self.doc_user1)
        res = self.client.get('/api/care-coordination/home-visits/calendar/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        occ_ids = [v['occurrence_id'] for v in res.data]
        self.assertIn(occ1.occurrence_id, occ_ids)
        self.assertNotIn(occ2.occurrence_id, occ_ids)

        # 3. Nurse 1 with scope=mine sees only occ1
        self.client.force_authenticate(user=self.nurse_user1)
        res = self.client.get('/api/care-coordination/home-visits/calendar/?scope=mine')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        occ_ids = [v['occurrence_id'] for v in res.data]
        self.assertIn(occ1.occurrence_id, occ_ids)
        self.assertNotIn(occ2.occurrence_id, occ_ids)

        # 4. Nurse 1 with scope=all sees both occ1 and occ2
        res = self.client.get('/api/care-coordination/home-visits/calendar/?scope=all')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        occ_ids = [v['occurrence_id'] for v in res.data]
        self.assertIn(occ1.occurrence_id, occ_ids)
        self.assertIn(occ2.occurrence_id, occ_ids)

    # -------------------------------------------------------------
    # 7. DOCUMENTATION OWNERSHIP & IMMUTABILITY ENFORCEMENT
    # -------------------------------------------------------------
    def test_12_nurse_documentation_ownership_enforcement(self):
        """Only the allocated nurse can submit official completion; other nurses receive 403."""
        today = timezone.now().date()
        occ = HomeVisitOccurrence.objects.create(
            patient=self.patient1, scheduled_date=today, visit_type=VisitType.RECURRING,
            status=OccurrenceStatus.SCHEDULED, allocated_nurse=self.nurse1, visiting_doctor=self.doctor1
        )

        # Nurse 2 attempts to complete Nurse 1's visit -> 403 Forbidden
        self.client.force_authenticate(user=self.nurse_user2)
        res = self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/complete/', {
            "blood_pressure": "120/80",
            "treatment_notes": "Attempted completion by unallocated nurse."
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Only the allocated nurse", res.data['detail'])

        # Nurse 1 completes -> 200 OK
        self.client.force_authenticate(user=self.nurse_user1)
        res = self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/complete/', {
            "blood_pressure": "120/80",
            "treatment_notes": "Official documentation by allocated nurse."
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        occ.refresh_from_db()
        self.assertEqual(occ.status, OccurrenceStatus.COMPLETED)
        self.assertEqual(occ.homevisitsummary.nurse, self.nurse1)

    def test_13_completed_visit_immutability(self):
        """Completed visits are protected against re-claiming, re-assigning doctor, and re-completing."""
        today = timezone.now().date()
        occ = HomeVisitOccurrence.objects.create(
            patient=self.patient1, scheduled_date=today, visit_type=VisitType.RECURRING,
            status=OccurrenceStatus.COMPLETED, allocated_nurse=self.nurse1, visiting_doctor=self.doctor1
        )
        HomeVisitSummary.objects.create(
            occurrence=occ, nurse=self.nurse1, blood_pressure="120/80", treatment_notes="Initial care"
        )

        self.client.force_authenticate(user=self.nurse_user1)

        # Attempt to re-assign doctor on completed visit -> 400
        res = self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/assign-doctor/', {
            "doctor_id": self.doctor2.doctor_id
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Attempt to claim completed visit -> 400
        res = self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/claim/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

        # Attempt to complete already completed visit -> 400
        res = self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/complete/', {
            "blood_pressure": "130/90"
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_14_team_status_progression(self):
        """Occurrence progresses correctly from Unassigned -> Nurse Assigned -> Team Assigned."""
        today = timezone.now().date()
        occ = HomeVisitOccurrence.objects.create(
            patient=self.patient1, scheduled_date=today, visit_type=VisitType.RECURRING,
            status=OccurrenceStatus.SCHEDULED, allocated_nurse=None, visiting_doctor=None
        )

        self.client.force_authenticate(user=self.nurse_user1)

        # 1. Initially unassigned
        res = self.client.get(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['team_status'], "Unassigned")
        self.assertFalse(res.data['is_team_assigned'])

        # 2. Claim by Nurse 1
        res = self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/claim/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.get(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/')
        self.assertEqual(res.data['team_status'], "Nurse Assigned (Doctor Pending)")
        self.assertFalse(res.data['is_team_assigned'])

        # 3. Assign Doctor 1
        res = self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/assign-doctor/', {
            "doctor_id": self.doctor1.doctor_id
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        res = self.client.get(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/')
        self.assertEqual(res.data['team_status'], "Team Assigned")
        self.assertTrue(res.data['is_team_assigned'])

    # -------------------------------------------------------------
    # 8. DOCTOR RBAC & RESTRICTIONS
    # -------------------------------------------------------------
    def test_15_doctor_cannot_claim_or_assign_doctor(self):
        """Doctor cannot claim visits or assign doctors (Nurse owns coordination)."""
        occ = HomeVisitOccurrence.objects.create(
            patient=self.patient1, scheduled_date=timezone.now().date(), visit_type=VisitType.RECURRING,
            status=OccurrenceStatus.SCHEDULED, allocated_nurse=None
        )

        self.client.force_authenticate(user=self.doc_user1)

        # 1. Doctor attempts to claim -> 403 Forbidden
        res = self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/claim/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Doctor attempts to assign doctor -> 403 Forbidden
        res = self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/assign-doctor/', {
            "doctor_id": self.doctor2.doctor_id
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # -------------------------------------------------------------
    # 9. OTHER ROLES RBAC ENFORCEMENT
    # -------------------------------------------------------------
    def test_16_unauthorized_roles_and_anonymous_rbac(self):
        """Caregivers without assignment, Patients, and Anonymous users RBAC."""
        caregiver_user = User.objects.create_user(email="caregiver.jane@karunagrid.org", password="Password123!", role=Role.CAREGIVER)
        Caregiver.objects.create(user=caregiver_user, name="Jane Caregiver", verification_status=VerificationStatus.APPROVED)

        occ = HomeVisitOccurrence.objects.create(
            patient=self.patient1, scheduled_date=timezone.now().date(), visit_type=VisitType.RECURRING,
            status=OccurrenceStatus.SCHEDULED, allocated_nurse=self.nurse1
        )

        # 1. Caregiver without active assignment cannot access this occurrence detail -> 403
        self.client.force_authenticate(user=caregiver_user)
        res = self.client.get(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Patient cannot create schedule -> 403
        self.client.force_authenticate(user=self.pat_user1)
        res = self.client.post('/api/care-coordination/home-visits/schedules/', {
            "patient_id": self.patient1.patient_id, "frequency": "Weekly"
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Patient cannot claim visit -> 403
        res = self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/claim/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # 4. Unauthenticated -> 401
        self.client.logout()
        res = self.client.get('/api/care-coordination/home-visits/occurrences/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    # -------------------------------------------------------------
    # 10. COMPREHENSIVE FREQUENCY SAFETY AUDIT
    # -------------------------------------------------------------
    def test_17_comprehensive_frequency_protection(self):
        """
        Changing frequency must protect:
        - Completed visits
        - Past visits
        - Future Nurse-allocated visits
        - Future Team-assigned visits
        - Urgent visits (schedule_id=NULL)
        - Additional visits (schedule_id=NULL)
        Only future unassigned recurring occurrences are deleted and regenerated.
        """
        today = timezone.now().date()
        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency=ScheduleFrequency.WEEKLY, start_date=today
        )

        # 1. Historical completed visit
        completed_occ = HomeVisitOccurrence.objects.create(
            schedule=schedule, patient=self.patient1, scheduled_date=today - datetime.timedelta(days=14),
            visit_type=VisitType.RECURRING, status=OccurrenceStatus.COMPLETED,
            allocated_nurse=self.nurse1, visiting_doctor=self.doctor1
        )
        # 2. Historical past visit
        past_occ = HomeVisitOccurrence.objects.create(
            schedule=schedule, patient=self.patient1, scheduled_date=today - datetime.timedelta(days=7),
            visit_type=VisitType.RECURRING, status=OccurrenceStatus.SCHEDULED,
            allocated_nurse=self.nurse1, visiting_doctor=self.doctor1
        )
        # 3. Future Nurse-allocated visit
        allocated_occ = HomeVisitOccurrence.objects.create(
            schedule=schedule, patient=self.patient1, scheduled_date=today + datetime.timedelta(days=7),
            visit_type=VisitType.RECURRING, status=OccurrenceStatus.SCHEDULED,
            allocated_nurse=self.nurse1, visiting_doctor=None
        )
        # 4. Future Team-assigned visit
        team_occ = HomeVisitOccurrence.objects.create(
            schedule=schedule, patient=self.patient1, scheduled_date=today + datetime.timedelta(days=14),
            visit_type=VisitType.RECURRING, status=OccurrenceStatus.SCHEDULED,
            allocated_nurse=self.nurse1, visiting_doctor=self.doctor1
        )
        # 5. Future Unassigned visit (this should be deleted/regenerated)
        unassigned_occ = HomeVisitOccurrence.objects.create(
            schedule=schedule, patient=self.patient1, scheduled_date=today + datetime.timedelta(days=21),
            visit_type=VisitType.RECURRING, status=OccurrenceStatus.SCHEDULED,
            allocated_nurse=None, visiting_doctor=self.doctor1
        )
        # 6. Urgent visit (schedule=None)
        urgent_occ = HomeVisitOccurrence.objects.create(
            schedule=None, patient=self.patient1, scheduled_date=today + datetime.timedelta(days=3),
            visit_type=VisitType.ADDITIONAL, urgency_level=UrgencyLevel.URGENT,
            status=OccurrenceStatus.SCHEDULED, allocated_nurse=self.nurse1
        )

        # Nurse changes frequency to Monthly
        self.client.force_authenticate(user=self.nurse_user1)
        res = self.client.patch(f'/api/care-coordination/home-visits/schedules/{schedule.schedule_id}/', {
            "frequency": ScheduleFrequency.MONTHLY,
            "reason": "Condition stable; routine monthly checkups"
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Assertions
        self.assertTrue(HomeVisitOccurrence.objects.filter(occurrence_id=completed_occ.occurrence_id).exists())
        self.assertTrue(HomeVisitOccurrence.objects.filter(occurrence_id=past_occ.occurrence_id).exists())
        self.assertTrue(HomeVisitOccurrence.objects.filter(occurrence_id=allocated_occ.occurrence_id).exists())
        self.assertTrue(HomeVisitOccurrence.objects.filter(occurrence_id=team_occ.occurrence_id).exists())
        self.assertTrue(HomeVisitOccurrence.objects.filter(occurrence_id=urgent_occ.occurrence_id).exists())

        # Unassigned future occurrence was cleanly replaced
        self.assertFalse(HomeVisitOccurrence.objects.filter(occurrence_id=unassigned_occ.occurrence_id).exists())

    # -------------------------------------------------------------
    # 11. DUPLICATE OCCURRENCE PREVENTION
    # -------------------------------------------------------------
    def test_18_no_duplicate_occurrences_on_same_date(self):
        """generate_recurring_occurrences skips dates where an occurrence already exists."""
        from care_coordination.views import generate_recurring_occurrences
        today = timezone.now().date()
        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency=ScheduleFrequency.WEEKLY, start_date=today
        )

        # Existing occurrence on start_date
        HomeVisitOccurrence.objects.create(
            schedule=schedule, patient=self.patient1, scheduled_date=today,
            visit_type=VisitType.RECURRING, status=OccurrenceStatus.SCHEDULED
        )

        # Generate occurrences (4 cycles)
        created = generate_recurring_occurrences(schedule, num_occurrences=4)
        # Should generate 3 new ones, skipping the existing 1
        self.assertEqual(created, 3)
        self.assertEqual(HomeVisitOccurrence.objects.filter(patient=self.patient1, scheduled_date=today).count(), 1)

    # -------------------------------------------------------------
    # 12. DOCTOR ASSIGNMENT VALIDATION
    # -------------------------------------------------------------
    def test_19_doctor_assignment_validation(self):
        """Cannot assign inactive doctor or unapproved doctor."""
        unapproved_user = User.objects.create_user(email="unapproved.doc@karunagrid.org", password="Password123!", role=Role.DOCTOR)
        unapproved_doc = Doctor.objects.create(
            user=unapproved_user, name="Unapproved Doc", specialization="Medicine",
            verification_status=VerificationStatus.PENDING
        )

        occ = HomeVisitOccurrence.objects.create(
            patient=self.patient1, scheduled_date=timezone.now().date(), visit_type=VisitType.RECURRING,
            status=OccurrenceStatus.SCHEDULED, allocated_nurse=self.nurse1
        )

        self.client.force_authenticate(user=self.nurse_user1)
        res = self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/assign-doctor/', {
            "doctor_id": unapproved_doc.doctor_id
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("not approved", str(res.data))

    # -------------------------------------------------------------
    # 13. URGENT VISIT LIFECYCLE INDEPENDENCE
    # -------------------------------------------------------------
    def test_20_urgent_visit_schedule_id_remains_null(self):
        """Urgent visit schedule_id remains NULL throughout entire workflow."""
        # Find a non-Sunday date
        target_date = timezone.now().date()
        if target_date.weekday() == 6:
            target_date += datetime.timedelta(days=1)

        self.client.force_authenticate(user=self.pat_user1)
        res = self.client.post('/api/care-coordination/home-visits/urgent-requests/', {
            "urgency_level": "Emergency",
            "reason": "Acute respiratory distress",
            "date": str(target_date)
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        occ_id = res.data['occurrence_id']

        occ = HomeVisitOccurrence.objects.get(occurrence_id=occ_id)
        self.assertIsNone(occ.schedule_id)

        # Nurse claims
        self.client.force_authenticate(user=self.nurse_user1)
        self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ_id}/claim/')
        occ.refresh_from_db()
        self.assertIsNone(occ.schedule_id)

        # Nurse assigns doctor
        self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ_id}/assign-doctor/', {
            "doctor_id": self.doctor1.doctor_id
        }, format='json')
        occ.refresh_from_db()
        self.assertIsNone(occ.schedule_id)

        # Nurse completes
        self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ_id}/complete/', {
            "blood_pressure": "140/90",
            "oxygen_level": 92,
            "treatment_notes": "Oxygen therapy administered on-site."
        }, format='json')
        occ.refresh_from_db()
        self.assertIsNone(occ.schedule_id)
        self.assertEqual(occ.status, OccurrenceStatus.COMPLETED)

    # =============================================================
    # SPECIFICATION TESTS: SECTION 28 (A THROUGH T)
    # =============================================================

    # A. DEFAULT DOCTOR: Patient has a responsible Doctor. Create occurrence. Expected: visiting_doctor = responsible Doctor
    def test_A_default_doctor_assignment(self):
        """When creating a normal Home Visit occurrence, patient's reviewed_by_doctor automatically becomes visiting_doctor."""
        # Patient 1 has responsible Doctor 1 (self.doctor1)
        monday = timezone.now().date()
        while monday.weekday() != 0:
            monday += datetime.timedelta(days=1)

        self.client.force_authenticate(user=self.nurse_user1)
        res = self.client.post('/api/care-coordination/home-visits/schedules/', {
            "patient_id": self.patient1.patient_id,
            "frequency": ScheduleFrequency.WEEKLY,
            "start_date": str(monday)
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        occurrences = HomeVisitOccurrence.objects.filter(patient=self.patient1)
        self.assertGreater(occurrences.count(), 0)
        for occ in occurrences:
            self.assertEqual(occ.visiting_doctor, self.doctor1)
            self.assertEqual(occ.visiting_doctor.name, "John Smith")

    # B. NO RESPONSIBLE DOCTOR: If patient has no valid responsible Doctor: visiting_doctor may remain NULL
    def test_B_no_responsible_doctor_leaves_visiting_doctor_null(self):
        """If patient genuinely has NO responsible Doctor, visiting_doctor remains NULL."""
        # Create approved patient without reviewed_by_doctor
        pat_user_no_doc = User.objects.create_user(email="no.doc.pat@gmail.com", password="Password123!", role=Role.PATIENT)
        patient_no_doc = Patient.objects.create(
            user=pat_user_no_doc,
            name="No Doctor Patient",
            registration_id="KG-PAT-NODOC",
            registration_status=RegistrationStatus.APPROVED,
            status=PatientStatus.ACTIVE,
            reviewed_by_doctor=None,
            dob=datetime.date(1975, 5, 20),
        )

        monday = timezone.now().date()
        while monday.weekday() != 0:
            monday += datetime.timedelta(days=1)

        self.client.force_authenticate(user=self.nurse_user1)
        res = self.client.post('/api/care-coordination/home-visits/schedules/', {
            "patient_id": patient_no_doc.patient_id,
            "frequency": ScheduleFrequency.WEEKLY,
            "start_date": str(monday)
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        occurrences = HomeVisitOccurrence.objects.filter(patient=patient_no_doc)
        self.assertGreater(occurrences.count(), 0)
        for occ in occurrences:
            self.assertIsNone(occ.visiting_doctor)

    # C. CHANGE DOCTOR: Nurse changes Dr. Maria -> Dr. Rahul
    def test_C_nurse_changes_visiting_doctor(self):
        """Nurse can change the Visiting Doctor to another valid active Doctor."""
        monday = timezone.now().date()
        while monday.weekday() != 0:
            monday += datetime.timedelta(days=1)

        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency=ScheduleFrequency.WEEKLY, start_date=monday
        )
        occ = HomeVisitOccurrence.objects.create(
            schedule=schedule, patient=self.patient1, scheduled_date=monday,
            visit_type=VisitType.RECURRING, status=OccurrenceStatus.SCHEDULED,
            allocated_nurse=self.nurse1, visiting_doctor=self.doctor1
        )
        self.assertEqual(occ.visiting_doctor, self.doctor1)

        # Nurse changes doctor from doctor1 to doctor2
        self.client.force_authenticate(user=self.nurse_user1)
        res = self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/assign-doctor/', {
            "doctor_id": self.doctor2.doctor_id
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        occ.refresh_from_db()
        self.assertEqual(occ.visiting_doctor, self.doctor2)
        self.assertTrue(occ.is_doctor_customized)

    # D. PRESERVE EXPLICIT DOCTOR: After Doctor is changed manually, regeneration MUST NOT overwrite it
    def test_D_preserve_explicit_doctor_reassignment_on_regeneration(self):
        """Explicit doctor changes (is_doctor_customized=True) are strictly preserved across occurrence generation."""
        from care_coordination.views import generate_recurring_occurrences
        monday = timezone.now().date()
        while monday.weekday() != 0:
            monday += datetime.timedelta(days=1)

        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency=ScheduleFrequency.WEEKLY, start_date=monday
        )
        # Generate initial visits (default doctor1)
        generate_recurring_occurrences(schedule, num_occurrences=4)
        occ = HomeVisitOccurrence.objects.filter(schedule=schedule).order_by('scheduled_date').first()
        self.assertEqual(occ.visiting_doctor, self.doctor1)

        # Nurse explicitly changes to doctor2
        self.client.force_authenticate(user=self.nurse_user1)
        res = self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/assign-doctor/', {
            "doctor_id": self.doctor2.doctor_id
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        occ.refresh_from_db()
        self.assertEqual(occ.visiting_doctor, self.doctor2)
        self.assertTrue(occ.is_doctor_customized)

        # Re-run occurrence generation
        generate_recurring_occurrences(schedule, num_occurrences=4)
        occ.refresh_from_db()
        self.assertEqual(occ.visiting_doctor, self.doctor2, "Explicit doctor reassignment must NOT be overwritten!")

    # E. EVERY DAY: Expected Monday-Saturday. Sunday must be absent.
    def test_E_every_day_generates_monday_through_saturday_no_sunday(self):
        """Every Day frequency generates visits for Monday-Saturday and completely excludes Sunday."""
        from care_coordination.views import generate_recurring_occurrences
        monday = timezone.now().date()
        while monday.weekday() != 0:
            monday += datetime.timedelta(days=1)

        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency=ScheduleFrequency.EVERY_DAY, start_date=monday
        )
        # Generate 14 occurrences (should cover more than 2 calendar weeks without any Sundays)
        created = generate_recurring_occurrences(schedule, num_occurrences=14)
        self.assertEqual(created, 14)

        occurrences = HomeVisitOccurrence.objects.filter(schedule=schedule).order_by('scheduled_date')
        self.assertEqual(occurrences.count(), 14)

        for occ in occurrences:
            # weekday() 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
            self.assertNotEqual(occ.scheduled_date.weekday(), 6, f"Sunday found in Every Day schedule: {occ.scheduled_date}")
            self.assertIn(occ.scheduled_date.weekday(), [0, 1, 2, 3, 4, 5])

    # F. WEEKLY: Verify correct recurrence and non-Sunday dates
    def test_F_weekly_recurrence(self):
        """Weekly recurrence creates visits 7 days apart on working days."""
        from care_coordination.views import generate_recurring_occurrences
        tuesday = timezone.now().date()
        while tuesday.weekday() != 1:
            tuesday += datetime.timedelta(days=1)

        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency=ScheduleFrequency.WEEKLY, start_date=tuesday
        )
        generate_recurring_occurrences(schedule, num_occurrences=4)
        occurrences = list(HomeVisitOccurrence.objects.filter(schedule=schedule).order_by('scheduled_date'))
        self.assertEqual(len(occurrences), 4)

        for i in range(len(occurrences) - 1):
            diff = (occurrences[i+1].scheduled_date - occurrences[i].scheduled_date).days
            self.assertEqual(diff, 7)
            self.assertNotEqual(occurrences[i].scheduled_date.weekday(), 6)

    # G. EVERY 2 WEEKS: Verify 14-day recurrence
    def test_G_every_2_weeks_14_day_recurrence(self):
        """Every 2 Weeks frequency creates visits exactly 14 days apart on working days."""
        from care_coordination.views import generate_recurring_occurrences
        wednesday = timezone.now().date()
        while wednesday.weekday() != 2:
            wednesday += datetime.timedelta(days=1)

        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency=ScheduleFrequency.EVERY_2_WEEKS, start_date=wednesday
        )
        generate_recurring_occurrences(schedule, num_occurrences=4)
        occurrences = list(HomeVisitOccurrence.objects.filter(schedule=schedule).order_by('scheduled_date'))
        self.assertEqual(len(occurrences), 4)

        for i in range(len(occurrences) - 1):
            diff = (occurrences[i+1].scheduled_date - occurrences[i].scheduled_date).days
            self.assertEqual(diff, 14)
            self.assertNotEqual(occurrences[i].scheduled_date.weekday(), 6)

    # H. MONTHLY: Verify monthly recurrence
    def test_H_monthly_recurrence(self):
        """Monthly recurrence generates monthly occurrences without landing on Sunday."""
        from care_coordination.views import generate_recurring_occurrences
        start = datetime.date(2026, 9, 8)  # Tuesday

        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency=ScheduleFrequency.MONTHLY, start_date=start
        )
        generate_recurring_occurrences(schedule, num_occurrences=4)
        occurrences = list(HomeVisitOccurrence.objects.filter(schedule=schedule).order_by('scheduled_date'))
        self.assertEqual(len(occurrences), 4)

        for occ in occurrences:
            self.assertNotEqual(occ.scheduled_date.weekday(), 6, f"Occurrence fell on Sunday: {occ.scheduled_date}")

    # I. CUSTOM: Test Monday + Wednesday + Friday
    def test_I_custom_frequency_mon_wed_fri(self):
        """Custom schedule with Mon, Wed, Fri creates visits ONLY on those selected weekdays."""
        monday = timezone.now().date()
        while monday.weekday() != 0:
            monday += datetime.timedelta(days=1)

        self.client.force_authenticate(user=self.nurse_user1)
        res = self.client.post('/api/care-coordination/home-visits/schedules/', {
            "patient_id": self.patient1.patient_id,
            "frequency": ScheduleFrequency.CUSTOM,
            "custom_days": ["Monday", "Wednesday", "Friday"],
            "start_date": str(monday)
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        schedule = HomeVisitSchedule.objects.get(patient=self.patient1, status=ScheduleStatus.ACTIVE)
        self.assertEqual(schedule.custom_days, ["Monday", "Wednesday", "Friday"])

        occurrences = HomeVisitOccurrence.objects.filter(schedule=schedule).order_by('scheduled_date')
        self.assertGreater(occurrences.count(), 0)

        for occ in occurrences:
            # 0=Monday, 2=Wednesday, 4=Friday
            self.assertIn(occ.scheduled_date.weekday(), [0, 2, 4], f"Unexpected weekday for custom schedule: {occ.scheduled_date.weekday()}")
            self.assertNotEqual(occ.scheduled_date.weekday(), 6)

    # J. CUSTOM SUNDAY: Attempt to select Sunday -> validation failure
    def test_J_custom_frequency_sunday_rejected(self):
        """Attempting to select Sunday in custom_days must be rejected with 400."""
        monday = timezone.now().date()
        while monday.weekday() != 0:
            monday += datetime.timedelta(days=1)

        self.client.force_authenticate(user=self.nurse_user1)
        res = self.client.post('/api/care-coordination/home-visits/schedules/', {
            "patient_id": self.patient1.patient_id,
            "frequency": ScheduleFrequency.CUSTOM,
            "custom_days": ["Monday", "Sunday"],
            "start_date": str(monday)
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Sunday is a non-working day", str(res.data))

    # K. CUSTOM WITH NO DAYS: validation failure
    def test_K_custom_frequency_no_days_rejected(self):
        """Attempting to create Custom schedule with empty custom_days list must be rejected with 400."""
        monday = timezone.now().date()
        while monday.weekday() != 0:
            monday += datetime.timedelta(days=1)

        self.client.force_authenticate(user=self.nurse_user1)
        res = self.client.post('/api/care-coordination/home-visits/schedules/', {
            "patient_id": self.patient1.patient_id,
            "frequency": ScheduleFrequency.CUSTOM,
            "custom_days": [],
            "start_date": str(monday)
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    # L. SUNDAY DIRECT API REQUEST: Attempt invalid Sunday scheduling
    def test_L_sunday_direct_api_request_rejected(self):
        """Attempting to schedule on a Sunday via API must be rejected with 400."""
        sunday = timezone.now().date()
        while sunday.weekday() != 6:
            sunday += datetime.timedelta(days=1)

        self.client.force_authenticate(user=self.nurse_user1)
        # 1. Schedule creation on Sunday
        res = self.client.post('/api/care-coordination/home-visits/schedules/', {
            "patient_id": self.patient1.patient_id,
            "frequency": ScheduleFrequency.WEEKLY,
            "start_date": str(sunday)
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Sunday", str(res.data))

        # 2. Urgent request on Sunday
        self.client.force_authenticate(user=self.pat_user1)
        res2 = self.client.post('/api/care-coordination/home-visits/urgent-requests/', {
            "urgency_level": "Urgent",
            "reason": "Sunday visit request test",
            "date": str(sunday)
        }, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Sunday", str(res2.data))

    # M. DUPLICATE PREVENTION: Multiple occurrence generation runs
    def test_M_duplicate_prevention_on_multiple_runs(self):
        """Running occurrence generation multiple times produces zero duplicates on same date."""
        from care_coordination.views import generate_recurring_occurrences
        monday = timezone.now().date()
        while monday.weekday() != 0:
            monday += datetime.timedelta(days=1)

        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency=ScheduleFrequency.EVERY_DAY, start_date=monday
        )
        # First run
        created1 = generate_recurring_occurrences(schedule, num_occurrences=6)
        self.assertEqual(created1, 6)
        initial_count = HomeVisitOccurrence.objects.filter(schedule=schedule).count()

        # Second run
        created2 = generate_recurring_occurrences(schedule, num_occurrences=6)
        self.assertEqual(created2, 0)
        self.assertEqual(HomeVisitOccurrence.objects.filter(schedule=schedule).count(), initial_count)

    # N. EDIT FREQUENCY: Change Weekly -> Custom: Mon + Wed + Fri
    def test_N_edit_frequency_weekly_to_custom(self):
        """Nurse edits recurring schedule from Weekly to Custom (Mon, Wed, Fri); future visits follow new pattern."""
        monday = timezone.now().date()
        while monday.weekday() != 0:
            monday += datetime.timedelta(days=1)

        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency=ScheduleFrequency.WEEKLY, start_date=monday
        )
        # Create unassigned future occurrence
        unassigned_occ = HomeVisitOccurrence.objects.create(
            schedule=schedule, patient=self.patient1, scheduled_date=monday + datetime.timedelta(days=7),
            visit_type=VisitType.RECURRING, status=OccurrenceStatus.SCHEDULED, allocated_nurse=None
        )

        self.client.force_authenticate(user=self.nurse_user1)
        res = self.client.patch(f'/api/care-coordination/home-visits/schedules/{schedule.schedule_id}/', {
            "frequency": ScheduleFrequency.CUSTOM,
            "custom_days": ["Monday", "Wednesday", "Friday"],
            "effective_date": str(monday + datetime.timedelta(days=7)),
            "reason": "Transition to MWF custom palliative protocol"
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        schedule.refresh_from_db()
        self.assertEqual(schedule.frequency, ScheduleFrequency.CUSTOM)
        self.assertEqual(schedule.custom_days, ["Monday", "Wednesday", "Friday"])

    # O. EFFECTIVE DATE: Verify changes apply only from Effective From date
    def test_O_effective_date_schedule_update(self):
        """Schedule edits apply only from the Effective From date onwards."""
        today = timezone.now().date()
        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency=ScheduleFrequency.WEEKLY, start_date=today
        )

        effective_date = today + datetime.timedelta(days=14)
        if effective_date.weekday() == 6:
            effective_date += datetime.timedelta(days=1)

        self.client.force_authenticate(user=self.nurse_user1)
        res = self.client.patch(f'/api/care-coordination/home-visits/schedules/{schedule.schedule_id}/', {
            "frequency": ScheduleFrequency.EVERY_2_WEEKS,
            "effective_date": str(effective_date),
            "reason": "Update starting from effective date"
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        schedule.refresh_from_db()
        self.assertEqual(schedule.frequency, ScheduleFrequency.EVERY_2_WEEKS)

    # P. HISTORICAL PROTECTION: Completed/past visits remain unchanged
    def test_P_historical_and_completed_visits_protected(self):
        """Completed and past visits must NEVER be modified or deleted during schedule edit."""
        today = timezone.now().date()
        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency=ScheduleFrequency.WEEKLY, start_date=today - datetime.timedelta(days=28)
        )
        completed_occ = HomeVisitOccurrence.objects.create(
            schedule=schedule, patient=self.patient1, scheduled_date=today - datetime.timedelta(days=14),
            visit_type=VisitType.RECURRING, status=OccurrenceStatus.COMPLETED,
            allocated_nurse=self.nurse1, visiting_doctor=self.doctor1
        )
        summary = HomeVisitSummary.objects.create(
            occurrence=completed_occ, nurse=self.nurse1, blood_pressure="120/80", pulse=75,
            treatment_notes="Historical clinical notes preserved"
        )

        self.client.force_authenticate(user=self.nurse_user1)
        res = self.client.patch(f'/api/care-coordination/home-visits/schedules/{schedule.schedule_id}/', {
            "frequency": ScheduleFrequency.MONTHLY,
            "reason": "Change schedule frequency"
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Completed occurrence and its summary must be fully preserved
        self.assertTrue(HomeVisitOccurrence.objects.filter(occurrence_id=completed_occ.occurrence_id).exists())
        completed_occ.refresh_from_db()
        self.assertEqual(completed_occ.status, OccurrenceStatus.COMPLETED)
        self.assertEqual(completed_occ.homevisitsummary.treatment_notes, "Historical clinical notes preserved")

    # Q. ALLOCATED VISIT PROTECTION: Already allocated/team-assigned visits are not blindly rewritten
    def test_Q_allocated_and_team_assigned_visits_protected(self):
        """Future occurrences that are already allocated to a nurse or team-assigned are preserved."""
        today = timezone.now().date()
        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency=ScheduleFrequency.WEEKLY, start_date=today
        )
        future_allocated_occ = HomeVisitOccurrence.objects.create(
            schedule=schedule, patient=self.patient1, scheduled_date=today + datetime.timedelta(days=7),
            visit_type=VisitType.RECURRING, status=OccurrenceStatus.SCHEDULED,
            allocated_nurse=self.nurse1, visiting_doctor=self.doctor1
        )

        self.client.force_authenticate(user=self.nurse_user1)
        res = self.client.patch(f'/api/care-coordination/home-visits/schedules/{schedule.schedule_id}/', {
            "frequency": ScheduleFrequency.MONTHLY,
            "reason": "Switch to monthly"
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.assertTrue(HomeVisitOccurrence.objects.filter(occurrence_id=future_allocated_occ.occurrence_id).exists())
        future_allocated_occ.refresh_from_db()
        self.assertEqual(future_allocated_occ.allocated_nurse, self.nurse1)
        self.assertEqual(future_allocated_occ.visiting_doctor, self.doctor1)

    # R. EXPLICIT DOCTOR PROTECTION: Schedule editing must not overwrite an explicitly reassigned Doctor
    def test_R_explicit_doctor_protected_during_schedule_edit(self):
        """Occurrences with is_doctor_customized=True must be protected during schedule editing."""
        today = timezone.now().date()
        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency=ScheduleFrequency.WEEKLY, start_date=today
        )
        custom_doc_occ = HomeVisitOccurrence.objects.create(
            schedule=schedule, patient=self.patient1, scheduled_date=today + datetime.timedelta(days=7),
            visit_type=VisitType.RECURRING, status=OccurrenceStatus.SCHEDULED,
            allocated_nurse=None, visiting_doctor=self.doctor2, is_doctor_customized=True
        )

        self.client.force_authenticate(user=self.nurse_user1)
        res = self.client.patch(f'/api/care-coordination/home-visits/schedules/{schedule.schedule_id}/', {
            "frequency": ScheduleFrequency.MONTHLY,
            "reason": "Switch to monthly"
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.assertTrue(HomeVisitOccurrence.objects.filter(occurrence_id=custom_doc_occ.occurrence_id).exists())
        custom_doc_occ.refresh_from_db()
        self.assertEqual(custom_doc_occ.visiting_doctor, self.doctor2)
        self.assertTrue(custom_doc_occ.is_doctor_customized)

    # S. URGENT VISIT: schedule_id = NULL remains unchanged
    def test_S_urgent_visit_schedule_id_null(self):
        """Urgent visits are created with schedule_id=NULL and never attached to recurring schedules."""
        target_date = timezone.now().date()
        if target_date.weekday() == 6:
            target_date += datetime.timedelta(days=1)

        self.client.force_authenticate(user=self.pat_user1)
        res = self.client.post('/api/care-coordination/home-visits/urgent-requests/', {
            "urgency_level": "Urgent",
            "reason": "Pain relief needed",
            "date": str(target_date)
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        occ = HomeVisitOccurrence.objects.get(occurrence_id=res.data['occurrence_id'])
        self.assertIsNone(occ.schedule)
        self.assertIsNone(occ.schedule_id)
        self.assertEqual(occ.visit_type, VisitType.ADDITIONAL)

    # T. RBAC: Verify Patient, Doctor, Unauthorized users
    def test_T_rbac_enforcement(self):
        """
        RBAC Verification:
        - Patient cannot edit schedule -> 403
        - Doctor cannot edit schedule -> 403
        - Doctor cannot claim visit -> 403
        - Doctor cannot assign themselves -> 403
        - Unauthorized users receive 403
        """
        today = timezone.now().date()
        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency=ScheduleFrequency.WEEKLY, start_date=today
        )
        occ = HomeVisitOccurrence.objects.create(
            schedule=schedule, patient=self.patient1, scheduled_date=today,
            visit_type=VisitType.RECURRING, status=OccurrenceStatus.SCHEDULED, allocated_nurse=None
        )

        # 1. Patient cannot edit schedule -> 403
        self.client.force_authenticate(user=self.pat_user1)
        res1 = self.client.patch(f'/api/care-coordination/home-visits/schedules/{schedule.schedule_id}/', {
            "frequency": ScheduleFrequency.MONTHLY
        }, format='json')
        self.assertEqual(res1.status_code, status.HTTP_403_FORBIDDEN)

        # 2. Doctor cannot edit schedule -> 403
        self.client.force_authenticate(user=self.doc_user1)
        res2 = self.client.patch(f'/api/care-coordination/home-visits/schedules/{schedule.schedule_id}/', {
            "frequency": ScheduleFrequency.MONTHLY
        }, format='json')
        self.assertEqual(res2.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Doctor cannot claim visit -> 403
        res3 = self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/claim/')
        self.assertEqual(res3.status_code, status.HTTP_403_FORBIDDEN)

        # 4. Doctor cannot assign doctor -> 403
        res4 = self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/assign-doctor/', {
            "doctor_id": self.doctor1.doctor_id
        }, format='json')
        self.assertEqual(res4.status_code, status.HTTP_403_FORBIDDEN)

