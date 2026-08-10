from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import User, Administrator, Doctor, Nurse, Patient, Caregiver, VerificationStatus, RegistrationStatus
from .notifications import create_status_notification


class AdministratorInline(admin.StackedInline):
    model = Administrator
    can_delete = False
    verbose_name_plural = 'Administrator Profile'
    fk_name = 'user'


class DoctorInline(admin.StackedInline):
    model = Doctor
    can_delete = False
    verbose_name_plural = 'Doctor Profile'
    fk_name = 'user'


class NurseInline(admin.StackedInline):
    model = Nurse
    can_delete = False
    verbose_name_plural = 'Nurse Profile'
    fk_name = 'user'


class PatientInline(admin.StackedInline):
    model = Patient
    can_delete = False
    verbose_name_plural = 'Patient Profile'
    fk_name = 'user'


class CaregiverInline(admin.StackedInline):
    model = Caregiver
    can_delete = False
    verbose_name_plural = 'Caregiver Profile'
    fk_name = 'user'


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
    inlines = [AdministratorInline, DoctorInline, NurseInline, PatientInline, CaregiverInline]


@admin.register(Administrator)
class AdministratorAdmin(admin.ModelAdmin):
    list_display = ('admin_id', 'name', 'user', 'phone', 'created_at', 'updated_at')
    search_fields = ('name', 'user__email')


@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ('doctor_id', 'name', 'specialization', 'phone', 'panchayath', 'pincode', 'is_available_now', 'verification_status', 'created_at')
    list_filter = ('verification_status', 'is_available_now')
    search_fields = ('name', 'specialization', 'place', 'panchayath', 'pincode', 'user__email')
    fieldsets = (
        ('Basic Details', {'fields': ('user', 'name', 'phone', 'specialization', 'is_available_now')}),
        ('Address Details', {'fields': ('house_name', 'place', 'panchayath', 'ward_no', 'pincode')}),
        ('Verification & Status', {'fields': ('verification_status', 'rejection_reason', 'verified_by_admin')}),
    )

    def save_model(self, request, obj, form, change):
        if not change and not obj.verification_status:
            obj.verification_status = VerificationStatus.APPROVED
        super().save_model(request, obj, form, change)


@admin.register(Nurse)
class NurseAdmin(admin.ModelAdmin):
    list_display = ('nurse_id', 'name', 'phone', 'panchayath', 'pincode', 'is_available_now', 'verification_status', 'created_at')
    list_filter = ('verification_status', 'is_available_now')
    search_fields = ('name', 'place', 'panchayath', 'pincode', 'user__email')
    fieldsets = (
        ('Basic Details', {'fields': ('user', 'name', 'phone', 'is_available_now')}),
        ('Address Details', {'fields': ('house_name', 'place', 'panchayath', 'ward_no', 'pincode')}),
        ('Verification & Status', {'fields': ('verification_status', 'rejection_reason', 'verified_by_admin')}),
    )

    def save_model(self, request, obj, form, change):
        if not change and not obj.verification_status:
            obj.verification_status = VerificationStatus.APPROVED
        super().save_model(request, obj, form, change)


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ('patient_id', 'registration_id', 'name', 'gender', 'phone', 'panchayath', 'pincode', 'registration_status', 'status', 'created_at')
    list_filter = ('registration_status', 'status', 'gender')
    search_fields = ('name', 'registration_id', 'phone', 'place', 'panchayath', 'pincode', 'user__email')
    fieldsets = (
        ('Basic Details', {'fields': ('user', 'registration_id', 'name', 'dob', 'gender', 'phone')}),
        ('Address Details', {'fields': ('house_name', 'place', 'panchayath', 'ward_no', 'pincode')}),
        ('Medical Referral Document', {'fields': ('discharge_summary_path', 'discharge_summary_preview')}),
        ('Emergency Contact', {'fields': ('emergency_contact_name', 'emergency_contact_phone')}),
        ('Status & Doctor Review', {'fields': ('registration_status', 'status', 'rejection_reason', 'reviewed_by_doctor')}),
    )
    readonly_fields = ('discharge_summary_preview',)

    def discharge_summary_preview(self, obj):
        if obj.discharge_summary_path:
            return format_html(
                '<a href="/api/auth/documents/view/?type=patient_discharge_summary&id={}" target="_blank" style="font-weight:bold; color:#0284c7;">📄 View Secure Discharge Summary Document</a>',
                obj.patient_id
            )
        return "No discharge summary document uploaded"
    discharge_summary_preview.short_description = "Discharge Summary Document"

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if change and 'registration_status' in form.changed_data:
            if obj.registration_status in [RegistrationStatus.APPROVED, RegistrationStatus.REJECTED]:
                create_status_notification(
                    user=obj.user,
                    status=obj.registration_status,
                    role='Patient',
                    rejection_reason=obj.rejection_reason
                )


@admin.register(Caregiver)
class CaregiverAdmin(admin.ModelAdmin):
    list_display = ('caregiver_id', 'name', 'phone', 'panchayath', 'pincode', 'verification_status', 'created_at', 'updated_at')
    list_filter = ('verification_status',)
    search_fields = ('name', 'place', 'panchayath', 'pincode', 'user__email')
    fieldsets = (
        ('Basic Details', {'fields': ('user', 'name', 'phone', 'specialization', 'qualifications', 'certifications', 'availability_notes')}),
        ('Address Details', {'fields': ('house_name', 'place', 'panchayath', 'ward_no', 'pincode')}),
        ('Identity Verification', {'fields': ('identity_proof_path', 'identity_proof_preview')}),
        ('Verification & Status', {'fields': ('verification_status', 'rejection_reason', 'verified_by_admin')}),
    )
    readonly_fields = ('identity_proof_preview',)

    def identity_proof_preview(self, obj):
        if obj.identity_proof_path:
            return format_html(
                '<a href="/api/auth/documents/view/?type=caregiver_identity_proof&id={}" target="_blank" style="font-weight:bold; color:#0284c7;">📄 View Secure Identity Proof Document</a>',
                obj.caregiver_id
            )
        return "No identity proof document uploaded"
    identity_proof_preview.short_description = "Identity Proof Document"

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if change and 'verification_status' in form.changed_data:
            if obj.verification_status in [VerificationStatus.APPROVED, VerificationStatus.REJECTED]:
                create_status_notification(
                    user=obj.user,
                    status=obj.verification_status,
                    role='Caregiver',
                    rejection_reason=obj.rejection_reason
                )
