import datetime
from django.test import TestCase
from django.utils import timezone
from django.core import mail
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
    CaregiverRequest,
    CaregiverRequestStatus,
    CaregiverPatientAssignment,
    CaregiverFeedback,
    CaregiverComplaint,
    AssignmentStatus,
    ComplaintStatus,
    ComplaintCategory,
)
from notifications.models import Notification


class CaregiverManagementWorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # 1. Create Nurse
        self.nurse_user = User.objects.create_user(
            email="nurse.mary@karunagrid.org",
            password="Password123!",
            role=Role.NURSE
        )
        self.nurse = Nurse.objects.create(
            user=self.nurse_user,
            name="Mary Jane",
            verification_status=VerificationStatus.APPROVED
        )

        # 2. Create Caregivers (Pending, Approved, Rejected)
        self.cg_user_pending = User.objects.create_user(
            email="cg.pending@karunagrid.org",
            password="Password123!",
            role=Role.CAREGIVER
        )
        self.cg_pending = Caregiver.objects.create(
            user=self.cg_user_pending,
            name="Alice Pending",
            qualifications="Certified Nursing Assistant",
            specialization="Elderly Care",
            experience_years="3+ years",
            phone="9876543210",
            place="Kochi",
            panchayath="Kochi Corp",
            verification_status=VerificationStatus.PENDING,
            is_available=True
        )

        self.cg_user_approved = User.objects.create_user(
            email="cg.approved@karunagrid.org",
            password="Password123!",
            role=Role.CAREGIVER
        )
        self.cg_approved = Caregiver.objects.create(
            user=self.cg_user_approved,
            name="Bob Approved",
            qualifications="Palliative Care Aide",
            specialization="Palliative Support",
            experience_years="5+ years",
            phone="9876543211",
            place="Aluva",
            panchayath="Aluva",
            verification_status=VerificationStatus.APPROVED,
            is_available=True
        )

        self.cg_user_rejected = User.objects.create_user(
            email="cg.rejected@karunagrid.org",
            password="Password123!",
            role=Role.CAREGIVER
        )
        self.cg_rejected = Caregiver.objects.create(
            user=self.cg_user_rejected,
            name="Charlie Rejected",
            qualifications="Care Attendant",
            specialization="General",
            experience_years="1 year",
            phone="9876543212",
            verification_status=VerificationStatus.REJECTED,
            rejection_reason="Incomplete background verification",
            is_available=False
        )

        # 3. Create Patients
        self.patient_user1 = User.objects.create_user(
            email="patient.sam@karunagrid.org",
            password="Password123!",
            role=Role.PATIENT
        )
        self.patient1 = Patient.objects.create(
            user=self.patient_user1,
            name="Sam Patient",
            registration_id="KG-PAT-001",
            registration_status=RegistrationStatus.APPROVED,
            status=PatientStatus.ACTIVE,
            phone="9998887771"
        )

        self.patient_user2 = User.objects.create_user(
            email="patient.lisa@karunagrid.org",
            password="Password123!",
            role=Role.PATIENT
        )
        self.patient2 = Patient.objects.create(
            user=self.patient_user2,
            name="Lisa Patient",
            registration_id="KG-PAT-002",
            registration_status=RegistrationStatus.APPROVED,
            status=PatientStatus.ACTIVE,
            phone="9998887772"
        )

        # 4. Create Doctor and Admin for RBAC testing
        self.doc_user = User.objects.create_user(
            email="dr.smith@karunagrid.org",
            password="Password123!",
            role=Role.DOCTOR
        )
        self.doctor = Doctor.objects.create(
            user=self.doc_user,
            name="Dr. Smith",
            verification_status=VerificationStatus.APPROVED
        )

        self.admin_user = User.objects.create_user(
            email="admin@karunagrid.org",
            password="Password123!",
            role=Role.ADMIN
        )

    def _err_text(self, response):
        return str(response.data).lower()

    # -------------------------------------------------------------
    # 1. NURSE CAREGIVER APPROVAL & REJECTION WORKFLOW
    # -------------------------------------------------------------
    def test_nurse_can_view_pending_caregivers(self):
        """Nurse should be able to view list of pending caregivers."""
        self.client.force_authenticate(user=self.nurse_user)
        response = self.client.get("/api/nurse/caregivers/pending/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should include Alice Pending, but not Bob or Charlie
        data = response.data
        names = [cg["name"] for cg in data]
        self.assertIn("Alice Pending", names)
        self.assertNotIn("Bob Approved", names)
        self.assertNotIn("Charlie Rejected", names)

    def test_nurse_can_approve_caregiver_and_sends_email(self):
        """Nurse approves pending caregiver -> status becomes APPROVED, email is sent, notification created."""
        mail.outbox = []  # clear outbox
        self.client.force_authenticate(user=self.nurse_user)
        response = self.client.post(f"/api/nurse/caregivers/{self.cg_pending.caregiver_id}/approve/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("verification_status"), "Approved")

        # Refresh from DB
        self.cg_pending.refresh_from_db()
        self.assertEqual(self.cg_pending.verification_status, VerificationStatus.APPROVED)
        self.assertEqual(self.cg_pending.verified_by_nurse, self.nurse)
        self.assertTrue(self.cg_pending.is_available)

        # Check approval email sent
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [self.cg_user_pending.email])
        self.assertIn("Registration Approved", mail.outbox[0].subject)

        # Check in-app notification
        cg_notifs = Notification.objects.filter(user=self.cg_user_pending)
        self.assertTrue(cg_notifs.exists())

    def test_nurse_cannot_approve_already_approved_caregiver(self):
        """Attempting to approve an already approved caregiver should fail."""
        self.client.force_authenticate(user=self.nurse_user)
        response = self.client.post(f"/api/nurse/caregivers/{self.cg_approved.caregiver_id}/approve/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already", self._err_text(response))

    def test_nurse_rejection_requires_reason(self):
        """Nurse rejecting caregiver without reason must fail with 400."""
        self.client.force_authenticate(user=self.nurse_user)
        response = self.client.post(
            f"/api/nurse/caregivers/{self.cg_pending.caregiver_id}/reject/",
            {"rejection_reason": ""}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("reason", self._err_text(response))

    def test_nurse_rejects_caregiver_with_reason_and_sends_email(self):
        """Nurse rejecting caregiver with reason updates status to REJECTED and sends rejection email."""
        mail.outbox = []
        self.client.force_authenticate(user=self.nurse_user)
        response = self.client.post(
            f"/api/nurse/caregivers/{self.cg_pending.caregiver_id}/reject/",
            {"rejection_reason": "Incomplete background documentation"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("verification_status"), "Rejected")

        self.cg_pending.refresh_from_db()
        self.assertEqual(self.cg_pending.verification_status, VerificationStatus.REJECTED)
        self.assertEqual(self.cg_pending.rejection_reason, "Incomplete background documentation")
        self.assertFalse(self.cg_pending.is_available)

        # Check rejection email sent
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, [self.cg_user_pending.email])
        self.assertIn("Registration Update", mail.outbox[0].subject)

    # -------------------------------------------------------------
    # 2. PATIENT CAREGIVER BROWSING & REQUESTING WORKFLOW
    # -------------------------------------------------------------
    def test_patient_can_only_see_approved_caregivers(self):
        """Patient viewing caregiver catalog sees only APPROVED caregivers."""
        self.client.force_authenticate(user=self.patient_user1)
        response = self.client.get("/api/patient/caregivers/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        cg_names = [item["name"] for item in data]
        self.assertIn("Bob Approved", cg_names)
        self.assertNotIn("Alice Pending", cg_names)
        self.assertNotIn("Charlie Rejected", cg_names)

    def test_patient_can_request_approved_caregiver(self):
        """Patient sends caregiver request -> request status PENDING created."""
        self.client.force_authenticate(user=self.patient_user1)
        payload = {
            "caregiver_id": self.cg_approved.caregiver_id,
            "message": "Need help with morning medication and physiotherapy assistance."
        }
        response = self.client.post("/api/patient/caregiver-requests/", payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data.get("request", {}).get("status"), "Pending")

        # Caregiver receives notification
        cg_notifs = Notification.objects.filter(user=self.cg_user_approved)
        self.assertTrue(cg_notifs.exists())

    def test_patient_cannot_request_duplicate_pending(self):
        """Patient cannot send duplicate active request to the same caregiver."""
        # Create initial request
        CaregiverRequest.objects.create(
            patient=self.patient1,
            caregiver=self.cg_approved,
            status=CaregiverRequestStatus.PENDING
        )
        self.client.force_authenticate(user=self.patient_user1)
        payload = {"caregiver_id": self.cg_approved.caregiver_id}
        response = self.client.post("/api/patient/caregiver-requests/", payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already have a pending", self._err_text(response))

    def test_patient_cannot_request_unapproved_caregiver(self):
        """Patient cannot request pending or rejected caregiver."""
        self.client.force_authenticate(user=self.patient_user1)
        response = self.client.post(
            "/api/patient/caregiver-requests/",
            {"caregiver_id": self.cg_pending.caregiver_id}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("not approved", self._err_text(response))

    def test_patient_cannot_request_unavailable_caregiver(self):
        """Patient cannot request caregiver who is currently marked unavailable."""
        self.cg_approved.is_available = False
        self.cg_approved.save()

        self.client.force_authenticate(user=self.patient_user1)
        response = self.client.post(
            "/api/patient/caregiver-requests/",
            {"caregiver_id": self.cg_approved.caregiver_id}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("unavailable", self._err_text(response))

    # -------------------------------------------------------------
    # 3. CAREGIVER REQUEST HANDLING & ATOMIC ASSIGNMENT
    # -------------------------------------------------------------
    def test_caregiver_can_view_own_requests(self):
        """Caregiver can view pending requests addressed to them."""
        req = CaregiverRequest.objects.create(
            patient=self.patient1,
            caregiver=self.cg_approved,
            status=CaregiverRequestStatus.PENDING,
            patient_message="Please assist me"
        )
        self.client.force_authenticate(user=self.cg_user_approved)
        response = self.client.get("/api/caregiver/requests/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["patient_name"], "Sam Patient")

    def test_caregiver_accepts_request_creates_active_assignment(self):
        """Caregiver accepts request -> request ACCEPTED, assignment ACTIVE, caregiver is_available=False."""
        req = CaregiverRequest.objects.create(
            patient=self.patient1,
            caregiver=self.cg_approved,
            status=CaregiverRequestStatus.PENDING
        )
        self.client.force_authenticate(user=self.cg_user_approved)
        response = self.client.post(f"/api/caregiver/requests/{req.request_id}/accept/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Check request updated
        req.refresh_from_db()
        self.assertEqual(req.status, CaregiverRequestStatus.ACCEPTED)

        # Check caregiver unavailable
        self.cg_approved.refresh_from_db()
        self.assertFalse(self.cg_approved.is_available)

        # Check assignment created
        assignment = CaregiverPatientAssignment.objects.filter(
            caregiver=self.cg_approved,
            patient=self.patient1,
            status=AssignmentStatus.ACTIVE
        ).first()
        self.assertIsNotNone(assignment)
        self.assertEqual(assignment.request, req)

        # Patient receives notification
        patient_notifs = Notification.objects.filter(user=self.patient_user1)
        self.assertTrue(patient_notifs.exists())

    def test_caregiver_rejects_request(self):
        """Caregiver rejects request -> request REJECTED, caregiver remains available."""
        req = CaregiverRequest.objects.create(
            patient=self.patient1,
            caregiver=self.cg_approved,
            status=CaregiverRequestStatus.PENDING
        )
        self.client.force_authenticate(user=self.cg_user_approved)
        response = self.client.post(
            f"/api/caregiver/requests/{req.request_id}/reject/",
            {"response_notes": "Currently at maximum patient load"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        req.refresh_from_db()
        self.assertEqual(req.status, CaregiverRequestStatus.REJECTED)
        self.assertEqual(req.response_notes, "Currently at maximum patient load")

        self.cg_approved.refresh_from_db()
        self.assertTrue(self.cg_approved.is_available)

    def test_unauthorized_caregiver_cannot_accept_others_request(self):
        """A caregiver cannot accept a request meant for another caregiver."""
        req = CaregiverRequest.objects.create(
            patient=self.patient1,
            caregiver=self.cg_approved,
            status=CaregiverRequestStatus.PENDING
        )
        # Login as Alice Pending (approved now)
        self.cg_pending.verification_status = VerificationStatus.APPROVED
        self.cg_pending.save()
        self.client.force_authenticate(user=self.cg_user_pending)

        response = self.client.post(f"/api/caregiver/requests/{req.request_id}/accept/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # -------------------------------------------------------------
    # 4. CARE COMPLETION WORKFLOW
    # -------------------------------------------------------------
    def test_caregiver_completes_care_resets_availability(self):
        """Caregiver completing care sets assignment COMPLETED, completed_at, and is_available=True."""
        assignment = CaregiverPatientAssignment.objects.create(
            caregiver=self.cg_approved,
            patient=self.patient1,
            status=AssignmentStatus.ACTIVE
        )
        self.cg_approved.is_available = False
        self.cg_approved.save()

        self.client.force_authenticate(user=self.cg_user_approved)
        response = self.client.post(
            "/api/caregiver/assignment/complete/",
            {"notes": "Care cycle completed successfully"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        assignment.refresh_from_db()
        self.assertEqual(assignment.status, AssignmentStatus.COMPLETED)
        self.assertIsNotNone(assignment.completed_at)
        self.assertEqual(assignment.notes, "Care cycle completed successfully")

        self.cg_approved.refresh_from_db()
        self.assertTrue(self.cg_approved.is_available)

        # Patient receives notification to leave rating
        patient_notifs = Notification.objects.filter(user=self.patient_user1)
        self.assertTrue(patient_notifs.filter(message__icontains="completed").exists())

    # -------------------------------------------------------------
    # 5. PATIENT FEEDBACK & RATING WORKFLOW
    # -------------------------------------------------------------
    def test_patient_submits_feedback_and_updates_rating(self):
        """Patient submits 1-5 feedback for completed assignment -> updates caregiver average rating."""
        assignment = CaregiverPatientAssignment.objects.create(
            caregiver=self.cg_approved,
            patient=self.patient1,
            status=AssignmentStatus.COMPLETED,
            completed_at=timezone.now()
        )

        self.client.force_authenticate(user=self.patient_user1)
        payload = {
            "assignment_id": assignment.assignment_id,
            "rating": 5,
            "comment": "Outstanding, attentive, and kind care!"
        }
        response = self.client.post("/api/patient/caregiver-feedback/", payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # Check feedback created in DB
        feedback = CaregiverFeedback.objects.filter(assignment=assignment).first()
        self.assertIsNotNone(feedback)
        self.assertEqual(feedback.rating, 5)
        self.assertEqual(feedback.comment, "Outstanding, attentive, and kind care!")

        # Verify catalog calculation returns average rating 5.0
        catalog_resp = self.client.get("/api/patient/caregivers/")
        self.assertEqual(catalog_resp.status_code, status.HTTP_200_OK)
        bob_data = next(c for c in catalog_resp.data if c["name"] == "Bob Approved")
        self.assertEqual(bob_data["average_rating"], 5.0)
        self.assertEqual(bob_data["total_reviews"], 1)

    def test_patient_cannot_submit_invalid_rating(self):
        """Rating outside 1-5 should be rejected with 400."""
        assignment = CaregiverPatientAssignment.objects.create(
            caregiver=self.cg_approved,
            patient=self.patient1,
            status=AssignmentStatus.COMPLETED,
            completed_at=timezone.now()
        )
        self.client.force_authenticate(user=self.patient_user1)
        response = self.client.post("/api/patient/caregiver-feedback/", {
            "assignment_id": assignment.assignment_id,
            "rating": 6,
            "comment": "Too high"
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_feedback_prevented(self):
        """Patient cannot submit duplicate feedback for the same completed assignment."""
        assignment = CaregiverPatientAssignment.objects.create(
            caregiver=self.cg_approved,
            patient=self.patient1,
            status=AssignmentStatus.COMPLETED,
            completed_at=timezone.now()
        )
        CaregiverFeedback.objects.create(
            assignment=assignment,
            patient=self.patient1,
            caregiver=self.cg_approved,
            rating=5,
            comment="First review"
        )
        self.client.force_authenticate(user=self.patient_user1)
        response = self.client.post("/api/patient/caregiver-feedback/", {
            "assignment_id": assignment.assignment_id,
            "rating": 4,
            "comment": "Second review attempt"
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already", self._err_text(response))

    def test_patient_cannot_rate_another_patients_assignment(self):
        """Patient 2 cannot submit feedback for Patient 1's assignment."""
        assignment = CaregiverPatientAssignment.objects.create(
            caregiver=self.cg_approved,
            patient=self.patient1,
            status=AssignmentStatus.COMPLETED,
            completed_at=timezone.now()
        )
        self.client.force_authenticate(user=self.patient_user2)
        response = self.client.post("/api/patient/caregiver-feedback/", {
            "assignment_id": assignment.assignment_id,
            "rating": 5
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # -------------------------------------------------------------
    # 6. CAREGIVER COMPLAINTS WORKFLOW
    # -------------------------------------------------------------
    def test_caregiver_can_submit_complaint(self):
        """Caregiver submits complaint -> status OPEN, Nurse notified."""
        self.client.force_authenticate(user=self.cg_user_approved)
        payload = {
            "subject": "Equipment delay for wound dressing",
            "category": "Schedule-related",
            "description": "Patient dressing supplies have not arrived for 2 days."
        }
        response = self.client.post("/api/caregiver/complaints/", payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data.get("complaint", {}).get("status"), "Open")

        # Nurse receives notification
        nurse_notifs = Notification.objects.filter(user=self.nurse_user)
        self.assertTrue(nurse_notifs.filter(message__icontains="complaint").exists())

    def test_nurse_can_review_and_resolve_complaint(self):
        """Nurse reviews and resolves complaint with resolution notes."""
        complaint = CaregiverComplaint.objects.create(
            caregiver=self.cg_approved,
            subject="Delayed dressing kits",
            category=ComplaintCategory.SCHEDULE_RELATED,
            description="Supplies delayed",
            status=ComplaintStatus.OPEN
        )
        self.client.force_authenticate(user=self.nurse_user)
        response = self.client.post(
            f"/api/nurse/caregiver-complaints/{complaint.complaint_id}/resolve/",
            {"resolution_notes": "Supplies dispatched via emergency courier."}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("status"), "Resolved")

        complaint.refresh_from_db()
        self.assertEqual(complaint.status, ComplaintStatus.RESOLVED)
        self.assertEqual(complaint.resolved_by_nurse, self.nurse)
        self.assertIsNotNone(complaint.resolved_at)
        self.assertEqual(complaint.resolution_notes, "Supplies dispatched via emergency courier.")

        # Caregiver notified of resolution
        cg_notifs = Notification.objects.filter(user=self.cg_user_approved)
        self.assertTrue(cg_notifs.filter(message__icontains="resolved").exists())

    def test_caregiver_cannot_resolve_own_complaint(self):
        """Caregiver cannot call nurse resolution endpoint."""
        complaint = CaregiverComplaint.objects.create(
            caregiver=self.cg_approved,
            subject="Delayed dressing kits",
            description="Supplies delayed",
            status=ComplaintStatus.OPEN
        )
        self.client.force_authenticate(user=self.cg_user_approved)
        response = self.client.post(
            f"/api/nurse/caregiver-complaints/{complaint.complaint_id}/resolve/",
            {"resolution_notes": "Self resolved"}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # -------------------------------------------------------------
    # 7. ROLE-BASED ACCESS CONTROL (RBAC) SECURITY CHECKS
    # -------------------------------------------------------------
    def test_rbac_patient_cannot_approve_caregiver(self):
        """Patient calling nurse approval endpoint must receive 403 Forbidden."""
        self.client.force_authenticate(user=self.patient_user1)
        response = self.client.post(f"/api/nurse/caregivers/{self.cg_pending.caregiver_id}/approve/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_rbac_doctor_cannot_approve_caregiver(self):
        """Doctor calling nurse approval endpoint must receive 403 Forbidden."""
        self.client.force_authenticate(user=self.doc_user)
        response = self.client.post(f"/api/nurse/caregivers/{self.cg_pending.caregiver_id}/approve/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_rbac_admin_cannot_approve_caregiver_directly_without_nurse(self):
        """Admin is restricted from nurse caregiver approval endpoints per Phase 1 spec."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(f"/api/nurse/caregivers/{self.cg_pending.caregiver_id}/approve/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
