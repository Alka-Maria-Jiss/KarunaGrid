# Generated for KarunaGrid Home Visit Team Module

import django.db.models.deletion
from django.db import migrations, models


def preserve_schedules_and_assign_nurse(apps, schema_editor):
    HomeVisitSchedule = apps.get_model('care_coordination', 'HomeVisitSchedule')
    Nurse = apps.get_model('accounts', 'Nurse')

    # If existing schedules exist, assign them to a valid active/approved Nurse rather than blindly mapping doctor_id
    if HomeVisitSchedule.objects.exists():
        fallback_nurse = Nurse.objects.filter(verification_status='Approved').first() or Nurse.objects.first()
        if fallback_nurse:
            HomeVisitSchedule.objects.filter(nurse__isnull=True).update(nurse=fallback_nurse)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_patientregistrationapplication'),
        ('care_coordination', '0002_remove_telemedicineconsultation_requested_datetime_and_more'),
    ]

    operations = [
        # Step 1: Add new nurse FK as nullable first
        migrations.AddField(
            model_name='homevisitschedule',
            name='nurse',
            field=models.ForeignKey(
                blank=True,
                null=True,
                db_column='nurse_id',
                on_delete=django.db.models.deletion.CASCADE,
                to='accounts.nurse',
            ),
        ),
        # Step 2: Safely populate nurse FK without blindly casting doctor_id to nurse_id
        migrations.RunPython(preserve_schedules_and_assign_nurse, noop_reverse),
        # Step 3: Remove old doctor FK safely after data handling
        migrations.RemoveField(
            model_name='homevisitschedule',
            name='doctor',
        ),
        # Step 4: Alter nurse FK to non-nullable
        migrations.AlterField(
            model_name='homevisitschedule',
            name='nurse',
            field=models.ForeignKey(
                db_column='nurse_id',
                on_delete=django.db.models.deletion.CASCADE,
                to='accounts.nurse',
            ),
        ),
        # Step 5: Add visiting_doctor FK to HomeVisitOccurrence
        migrations.AddField(
            model_name='homevisitoccurrence',
            name='visiting_doctor',
            field=models.ForeignKey(
                blank=True,
                db_column='visiting_doctor_id',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='visiting_occurrences',
                to='accounts.doctor',
            ),
        ),
    ]
