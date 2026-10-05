import os
import uuid
from datetime import datetime
from django.db import transaction
from django.db.models import Q, Avg, Count
from django.utils import timezone
from django.core.files.storage import default_storage
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from accounts.models import (
    Role,
    Caregiver,
    Patient,
    Nurse,
    VerificationStatus,
    RegistrationStatus,
)
from accounts.views import (
    get_authenticated_nurse,
    get_authenticated_patient,
    get_authenticated_doctor,
)
from accounts.notifications import (
    create_status_notification,
    send_caregiver_approval_email,
    send_caregiver_rejection_email,
)
from notifications.models import Notification
from care_coordination.models import (
    CaregiverRequest,
    CaregiverPatientAssignment,
    CaregiverFeedback,
    CaregiverComplaint,
    CaregiverRequestStatus,
    AssignmentStatus,
    ComplaintStatus,
    ComplaintCategory,
)
from care_coordination.serializers import (
    CaregiverRequestSerializer,
    CaregiverFeedbackSerializer,
    CaregiverPatientAssignmentSerializer,
    CaregiverComplaintSerializer,
    ApprovedCaregiverPublicSerializer,
)


def get_authenticated_caregiver(request):
    """Helper to retrieve Caregiver profile for authenticated user."""
    user = request.user
    if not user.is_authenticated:
        return None
    if user.role != Role.CAREGIVER:
        return None
    return Caregiver.objects.filter(user=user).first()


# ============================================================================
# 1. NURSE CAREGIVER MANAGEMENT VIEWS
# ============================================================================

class NursePendingCaregiversView(APIView):
    """
    GET /api/nurse/caregivers/pending/
    Returns all caregiver registrations pending nurse approval.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        nurse = get_authenticated_nurse(request)
        if not nurse and request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Nurses only."}, status=status.HTTP_403_FORBIDDEN)

        pending_qs = Caregiver.objects.filter(
            verification_status=VerificationStatus.PENDING
        ).order_by('-created_at')

        data = [
            {
                "caregiver_id": cg.caregiver_id,
                "name": cg.name,
                "email": cg.user.email,
                "phone": cg.phone or "N/A",
                "house_name": cg.house_name or "N/A",
                "place": cg.place or "N/A",
                "panchayath": cg.panchayath or "N/A",
                "ward_no": cg.ward_no,
                "pincode": cg.pincode or "N/A",
                "qualifications": cg.qualifications or "Not provided",
                "certifications": cg.certifications or "Not provided",
                "specialization": cg.specialization or "General Palliative Care",
                "availability_notes": cg.availability_notes or "Flexible",
                "experience_years": cg.experience_years or "1+ years",
                "identity_proof_path": cg.identity_proof_path,
                "verification_status": cg.verification_status,
                "created_at": cg.created_at.strftime('%Y-%m-%d %H:%M') if cg.created_at else "",
            }
            for cg in pending_qs
        ]
        return Response(data, status=status.HTTP_200_OK)


class NurseApproveCaregiverView(APIView):
    """
    POST /api/nurse/caregivers/<int:caregiver_id>/approve/
    Nurse approves a pending caregiver registration and triggers approval email.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, caregiver_id):
        nurse = get_authenticated_nurse(request)
        if not nurse:
            return Response({"detail": "Access restricted to Nurses only."}, status=status.HTTP_403_FORBIDDEN)

        with transaction.atomic():
            caregiver = Caregiver.objects.select_for_update().filter(caregiver_id=caregiver_id).first()
            if not caregiver:
                return Response({"detail": "Caregiver record not found."}, status=status.HTTP_404_NOT_FOUND)

            if caregiver.verification_status != VerificationStatus.PENDING:
                return Response(
                    {"errors": {"detail": [f"This caregiver registration has already been {caregiver.verification_status.lower()}."]}},
                    status=status.HTTP_400_BAD_REQUEST
                )

            caregiver.verification_status = VerificationStatus.APPROVED
            caregiver.verified_by_nurse = nurse
            caregiver.rejection_reason = None
            caregiver.is_available = True
            caregiver.save()

            # Create in-app notification
            create_status_notification(caregiver.user, status=VerificationStatus.APPROVED, role='Caregiver')

            # Send email
            email_sent = send_caregiver_approval_email(caregiver.user, caregiver, nurse.name)

        return Response({
            "message": f"Caregiver '{caregiver.name}' has been successfully approved.",
            "caregiver_id": caregiver.caregiver_id,
            "verification_status": caregiver.verification_status,
            "email_sent": email_sent,
        }, status=status.HTTP_200_OK)


class NurseRejectCaregiverView(APIView):
    """
    POST /api/nurse/caregivers/<int:caregiver_id>/reject/
    Nurse rejects a pending caregiver registration with mandatory reason.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, caregiver_id):
        nurse = get_authenticated_nurse(request)
        if not nurse:
            return Response({"detail": "Access restricted to Nurses only."}, status=status.HTTP_403_FORBIDDEN)

        rejection_reason = request.data.get('rejection_reason', '').strip()
        if not rejection_reason:
            return Response(
                {"errors": {"rejection_reason": ["A reason for rejection is required."]}},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            caregiver = Caregiver.objects.select_for_update().filter(caregiver_id=caregiver_id).first()
            if not caregiver:
                return Response({"detail": "Caregiver record not found."}, status=status.HTTP_404_NOT_FOUND)

            if caregiver.verification_status != VerificationStatus.PENDING:
                return Response(
                    {"errors": {"detail": [f"This caregiver registration has already been {caregiver.verification_status.lower()}."]}},
                    status=status.HTTP_400_BAD_REQUEST
                )

            caregiver.verification_status = VerificationStatus.REJECTED
            caregiver.rejection_reason = rejection_reason
            caregiver.verified_by_nurse = nurse
            caregiver.is_available = False
            caregiver.save()

            # Create in-app notification
            create_status_notification(
                caregiver.user,
                status=VerificationStatus.REJECTED,
                role='Caregiver',
                rejection_reason=rejection_reason
            )

            # Send rejection email
            send_caregiver_rejection_email(caregiver.user, caregiver, rejection_reason)

        return Response({
            "message": f"Caregiver '{caregiver.name}' registration has been rejected.",
            "caregiver_id": caregiver.caregiver_id,
            "verification_status": caregiver.verification_status,
        }, status=status.HTTP_200_OK)


class NurseApprovedCaregiversView(APIView):
    """
    GET /api/nurse/caregivers/approved/
    Returns all approved caregivers with current availability and assignment details.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        nurse = get_authenticated_nurse(request)
        if not nurse and request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Nurses only."}, status=status.HTTP_403_FORBIDDEN)

        approved_qs = Caregiver.objects.filter(
            verification_status=VerificationStatus.APPROVED
        ).order_by('name')

        serializer = ApprovedCaregiverPublicSerializer(approved_qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class NurseCaregiverComplaintsListView(APIView):
    """
    GET /api/nurse/caregiver-complaints/
    Returns list of caregiver complaints with optional status filtering.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        nurse = get_authenticated_nurse(request)
        if not nurse and request.user.role != Role.ADMIN:
            return Response({"detail": "Access restricted to Nurses only."}, status=status.HTTP_403_FORBIDDEN)

        status_filter = request.query_params.get('status')
        qs = CaregiverComplaint.objects.select_related('caregiver', 'caregiver__user', 'resolved_by_nurse').all()

        if status_filter and status_filter.lower() != 'all':
            qs = qs.filter(status__iexact=status_filter)

        serializer = CaregiverComplaintSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class NurseResolveCaregiverComplaintView(APIView):
    """
    POST /api/nurse/caregiver-complaints/<int:complaint_id>/resolve/
    Nurse resolves a caregiver complaint with resolution notes.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, complaint_id):
        nurse = get_authenticated_nurse(request)
        if not nurse:
            return Response({"detail": "Access restricted to Nurses only."}, status=status.HTTP_403_FORBIDDEN)

        resolution_notes = request.data.get('resolution_notes', '').strip()
        if not resolution_notes:
            return Response(
                {"errors": {"resolution_notes": ["Resolution notes are required."]}},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            complaint = CaregiverComplaint.objects.select_for_update().filter(complaint_id=complaint_id).first()
            if not complaint:
                return Response({"detail": "Complaint not found."}, status=status.HTTP_404_NOT_FOUND)

            complaint.status = ComplaintStatus.RESOLVED
            complaint.resolution_notes = resolution_notes
            complaint.resolved_by_nurse = nurse
            complaint.resolved_at = timezone.now()
            complaint.save()

            # Notify caregiver
            Notification.objects.create(
                user=complaint.caregiver.user,
                type='complaint_resolved',
                message=f"Your complaint regarding '{complaint.subject}' has been resolved by Nurse {nurse.name}."
            )

        return Response({
            "message": "Complaint marked as resolved successfully.",
            "complaint_id": complaint.complaint_id,
            "status": complaint.status,
        }, status=status.HTTP_200_OK)


# ============================================================================
# 2. PATIENT CAREGIVER VIEWS
# ============================================================================

class PatientApprovedCaregiversListView(APIView):
    """
    GET /api/patient/caregivers/
    Returns list of verified & approved Caregivers for patients to browse and request.
    Only approved caregivers are shown.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role not in [Role.PATIENT, Role.NURSE, Role.DOCTOR, Role.ADMIN]:
            return Response({"detail": "Access restricted."}, status=status.HTTP_403_FORBIDDEN)

        approved_caregivers = Caregiver.objects.filter(
            verification_status=VerificationStatus.APPROVED,
            user__is_active=True
        ).order_by('name')

        search_q = request.query_params.get('search', '').strip()
        if search_q:
            approved_caregivers = approved_caregivers.filter(
                Q(name__icontains=search_q) |
                Q(place__icontains=search_q) |
                Q(panchayath__icontains=search_q) |
                Q(specialization__icontains=search_q)
            )

        serializer = ApprovedCaregiverPublicSerializer(approved_caregivers, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PatientCaregiverStatusView(APIView):
    """
    GET /api/patient/caregiver/
    Returns the authenticated patient's current caregiver relationship, active assignment,
    pending requests, and completed care assignments awaiting feedback.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        patient = get_authenticated_patient(request)
        if not patient:
            return Response({"detail": "Patient profile not found."}, status=status.HTTP_403_FORBIDDEN)

        # 1. Active Assignment
        active_assignment = CaregiverPatientAssignment.objects.select_related('caregiver', 'caregiver__user').filter(
            patient=patient, status=AssignmentStatus.ACTIVE
        ).first()

        # 2. Pending Requests sent by patient
        pending_requests = CaregiverRequest.objects.select_related('caregiver', 'caregiver__user').filter(
            patient=patient, status=CaregiverRequestStatus.PENDING
        )

        # 3. Completed Assignments eligible for Feedback (no feedback submitted yet)
        completed_assignments_without_feedback = CaregiverPatientAssignment.objects.select_related(
            'caregiver', 'caregiver__user'
        ).filter(
            patient=patient,
            status=AssignmentStatus.COMPLETED,
            feedback__isnull=True
        )

        # 4. Past Care History
        past_assignments = CaregiverPatientAssignment.objects.select_related(
            'caregiver', 'feedback'
        ).filter(
            patient=patient,
            status__in=[AssignmentStatus.COMPLETED, AssignmentStatus.ENDED, AssignmentStatus.TERMINATED]
        ).order_by('-assigned_at')

        active_data = None
        if active_assignment:
            active_data = CaregiverPatientAssignmentSerializer(active_assignment).data

        return Response({
            "has_active_assignment": active_assignment is not None,
            "active_assignment": active_data,
            "caregiver": active_data["caregiver_name"] if active_data else None,
            "assigned": active_assignment is not None,
            "pending_requests": CaregiverRequestSerializer(pending_requests, many=True).data,
            "pending_feedback_assignments": CaregiverPatientAssignmentSerializer(completed_assignments_without_feedback, many=True).data,
            "past_assignments": CaregiverPatientAssignmentSerializer(past_assignments, many=True).data,
        }, status=status.HTTP_200_OK)


class PatientCreateCaregiverRequestView(APIView):
    """
    POST /api/patient/caregiver-requests/
    Patient sends a care request to an approved & available caregiver.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        patient = get_authenticated_patient(request)
        if not patient:
            return Response({"detail": "Patient profile not found."}, status=status.HTTP_403_FORBIDDEN)

        caregiver_id = request.data.get('caregiver_id')
        message = request.data.get('message', '').strip()

        if not caregiver_id:
            return Response({"errors": {"caregiver_id": ["Caregiver ID is required."]}}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            caregiver = Caregiver.objects.select_for_update().filter(caregiver_id=caregiver_id).first()
            if not caregiver:
                return Response({"errors": {"caregiver_id": ["Caregiver not found."]}}, status=status.HTTP_404_NOT_FOUND)

            if caregiver.verification_status != VerificationStatus.APPROVED:
                return Response({"errors": {"caregiver_id": ["This caregiver is not approved for patient assignments."]}}, status=status.HTTP_400_BAD_REQUEST)

            # Check if caregiver already has active assignment
            has_active_assignment = CaregiverPatientAssignment.objects.filter(
                caregiver=caregiver, status=AssignmentStatus.ACTIVE
            ).exists()
            if has_active_assignment or not caregiver.is_available:
                return Response(
                    {"errors": {"detail": ["This caregiver currently has an active patient assignment and is unavailable."]}},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if patient already has an active assignment
            if CaregiverPatientAssignment.objects.filter(patient=patient, status=AssignmentStatus.ACTIVE).exists():
                return Response(
                    {"errors": {"detail": ["You already have an active caregiver assigned."]}},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Prevent duplicate pending request to the same caregiver
            if CaregiverRequest.objects.filter(patient=patient, caregiver=caregiver, status=CaregiverRequestStatus.PENDING).exists():
                return Response(
                    {"errors": {"detail": ["You already have a pending care request with this caregiver."]}},
                    status=status.HTTP_400_BAD_REQUEST
                )

            req = CaregiverRequest.objects.create(
                patient=patient,
                caregiver=caregiver,
                status=CaregiverRequestStatus.PENDING,
                patient_message=message
            )

            # Notify caregiver
            Notification.objects.create(
                user=caregiver.user,
                type='caregiver_request',
                message=f"Patient {patient.name} has requested you as their caregiver."
            )

        return Response({
            "message": f"Caregiver request sent to {caregiver.name} successfully.",
            "request": CaregiverRequestSerializer(req).data
        }, status=status.HTTP_201_CREATED)


class PatientSubmitCaregiverFeedbackView(APIView):
    """
    POST /api/patient/caregiver-feedback/
    Patient submits 1-5 star rating and feedback for their completed caregiver assignment.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        patient = get_authenticated_patient(request)
        if not patient:
            return Response({"detail": "Patient profile not found."}, status=status.HTTP_403_FORBIDDEN)

        assignment_id = request.data.get('assignment_id')
        rating = request.data.get('rating')
        comment = request.data.get('comment', '').strip()

        if not assignment_id:
            return Response({"errors": {"assignment_id": ["Assignment ID is required."]}}, status=status.HTTP_400_BAD_REQUEST)

        try:
            rating_int = int(rating)
            if rating_int < 1 or rating_int > 5:
                raise ValueError()
        except (ValueError, TypeError):
            return Response({"errors": {"rating": ["Rating must be an integer between 1 and 5."]}}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            assignment = CaregiverPatientAssignment.objects.select_for_update().filter(
                assignment_id=assignment_id
            ).first()

            if not assignment:
                return Response({"errors": {"assignment_id": ["Care assignment not found."]}}, status=status.HTTP_404_NOT_FOUND)

            if assignment.patient != patient:
                return Response({"detail": "You are not authorized to submit feedback for another patient's care assignment."}, status=status.HTTP_403_FORBIDDEN)

            if assignment.status != AssignmentStatus.COMPLETED:
                return Response(
                    {"errors": {"detail": ["Feedback can only be submitted after care has been marked completed."]}},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if hasattr(assignment, 'feedback'):
                return Response(
                    {"errors": {"detail": ["Feedback has already been submitted for this care assignment."]}},
                    status=status.HTTP_400_BAD_REQUEST
                )

            feedback = CaregiverFeedback.objects.create(
                assignment=assignment,
                patient=patient,
                caregiver=assignment.caregiver,
                rating=rating_int,
                comment=comment
            )

            # Calculate updated caregiver rating
            avg_rating = CaregiverFeedback.objects.filter(caregiver=assignment.caregiver).aggregate(Avg('rating'))['rating__avg']
            total_reviews = CaregiverFeedback.objects.filter(caregiver=assignment.caregiver).count()

            # Notify caregiver
            Notification.objects.create(
                user=assignment.caregiver.user,
                type='caregiver_feedback',
                message=f"Patient {patient.name} left a {rating_int}★ review for your completed care."
            )

        return Response({
            "message": "Thank you! Your feedback has been recorded successfully.",
            "feedback": CaregiverFeedbackSerializer(feedback).data,
            "average_rating": round(float(avg_rating), 1) if avg_rating else 5.0,
            "total_reviews": total_reviews
        }, status=status.HTTP_201_CREATED)


# ============================================================================
# 3. CAREGIVER PORTAL VIEWS
# ============================================================================

class CaregiverRequestsListView(APIView):
    """
    GET /api/caregiver/requests/
    Returns list of patient requests received by the authenticated caregiver.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        caregiver = get_authenticated_caregiver(request)
        if not caregiver:
            return Response({"detail": "Caregiver profile not found."}, status=status.HTTP_403_FORBIDDEN)

        requests_qs = CaregiverRequest.objects.select_related('patient').filter(
            caregiver=caregiver
        ).order_by('-created_at')

        serializer = CaregiverRequestSerializer(requests_qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CaregiverAcceptRequestView(APIView):
    """
    POST /api/caregiver/requests/<int:request_id>/accept/
    Caregiver accepts a pending patient care request atomically.
    Creates active assignment and sets caregiver as unavailable.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, request_id):
        caregiver = get_authenticated_caregiver(request)
        if not caregiver:
            return Response({"detail": "Caregiver profile not found."}, status=status.HTTP_403_FORBIDDEN)

        if caregiver.verification_status != VerificationStatus.APPROVED:
            return Response({"detail": "Only verified & approved caregivers can accept patient requests."}, status=status.HTTP_403_FORBIDDEN)

        with transaction.atomic():
            cg = Caregiver.objects.select_for_update().filter(caregiver_id=caregiver.caregiver_id).first()
            care_req = CaregiverRequest.objects.select_for_update().filter(
                request_id=request_id, caregiver=cg
            ).first()

            if not care_req:
                return Response({"detail": "Care request not found."}, status=status.HTTP_404_NOT_FOUND)

            if care_req.status != CaregiverRequestStatus.PENDING:
                return Response(
                    {"errors": {"detail": [f"This care request has already been {care_req.status.lower()}."]}},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check concurrency: caregiver must not have another active assignment
            active_existing = CaregiverPatientAssignment.objects.select_for_update().filter(
                caregiver=cg, status=AssignmentStatus.ACTIVE
            ).first()
            if active_existing:
                return Response(
                    {"errors": {"detail": ["You already have an active patient assignment. Complete current care before accepting new requests."]}},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Accept request
            care_req.status = CaregiverRequestStatus.ACCEPTED
            care_req.responded_at = timezone.now()
            care_req.save()

            # Create assignment
            assignment = CaregiverPatientAssignment.objects.create(
                caregiver=cg,
                patient=care_req.patient,
                request=care_req,
                status=AssignmentStatus.ACTIVE
            )

            # Mark caregiver as unavailable
            cg.is_available = False
            cg.save()

            # Reject any other pending requests for this caregiver or patient gracefully
            CaregiverRequest.objects.filter(
                caregiver=cg, status=CaregiverRequestStatus.PENDING
            ).exclude(request_id=request_id).update(
                status=CaregiverRequestStatus.REJECTED,
                response_notes="Caregiver accepted another assignment",
                responded_at=timezone.now()
            )

            # Notify patient
            Notification.objects.create(
                user=care_req.patient.user,
                type='caregiver_accepted',
                message=f"Caregiver {cg.name} has accepted your care request! Care assignment is now active."
            )

        return Response({
            "message": f"You have accepted {care_req.patient.name}'s care request. Care is now active.",
            "assignment": CaregiverPatientAssignmentSerializer(assignment).data
        }, status=status.HTTP_200_OK)


class CaregiverRejectRequestView(APIView):
    """
    POST /api/caregiver/requests/<int:request_id>/reject/
    Caregiver declines a pending patient care request.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, request_id):
        caregiver = get_authenticated_caregiver(request)
        if not caregiver:
            return Response({"detail": "Caregiver profile not found."}, status=status.HTTP_403_FORBIDDEN)

        reason = (request.data.get('response_notes') or request.data.get('reason') or 'Caregiver is currently unavailable').strip()

        with transaction.atomic():
            care_req = CaregiverRequest.objects.select_for_update().filter(
                request_id=request_id, caregiver=caregiver
            ).first()

            if not care_req:
                return Response({"detail": "Care request not found."}, status=status.HTTP_404_NOT_FOUND)

            if care_req.status != CaregiverRequestStatus.PENDING:
                return Response(
                    {"errors": {"detail": [f"This care request has already been {care_req.status.lower()}."]}},
                    status=status.HTTP_400_BAD_REQUEST
                )

            care_req.status = CaregiverRequestStatus.REJECTED
            care_req.response_notes = reason
            care_req.responded_at = timezone.now()
            care_req.save()

            # Notify patient
            Notification.objects.create(
                user=care_req.patient.user,
                type='caregiver_rejected',
                message=f"Caregiver {caregiver.name} was unable to accept your care request at this time."
            )

        return Response({
            "message": "Care request declined.",
            "request_id": care_req.request_id,
            "status": care_req.status,
        }, status=status.HTTP_200_OK)


class CaregiverActiveAssignmentView(APIView):
    """
    GET /api/caregiver/assignment/
    Returns the caregiver's currently active assigned patient details.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        caregiver = get_authenticated_caregiver(request)
        if not caregiver:
            return Response({"detail": "Caregiver profile not found."}, status=status.HTTP_403_FORBIDDEN)

        assignment = CaregiverPatientAssignment.objects.select_related('patient', 'request').filter(
            caregiver=caregiver, status=AssignmentStatus.ACTIVE
        ).first()

        if not assignment:
            return Response({
                "has_active_assignment": False,
                "assignment": None,
                "is_available": caregiver.is_available,
            }, status=status.HTTP_200_OK)

        return Response({
            "has_active_assignment": True,
            "assignment": CaregiverPatientAssignmentSerializer(assignment).data,
            "is_available": caregiver.is_available,
        }, status=status.HTTP_200_OK)


class CaregiverCompleteCareView(APIView):
    """
    POST /api/caregiver/assignment/complete/
    Caregiver marks their current active patient care as completed.
    Resets caregiver availability to Available and invites patient for rating/feedback.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, assignment_id=None):
        caregiver = get_authenticated_caregiver(request)
        if not caregiver:
            return Response({"detail": "Caregiver profile not found."}, status=status.HTTP_403_FORBIDDEN)

        notes = request.data.get('notes', '').strip()

        with transaction.atomic():
            cg = Caregiver.objects.select_for_update().filter(caregiver_id=caregiver.caregiver_id).first()

            if assignment_id:
                assignment = CaregiverPatientAssignment.objects.select_for_update().filter(
                    assignment_id=assignment_id, caregiver=cg
                ).first()
            else:
                assignment = CaregiverPatientAssignment.objects.select_for_update().filter(
                    caregiver=cg, status=AssignmentStatus.ACTIVE
                ).first()

            if not assignment:
                return Response({"detail": "Active care assignment not found."}, status=status.HTTP_404_NOT_FOUND)

            if assignment.status != AssignmentStatus.ACTIVE:
                return Response(
                    {"errors": {"detail": [f"This care assignment is already {assignment.status.lower()}."]}},
                    status=status.HTTP_400_BAD_REQUEST
                )

            assignment.status = AssignmentStatus.COMPLETED
            assignment.completed_at = timezone.now()
            if notes:
                assignment.notes = notes
            assignment.save()

            # Caregiver becomes available again
            cg.is_available = True
            cg.save()

            # Notify patient that care is completed and invite rating
            Notification.objects.create(
                user=assignment.patient.user,
                type='care_completed',
                message=f"Care support by {cg.name} has been completed. Please take a moment to rate your experience."
            )

        return Response({
            "message": f"Care assignment with {assignment.patient.name} has been marked completed.",
            "assignment": CaregiverPatientAssignmentSerializer(assignment).data,
            "is_available": cg.is_available,
        }, status=status.HTTP_200_OK)


class CaregiverCareHistoryView(APIView):
    """
    GET /api/caregiver/care-history/
    Returns list of past / completed care assignments and feedbacks for the caregiver.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        caregiver = get_authenticated_caregiver(request)
        if not caregiver:
            return Response({"detail": "Caregiver profile not found."}, status=status.HTTP_403_FORBIDDEN)

        history_qs = CaregiverPatientAssignment.objects.select_related(
            'patient', 'feedback'
        ).filter(
            caregiver=caregiver
        ).order_by('-assigned_at')

        avg_rating = CaregiverFeedback.objects.filter(caregiver=caregiver).aggregate(Avg('rating'))['rating__avg']
        total_reviews = CaregiverFeedback.objects.filter(caregiver=caregiver).count()

        serializer = CaregiverPatientAssignmentSerializer(history_qs, many=True)
        return Response({
            "history": serializer.data,
            "average_rating": round(float(avg_rating), 1) if avg_rating else 5.0,
            "total_reviews": total_reviews,
            "total_completed_patients": history_qs.filter(status=AssignmentStatus.COMPLETED).count(),
        }, status=status.HTTP_200_OK)


class CaregiverComplaintsView(APIView):
    """
    GET /api/caregiver/complaints/ - List caregiver's own complaints
    POST /api/caregiver/complaints/ - Submit a new complaint with category & description
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        caregiver = get_authenticated_caregiver(request)
        if not caregiver:
            return Response({"detail": "Caregiver profile not found."}, status=status.HTTP_403_FORBIDDEN)

        complaints_qs = CaregiverComplaint.objects.filter(caregiver=caregiver).order_by('-created_at')
        serializer = CaregiverComplaintSerializer(complaints_qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        caregiver = get_authenticated_caregiver(request)
        if not caregiver:
            return Response({"detail": "Caregiver profile not found."}, status=status.HTTP_403_FORBIDDEN)

        subject = request.data.get('subject', '').strip()
        category = request.data.get('category', ComplaintCategory.OTHER).strip()
        description = request.data.get('description', '').strip()
        attachment = request.FILES.get('attachment')

        if not subject:
            return Response({"errors": {"subject": ["Subject is required."]}}, status=status.HTTP_400_BAD_REQUEST)
        if not description:
            return Response({"errors": {"description": ["Complaint description is required."]}}, status=status.HTTP_400_BAD_REQUEST)

        saved_path = None
        if attachment:
            file_ext = os.path.splitext(attachment.name)[1].lower()
            filename = f"complaints/{uuid.uuid4().hex}{file_ext}"
            saved_path = default_storage.save(filename, attachment)

        complaint = CaregiverComplaint.objects.create(
            caregiver=caregiver,
            subject=subject,
            category=category if category in ComplaintCategory.values else ComplaintCategory.OTHER,
            description=description,
            attachment_path=saved_path,
            status=ComplaintStatus.OPEN
        )

        # Notify active nurses about the new complaint
        nurses = Nurse.objects.filter(user__is_active=True)
        for n in nurses:
            Notification.objects.create(
                user=n.user,
                type='caregiver_complaint',
                message=f"New complaint filed by Caregiver {caregiver.name}: '{subject}'"
            )

        return Response({
            "message": "Complaint submitted successfully. Our nursing team will review and resolve it promptly.",
            "complaint": CaregiverComplaintSerializer(complaint).data
        }, status=status.HTTP_201_CREATED)
