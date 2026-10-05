from django.urls import path
from .views import DoctorEquipmentRequestsView

urlpatterns = [
    path('doctor/equipment-requests/', DoctorEquipmentRequestsView.as_view(), name='resources_doctor_equipment_requests'),
    path('doctor/equipment-requests/<int:request_id>/review/', DoctorEquipmentRequestsView.as_view(), name='resources_doctor_equipment_requests_review'),
]
