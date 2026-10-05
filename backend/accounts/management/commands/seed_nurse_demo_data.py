import os
from datetime import datetime, timedelta, date
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from accounts.models import (
    User, Role, RegistrationStatus, VerificationStatus,
    Patient, Doctor, Nurse, Caregiver
)
from care_coordination.models import (
    HomeVisitSchedule, HomeVisitOccurrence, HomeVisitSummary,
    VisitSymptom, CaregiverPatientAssignment,
    ScheduleFrequency, ScheduleStatus, VisitType, OccurrenceStatus, AssignmentStatus, UrgencyLevel
)
from medical_records.models import (
    PatientDiagnosis, PatientAllergy, PatientChronicCondition,
    Prescription, PrescriptionItem, LabReport, ReviewStatus, ActiveSupersededStatus
)
from notifications.models import Notification


class Command(BaseCommand):
    help = "Seed realistic demo palliative-care patients, visits, allocations, and requests for Nurse Dashboard."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Seeding Nurse Dashboard Phase 1 demo data..."))

        with transaction.atomic():
            # 1. Ensure Demo Nurses exist
            nurse_data = [
                {
                    "email": "binumathew@karunagrid.org",
                    "name": "Binu Mathew",
                    "phone": "9847123456",
                    "service_area": "Kottayam & Pala",
                    "panchayath": "Pala",
                    "is_available_now": True,
                },
                {
                    "email": "ericjohn@karunagrid.org",
                    "name": "Eric John",
                    "phone": "9847654321",
                    "service_area": "Changanassery & Erattupetta",
                    "panchayath": "Changanassery",
                    "is_available_now": True,
                }
            ]

            nurses = []
            for nd in nurse_data:
                u, _ = User.objects.get_or_create(
                    email=nd["email"],
                    defaults={"role": Role.NURSE, "is_active": True}
                )
                u.set_password("Nurse@123")
                u.role = Role.NURSE
                u.is_active = True
                u.save()

                n, _ = Nurse.objects.get_or_create(
                    user=u,
                    defaults={
                        "name": nd["name"],
                        "phone": nd["phone"],
                        "service_area": nd["service_area"],
                        "is_available_now": nd["is_available_now"],
                        "verification_status": VerificationStatus.APPROVED
                    }
                )
                n.name = nd["name"]
                n.is_available_now = nd["is_available_now"]
                n.verification_status = VerificationStatus.APPROVED
                n.save()
                nurses.append(n)

            primary_nurse = nurses[0] # Binu Mathew
            secondary_nurse = nurses[1] # Eric John

            # 2. Ensure a supervising Doctor exists
            doc_user, _ = User.objects.get_or_create(
                email="doctor@karunagrid.org",
                defaults={"role": Role.DOCTOR, "is_active": True}
            )
            doc_user.set_password("Doctor@123")
            doc_user.save()

            doctor, _ = Doctor.objects.get_or_create(
                user=doc_user,
                defaults={
                    "name": "Dr. Abraham Mathew",
                    "specialization": "Palliative Medicine Specialist",
                    "service_area": "Central Kerala",
                    "phone": "9447112233",
                    "verification_status": VerificationStatus.APPROVED
                }
            )

            # 3. Ensure Verified Caregivers exist
            caregiver_info = [
                {"email": "mary.caregiver@karunagrid.org", "name": "Marykutty Thomas", "phone": "9847111222", "specialization": "Certified Palliative Aide", "place": "Pala"},
                {"email": "varghese.caregiver@karunagrid.org", "name": "Varghese Paul", "phone": "9847333444", "specialization": "Community Health Volunteer", "place": "Kottayam"},
            ]
            caregivers = []
            for cg in caregiver_info:
                cgu, _ = User.objects.get_or_create(email=cg["email"], defaults={"role": Role.CAREGIVER, "is_active": True})
                cgu.set_password("Caregiver@123")
                cgu.save()
                cg_obj, _ = Caregiver.objects.get_or_create(
                    user=cgu,
                    defaults={
                        "name": cg["name"],
                        "phone": cg["phone"],
                        "specialization": cg["specialization"],
                        "place": cg["place"],
                        "verification_status": VerificationStatus.APPROVED
                    }
                )
                caregivers.append(cg_obj)

            # 4. Demo Patients (8 realistic fictional patients)
            patients_def = [
                {
                    "reg_id": "KG-PAT-1001",
                    "name": "Rosamma Francis",
                    "dob": date(1958, 4, 12),
                    "gender": "Female",
                    "phone": "9847201001",
                    "house_name": "Karottu House",
                    "place": "Pala",
                    "panchayath": "Pala Municipality",
                    "condition": "Advanced Breast Carcinoma with Bone Metastasis",
                    "allergy": "Penicillin",
                    "chronic": "Hypertension",
                },
                {
                    "reg_id": "KG-PAT-1002",
                    "name": "Joseph Mathew",
                    "dob": date(1954, 8, 25),
                    "gender": "Male",
                    "phone": "9847201002",
                    "house_name": "Plathottam",
                    "place": "Kottayam",
                    "panchayath": "Kottayam Town",
                    "condition": "Chronic Heart Failure (NYHA Class III)",
                    "allergy": "Sulfa drugs",
                    "chronic": "Type 2 Diabetes Mellitus",
                },
                {
                    "reg_id": "KG-PAT-1003",
                    "name": "Annamma Thomas",
                    "dob": date(1962, 2, 18),
                    "gender": "Female",
                    "phone": "9847201003",
                    "house_name": "Kulangara",
                    "place": "Changanassery",
                    "panchayath": "Changanassery Ward 5",
                    "condition": "Advanced COPD with Cor Pulmonale",
                    "allergy": "Aspirin",
                    "chronic": "Severe Bronchial Asthma",
                },
                {
                    "reg_id": "KG-PAT-1004",
                    "name": "Thomas George",
                    "dob": date(1950, 11, 5),
                    "gender": "Male",
                    "phone": "9847201004",
                    "house_name": "Vattakunnel",
                    "place": "Erattupetta",
                    "panchayath": "Erattupetta Block 3",
                    "condition": "Progressive Parkinson's Disease with Dysphagia",
                    "allergy": "No known drug allergies",
                    "chronic": "Ischemic Heart Disease",
                },
                {
                    "reg_id": "KG-PAT-1005",
                    "name": "Marykutty Joseph",
                    "dob": date(1956, 6, 30),
                    "gender": "Female",
                    "phone": "9847201005",
                    "house_name": "Puthuparampil",
                    "place": "Bharananganam",
                    "panchayath": "Bharananganam Ward 2",
                    "condition": "End-Stage Renal Disease (CKD Stage 5)",
                    "allergy": "Iodine contrast",
                    "chronic": "Hypertension & Renal Anemia",
                },
                {
                    "reg_id": "KG-PAT-1006",
                    "name": "Sebastian Varghese",
                    "dob": date(1959, 9, 14),
                    "gender": "Male",
                    "phone": "9847201006",
                    "house_name": "Thekkedathu",
                    "place": "Pala",
                    "panchayath": "Pala Ward 7",
                    "condition": "Colorectal Carcinoma with Peritoneal Spread",
                    "allergy": "Ciprofloxacin",
                    "chronic": "Chronic Intestinal Neuropathy",
                },
                {
                    "reg_id": "KG-PAT-1007",
                    "name": "Lissy Abraham",
                    "dob": date(1965, 1, 20),
                    "gender": "Female",
                    "phone": "9847201007",
                    "house_name": "Maliyekkal",
                    "place": "Kottayam",
                    "panchayath": "Kottayam Ward 11",
                    "condition": "Idiopathic Pulmonary Fibrosis",
                    "allergy": "Codeine",
                    "chronic": "Pulmonary Hypertension",
                },
                {
                    "reg_id": "KG-PAT-1008",
                    "name": "Mathew Kurian",
                    "dob": date(1947, 5, 10),
                    "gender": "Male",
                    "phone": "9847201008",
                    "house_name": "Kalarickal",
                    "place": "Changanassery",
                    "panchayath": "Changanassery Town",
                    "condition": "Severe Aortic Stenosis & Dilated Cardiomyopathy",
                    "allergy": "Metformin",
                    "chronic": "Atrial Fibrillation",
                },
            ]

            created_patients = []
            for pdef in patients_def:
                p_user, _ = User.objects.get_or_create(
                    email=f"{pdef['name'].lower().replace(' ', '.')}@karunagrid.org",
                    defaults={"role": Role.PATIENT, "is_active": True}
                )
                p_user.set_password("Patient@123")
                p_user.save()

                pat, _ = Patient.objects.get_or_create(
                    registration_id=pdef["reg_id"],
                    defaults={
                        "user": p_user,
                        "name": pdef["name"],
                        "dob": pdef["dob"],
                        "gender": pdef["gender"],
                        "phone": pdef["phone"],
                        "house_name": pdef["house_name"],
                        "place": pdef["place"],
                        "panchayath": pdef["panchayath"],
                        "ward_no": 4,
                        "pincode": "686575",
                        "emergency_contact_name": "Family Member",
                        "emergency_contact_phone": "9847999888",
                        "registration_status": RegistrationStatus.APPROVED,
                        "status": "Active",
                    }
                )
                pat.user = p_user
                pat.name = pdef["name"]
                pat.registration_status = RegistrationStatus.APPROVED
                pat.status = "Active"
                pat.save()
                created_patients.append(pat)

                # Clinical profile info (Diagnoses, Allergies, Chronic conditions)
                PatientDiagnosis.objects.get_or_create(
                    patient=pat,
                    diagnosis_text=pdef["condition"],
                    defaults={"doctor": doctor, "diagnosed_date": date(2026, 1, 15)}
                )

                PatientAllergy.objects.get_or_create(
                    patient=pat,
                    allergy_name=pdef["allergy"],
                    defaults={"severity": "Moderate"}
                )

                PatientChronicCondition.objects.get_or_create(
                    patient=pat,
                    condition_name=pdef["chronic"],
                    defaults={"notes": "Regular monitoring required"}
                )

                # Prescriptions (Doctor managed, for nurse reference)
                rx, _ = Prescription.objects.get_or_create(
                    patient=pat,
                    version_number=1,
                    defaults={
                        "doctor": doctor,
                        "status": ActiveSupersededStatus.ACTIVE
                    }
                )
                PrescriptionItem.objects.get_or_create(
                    prescription=rx,
                    medicine_name="Paracetamol",
                    defaults={"dosage": "500mg", "frequency": "TDS PRN", "duration_days": 14}
                )

                # Diagnostic Lab Report
                LabReport.objects.get_or_create(
                    patient=pat,
                    file_path=f"labs/{pdef['reg_id']}_panel.pdf",
                    defaults={
                        "uploaded_by": p_user,
                        "report_date": date(2026, 8, 15),
                        "review_status": ReviewStatus.PENDING,
                        "remarks": "Electrolytes & CBC test panel."
                    }
                )

            # Map patients by name for clarity
            p_map = {p.name: p for p in created_patients}

            today = timezone.now().date()

            # 5. HOME VISITS — UPCOMING ALLOCATED (FOR LOGGED-IN NURSE BINU MATHEW)
            # Ensure at least 3 upcoming visits allocated to Binu Mathew
            allocated_visits_def = [
                {
                    "patient": p_map["Rosamma Francis"],
                    "date": today,
                    "type": VisitType.RECURRING,
                    "urgency": "Urgent",
                    "status": OccurrenceStatus.SCHEDULED,
                    "notes": "Pain assessment and wound dressing check at home.",
                },
                {
                    "patient": p_map["Joseph Mathew"],
                    "date": today,
                    "type": VisitType.RECURRING,
                    "urgency": "Routine",
                    "status": OccurrenceStatus.SCHEDULED,
                    "notes": "Cardiac vitals evaluation and fluid retention inspection.",
                },
                {
                    "patient": p_map["Marykutty Joseph"],
                    "date": today + timedelta(days=1),
                    "type": VisitType.RECURRING,
                    "urgency": "Urgent",
                    "status": OccurrenceStatus.SCHEDULED,
                    "notes": "Renal palliative follow-up, BP & edema check.",
                },
                {
                    "patient": p_map["Mathew Kurian"],
                    "date": today + timedelta(days=3),
                    "type": VisitType.RECURRING,
                    "urgency": "Routine",
                    "status": OccurrenceStatus.SCHEDULED,
                    "notes": "Mobility assistance and caregiver medication routine review.",
                }
            ]

            for av in allocated_visits_def:
                occ, _ = HomeVisitOccurrence.objects.get_or_create(
                    patient=av["patient"],
                    scheduled_date=av["date"],
                    visit_type=av["type"],
                    defaults={
                        "urgency_level": av["urgency"],
                        "status": av["status"],
                        "allocated_nurse": primary_nurse,
                        "notes": av["notes"]
                    }
                )
                occ.allocated_nurse = primary_nurse
                occ.status = av["status"]
                occ.notes = av["notes"]
                occ.save()

            # 6. VISIT ALLOCATIONS QUEUE — AVAILABLE VISITS (UNALLOCATED FOR NURSE SELF-ALLOCATION)
            available_visits_def = [
                {
                    "patient": p_map["Thomas George"],
                    "date": today,
                    "type": VisitType.RECURRING,
                    "urgency": "Routine",
                    "notes": "Dysphagia care advice and mobility support.",
                },
                {
                    "patient": p_map["Lissy Abraham"],
                    "date": today + timedelta(days=1),
                    "type": VisitType.RECURRING,
                    "urgency": "Routine",
                    "notes": "Oxygen saturation monitoring and breathing comfort checks.",
                },
                {
                    "patient": p_map["Rosamma Francis"],
                    "date": today + timedelta(days=4),
                    "type": VisitType.RECURRING,
                    "urgency": "Urgent",
                    "notes": "Weekly palliative nurse round.",
                },
            ]

            for uv in available_visits_def:
                occ, _ = HomeVisitOccurrence.objects.get_or_create(
                    patient=uv["patient"],
                    scheduled_date=uv["date"],
                    visit_type=uv["type"],
                    defaults={
                        "urgency_level": uv["urgency"],
                        "status": OccurrenceStatus.SCHEDULED,
                        "allocated_nurse": None,
                        "notes": uv["notes"]
                    }
                )
                occ.allocated_nurse = None
                occ.status = OccurrenceStatus.SCHEDULED
                occ.notes = uv["notes"]
                occ.save()

            # 7. ADDITIONAL VISIT REQUESTS (PENDING NURSE REVIEW)
            additional_requests_def = [
                {
                    "patient": p_map["Annamma Thomas"],
                    "date": today + timedelta(days=1),
                    "urgency": "Urgent",
                    "reason": "Increased breathing difficulty and weakness.",
                },
                {
                    "patient": p_map["Sebastian Varghese"],
                    "date": today + timedelta(days=2),
                    "urgency": "Urgent",
                    "reason": "Pain management follow-up and dressing renewal.",
                },
                {
                    "patient": p_map["Rosamma Francis"],
                    "date": today + timedelta(days=3),
                    "urgency": "Routine",
                    "reason": "Increased fatigue and symptom monitoring requested by family.",
                },
                {
                    "patient": p_map["Marykutty Joseph"],
                    "date": today + timedelta(days=4),
                    "urgency": "Urgent",
                    "reason": "Follow-up after recent medication adjustment.",
                },
            ]

            for ar in additional_requests_def:
                occ, _ = HomeVisitOccurrence.objects.get_or_create(
                    patient=ar["patient"],
                    scheduled_date=ar["date"],
                    visit_type=VisitType.ADDITIONAL,
                    defaults={
                        "urgency_level": ar["urgency"],
                        "status": OccurrenceStatus.SCHEDULED,
                        "approved_by_nurse": None,
                        "allocated_nurse": None,
                        "notes": ar["reason"]
                    }
                )
                occ.visit_type = VisitType.ADDITIONAL
                occ.approved_by_nurse = None
                occ.allocated_nurse = None
                occ.status = OccurrenceStatus.SCHEDULED
                occ.notes = ar["reason"]
                occ.save()

            # 8. COMPLETED VISITS (WITH FULL CLINICAL VITALS & SYMPTOMS)
            completed_visits_def = [
                {
                    "patient": p_map["Rosamma Francis"],
                    "date": today - timedelta(days=2),
                    "bp": "128/78",
                    "pulse": 76,
                    "temp": 98.2,
                    "spo2": 96,
                    "notes": "Medication adherence reviewed and supportive care advice provided. Patient in good spirits.",
                    "next_rec": today + timedelta(days=5),
                    "symptoms": [("Mild fatigue", "Mild"), ("Back discomfort", "Mild")],
                },
                {
                    "patient": p_map["Joseph Mathew"],
                    "date": today - timedelta(days=3),
                    "bp": "134/82",
                    "pulse": 72,
                    "temp": 98.4,
                    "spo2": 97,
                    "notes": "No pedal edema detected. Dietary salt restriction reinforced.",
                    "next_rec": today + timedelta(days=7),
                    "symptoms": [("Occasional breathlessness", "Mild")],
                },
                {
                    "patient": p_map["Sebastian Varghese"],
                    "date": today - timedelta(days=5),
                    "bp": "118/74",
                    "pulse": 80,
                    "temp": 98.6,
                    "spo2": 98,
                    "notes": "Dressing changed with sterile technique. Analgesic timing confirmed.",
                    "next_rec": today + timedelta(days=2),
                    "symptoms": [("Surgical site tenderness", "Moderate")],
                },
            ]

            for cv in completed_visits_def:
                occ, _ = HomeVisitOccurrence.objects.get_or_create(
                    patient=cv["patient"],
                    scheduled_date=cv["date"],
                    visit_type=VisitType.RECURRING,
                    defaults={
                        "status": OccurrenceStatus.COMPLETED,
                        "allocated_nurse": primary_nurse,
                        "notes": "Completed clinical visit."
                    }
                )
                occ.status = OccurrenceStatus.COMPLETED
                occ.allocated_nurse = primary_nurse
                occ.save()

                summary, _ = HomeVisitSummary.objects.update_or_create(
                    occurrence=occ,
                    defaults={
                        "nurse": primary_nurse,
                        "blood_pressure": cv["bp"],
                        "pulse": cv["pulse"],
                        "temperature": cv["temp"],
                        "oxygen_level": cv["spo2"],
                        "treatment_notes": cv["notes"],
                        "next_visit_recommendation": cv["next_rec"],
                    }
                )

                VisitSymptom.objects.filter(summary=summary).delete()
                for sym_name, sym_sev in cv["symptoms"]:
                    VisitSymptom.objects.create(
                        summary=summary,
                        symptom_name=sym_name,
                        severity=sym_sev
                    )

            # 9. CAREGIVER ASSIGNMENTS
            CaregiverPatientAssignment.objects.get_or_create(
                caregiver=caregivers[0],
                patient=p_map["Rosamma Francis"],
                defaults={
                    "assigned_by_nurse": primary_nurse,
                    "status": AssignmentStatus.ACTIVE
                }
            )
            CaregiverPatientAssignment.objects.get_or_create(
                caregiver=caregivers[1],
                patient=p_map["Joseph Mathew"],
                defaults={
                    "assigned_by_nurse": primary_nurse,
                    "status": AssignmentStatus.ACTIVE
                }
            )

            # 10. NOTIFICATIONS FOR NURSE
            Notification.objects.get_or_create(
                user=primary_nurse.user,
                message="New additional visit request submitted for Annamma Thomas.",
                defaults={"type": "request", "is_read": False}
            )
            Notification.objects.get_or_create(
                user=primary_nurse.user,
                message="Laboratory test results uploaded for Rosamma Francis.",
                defaults={"type": "lab_report", "is_read": False}
            )

        self.stdout.write(self.style.SUCCESS(
            "Successfully seeded Nurse Dashboard demo data!\n"
            f"- 8 Palliative Patients created/verified\n"
            f"- 3 Demo Nurses active (Password: Nurse@123)\n"
            f"- {len(allocated_visits_def)} Upcoming Allocated Visits\n"
            f"- {len(available_visits_def)} Available Visits for Self-Allocation\n"
            f"- {len(additional_requests_def)} Pending Additional Visit Requests\n"
            f"- {len(completed_visits_def)} Completed Visits with Vitals and Symptoms"
        ))
