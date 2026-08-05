from django.contrib import admin
from .models import (
    WelfareScheme,
    WelfareApplication,
    EquipmentType,
    EquipmentUnit,
    EquipmentRequest,
)


@admin.register(WelfareScheme)
class WelfareSchemeAdmin(admin.ModelAdmin):
    list_display = ('scheme_id', 'name', 'created_by_admin', 'created_at', 'updated_at')
    search_fields = ('name', 'created_by_admin__name')


@admin.register(WelfareApplication)
class WelfareApplicationAdmin(admin.ModelAdmin):
    list_display = ('application_id', 'patient', 'scheme', 'submitted_by', 'status', 'submitted_at')
    list_filter = ('status',)
    search_fields = ('patient__name', 'scheme__name', 'submitted_by__email')


@admin.register(EquipmentType)
class EquipmentTypeAdmin(admin.ModelAdmin):
    list_display = ('equipment_type_id', 'name', 'description')
    search_fields = ('name',)


@admin.register(EquipmentUnit)
class EquipmentUnitAdmin(admin.ModelAdmin):
    list_display = ('unit_id', 'equipment_type', 'serial_number', 'status', 'updated_at')
    list_filter = ('status',)
    search_fields = ('serial_number', 'equipment_type__name')


@admin.register(EquipmentRequest)
class EquipmentRequestAdmin(admin.ModelAdmin):
    list_display = ('request_id', 'patient', 'equipment_type', 'requested_by', 'doctor_approval_status', 'delivery_status', 'requested_at')
    list_filter = ('doctor_approval_status', 'delivery_status')
    search_fields = ('patient__name', 'equipment_type__name', 'requested_by__email')
