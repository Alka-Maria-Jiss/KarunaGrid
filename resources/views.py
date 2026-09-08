from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from accounts.models import Role, Doctor
from resources.models import EquipmentRequest, DoctorApprovalStatus


def get_authenticated_doctor(request):
    if request.user.role != Role.DOCTOR:
        return None
    return getattr(request.user, 'doctor', None) or Doctor.objects.filter(user=request.user).first()


class DoctorEquipmentRequestsView(APIView):
    """
    Clinical necessity evaluation of assistive medical equipment requests by Doctor:
    GET: List equipment requests with doctor_approval_status.
    POST / review: Approve or reject clinical necessity (mandatory rejection reason if rejected).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        doctor = get_authenticated_doctor(request)
        if not doctor:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        status_param = request.query_params.get('status')
        qs = EquipmentRequest.objects.all().order_by('-requested_at')
        if status_param and status_param.lower() != 'all':
            qs = qs.filter(doctor_approval_status__iexact=status_param)

        results = [
            {
                "request_id": r.request_id,
                "patient_id": r.patient.patient_id,
                "patient_name": r.patient.name,
                "patient_reg_id": r.patient.registration_id,
                "equipment_type_id": r.equipment_type.equipment_type_id,
                "equipment_type_name": r.equipment_type.name,
                "doctor_approval_status": r.doctor_approval_status,
                "approved_by_doctor_name": r.approved_by_doctor.name if r.approved_by_doctor else None,
                "delivery_status": r.delivery_status,
                "requested_at": r.requested_at.strftime('%d %b %Y, %H:%M'),
            }
            for r in qs
        ]
        return Response(results, status=status.HTTP_200_OK)

    def post(self, request, request_id=None, *args, **kwargs):
        doctor = get_authenticated_doctor(request)
        if not doctor:
            return Response({"detail": "Access restricted to Doctors only."}, status=status.HTTP_403_FORBIDDEN)

        req_id = request_id or request.data.get('request_id')
        if not req_id:
            return Response({"errors": {"request_id": ["Request ID is required."]}}, status=status.HTTP_400_BAD_REQUEST)

        eq_request = EquipmentRequest.objects.filter(request_id=req_id).first()
        if not eq_request:
            return Response({"detail": "Equipment request not found."}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action', 'approve').lower()
        if action == 'approve':
            eq_request.doctor_approval_status = DoctorApprovalStatus.APPROVED
            eq_request.approved_by_doctor = doctor
            eq_request.save()
            return Response({
                "message": f"Equipment request #{eq_request.request_id} ({eq_request.equipment_type.name}) clinically approved.",
                "request_id": eq_request.request_id,
                "doctor_approval_status": eq_request.doctor_approval_status,
            }, status=status.HTTP_200_OK)
        else:
            rejection_reason = request.data.get('rejection_reason', '').strip()
            if not rejection_reason:
                return Response({
                    "errors": {"rejection_reason": ["A clinical rejection reason is mandatory."]}
                }, status=status.HTTP_400_BAD_REQUEST)

            eq_request.doctor_approval_status = DoctorApprovalStatus.REJECTED
            eq_request.approved_by_doctor = doctor
            eq_request.save()
            return Response({
                "message": f"Equipment request #{eq_request.request_id} clinically rejected: {rejection_reason}",
                "request_id": eq_request.request_id,
                "doctor_approval_status": eq_request.doctor_approval_status,
            }, status=status.HTTP_200_OK)
