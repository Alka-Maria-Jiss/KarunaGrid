import os
import uuid
from django.db import transaction
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.files.storage import default_storage
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from rest_framework import serializers

from .models import (
    User,
    Patient,
    PatientRegistrationApplication,
    Caregiver,
    Doctor,
    Nurse,
    Administrator,
    Role,
    RegistrationStatus,
    VerificationStatus,
    PatientStatus,
)


import re
from datetime import date, timedelta
from django.core.validators import RegexValidator

phone_validator = RegexValidator(
    regex=r'^\d{10}$',
    message='Phone number must be a valid 10-digit number.'
)
pincode_validator = RegexValidator(
    regex=r'^\d{6}$',
    message='Pincode must be a valid 6-digit number.'
)


def validate_uploaded_document_file(file_obj):
    if not file_obj:
        raise serializers.ValidationError("Document file is required.")

    # 1. File size check (max 5MB)
    max_size = 5 * 1024 * 1024
    if file_obj.size > max_size:
        raise serializers.ValidationError("File size exceeds maximum limit of 5MB.")

    # 2. Extension check
    ext = os.path.splitext(file_obj.name)[1].lower()
    valid_extensions = ['.pdf', '.jpg', '.jpeg', '.png']
    if ext not in valid_extensions:
        raise serializers.ValidationError("Unsupported file format. Please upload a PDF, JPG, or PNG file.")

    # 3. Magic byte content verification
    initial_pos = file_obj.tell() if hasattr(file_obj, 'tell') else 0
    header_bytes = file_obj.read(16)
    if hasattr(file_obj, 'seek'):
        file_obj.seek(initial_pos)

    is_valid_content = False
    if ext == '.pdf':
        if header_bytes.startswith(b'%PDF'):
            is_valid_content = True
    elif ext in ['.jpg', '.jpeg']:
        if header_bytes.startswith(b'\xff\xd8\xff'):
            is_valid_content = True
    elif ext == '.png':
        if header_bytes.startswith(b'\x89PNG\r\n\x1a\n'):
            is_valid_content = True

    if not is_valid_content:
        raise serializers.ValidationError(
            f"File content signature does not match the '{ext}' extension. Please upload a valid, uncorrupted document."
        )

    return file_obj


def validate_patient_registration_email(email):
    """
    Validates patient registration email according to the 3 business rules:
    RULE 1: Email already exists in User -> BLOCK
    RULE 2: Email has a Pending application -> BLOCK
    RULE 3: Email has only Rejected applications -> ALLOW (creates new row)
    """
    clean_email = str(email).strip().lower()

    # RULE 1: Email already exists in User
    if User.objects.filter(email__iexact=clean_email).exists():
        raise serializers.ValidationError(
            "An account already exists with this email address. Please log in instead."
        )

    # RULE 2: Email has a pending application
    if PatientRegistrationApplication.objects.filter(
        email__iexact=clean_email,
        registration_status=RegistrationStatus.PENDING
    ).exists():
        raise serializers.ValidationError(
            "You already have a pending registration application. Please wait for the Doctor's review."
        )

    # RULE 3: Rejected applications -> ALLOW clean new reapplication row
    return clean_email


def handle_reapplication_if_rejected(email):
    """
    Caregiver re-application handling.
    """
    existing_user = User.objects.filter(email__iexact=email).first()
    if not existing_user:
        return

    is_rejected = False
    if existing_user.role == Role.CAREGIVER and hasattr(existing_user, 'caregiver'):
        if existing_user.caregiver.verification_status == VerificationStatus.REJECTED:
            is_rejected = True
    elif existing_user.role == Role.DOCTOR and hasattr(existing_user, 'doctor'):
        if existing_user.doctor.verification_status == VerificationStatus.REJECTED:
            is_rejected = True
    elif existing_user.role == Role.NURSE and hasattr(existing_user, 'nurse'):
        if existing_user.nurse.verification_status == VerificationStatus.REJECTED:
            is_rejected = True

    if is_rejected:
        existing_user.delete()
    else:
        raise serializers.ValidationError({"email": ["This email is already registered."]})


class PatientRegisterSerializer(serializers.Serializer):
    # Required at registration
    name = serializers.CharField(max_length=100, required=True)
    email = serializers.EmailField(max_length=150, required=True)
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    confirm_password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    dob = serializers.DateField(required=True)
    phone = serializers.CharField(max_length=15, required=True, validators=[phone_validator])
    house_name = serializers.CharField(max_length=50, required=True)
    place = serializers.CharField(max_length=50, required=True)
    panchayath = serializers.CharField(max_length=50, required=True)
    ward_no = serializers.IntegerField(required=True)
    pincode = serializers.CharField(max_length=50, required=True, validators=[pincode_validator])
    discharge_summary = serializers.FileField(required=True)

    # Optional at registration
    gender = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    emergency_contact_name = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    emergency_contact_phone = serializers.CharField(max_length=15, required=False, allow_blank=True, default='')

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate_email(self, value):
        return validate_patient_registration_email(value)

    def validate_dob(self, value):
        if not value:
            raise serializers.ValidationError("Date of birth is required.")
        today = date.today()
        if value >= today:
            raise serializers.ValidationError("Date of birth must be a past date.")
        max_age_cutoff = today - timedelta(days=120 * 365.25)
        if value < max_age_cutoff:
            raise serializers.ValidationError("Please provide a valid date of birth (age cannot exceed 120 years).")
        return value

    def validate_ward_no(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("Ward number must be a positive integer.")
        return value

    def validate_emergency_contact_phone(self, value):
        if value:
            clean_val = str(value).strip()
            if clean_val and not re.match(r'^\d{10}$', clean_val):
                raise serializers.ValidationError("Emergency contact phone number must be a valid 10-digit number.")
        return value

    def validate_discharge_summary(self, file_obj):
        return validate_uploaded_document_file(file_obj)

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"confirm_password": ["Passwords do not match."]})
        return attrs

    def create(self, validated_data):
        email = validated_data['email'].strip().lower()
        password = validated_data['password']
        discharge_file = validated_data['discharge_summary']

        # Save discharge summary file with distinct UUID filename to avoid overwrites
        file_ext = os.path.splitext(discharge_file.name)[1].lower()
        filename = f"discharge_summaries/{uuid.uuid4().hex}{file_ext}"
        saved_path = default_storage.save(filename, discharge_file)

        # Generate unique application ID (e.g. APP-2026-A1B2C3)
        year = timezone.now().year
        app_id = f"APP-{year}-{uuid.uuid4().hex[:6].upper()}"

        # Hash temporary password
        password_hash = make_password(password)

        # Create PatientRegistrationApplication (NO User, NO Patient created)
        application = PatientRegistrationApplication.objects.create(
            application_id=app_id,
            name=validated_data['name'].strip(),
            email=email,
            password_hash=password_hash,
            dob=validated_data['dob'],
            gender=validated_data.get('gender', '').strip(),
            phone=validated_data['phone'].strip(),
            house_name=validated_data['house_name'].strip(),
            place=validated_data['place'].strip(),
            panchayath=validated_data['panchayath'].strip(),
            ward_no=validated_data['ward_no'],
            pincode=validated_data['pincode'].strip(),
            discharge_summary_path=saved_path,
            emergency_contact_name=validated_data.get('emergency_contact_name', '').strip(),
            emergency_contact_phone=validated_data.get('emergency_contact_phone', '').strip(),
            registration_status=RegistrationStatus.PENDING,
        )

        return application


class CaregiverRegisterSerializer(serializers.Serializer):
    # Required at registration
    name = serializers.CharField(max_length=100, required=True)
    email = serializers.EmailField(max_length=150, required=True)
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    confirm_password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    phone = serializers.CharField(max_length=15, required=True, validators=[phone_validator])
    house_name = serializers.CharField(max_length=50, required=True)
    place = serializers.CharField(max_length=50, required=True)
    panchayath = serializers.CharField(max_length=50, required=True)
    ward_no = serializers.IntegerField(required=True)
    pincode = serializers.CharField(max_length=50, required=True, validators=[pincode_validator])
    identity_proof = serializers.FileField(required=True)

    # Optional at registration
    qualifications = serializers.CharField(required=False, allow_blank=True, default='')
    certifications = serializers.CharField(required=False, allow_blank=True, default='')
    specialization = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    availability_notes = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate_email(self, value):
        handle_reapplication_if_rejected(value)
        return value

    def validate_ward_no(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError("Ward number must be a positive integer.")
        return value

    def validate_identity_proof(self, file_obj):
        return validate_uploaded_document_file(file_obj)

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"confirm_password": ["Passwords do not match."]})
        return attrs

    def create(self, validated_data):
        email = validated_data['email']
        password = validated_data['password']
        identity_file = validated_data['identity_proof']

        # Save identity proof file
        file_ext = os.path.splitext(identity_file.name)[1].lower()
        filename = f"identity_proofs/{uuid.uuid4().hex}{file_ext}"
        saved_path = default_storage.save(filename, identity_file)

        with transaction.atomic():
            # Create User
            user = User.objects.create_user(
                email=email,
                password=password,
                role=Role.CAREGIVER,
                is_active=True,
            )

            # Create Caregiver profile
            caregiver = Caregiver.objects.create(
                user=user,
                name=validated_data['name'],
                phone=validated_data['phone'],
                house_name=validated_data['house_name'],
                place=validated_data['place'],
                panchayath=validated_data['panchayath'],
                ward_no=validated_data['ward_no'],
                pincode=validated_data['pincode'],
                identity_proof_path=saved_path,
                qualifications=validated_data.get('qualifications', ''),
                certifications=validated_data.get('certifications', ''),
                specialization=validated_data.get('specialization', ''),
                availability_notes=validated_data.get('availability_notes', ''),
                verification_status=VerificationStatus.PENDING,
            )

        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        user = authenticate(username=email, password=password)
        if not user:
            # Check if user exists to give accurate error message if inactive/bad password
            user_obj = User.objects.filter(email__iexact=email).first()
            if user_obj and user_obj.check_password(password):
                user = user_obj
            else:
                raise serializers.ValidationError({"non_field_errors": ["Invalid email or password."]})

        attrs['user'] = user
        return attrs


class PendingPatientSerializer(serializers.ModelSerializer):
    patient_id = serializers.IntegerField(source='id', read_only=True)
    registration_id = serializers.CharField(source='application_id', read_only=True)
    discharge_summary_url = serializers.SerializerMethodField()

    class Meta:
        model = PatientRegistrationApplication
        fields = (
            'id', 'patient_id', 'application_id', 'registration_id', 'name', 'email', 'dob', 'gender', 'phone',
            'house_name', 'place', 'panchayath', 'ward_no', 'pincode',
            'discharge_summary_path', 'discharge_summary_url',
            'emergency_contact_name', 'emergency_contact_phone',
            'registration_status', 'rejection_reason', 'created_at'
        )

    def get_discharge_summary_url(self, obj):
        if obj.discharge_summary_path:
            return f"/api/auth/documents/view/?type=patient_discharge_summary&id={obj.id}"
        return None


class PublicApplicationStatusSerializer(serializers.Serializer):
    application_id = serializers.CharField(required=True, max_length=50)
    email = serializers.EmailField(required=True, max_length=150)

    def validate(self, attrs):
        app_id = str(attrs.get('application_id', '')).strip()
        email = str(attrs.get('email', '')).strip().lower()

        application = PatientRegistrationApplication.objects.filter(
            application_id__iexact=app_id,
            email__iexact=email
        ).first()

        if not application:
            raise serializers.ValidationError(
                "We could not find an application matching the provided details."
            )

        attrs['application'] = application
        return attrs


class PendingCaregiverSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    identity_proof_url = serializers.SerializerMethodField()

    class Meta:
        model = Caregiver
        fields = (
            'caregiver_id', 'name', 'email', 'phone',
            'house_name', 'place', 'panchayath', 'ward_no', 'pincode',
            'identity_proof_path', 'identity_proof_url',
            'qualifications', 'certifications', 'specialization', 'availability_notes',
            'verification_status', 'rejection_reason', 'created_at'
        )

    def get_identity_proof_url(self, obj):
        if obj.identity_proof_path:
            return f"/api/auth/documents/view/?type=caregiver_identity_proof&id={obj.caregiver_id}"
        return None


class AdminStaffCreateSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=['doctor', 'nurse'], required=True)
    name = serializers.CharField(max_length=100, required=True)
    email = serializers.EmailField(max_length=150, required=True)
    password = serializers.CharField(write_only=True, required=True)
    phone = serializers.CharField(max_length=15, required=False, allow_blank=True, default='')
    gender = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    date_of_birth = serializers.DateField(required=False, allow_null=True, default=None)
    qualification = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')
    experience = serializers.IntegerField(required=False, default=0, min_value=0)
    specialization = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    service_area = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def create(self, validated_data):
        role_choice = validated_data['role'].lower()
        email = validated_data['email']
        password = validated_data['password']

        with transaction.atomic():
            if role_choice == 'doctor':
                user = User.objects.create_user(
                    email=email,
                    password=password,
                    role=Role.DOCTOR,
                    is_active=True
                )
                doctor = Doctor.objects.create(
                    user=user,
                    name=validated_data['name'],
                    phone=validated_data['phone'],
                    gender=validated_data.get('gender', ''),
                    date_of_birth=validated_data.get('date_of_birth'),
                    qualification=validated_data.get('qualification', ''),
                    experience=validated_data.get('experience', 0),
                    specialization=validated_data.get('specialization', ''),
                    service_area=validated_data.get('service_area', ''),
                    verification_status=VerificationStatus.APPROVED,
                    is_available_now=True
                )
            else:
                user = User.objects.create_user(
                    email=email,
                    password=password,
                    role=Role.NURSE,
                    is_active=True
                )
                nurse = Nurse.objects.create(
                    user=user,
                    name=validated_data['name'],
                    phone=validated_data['phone'],
                    gender=validated_data.get('gender', ''),
                    date_of_birth=validated_data.get('date_of_birth'),
                    qualification=validated_data.get('qualification', ''),
                    experience=validated_data.get('experience', 0),
                    specialization=validated_data.get('specialization', ''),
                    service_area=validated_data.get('service_area', ''),
                    verification_status=VerificationStatus.APPROVED,
                    is_available_now=True
                )
        return user


class AdminOnboardDoctorSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100, required=True)
    email = serializers.EmailField(max_length=150, required=True)
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    specialization = serializers.CharField(max_length=100, required=False, allow_blank=True, default='Palliative Medicine')
    phone = serializers.CharField(max_length=15, required=False, allow_blank=True, default='')
    service_area = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    gender = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    date_of_birth = serializers.DateField(required=False, allow_null=True, default=None)
    qualification = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')
    experience = serializers.IntegerField(required=False, default=0, min_value=0)

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def create(self, validated_data):
        email = validated_data['email']
        password = validated_data['password']

        with transaction.atomic():
            user = User.objects.create_user(
                email=email,
                password=password,
                role=Role.DOCTOR,
                is_active=True
            )
            doctor = Doctor.objects.create(
                user=user,
                name=validated_data['name'],
                specialization=validated_data['specialization'],
                service_area=validated_data['service_area'],
                phone=validated_data['phone'],
                gender=validated_data.get('gender', ''),
                date_of_birth=validated_data.get('date_of_birth'),
                qualification=validated_data.get('qualification', ''),
                experience=validated_data.get('experience', 0),
                verification_status=VerificationStatus.APPROVED,
                is_available_now=True
            )
        return user


class AdminOnboardNurseSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100, required=True)
    email = serializers.EmailField(max_length=150, required=True)
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    phone = serializers.CharField(max_length=15, required=False, allow_blank=True, default='')
    service_area = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    specialization = serializers.CharField(max_length=100, required=False, allow_blank=True, default='Palliative Nursing')
    gender = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    date_of_birth = serializers.DateField(required=False, allow_null=True, default=None)
    qualification = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')
    experience = serializers.IntegerField(required=False, default=0, min_value=0)

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def create(self, validated_data):
        email = validated_data['email']
        password = validated_data['password']

        with transaction.atomic():
            user = User.objects.create_user(
                email=email,
                password=password,
                role=Role.NURSE,
                is_active=True
            )
            nurse = Nurse.objects.create(
                user=user,
                name=validated_data['name'],
                service_area=validated_data['service_area'],
                phone=validated_data['phone'],
                gender=validated_data.get('gender', ''),
                date_of_birth=validated_data.get('date_of_birth'),
                qualification=validated_data.get('qualification', ''),
                experience=validated_data.get('experience', 0),
                specialization=validated_data.get('specialization', ''),
                verification_status=VerificationStatus.APPROVED,
                is_available_now=True
            )
        return user
