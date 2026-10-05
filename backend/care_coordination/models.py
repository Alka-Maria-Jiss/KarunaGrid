from django.db import models


class AssignmentStatus(models.TextChoices):
    ACTIVE = 'Active', 'Active'
    COMPLETED = 'Completed', 'Completed'
    ENDED = 'Ended', 'Ended'
    TERMINATED = 'Terminated', 'Terminated'


class CaregiverRequestStatus(models.TextChoices):
    PENDING = 'Pending', 'Pending'
    ACCEPTED = 'Accepted', 'Accepted'
    REJECTED = 'Rejected', 'Rejected'
    CANCELLED = 'Cancelled', 'Cancelled'


class CaregiverRequest(models.Model):
    request_id = models.AutoField(primary_key=True)
    patient = models.ForeignKey('accounts.Patient', on_delete=models.CASCADE, db_column='patient_id', related_name='caregiver_requests')
    caregiver = models.ForeignKey('accounts.Caregiver', on_delete=models.CASCADE, db_column='caregiver_id', related_name='received_requests')
    status = models.CharField(
        max_length=20, choices=CaregiverRequestStatus.choices, default=CaregiverRequestStatus.PENDING
    )
    patient_message = models.TextField(null=True, blank=True)
    response_notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'caregiver_patient_requests'
        ordering = ['-created_at']

    def __str__(self):
        return f"CaregiverRequest #{self.request_id}: Patient #{self.patient_id} -> Caregiver #{self.caregiver_id} ({self.status})"


class CaregiverPatientAssignment(models.Model):
    assignment_id = models.AutoField(primary_key=True)
    caregiver = models.ForeignKey('accounts.Caregiver', on_delete=models.CASCADE, db_column='caregiver_id')
    patient = models.ForeignKey('accounts.Patient', on_delete=models.CASCADE, db_column='patient_id')
    assigned_by_nurse = models.ForeignKey('accounts.Nurse', on_delete=models.SET_NULL, null=True, blank=True, db_column='assigned_by_nurse_id')
    request = models.ForeignKey('care_coordination.CaregiverRequest', on_delete=models.SET_NULL, null=True, blank=True, db_column='request_id')
    status = models.CharField(
        max_length=20, choices=AssignmentStatus.choices, default=AssignmentStatus.ACTIVE
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'caregiver_patient_assignment'
        ordering = ['-assigned_at']

    def __str__(self):
        return f"Assignment #{self.assignment_id}: Caregiver #{self.caregiver_id} -> Patient #{self.patient_id} ({self.status})"


class CaregiverFeedback(models.Model):
    feedback_id = models.AutoField(primary_key=True)
    assignment = models.OneToOneField(
        'care_coordination.CaregiverPatientAssignment', on_delete=models.CASCADE, db_column='assignment_id', related_name='feedback'
    )
    patient = models.ForeignKey('accounts.Patient', on_delete=models.CASCADE, db_column='patient_id', related_name='caregiver_feedbacks')
    caregiver = models.ForeignKey('accounts.Caregiver', on_delete=models.CASCADE, db_column='caregiver_id', related_name='patient_feedbacks')
    rating = models.PositiveSmallIntegerField(default=5)
    comment = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'caregiver_feedbacks'
        ordering = ['-created_at']

    def __str__(self):
        return f"Feedback #{self.feedback_id} - {self.rating}★ for Caregiver #{self.caregiver_id}"


class ComplaintStatus(models.TextChoices):
    OPEN = 'Open', 'Open'
    IN_REVIEW = 'In Review', 'In Review'
    RESOLVED = 'Resolved', 'Resolved'


class ComplaintCategory(models.TextChoices):
    PATIENT_RELATED = 'Patient-related', 'Patient-related'
    SCHEDULE_RELATED = 'Schedule-related', 'Schedule-related'
    SAFETY_CONCERN = 'Safety concern', 'Safety concern'
    ADMINISTRATIVE = 'Payment / Administrative', 'Payment / Administrative'
    TECHNICAL_ISSUE = 'Technical issue', 'Technical issue'
    OTHER = 'Other', 'Other'


class CaregiverComplaint(models.Model):
    complaint_id = models.AutoField(primary_key=True)
    caregiver = models.ForeignKey('accounts.Caregiver', on_delete=models.CASCADE, db_column='caregiver_id', related_name='complaints')
    subject = models.CharField(max_length=200)
    category = models.CharField(max_length=50, choices=ComplaintCategory.choices, default=ComplaintCategory.OTHER)
    description = models.TextField()
    attachment_path = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(max_length=20, choices=ComplaintStatus.choices, default=ComplaintStatus.OPEN)
    resolution_notes = models.TextField(null=True, blank=True)
    resolved_by_nurse = models.ForeignKey('accounts.Nurse', on_delete=models.SET_NULL, null=True, blank=True, db_column='resolved_by_nurse_id')
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'caregiver_complaints'
        ordering = ['-created_at']

    def __str__(self):
        return f"Complaint #{self.complaint_id}: {self.subject} ({self.status})"


class ConsultationStatus(models.TextChoices):
    PENDING = 'Pending', 'Pending'
    ACCEPTED = 'Accepted', 'Accepted'
    SCHEDULED = 'Scheduled', 'Scheduled'
    IN_PROGRESS = 'In Progress', 'In Progress'
    COMPLETED = 'Completed', 'Completed'
    REJECTED = 'Rejected', 'Rejected'
    CANCELLED = 'Cancelled', 'Cancelled'
    RESCHEDULED = 'Rescheduled', 'Rescheduled'
    REQUESTED = 'Requested', 'Requested'
    APPROVED = 'Approved', 'Approved'


class ScheduleFrequency(models.TextChoices):
    EVERY_DAY = 'Every Day', 'Every Day'
    DAILY = 'Daily', 'Daily'
    WEEKLY = 'Weekly', 'Weekly'
    TWICE_WEEKLY = 'TwiceWeekly', 'TwiceWeekly'
    EVERY_2_WEEKS = 'Every 2 Weeks', 'Every 2 Weeks'
    FORTNIGHTLY = 'Fortnightly', 'Fortnightly'
    MONTHLY = 'Monthly', 'Monthly'
    CUSTOM = 'Custom', 'Custom'


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
    nurse = models.ForeignKey('accounts.Nurse', on_delete=models.CASCADE, db_column='nurse_id')
    frequency = models.CharField(max_length=30, choices=ScheduleFrequency.choices)
    custom_days = models.JSONField(default=list, blank=True, null=True)
    start_date = models.DateField()
    status = models.CharField(
        max_length=20, choices=ScheduleStatus.choices, default=ScheduleStatus.ACTIVE
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'home_visit_schedules'

    def __str__(self):
        return f"Schedule #{self.schedule_id} - {self.frequency} (Nurse #{self.nurse_id})"


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
    visiting_doctor = models.ForeignKey(
        'accounts.Doctor', on_delete=models.SET_NULL, null=True, blank=True, db_column='visiting_doctor_id', related_name='visiting_occurrences'
    )
    is_doctor_customized = models.BooleanField(default=False)
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
