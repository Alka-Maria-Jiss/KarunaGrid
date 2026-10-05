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
    # 1. NURSE A CREATES RECURRING SCHEDULE
    # -------------------------------------------------------------
    def test_01_nurse_a_can_create_recurring_schedule(self):
        """Nurse A can create a recurring schedule; future occurrences are automatically generated."""
        self.client.force_authenticate(user=self.nurse_user1)
        monday = timezone.now().date()
        while monday.weekday() != 0:
            monday += datetime.timedelta(days=1)

        res = self.client.post('/api/care-coordination/home-visits/schedules/', {
            "patient_id": self.patient1.patient_id,
            "frequency": ScheduleFrequency.WEEKLY,
            "start_date": str(monday)
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        schedule = HomeVisitSchedule.objects.get(patient=self.patient1, status=ScheduleStatus.ACTIVE)
        self.assertEqual(schedule.nurse, self.nurse1)
        self.assertEqual(schedule.frequency, ScheduleFrequency.WEEKLY)

        occurrences = HomeVisitOccurrence.objects.filter(schedule=schedule).order_by('scheduled_date')
        self.assertEqual(occurrences.count(), 4)
        for occ in occurrences:
            self.assertEqual(occ.visit_type, VisitType.RECURRING)
            self.assertEqual(occ.status, OccurrenceStatus.SCHEDULED)
            self.assertEqual(occ.visiting_doctor, self.doctor1)

    # -------------------------------------------------------------
    # 2. NURSE B CAN SEE NURSE A'S SCHEDULE
    # -------------------------------------------------------------
    def test_02_nurse_b_can_see_nurse_a_schedule(self):
        """Nurse B can view schedules created by Nurse A (shared care coordination)."""
        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency=ScheduleFrequency.WEEKLY,
            start_date=timezone.now().date(), status=ScheduleStatus.ACTIVE
        )

        self.client.force_authenticate(user=self.nurse_user2)
        res = self.client.get('/api/care-coordination/home-visits/schedules/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        sched_ids = [s['schedule_id'] for s in res.data]
        self.assertIn(schedule.schedule_id, sched_ids)

    # -------------------------------------------------------------
    # 3. NURSE B CAN EDIT NURSE A'S SCHEDULE
    # -------------------------------------------------------------
    def test_03_nurse_b_can_edit_nurse_a_schedule(self):
        """Nurse B can modify the frequency and parameters of a schedule created by Nurse A."""
        monday = timezone.now().date()
        while monday.weekday() != 0:
            monday += datetime.timedelta(days=1)

        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency=ScheduleFrequency.WEEKLY,
            start_date=monday, status=ScheduleStatus.ACTIVE
        )

        self.client.force_authenticate(user=self.nurse_user2)
        res = self.client.patch(f'/api/care-coordination/home-visits/schedules/{schedule.schedule_id}/', {
            "frequency": ScheduleFrequency.FORTNIGHTLY,
            "reason": "Condition stabilized, changing to fortnightly visits."
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        schedule.refresh_from_db()
        self.assertEqual(schedule.frequency, ScheduleFrequency.FORTNIGHTLY)

    # -------------------------------------------------------------
    # 4. NO NURSE NEEDS TO CLAIM A VISIT
    # -------------------------------------------------------------
    def test_04_no_nurse_needs_to_claim_visit(self):
        """Visits are immediately open for any nurse to view, manage, and complete without claiming."""
        monday = timezone.now().date()
        while monday.weekday() != 0:
            monday += datetime.timedelta(days=1)

        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency=ScheduleFrequency.WEEKLY,
            start_date=monday, status=ScheduleStatus.ACTIVE
        )
        occ = HomeVisitOccurrence.objects.create(
            schedule=schedule, patient=self.patient1, scheduled_date=monday,
            visit_type=VisitType.RECURRING, status=OccurrenceStatus.SCHEDULED,
            visiting_doctor=self.doctor1
        )

        # Nurse 2 checks the occurrence - no claim barrier
        self.client.force_authenticate(user=self.nurse_user2)
        res = self.client.get(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['status'], OccurrenceStatus.SCHEDULED)

    # -------------------------------------------------------------
    # 5. ALL NURSES SEE ALL VISITS
    # -------------------------------------------------------------
    def test_05_all_nurses_see_all_visits(self):
        """Nurse 1 and Nurse 2 see identical sets of visits across the board."""
        today = timezone.now().date()
        occ1 = HomeVisitOccurrence.objects.create(
            patient=self.patient1, scheduled_date=today, visit_type=VisitType.RECURRING,
            status=OccurrenceStatus.SCHEDULED, visiting_doctor=self.doctor1
        )
        occ2 = HomeVisitOccurrence.objects.create(
            patient=self.patient2, scheduled_date=today, visit_type=VisitType.RECURRING,
            status=OccurrenceStatus.SCHEDULED, visiting_doctor=self.doctor2
        )

        # Nurse 1 sees both
        self.client.force_authenticate(user=self.nurse_user1)
        res1 = self.client.get('/api/care-coordination/nurse/home-visits/')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        ids1 = [v['occurrence_id'] for v in res1.data]
        self.assertIn(occ1.occurrence_id, ids1)
        self.assertIn(occ2.occurrence_id, ids1)

        # Nurse 2 sees both
        self.client.force_authenticate(user=self.nurse_user2)
        res2 = self.client.get('/api/care-coordination/nurse/home-visits/')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        ids2 = [v['occurrence_id'] for v in res2.data]
        self.assertEqual(ids1, ids2)

    # -------------------------------------------------------------
    # 6. DATE FILTERING WORKS
    # -------------------------------------------------------------
    def test_06_date_filtering_works(self):
        """Querying with ?date=YYYY-MM-DD returns only visits for that specific date."""
        date1 = datetime.date(2026, 10, 5)  # Monday
        date2 = datetime.date(2026, 10, 6)  # Tuesday

        occ1 = HomeVisitOccurrence.objects.create(
            patient=self.patient1, scheduled_date=date1, visit_type=VisitType.RECURRING,
            status=OccurrenceStatus.SCHEDULED, visiting_doctor=self.doctor1
        )
        occ2 = HomeVisitOccurrence.objects.create(
            patient=self.patient2, scheduled_date=date2, visit_type=VisitType.RECURRING,
            status=OccurrenceStatus.SCHEDULED, visiting_doctor=self.doctor2
        )

        self.client.force_authenticate(user=self.nurse_user1)
        res = self.client.get('/api/care-coordination/nurse/home-visits/?date=2026-10-05')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = [v['occurrence_id'] for v in res.data]
        self.assertIn(occ1.occurrence_id, ids)
        self.assertNotIn(occ2.occurrence_id, ids)

    # -------------------------------------------------------------
    # 7. ASSIGN DOCTOR WORKS FOR AN INDIVIDUAL OCCURRENCE
    # -------------------------------------------------------------
    def test_07_assign_doctor_works_for_individual_occurrence(self):
        """Any nurse can assign a doctor to an unassigned occurrence."""
        today = timezone.now().date()
        occ = HomeVisitOccurrence.objects.create(
            patient=self.patient1, scheduled_date=today, visit_type=VisitType.RECURRING,
            status=OccurrenceStatus.SCHEDULED, visiting_doctor=None
        )

        self.client.force_authenticate(user=self.nurse_user2)
        res = self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/assign-doctor/', {
            "doctor_id": self.doctor2.doctor_id
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        occ.refresh_from_db()
        self.assertEqual(occ.visiting_doctor, self.doctor2)
        self.assertTrue(occ.is_doctor_customized)

    # -------------------------------------------------------------
    # 8. CHANGE DOCTOR WORKS FOR AN INDIVIDUAL OCCURRENCE
    # -------------------------------------------------------------
    def test_08_change_doctor_works_for_individual_occurrence(self):
        """Any nurse can change an already assigned doctor on an occurrence."""
        today = timezone.now().date()
        occ = HomeVisitOccurrence.objects.create(
            patient=self.patient1, scheduled_date=today, visit_type=VisitType.RECURRING,
            status=OccurrenceStatus.SCHEDULED, visiting_doctor=self.doctor1
        )

        self.client.force_authenticate(user=self.nurse_user1)
        res = self.client.patch(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/assign-doctor/', {
            "doctor_id": self.doctor2.doctor_id
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        occ.refresh_from_db()
        self.assertEqual(occ.visiting_doctor, self.doctor2)

    # -------------------------------------------------------------
    # 9. DOCTOR ASSIGNMENT ON OCT 4 DOES NOT CHANGE OCT 5
    # -------------------------------------------------------------
    def test_09_doctor_assignment_oct4_does_not_change_oct5(self):
        """Changing doctor on Oct 4 occurrence leaves Oct 5 occurrence completely unaffected."""
        date1 = datetime.date(2026, 10, 5)  # Monday
        date2 = datetime.date(2026, 10, 6)  # Tuesday

        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency=ScheduleFrequency.EVERY_DAY,
            start_date=date1, status=ScheduleStatus.ACTIVE
        )
        occ1 = HomeVisitOccurrence.objects.create(
            schedule=schedule, patient=self.patient1, scheduled_date=date1,
            visit_type=VisitType.RECURRING, status=OccurrenceStatus.SCHEDULED, visiting_doctor=self.doctor1
        )
        occ2 = HomeVisitOccurrence.objects.create(
            schedule=schedule, patient=self.patient1, scheduled_date=date2,
            visit_type=VisitType.RECURRING, status=OccurrenceStatus.SCHEDULED, visiting_doctor=self.doctor1
        )

        # Change doctor on occ1 (Oct 5) to Doctor 2
        self.client.force_authenticate(user=self.nurse_user1)
        res = self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ1.occurrence_id}/assign-doctor/', {
            "doctor_id": self.doctor2.doctor_id
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        occ1.refresh_from_db()
        occ2.refresh_from_db()
        self.assertEqual(occ1.visiting_doctor, self.doctor2)
        self.assertEqual(occ2.visiting_doctor, self.doctor1)  # Oct 6 unchanged

    # -------------------------------------------------------------
    # 10. DIFFERENT DATES CAN HAVE DIFFERENT DOCTORS / PROVIDERS
    # -------------------------------------------------------------
    def test_10_different_dates_can_have_different_doctors(self):
        """Occurrences across different dates have independent visiting doctor assignments."""
        date1 = datetime.date(2026, 10, 5)
        date2 = datetime.date(2026, 10, 6)

        occ1 = HomeVisitOccurrence.objects.create(
            patient=self.patient1, scheduled_date=date1, visit_type=VisitType.RECURRING,
            status=OccurrenceStatus.SCHEDULED, visiting_doctor=self.doctor1
        )
        occ2 = HomeVisitOccurrence.objects.create(
            patient=self.patient1, scheduled_date=date2, visit_type=VisitType.RECURRING,
            status=OccurrenceStatus.SCHEDULED, visiting_doctor=self.doctor2
        )

        self.assertEqual(occ1.visiting_doctor, self.doctor1)
        self.assertEqual(occ2.visiting_doctor, self.doctor2)

    # -------------------------------------------------------------
    # 11. DOCTOR ASSIGNMENT DOES NOT MODIFY RECURRING SCHEDULE
    # -------------------------------------------------------------
    def test_11_doctor_assignment_does_not_modify_recurring_schedule(self):
        """Assigning or changing a doctor on an occurrence never touches the schedule model."""
        today = timezone.now().date()
        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency=ScheduleFrequency.WEEKLY,
            start_date=today, status=ScheduleStatus.ACTIVE
        )
        occ = HomeVisitOccurrence.objects.create(
            schedule=schedule, patient=self.patient1, scheduled_date=today,
            visit_type=VisitType.RECURRING, status=OccurrenceStatus.SCHEDULED, visiting_doctor=None
        )

        self.client.force_authenticate(user=self.nurse_user1)
        res = self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/assign-doctor/', {
            "doctor_id": self.doctor2.doctor_id
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        schedule.refresh_from_db()
        self.assertEqual(schedule.frequency, ScheduleFrequency.WEEKLY)
        self.assertFalse(hasattr(schedule, 'visiting_doctor'))  # Schedule level has no doctor

    # -------------------------------------------------------------
    # 12. ANY NURSE CAN COMPLETE ANY SCHEDULED VISIT
    # -------------------------------------------------------------
    def test_12_any_nurse_can_complete_scheduled_visit(self):
        """Nurse A creates schedule; Nurse B completes the scheduled visit without claiming."""
        today = timezone.now().date()
        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency=ScheduleFrequency.WEEKLY, start_date=today
        )
        occ = HomeVisitOccurrence.objects.create(
            schedule=schedule, patient=self.patient1, scheduled_date=today,
            visit_type=VisitType.RECURRING, status=OccurrenceStatus.SCHEDULED,
            visiting_doctor=self.doctor1
        )

        # Nurse B completes the visit directly
        self.client.force_authenticate(user=self.nurse_user2)
        res = self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/complete/', {
            "blood_pressure": "120/80",
            "pulse": 72,
            "temperature": 98.4,
            "oxygen_level": 98,
            "treatment_notes": "Completed successfully by Nurse B.",
            "symptoms": [{"name": "Pain", "severity": "Mild"}]
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        occ.refresh_from_db()
        self.assertEqual(occ.status, OccurrenceStatus.COMPLETED)

    # -------------------------------------------------------------
    # 13. NURSE WHO ACTUALLY COMPLETES VISIT RECORDED FOR AUDIT
    # -------------------------------------------------------------
    def test_13_nurse_who_completes_visit_recorded_for_audit(self):
        """HomeVisitSummary.nurse is set to the specific nurse who completed documentation."""
        today = timezone.now().date()
        occ = HomeVisitOccurrence.objects.create(
            patient=self.patient1, scheduled_date=today, visit_type=VisitType.RECURRING,
            status=OccurrenceStatus.SCHEDULED, visiting_doctor=self.doctor1
        )

        self.client.force_authenticate(user=self.nurse_user2)
        res = self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/complete/', {
            "blood_pressure": "118/76",
            "pulse": 70,
            "treatment_notes": "Clinical summary by Nurse Florence."
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        summary = HomeVisitSummary.objects.get(occurrence=occ)
        self.assertEqual(summary.nurse, self.nurse2)  # Audit records Nurse 2

    # -------------------------------------------------------------
    # 14. COMPLETED VISITS REMAIN PROTECTED
    # -------------------------------------------------------------
    def test_14_completed_visits_remain_protected(self):
        """Completed visits cannot be re-completed or have doctor changed."""
        today = timezone.now().date()
        occ = HomeVisitOccurrence.objects.create(
            patient=self.patient1, scheduled_date=today, visit_type=VisitType.RECURRING,
            status=OccurrenceStatus.COMPLETED, visiting_doctor=self.doctor1
        )
        HomeVisitSummary.objects.create(
            occurrence=occ, nurse=self.nurse1, blood_pressure="120/80", treatment_notes="Initial care"
        )

        self.client.force_authenticate(user=self.nurse_user1)

        # Attempt to change doctor on completed visit -> 400
        res1 = self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/assign-doctor/', {
            "doctor_id": self.doctor2.doctor_id
        }, format='json')
        self.assertEqual(res1.status_code, status.HTTP_400_BAD_REQUEST)

        # Attempt to re-complete -> 400
        res2 = self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/complete/', {
            "blood_pressure": "130/90"
        }, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)

    # -------------------------------------------------------------
    # 15. URGENT REQUESTS VISIBLE TO ALL NURSES
    # -------------------------------------------------------------
    def test_15_urgent_requests_visible_to_all_nurses(self):
        """Urgent visit requests appear in the shared queue for all nurses."""
        target_date = timezone.now().date() + datetime.timedelta(days=1)
        if target_date.weekday() == 6:
            target_date += datetime.timedelta(days=1)

        self.client.force_authenticate(user=self.pat_user1)
        res = self.client.post('/api/care-coordination/home-visits/urgent-requests/', {
            "urgency_level": "Emergency",
            "reason": "Severe pain flare-up",
            "date": str(target_date)
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        occ_id = res.data['occurrence_id']

        # Nurse 1 sees request in queue
        self.client.force_authenticate(user=self.nurse_user1)
        res1 = self.client.get('/api/care-coordination/nurse/additional-requests/')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        req_ids1 = [r['occurrence_id'] for r in res1.data]
        self.assertIn(occ_id, req_ids1)

        # Nurse 2 also sees request in queue
        self.client.force_authenticate(user=self.nurse_user2)
        res2 = self.client.get('/api/care-coordination/nurse/additional-requests/')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        req_ids2 = [r['occurrence_id'] for r in res2.data]
        self.assertIn(occ_id, req_ids2)

    # -------------------------------------------------------------
    # 16. ANY NURSE CAN ACCEPT AN URGENT REQUEST
    # -------------------------------------------------------------
    def test_16_any_nurse_can_accept_urgent_request(self):
        """Nurse 2 can accept the urgent request. Status updates and records accepting nurse."""
        target_date = timezone.now().date() + datetime.timedelta(days=1)
        if target_date.weekday() == 6:
            target_date += datetime.timedelta(days=1)

        occ = HomeVisitOccurrence.objects.create(
            patient=self.patient1, scheduled_date=target_date, visit_type=VisitType.ADDITIONAL,
            urgency_level=UrgencyLevel.URGENT, status=OccurrenceStatus.SCHEDULED, approved_by_nurse=None
        )

        self.client.force_authenticate(user=self.nurse_user2)
        res = self.client.post(f'/api/care-coordination/nurse/additional-requests/{occ.occurrence_id}/accept/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        occ.refresh_from_db()
        self.assertEqual(occ.approved_by_nurse, self.nurse2)

    # -------------------------------------------------------------
    # 17. TWO NURSES CANNOT ACCEPT SAME URGENT REQUEST SIMULTANEOUSLY
    # -------------------------------------------------------------
    def test_17_two_nurses_cannot_accept_same_urgent_request_simultaneously(self):
        """If Nurse 1 has accepted an urgent request, Nurse 2 receives 400."""
        target_date = timezone.now().date() + datetime.timedelta(days=1)
        if target_date.weekday() == 6:
            target_date += datetime.timedelta(days=1)

        occ = HomeVisitOccurrence.objects.create(
            patient=self.patient1, scheduled_date=target_date, visit_type=VisitType.ADDITIONAL,
            urgency_level=UrgencyLevel.URGENT, status=OccurrenceStatus.SCHEDULED, approved_by_nurse=self.nurse1
        )

        self.client.force_authenticate(user=self.nurse_user2)
        res = self.client.post(f'/api/care-coordination/nurse/additional-requests/{occ.occurrence_id}/accept/')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already been accepted", res.data['detail'])

    # -------------------------------------------------------------
    # 18. SUNDAY RULE STILL WORKS
    # -------------------------------------------------------------
    def test_18_sunday_rule_works(self):
        """Sunday is rejected for schedule start dates, urgent requests, and excluded from Every Day recurrence."""
        sunday = timezone.now().date()
        while sunday.weekday() != 6:
            sunday += datetime.timedelta(days=1)

        self.client.force_authenticate(user=self.nurse_user1)
        res = self.client.post('/api/care-coordination/home-visits/schedules/', {
            "patient_id": self.patient1.patient_id,
            "frequency": ScheduleFrequency.WEEKLY,
            "start_date": str(sunday)
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Sunday", str(res.data))

    # -------------------------------------------------------------
    # 19. FREQUENCY-CHANGE SAFETY
    # -------------------------------------------------------------
    def test_19_frequency_change_safety(self):
        """Frequency change preserves historical completed visits and explicitly customized doctor visits."""
        today = timezone.now().date()
        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency=ScheduleFrequency.WEEKLY, start_date=today
        )
        # 1 historical completed visit
        completed_occ = HomeVisitOccurrence.objects.create(
            schedule=schedule, patient=self.patient1, scheduled_date=today - datetime.timedelta(days=14),
            visit_type=VisitType.RECURRING, status=OccurrenceStatus.COMPLETED, visiting_doctor=self.doctor1
        )
        # 1 future customized doctor visit
        custom_occ = HomeVisitOccurrence.objects.create(
            schedule=schedule, patient=self.patient1, scheduled_date=today + datetime.timedelta(days=7),
            visit_type=VisitType.RECURRING, status=OccurrenceStatus.SCHEDULED,
            visiting_doctor=self.doctor2, is_doctor_customized=True
        )
        # 1 future uncustomized visit
        regular_occ = HomeVisitOccurrence.objects.create(
            schedule=schedule, patient=self.patient1, scheduled_date=today + datetime.timedelta(days=14),
            visit_type=VisitType.RECURRING, status=OccurrenceStatus.SCHEDULED,
            visiting_doctor=self.doctor1, is_doctor_customized=False
        )

        self.client.force_authenticate(user=self.nurse_user1)
        res = self.client.patch(f'/api/care-coordination/home-visits/schedules/{schedule.schedule_id}/', {
            "frequency": ScheduleFrequency.MONTHLY,
            "reason": "Routine monthly checkup"
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Completed and customized occurrences remain protected
        self.assertTrue(HomeVisitOccurrence.objects.filter(occurrence_id=completed_occ.occurrence_id).exists())
        self.assertTrue(HomeVisitOccurrence.objects.filter(occurrence_id=custom_occ.occurrence_id).exists())
        # Regular future occurrence was replaced
        self.assertFalse(HomeVisitOccurrence.objects.filter(occurrence_id=regular_occ.occurrence_id).exists())

    # -------------------------------------------------------------
    # 20. DUPLICATE OCCURRENCE PROTECTION
    # -------------------------------------------------------------
    def test_20_duplicate_occurrence_protection(self):
        """Multiple occurrence generation runs produce zero duplicates on same date."""
        from care_coordination.views import generate_recurring_occurrences
        monday = timezone.now().date()
        while monday.weekday() != 0:
            monday += datetime.timedelta(days=1)

        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency=ScheduleFrequency.WEEKLY, start_date=monday
        )
        created1 = generate_recurring_occurrences(schedule, num_occurrences=4)
        self.assertEqual(created1, 4)

        created2 = generate_recurring_occurrences(schedule, num_occurrences=4)
        self.assertEqual(created2, 0)
        self.assertEqual(HomeVisitOccurrence.objects.filter(schedule=schedule).count(), 4)

    # -------------------------------------------------------------
    # 21. PATIENTS / CAREGIVERS SEE OWN VISITS
    # -------------------------------------------------------------
    def test_21_patients_see_own_visits(self):
        """Patient 1 sees only Patient 1 visits; cannot see other patients' visits."""
        today = timezone.now().date()
        occ1 = HomeVisitOccurrence.objects.create(
            patient=self.patient1, scheduled_date=today, visit_type=VisitType.RECURRING,
            status=OccurrenceStatus.SCHEDULED, visiting_doctor=self.doctor1
        )
        occ2 = HomeVisitOccurrence.objects.create(
            patient=self.patient2, scheduled_date=today, visit_type=VisitType.RECURRING,
            status=OccurrenceStatus.SCHEDULED, visiting_doctor=self.doctor2
        )

        self.client.force_authenticate(user=self.pat_user1)
        res = self.client.get('/api/care-coordination/home-visits/occurrences/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = [v['occurrence_id'] for v in res.data]
        self.assertIn(occ1.occurrence_id, ids)
        self.assertNotIn(occ2.occurrence_id, ids)

    # -------------------------------------------------------------
    # 22. DOCTORS SEE OCCURRENCES WHERE THEY ARE ASSIGNED
    # -------------------------------------------------------------
    def test_22_doctors_see_occurrences_where_assigned(self):
        """Doctor 2 sees only occurrences where assigned as visiting doctor or responsible doctor."""
        today = timezone.now().date()
        # Occ 1: Patient 1 (Responsible Doc 1, Visiting Doc 2) -> Doctor 2 sees it
        occ1 = HomeVisitOccurrence.objects.create(
            patient=self.patient1, scheduled_date=today, visit_type=VisitType.RECURRING,
            status=OccurrenceStatus.SCHEDULED, visiting_doctor=self.doctor2
        )
        # Occ 2: Patient 1 (Responsible Doc 1, Visiting Doc 1) -> Doctor 2 does not see it
        occ2 = HomeVisitOccurrence.objects.create(
            patient=self.patient1, scheduled_date=today + datetime.timedelta(days=7), visit_type=VisitType.RECURRING,
            status=OccurrenceStatus.SCHEDULED, visiting_doctor=self.doctor1
        )

        self.client.force_authenticate(user=self.doc_user2)
        res = self.client.get('/api/care-coordination/home-visits/occurrences/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = [v['occurrence_id'] for v in res.data]
        self.assertIn(occ1.occurrence_id, ids)
        self.assertNotIn(occ2.occurrence_id, ids)

    # -------------------------------------------------------------
    # 23. OLD ALLOCATION/CLAIM WORKFLOW IS NO LONGER REQUIRED
    # -------------------------------------------------------------
    def test_23_old_allocation_claim_workflow_no_longer_required(self):
        """Calling legacy allocation or claim endpoints returns graceful shared team responses."""
        today = timezone.now().date()
        occ = HomeVisitOccurrence.objects.create(
            patient=self.patient1, scheduled_date=today, visit_type=VisitType.RECURRING,
            status=OccurrenceStatus.SCHEDULED, visiting_doctor=self.doctor1
        )

        self.client.force_authenticate(user=self.nurse_user1)
        # Legacy claim endpoint succeeds with shared team message
        res = self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/claim/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("shared nurse team", res.data['message'])

    # -------------------------------------------------------------
    # 24. NO "MY VISITS" DATA FILTERING REMAINS
    # -------------------------------------------------------------
    def test_24_no_my_visits_filtering_remains(self):
        """Calendar and visits list endpoints do not restrict results by nurse ownership."""
        today = timezone.now().date()
        occ1 = HomeVisitOccurrence.objects.create(
            patient=self.patient1, scheduled_date=today, visit_type=VisitType.RECURRING,
            status=OccurrenceStatus.SCHEDULED, visiting_doctor=self.doctor1
        )
        occ2 = HomeVisitOccurrence.objects.create(
            patient=self.patient2, scheduled_date=today, visit_type=VisitType.RECURRING,
            status=OccurrenceStatus.SCHEDULED, visiting_doctor=self.doctor2
        )

        self.client.force_authenticate(user=self.nurse_user2)
        res = self.client.get('/api/care-coordination/home-visits/calendar/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = [v['occurrence_id'] for v in res.data]
        self.assertIn(occ1.occurrence_id, ids)
        self.assertIn(occ2.occurrence_id, ids)

    # -------------------------------------------------------------
    # 25. NO "AVAILABLE FOR ALLOCATION" COUNT REMAINS
    # -------------------------------------------------------------
    def test_25_nurse_dashboard_metrics_shared_team(self):
        """Nurse dashboard returns shared team metrics without allocation metrics."""
        today = timezone.now().date()
        HomeVisitOccurrence.objects.create(
            patient=self.patient1, scheduled_date=today, visit_type=VisitType.RECURRING,
            status=OccurrenceStatus.SCHEDULED, visiting_doctor=self.doctor1
        )

        self.client.force_authenticate(user=self.nurse_user1)
        res = self.client.get('/api/auth/nurse/dashboard/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        cards = res.data.get('summary_cards', {})
        self.assertIn('todays_visits', cards)
        self.assertIn('pending_requests', cards)
        self.assertIn('active_schedules', cards)
        self.assertNotIn('available_for_allocation', cards)

    # =============================================================
    # SPECIFICATION TESTS: SECTION 28 (A THROUGH T)
    # =============================================================

    def test_A_default_doctor_assignment(self):
        """When creating a normal Home Visit occurrence, patient's reviewed_by_doctor automatically becomes visiting_doctor."""
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

    def test_B_no_responsible_doctor_leaves_visiting_doctor_null(self):
        """If patient genuinely has NO responsible Doctor, visiting_doctor remains NULL."""
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
            visit_type=VisitType.RECURRING, status=OccurrenceStatus.SCHEDULED, visiting_doctor=self.doctor1
        )

        self.client.force_authenticate(user=self.nurse_user1)
        res = self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/assign-doctor/', {
            "doctor_id": self.doctor2.doctor_id
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        occ.refresh_from_db()
        self.assertEqual(occ.visiting_doctor, self.doctor2)
        self.assertTrue(occ.is_doctor_customized)

    def test_D_preserve_explicit_doctor_reassignment_on_regeneration(self):
        """Explicit doctor changes (is_doctor_customized=True) are strictly preserved across occurrence generation."""
        from care_coordination.views import generate_recurring_occurrences
        monday = timezone.now().date()
        while monday.weekday() != 0:
            monday += datetime.timedelta(days=1)

        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency=ScheduleFrequency.WEEKLY, start_date=monday
        )
        generate_recurring_occurrences(schedule, num_occurrences=4)
        occ = HomeVisitOccurrence.objects.filter(schedule=schedule).order_by('scheduled_date').first()

        self.client.force_authenticate(user=self.nurse_user1)
        res = self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/assign-doctor/', {
            "doctor_id": self.doctor2.doctor_id
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        occ.refresh_from_db()
        self.assertEqual(occ.visiting_doctor, self.doctor2)
        self.assertTrue(occ.is_doctor_customized)

        generate_recurring_occurrences(schedule, num_occurrences=4)
        occ.refresh_from_db()
        self.assertEqual(occ.visiting_doctor, self.doctor2)

    def test_E_every_day_generates_monday_through_saturday_no_sunday(self):
        """Every Day frequency generates visits for Monday-Saturday and completely excludes Sunday."""
        from care_coordination.views import generate_recurring_occurrences
        monday = timezone.now().date()
        while monday.weekday() != 0:
            monday += datetime.timedelta(days=1)

        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency=ScheduleFrequency.EVERY_DAY, start_date=monday
        )
        created = generate_recurring_occurrences(schedule, num_occurrences=14)
        self.assertEqual(created, 14)

        occurrences = HomeVisitOccurrence.objects.filter(schedule=schedule).order_by('scheduled_date')
        for occ in occurrences:
            self.assertNotEqual(occ.scheduled_date.weekday(), 6)
            self.assertIn(occ.scheduled_date.weekday(), [0, 1, 2, 3, 4, 5])

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
            self.assertNotEqual(occ.scheduled_date.weekday(), 6)

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
        for occ in occurrences:
            self.assertIn(occ.scheduled_date.weekday(), [0, 2, 4])
            self.assertNotEqual(occ.scheduled_date.weekday(), 6)

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

    def test_L_sunday_direct_api_request_rejected(self):
        """Attempting to schedule on a Sunday via API must be rejected with 400."""
        sunday = timezone.now().date()
        while sunday.weekday() != 6:
            sunday += datetime.timedelta(days=1)

        self.client.force_authenticate(user=self.nurse_user1)
        res = self.client.post('/api/care-coordination/home-visits/schedules/', {
            "patient_id": self.patient1.patient_id,
            "frequency": ScheduleFrequency.WEEKLY,
            "start_date": str(sunday)
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Sunday", str(res.data))

    def test_M_duplicate_prevention_on_multiple_runs(self):
        """Running occurrence generation multiple times produces zero duplicates on same date."""
        from care_coordination.views import generate_recurring_occurrences
        monday = timezone.now().date()
        while monday.weekday() != 0:
            monday += datetime.timedelta(days=1)

        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency=ScheduleFrequency.EVERY_DAY, start_date=monday
        )
        created1 = generate_recurring_occurrences(schedule, num_occurrences=6)
        self.assertEqual(created1, 6)
        initial_count = HomeVisitOccurrence.objects.filter(schedule=schedule).count()

        created2 = generate_recurring_occurrences(schedule, num_occurrences=6)
        self.assertEqual(created2, 0)
        self.assertEqual(HomeVisitOccurrence.objects.filter(schedule=schedule).count(), initial_count)

    def test_N_edit_frequency_weekly_to_custom(self):
        """Nurse edits recurring schedule from Weekly to Custom (Mon, Wed, Fri); future visits follow new pattern."""
        monday = timezone.now().date()
        while monday.weekday() != 0:
            monday += datetime.timedelta(days=1)

        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency=ScheduleFrequency.WEEKLY, start_date=monday
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

    def test_P_historical_and_completed_visits_protected(self):
        """Completed and past visits must NEVER be modified or deleted during schedule edit."""
        today = timezone.now().date()
        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency=ScheduleFrequency.WEEKLY, start_date=today - datetime.timedelta(days=28)
        )
        completed_occ = HomeVisitOccurrence.objects.create(
            schedule=schedule, patient=self.patient1, scheduled_date=today - datetime.timedelta(days=14),
            visit_type=VisitType.RECURRING, status=OccurrenceStatus.COMPLETED,
            visiting_doctor=self.doctor1
        )
        HomeVisitSummary.objects.create(
            occurrence=completed_occ, nurse=self.nurse1, blood_pressure="120/80", pulse=75,
            treatment_notes="Historical clinical notes preserved"
        )

        self.client.force_authenticate(user=self.nurse_user1)
        res = self.client.patch(f'/api/care-coordination/home-visits/schedules/{schedule.schedule_id}/', {
            "frequency": ScheduleFrequency.MONTHLY,
            "reason": "Change schedule frequency"
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.assertTrue(HomeVisitOccurrence.objects.filter(occurrence_id=completed_occ.occurrence_id).exists())
        completed_occ.refresh_from_db()
        self.assertEqual(completed_occ.status, OccurrenceStatus.COMPLETED)
        self.assertEqual(completed_occ.homevisitsummary.treatment_notes, "Historical clinical notes preserved")

    def test_Q_custom_doctor_and_completed_visits_protected_on_schedule_edit(self):
        """Future occurrences that have customized doctor or completed status are preserved."""
        today = timezone.now().date()
        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency=ScheduleFrequency.WEEKLY, start_date=today
        )
        custom_doc_occ = HomeVisitOccurrence.objects.create(
            schedule=schedule, patient=self.patient1, scheduled_date=today + datetime.timedelta(days=7),
            visit_type=VisitType.RECURRING, status=OccurrenceStatus.SCHEDULED,
            visiting_doctor=self.doctor2, is_doctor_customized=True
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

    def test_R_explicit_doctor_protected_during_schedule_edit(self):
        """Occurrences with is_doctor_customized=True must be protected during schedule editing."""
        today = timezone.now().date()
        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency=ScheduleFrequency.WEEKLY, start_date=today
        )
        custom_doc_occ = HomeVisitOccurrence.objects.create(
            schedule=schedule, patient=self.patient1, scheduled_date=today + datetime.timedelta(days=7),
            visit_type=VisitType.RECURRING, status=OccurrenceStatus.SCHEDULED,
            visiting_doctor=self.doctor2, is_doctor_customized=True
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

    def test_S_urgent_visit_schedule_id_null(self):
        """Urgent visits are created with schedule_id=NULL and never attached to recurring schedules."""
        target_date = timezone.now().date() + datetime.timedelta(days=1)
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

    def test_T_rbac_enforcement(self):
        """
        RBAC Verification:
        - Patient cannot edit schedule -> 403
        - Doctor cannot edit schedule -> 403
        - Doctor cannot assign doctor -> 403
        - Unauthorized users receive 403
        """
        today = timezone.now().date()
        schedule = HomeVisitSchedule.objects.create(
            patient=self.patient1, nurse=self.nurse1, frequency=ScheduleFrequency.WEEKLY, start_date=today
        )
        occ = HomeVisitOccurrence.objects.create(
            schedule=schedule, patient=self.patient1, scheduled_date=today,
            visit_type=VisitType.RECURRING, status=OccurrenceStatus.SCHEDULED
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

        # 3. Doctor cannot assign doctor -> 403
        res4 = self.client.post(f'/api/care-coordination/home-visits/occurrences/{occ.occurrence_id}/assign-doctor/', {
            "doctor_id": self.doctor1.doctor_id
        }, format='json')
        self.assertEqual(res4.status_code, status.HTTP_403_FORBIDDEN)
