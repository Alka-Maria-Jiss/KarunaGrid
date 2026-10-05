from django.db import models


class WelfareSchemeStatus(models.TextChoices):
    DRAFT = 'Draft', 'Draft'
    PUBLISHED = 'Published', 'Published'
    UNPUBLISHED = 'Unpublished', 'Unpublished'


class EquipmentUnitStatus(models.TextChoices):
    AVAILABLE = 'Available', 'Available'
    ALLOCATED = 'Allocated', 'Allocated'
    MAINTENANCE = 'Maintenance', 'Maintenance'
    RETIRED = 'Retired', 'Retired'


class DoctorApprovalStatus(models.TextChoices):
    PENDING = 'Pending', 'Pending'
    APPROVED = 'Approved', 'Approved'
    REJECTED = 'Rejected', 'Rejected'


class DeliveryStatus(models.TextChoices):
    REQUESTED = 'Requested', 'Requested'
    ALLOCATED = 'Allocated', 'Allocated'
    DELIVERED = 'Delivered', 'Delivered'
    RETURNED = 'Returned', 'Returned'


class WelfareScheme(models.Model):
    scheme_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=100, default='Financial Aid')
    description = models.TextField(null=True, blank=True)
    eligibility_criteria = models.TextField(null=True, blank=True)
    benefits = models.TextField(null=True, blank=True)
    required_documents = models.TextField(null=True, blank=True)
    application_instructions = models.TextField(null=True, blank=True)
    official_application_url = models.URLField(max_length=500, null=True, blank=True)
    government_department = models.CharField(max_length=200, null=True, blank=True)
    contact_info = models.TextField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=WelfareSchemeStatus.choices,
        default=WelfareSchemeStatus.DRAFT,
    )
    published_at = models.DateTimeField(null=True, blank=True)
    created_by_admin = models.ForeignKey(
        'accounts.Administrator', on_delete=models.CASCADE, db_column='created_by_admin_id'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'welfare_schemes'

    def __str__(self):
        return f"Scheme: {self.name} ({self.status})"


class EquipmentType(models.Model):
    equipment_type_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'equipment_types'

    def __str__(self):
        return f"Equipment Type: {self.name}"


class EquipmentUnit(models.Model):
    unit_id = models.AutoField(primary_key=True)
    equipment_type = models.ForeignKey(
        'resources.EquipmentType', on_delete=models.CASCADE, db_column='equipment_type_id'
    )
    serial_number = models.CharField(max_length=50, unique=True, null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=EquipmentUnitStatus.choices, default=EquipmentUnitStatus.AVAILABLE
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'equipment_units'

    def __str__(self):
        return f"Unit #{self.unit_id} ({self.serial_number}) - {self.status}"


class EquipmentRequest(models.Model):
    request_id = models.AutoField(primary_key=True)
    patient = models.ForeignKey('accounts.Patient', on_delete=models.CASCADE, db_column='patient_id')
    equipment_type = models.ForeignKey(
        'resources.EquipmentType', on_delete=models.CASCADE, db_column='equipment_type_id'
    )
    requested_by = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE, db_column='requested_by_user_id'
    )
    doctor_approval_status = models.CharField(
        max_length=15, choices=DoctorApprovalStatus.choices, default=DoctorApprovalStatus.PENDING
    )
    approved_by_doctor = models.ForeignKey(
        'accounts.Doctor', on_delete=models.SET_NULL, null=True, blank=True, db_column='approved_by_doctor_id'
    )
    allocated_unit = models.ForeignKey(
        'resources.EquipmentUnit', on_delete=models.SET_NULL, null=True, blank=True, db_column='allocated_unit_id'
    )
    allocated_by_admin = models.ForeignKey(
        'accounts.Administrator', on_delete=models.SET_NULL, null=True, blank=True, db_column='allocated_by_admin_id'
    )
    delivery_status = models.CharField(
        max_length=20, choices=DeliveryStatus.choices, default=DeliveryStatus.REQUESTED
    )
    requested_at = models.DateTimeField(auto_now_add=True)
    returned_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'equipment_requests'

    def __str__(self):
        return f"Equipment Request #{self.request_id} ({self.delivery_status})"
