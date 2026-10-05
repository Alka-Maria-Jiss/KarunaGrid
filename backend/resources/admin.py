from django.contrib import admin
from .models import (
    WelfareScheme,
    EquipmentType,
    EquipmentUnit,
    EquipmentRequest,
)


@admin.register(WelfareScheme)
class WelfareSchemeAdmin(admin.ModelAdmin):
    list_display = ('scheme_id', 'name', 'category', 'status', 'government_department', 'published_at', 'created_at')
    list_filter = ('status', 'category')
    search_fields = ('name', 'category', 'government_department', 'created_by_admin__name')


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
