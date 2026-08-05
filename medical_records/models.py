from django.db import models


class ReviewStatus(models.TextChoices):
    PENDING = 'Pending', 'Pending'
    REVIEWED = 'Reviewed', 'Reviewed'


class ActiveSupersededStatus(models.TextChoices):
    ACTIVE = 'Active', 'Active'
    SUPERSEDED = 'Superseded', 'Superseded'


class ChangeType(models.TextChoices):
    NEW = 'New', 'New'
    CONTINUED = 'Continued', 'Continued'
    DISCONTINUED = 'Discontinued', 'Discontinued'
    DOSAGE_CHANGED = 'DosageChanged', 'DosageChanged'


class PatientDiagnosis(models.Model):
    diagnosis_id = models.AutoField(primary_key=True)
    patient = models.ForeignKey('accounts.Patient', on_delete=models.CASCADE, db_column='patient_id')
    doctor = models.ForeignKey('accounts.Doctor', on_delete=models.CASCADE, db_column='doctor_id')
    diagnosis_text = models.TextField()
    diagnosed_date = models.DateField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'patient_diagnosis'

    def __str__(self):
        return f"Diagnosis #{self.diagnosis_id} for Patient #{self.patient_id}"


class PatientAllergy(models.Model):
    allergy_id = models.AutoField(primary_key=True)
    patient = models.ForeignKey('accounts.Patient', on_delete=models.CASCADE, db_column='patient_id')
    allergy_name = models.CharField(max_length=100)
    severity = models.CharField(max_length=20, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'patient_allergies'

    def __str__(self):
        return f"{self.allergy_name} ({self.severity}) - Patient #{self.patient_id}"


class PatientChronicCondition(models.Model):
    condition_id = models.AutoField(primary_key=True)
    patient = models.ForeignKey('accounts.Patient', on_delete=models.CASCADE, db_column='patient_id')
    condition_name = models.CharField(max_length=100)
    notes = models.TextField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'patient_chronic_conditions'

    def __str__(self):
        return f"{self.condition_name} - Patient #{self.patient_id}"


class MedicalDocument(models.Model):
    document_id = models.AutoField(primary_key=True)
    patient = models.ForeignKey('accounts.Patient', on_delete=models.CASCADE, db_column='patient_id')
    file_path = models.CharField(max_length=255)
    document_type = models.CharField(max_length=50, null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'medical_documents'

    def __str__(self):
        return f"Document #{self.document_id} ({self.document_type})"


class LabReport(models.Model):
    report_id = models.AutoField(primary_key=True)
    patient = models.ForeignKey('accounts.Patient', on_delete=models.CASCADE, db_column='patient_id')
    uploaded_by = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE, db_column='uploaded_by_user_id', related_name='uploaded_lab_reports'
    )
    file_path = models.CharField(max_length=255)
    report_date = models.DateField(null=True, blank=True)
    review_status = models.CharField(
        max_length=15, choices=ReviewStatus.choices, default=ReviewStatus.PENDING
    )
    reviewed_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True, db_column='reviewed_by_user_id', related_name='reviewed_lab_reports'
    )
    remarks = models.TextField(null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lab_reports'

    def __str__(self):
        return f"LabReport #{self.report_id} - Status: {self.review_status}"


class Prescription(models.Model):
    prescription_id = models.AutoField(primary_key=True)
    patient = models.ForeignKey('accounts.Patient', on_delete=models.CASCADE, db_column='patient_id')
    doctor = models.ForeignKey('accounts.Doctor', on_delete=models.CASCADE, db_column='doctor_id')
    version_number = models.IntegerField()
    status = models.CharField(
        max_length=15, choices=ActiveSupersededStatus.choices, default=ActiveSupersededStatus.ACTIVE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'prescriptions'

    def __str__(self):
        return f"Prescription #{self.prescription_id} v{self.version_number} ({self.status})"


class PrescriptionItem(models.Model):
    item_id = models.AutoField(primary_key=True)
    prescription = models.ForeignKey('medical_records.Prescription', on_delete=models.CASCADE, db_column='prescription_id')
    medicine_name = models.CharField(max_length=100)
    dosage = models.CharField(max_length=50, null=True, blank=True)
    frequency = models.CharField(max_length=50, null=True, blank=True)
    duration_days = models.IntegerField(null=True, blank=True)
    change_type = models.CharField(max_length=15, choices=ChangeType.choices)

    class Meta:
        db_table = 'prescription_items'

    def __str__(self):
        return f"{self.medicine_name} - {self.dosage} ({self.change_type})"


class NutritionPlan(models.Model):
    plan_id = models.AutoField(primary_key=True)
    patient = models.ForeignKey('accounts.Patient', on_delete=models.CASCADE, db_column='patient_id')
    doctor = models.ForeignKey('accounts.Doctor', on_delete=models.CASCADE, db_column='doctor_id')
    version_number = models.IntegerField()
    dietary_recommendations = models.TextField(null=True, blank=True)
    special_instructions = models.TextField(null=True, blank=True)
    status = models.CharField(
        max_length=15, choices=ActiveSupersededStatus.choices, default=ActiveSupersededStatus.ACTIVE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'nutrition_plans'

    def __str__(self):
        return f"NutritionPlan #{self.plan_id} v{self.version_number}"
