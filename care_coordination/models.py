from django.db import models


class AssignmentStatus(models.TextChoices):
    ACTIVE = 'Active', 'Active'
    ENDED = 'Ended', 'Ended'


class ConsultationStatus(models.TextChoices):
    PENDING = 'Pending', 'Pending'
    ACCEPTED = 'Accepted', 'Accepted'
    SCHEDULED = 'Scheduled', 'Scheduled'
    IN_PROGRESS = 'In Progress', 'In Progress'
    COMPLETED = 'Completed', 'Completed'
    REJECTED = 'Rejected', 'Rejected'
    CANCELLED = 'Cancelled', 'Cancelled'
    RESCHEDULED = 'Rescheduled', 'Rescheduled'
    # Legacy choices for compatibility
    REQUESTED = 'Requested', 'Requested'
    APPROVED = 'Approved', 'Approved'


class ScheduleFrequency(models.TextChoices):
    WEEKLY = 'Weekly', 'Weekly'
    TWICE_WEEKLY = 'TwiceWeekly', 'TwiceWeekly'
    FORTNIGHTLY = 'Fortnightly', 'Fortnightly'
    MONTHLY = 'Monthly', 'Monthly'


class ScheduleStatus(models.TextChoices):
    ACTIVE = 'Active', 'Active'
    MODIFIED = 'Modified', 'Modified'
    ENDED = 'Ended', 'Ended'


class VisitType(models.TextChoices):
    RECURRING = 'Recurring', 'Recurring'
    ADDITIONAL = 'Additional', 'Additional'


class UrgencyLevel(models.TextChoices):
    ROUTINE = 'Routine', 'Routine'
    URGENT = 'Urgent', 'Urgent'
    EMERGENCY = 'Emergency', 'Emergency'


class OccurrenceStatus(models.TextChoices):
    SCHEDULED = 'Scheduled', 'Scheduled'
    COMPLETED = 'Completed', 'Completed'
    SKIPPED = 'Skipped', 'Skipped'
    RESCHEDULED = 'Rescheduled', 'Rescheduled'


class CaregiverPatientAssignment(models.Model):
    assignment_id = models.AutoField(primary_key=True)
    caregiver = models.ForeignKey('accounts.Caregiver', on_delete=models.CASCADE, db_column='caregiver_id')
    patient = models.ForeignKey('accounts.Patient', on_delete=models.CASCADE, db_column='patient_id')
    assigned_by_nurse = models.ForeignKey('accounts.Nurse', on_delete=models.CASCADE, db_column='assigned_by_nurse_id')
    status = models.CharField(
        max_length=10, choices=AssignmentStatus.choices, default=AssignmentStatus.ACTIVE
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'caregiver_patient_assignment'

    def __str__(self):
        return f"Assignment #{self.assignment_id}: Caregiver #{self.caregiver_id} -> Patient #{self.patient_id}"


class TelemedicineConsultation(models.Model):
    consultation_id = models.AutoField(primary_key=True)
    patient = models.ForeignKey('accounts.Patient', on_delete=models.CASCADE, db_column='patient_id')
    doctor = models.ForeignKey('accounts.Doctor', on_delete=models.CASCADE, db_column='doctor_id')
    requested_by = models.ForeignKey('accounts.User', on_delete=models.CASCADE, db_column='requested_by_user_id')
    requested_date = models.DateField(null=True, blank=True)
    requested_time = models.TimeField(null=True, blank=True)
    scheduled_date = models.DateField(null=True, blank=True)
    scheduled_start_time = models.TimeField(null=True, blank=True)
    scheduled_end_time = models.TimeField(null=True, blank=True)
    reason = models.TextField(null=True, blank=True)
    symptoms = models.TextField(null=True, blank=True)
    priority = models.CharField(
        max_length=15, choices=UrgencyLevel.choices, default=UrgencyLevel.ROUTINE
    )
    patient_notes = models.TextField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=ConsultationStatus.choices, default=ConsultationStatus.PENDING
    )
    meeting_link = models.CharField(max_length=255, null=True, blank=True)
    rejection_reason = models.TextField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'telemedicine_consultations'

    def __str__(self):
        return f"Consultation #{self.consultation_id} - Patient #{self.patient_id} with Dr. #{self.doctor_id} ({self.status})"


class TelemedicineConsultationNote(models.Model):
    note_id = models.AutoField(primary_key=True)
    consultation = models.ForeignKey(
        'care_coordination.TelemedicineConsultation', on_delete=models.CASCADE, db_column='consultation_id', related_name='consultation_notes'
    )
    doctor = models.ForeignKey('accounts.Doctor', on_delete=models.CASCADE, db_column='doctor_id')
    patient = models.ForeignKey('accounts.Patient', on_delete=models.CASCADE, db_column='patient_id')
    symptoms_discussed = models.TextField(null=True, blank=True)
    clinical_observations = models.TextField(null=True, blank=True)
    advice = models.TextField(null=True, blank=True)
    recommendations = models.TextField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'telemedicine_consultation_notes'

    def __str__(self):
        return f"Note #{self.note_id} for Consultation #{self.consultation_id}"


class TelemedicineFollowUp(models.Model):
    followup_id = models.AutoField(primary_key=True)
    original_consultation = models.ForeignKey(
        'care_coordination.TelemedicineConsultation', on_delete=models.CASCADE, db_column='original_consultation_id', related_name='followups'
    )
    patient = models.ForeignKey('accounts.Patient', on_delete=models.CASCADE, db_column='patient_id')
    doctor = models.ForeignKey('accounts.Doctor', on_delete=models.CASCADE, db_column='doctor_id')
    followup_date = models.DateField()
    followup_time = models.TimeField()
    reason = models.TextField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    followup_type = models.CharField(max_length=50, default='Telemedicine')
    status = models.CharField(
        max_length=20, choices=ConsultationStatus.choices, default=ConsultationStatus.SCHEDULED
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'telemedicine_followups'

    def __str__(self):
        return f"FollowUp #{self.followup_id} for Consultation #{self.original_consultation_id} on {self.followup_date}"


class HomeVisitSchedule(models.Model):
    schedule_id = models.AutoField(primary_key=True)
    patient = models.ForeignKey('accounts.Patient', on_delete=models.CASCADE, db_column='patient_id')
    doctor = models.ForeignKey('accounts.Doctor', on_delete=models.CASCADE, db_column='doctor_id')
    frequency = models.CharField(max_length=20, choices=ScheduleFrequency.choices)
    start_date = models.DateField()
    status = models.CharField(
        max_length=20, choices=ScheduleStatus.choices, default=ScheduleStatus.ACTIVE
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'home_visit_schedules'

    def __str__(self):
        return f"Schedule #{self.schedule_id} - {self.frequency}"


class HomeVisitOccurrence(models.Model):
    occurrence_id = models.AutoField(primary_key=True)
    schedule = models.ForeignKey(
        'care_coordination.HomeVisitSchedule', on_delete=models.CASCADE, null=True, blank=True, db_column='schedule_id'
    )
    patient = models.ForeignKey('accounts.Patient', on_delete=models.CASCADE, db_column='patient_id')
    scheduled_date = models.DateField()
    visit_type = models.CharField(max_length=15, choices=VisitType.choices)
    urgency_level = models.CharField(
        max_length=15, choices=UrgencyLevel.choices, null=True, blank=True
    )
    status = models.CharField(
        max_length=15, choices=OccurrenceStatus.choices, default=OccurrenceStatus.SCHEDULED
    )
    requested_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True, db_column='requested_by_user_id'
    )
    approved_by_nurse = models.ForeignKey(
        'accounts.Nurse', on_delete=models.SET_NULL, null=True, blank=True, db_column='approved_by_nurse_id', related_name='approved_occurrences'
    )
    allocated_nurse = models.ForeignKey(
        'accounts.Nurse', on_delete=models.SET_NULL, null=True, blank=True, db_column='allocated_nurse_id', related_name='allocated_occurrences'
    )
    notes = models.TextField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'home_visit_occurrences'

    def __str__(self):
        return f"Visit #{self.occurrence_id} on {self.scheduled_date} ({self.status})"


class HomeVisitSummary(models.Model):
    summary_id = models.AutoField(primary_key=True)
    occurrence = models.OneToOneField(
        'care_coordination.HomeVisitOccurrence', on_delete=models.CASCADE, db_column='occurrence_id'
    )
    nurse = models.ForeignKey('accounts.Nurse', on_delete=models.CASCADE, db_column='nurse_id')
    blood_pressure = models.CharField(max_length=15, null=True, blank=True)
    pulse = models.IntegerField(null=True, blank=True)
    temperature = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    oxygen_level = models.IntegerField(null=True, blank=True)
    treatment_notes = models.TextField(null=True, blank=True)
    next_visit_recommendation = models.DateField(null=True, blank=True)
    recorded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'home_visit_summaries'

    def __str__(self):
        return f"Summary #{self.summary_id} for Visit #{self.occurrence_id}"


class VisitSymptom(models.Model):
    symptom_id = models.AutoField(primary_key=True)
    summary = models.ForeignKey(
        'care_coordination.HomeVisitSummary', on_delete=models.CASCADE, db_column='summary_id'
    )
    symptom_name = models.CharField(max_length=100)
    severity = models.CharField(max_length=20, null=True, blank=True)

    class Meta:
        db_table = 'visit_symptoms'

    def __str__(self):
        return f"{self.symptom_name} ({self.severity})"
