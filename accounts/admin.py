from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Administrator, Doctor, Nurse, Patient, Caregiver


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('user_id', 'email', 'role', 'is_active', 'is_staff', 'created_at')
    list_filter = ('role', 'is_active', 'is_staff')
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Permissions', {'fields': ('role', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'role', 'password', 'is_active', 'is_staff'),
        }),
    )
    search_fields = ('email',)
    ordering = ('user_id',)


@admin.register(Administrator)
class AdministratorAdmin(admin.ModelAdmin):
    list_display = ('admin_id', 'name', 'user', 'phone', 'created_at', 'updated_at')
    search_fields = ('name', 'user__email')


@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ('doctor_id', 'name', 'specialization', 'phone', 'service_area', 'is_available_now', 'verification_status', 'created_at')
    list_filter = ('verification_status', 'is_available_now')
    search_fields = ('name', 'specialization', 'service_area', 'user__email')


@admin.register(Nurse)
class NurseAdmin(admin.ModelAdmin):
    list_display = ('nurse_id', 'name', 'phone', 'service_area', 'is_available_now', 'verification_status', 'created_at')
    list_filter = ('verification_status', 'is_available_now')
    search_fields = ('name', 'service_area', 'user__email')


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ('patient_id', 'registration_id', 'name', 'gender', 'phone', 'registration_status', 'status', 'created_at')
    list_filter = ('registration_status', 'status', 'gender')
    search_fields = ('name', 'registration_id', 'phone', 'user__email')


@admin.register(Caregiver)
class CaregiverAdmin(admin.ModelAdmin):
    list_display = ('caregiver_id', 'name', 'phone', 'service_area', 'verification_status', 'created_at', 'updated_at')
    list_filter = ('verification_status',)
    search_fields = ('name', 'service_area', 'user__email')
