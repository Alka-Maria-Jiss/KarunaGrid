from django.db import models


class WelfareApplicationStatus(models.TextChoices):
    SUBMITTED = 'Submitted', 'Submitted'
    UNDER_REVIEW = 'UnderReview', 'UnderReview'
    APPROVED = 'Approved', 'Approved'
    REJECTED = 'Rejected', 'Rejected'


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
    name = models.CharField(max_length=150)
    description = models.TextField(null=True, blank=True)
    eligibility_criteria = models.TextField(null=True, blank=True)
    required_documents = models.TextField(null=True, blank=True)
    application_link = models.CharField(max_length=255, null=True, blank=True)
    created_by_admin = models.ForeignKey(
        'accounts.Administrator', on_delete=models.CASCADE, db_column='created_by_admin_id'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'welfare_schemes'

    def __str__(self):
        return f"Scheme: {self.name}"


class WelfareApplication(models.Model):
    application_id = models.AutoField(primary_key=True)
    patient = models.ForeignKey('accounts.Patient', on_delete=models.CASCADE, db_column='patient_id')
    scheme = models.ForeignKey('resources.WelfareScheme', on_delete=models.CASCADE, db_column='scheme_id')
    submitted_by = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE, db_column='submitted_by_user_id'
    )
    status = models.CharField(
        max_length=20, choices=WelfareApplicationStatus.choices, default=WelfareApplicationStatus.SUBMITTED
    )
    submitted_documents = models.TextField(null=True, blank=True)
    remarks = models.TextField(null=True, blank=True)
    reviewed_by_admin = models.ForeignKey(
        'accounts.Administrator', on_delete=models.SET_NULL, null=True, blank=True, db_column='reviewed_by_admin_id'
    )
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'welfare_applications'

    def __str__(self):
        return f"Welfare Application #{self.application_id} ({self.status})"


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
