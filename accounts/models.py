from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin


class Role(models.TextChoices):
    ADMIN = 'Admin', 'Admin'
    DOCTOR = 'Doctor', 'Doctor'
    NURSE = 'Nurse', 'Nurse'
    PATIENT = 'Patient', 'Patient'
    CAREGIVER = 'Caregiver', 'Caregiver'


class VerificationStatus(models.TextChoices):
    PENDING = 'Pending', 'Pending'
    APPROVED = 'Approved', 'Approved'
    REJECTED = 'Rejected', 'Rejected'


class RegistrationStatus(models.TextChoices):
    PENDING = 'Pending', 'Pending'
    APPROVED = 'Approved', 'Approved'
    REJECTED = 'Rejected', 'Rejected'


class PatientStatus(models.TextChoices):
    ACTIVE = 'Active', 'Active'
    DISCHARGED = 'Discharged', 'Discharged'
    DECEASED = 'Deceased', 'Deceased'


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Users must have an email address')
        email = self.normalize_email(email)
        extra_fields.setdefault('is_active', True)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('role', Role.ADMIN)
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    user_id = models.AutoField(primary_key=True)
    email = models.EmailField(max_length=150, unique=True)
    role = models.CharField(max_length=20, choices=Role.choices)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        db_table = 'users'

    def __str__(self):
        return f"{self.email} ({self.role})"


class Administrator(models.Model):
    admin_id = models.AutoField(primary_key=True)
    user = models.OneToOneField('accounts.User', on_delete=models.CASCADE, db_column='user_id')
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'administrators'

    def __str__(self):
        return f"Admin: {self.name}"


class Doctor(models.Model):
    doctor_id = models.AutoField(primary_key=True)
    user = models.OneToOneField('accounts.User', on_delete=models.CASCADE, db_column='user_id')
    name = models.CharField(max_length=100)
    specialization = models.CharField(max_length=100, null=True, blank=True)
    phone = models.CharField(max_length=15, null=True, blank=True)
    service_area = models.CharField(max_length=150, null=True, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    is_available_now = models.BooleanField(default=False)
    verification_status = models.CharField(
        max_length=20, choices=VerificationStatus.choices, default=VerificationStatus.PENDING
    )
    rejection_reason = models.TextField(null=True, blank=True)
    verified_by_admin = models.ForeignKey(
        'accounts.Administrator', on_delete=models.SET_NULL, null=True, blank=True, db_column='verified_by_admin_id'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'doctors'

    def __str__(self):
        return f"Dr. {self.name}"


class Nurse(models.Model):
    nurse_id = models.AutoField(primary_key=True)
    user = models.OneToOneField('accounts.User', on_delete=models.CASCADE, db_column='user_id')
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15, null=True, blank=True)
    service_area = models.CharField(max_length=150, null=True, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    is_available_now = models.BooleanField(default=False)
    verification_status = models.CharField(
        max_length=20, choices=VerificationStatus.choices, default=VerificationStatus.PENDING
    )
    rejection_reason = models.TextField(null=True, blank=True)
    verified_by_admin = models.ForeignKey(
        'accounts.Administrator', on_delete=models.SET_NULL, null=True, blank=True, db_column='verified_by_admin_id'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'nurses'

    def __str__(self):
        return f"Nurse: {self.name}"


class Patient(models.Model):
    patient_id = models.AutoField(primary_key=True)
    user = models.OneToOneField('accounts.User', on_delete=models.CASCADE, db_column='user_id')
    registration_id = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=100)
    dob = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, null=True, blank=True)
    phone = models.CharField(max_length=15, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    preferred_language = models.CharField(max_length=50, null=True, blank=True)
    emergency_contact_name = models.CharField(max_length=100, null=True, blank=True)
    emergency_contact_phone = models.CharField(max_length=15, null=True, blank=True)
    registration_status = models.CharField(
        max_length=20, choices=RegistrationStatus.choices, default=RegistrationStatus.PENDING
    )
    status = models.CharField(
        max_length=20, choices=PatientStatus.choices, default=PatientStatus.ACTIVE
    )
    rejection_reason = models.TextField(null=True, blank=True)
    reviewed_by_doctor = models.ForeignKey(
        'accounts.Doctor', on_delete=models.SET_NULL, null=True, blank=True, db_column='reviewed_by_doctor_id'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'patients'

    def __str__(self):
        return f"Patient: {self.name} ({self.registration_id})"


class Caregiver(models.Model):
    caregiver_id = models.AutoField(primary_key=True)
    user = models.OneToOneField('accounts.User', on_delete=models.CASCADE, db_column='user_id')
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=15, null=True, blank=True)
    service_area = models.CharField(max_length=150, null=True, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    qualifications = models.TextField(null=True, blank=True)
    certifications = models.TextField(null=True, blank=True)
    identity_proof_path = models.CharField(max_length=255, null=True, blank=True)
    specialization = models.CharField(max_length=100, null=True, blank=True)
    availability_notes = models.TextField(null=True, blank=True)
    verification_status = models.CharField(
        max_length=20, choices=VerificationStatus.choices, default=VerificationStatus.PENDING
    )
    rejection_reason = models.TextField(null=True, blank=True)
    verified_by_admin = models.ForeignKey(
        'accounts.Administrator', on_delete=models.SET_NULL, null=True, blank=True, db_column='verified_by_admin_id'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'caregivers'

    def __str__(self):
        return f"Caregiver: {self.name}"
