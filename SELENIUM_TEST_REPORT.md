# KarunaGrid Automated Selenium E2E Test Report

**Date:** 2026-10-05  
**Project:** KarunaGrid Healthcare & Palliative Care Network  
**Test Framework:** Python `unittest` + `selenium` (Chrome Headless)  
**Target Environment:** Local Full-Stack (`Frontend: http://localhost:5173` | `Backend: http://127.0.0.1:8000`)  
**Test Suite Directory:** `tests/selenium/`  

---

## 📊 1. Executive Summary

| Metric | Details | Status |
| :--- | :--- | :--- |
| **Total Test Cases** | **61** | 🟢 Complete |
| **Passed Test Cases** | **61** | 🟢 **100% PASS** |
| **Failed / Errored** | **0** | 🟢 **0%** |
| **Skipped** | **0** | — |
| **Total Execution Time** | **~78.4s** | Fast E2E Execution |
| **Browser Engine** | Google Chrome Headless (1440x900) | Standardized |

---

## 🏗️ 2. Test Suite Architecture & Module Breakdown

| Module File | Functional Area | Tests | Passed | Failed | Status |
| :--- | :--- | :---: | :---: | :---: | :---: |
| [`test_authentication.py`](file:///c:/SEM%203/PROJECT/KarunaGrid/tests/selenium/test_authentication.py) | Authentication, Registration & Password Lifecycle | 10 | 10 | 0 | 🟢 **PASS** |
| [`test_admin.py`](file:///c:/SEM%203/PROJECT/KarunaGrid/tests/selenium/test_admin.py) | Administrator Portal, Approvals & Operations | 8 | 8 | 0 | 🟢 **PASS** |
| [`test_doctor.py`](file:///c:/SEM%203/PROJECT/KarunaGrid/tests/selenium/test_doctor.py) | Doctor Clinical Workspace & Review Flow | 5 | 5 | 0 | 🟢 **PASS** |
| [`test_nurse.py`](file:///c:/SEM%203/PROJECT/KarunaGrid/tests/selenium/test_nurse.py) | Nurse Portal & Care Coordination | 6 | 6 | 0 | 🟢 **PASS** |
| [`test_caregiver.py`](file:///c:/SEM%203/PROJECT/KarunaGrid/tests/selenium/test_caregiver.py) | Caregiver Portal & Patient Support | 4 | 4 | 0 | 🟢 **PASS** |
| [`test_patient.py`](file:///c:/SEM%203/PROJECT/KarunaGrid/tests/selenium/test_patient.py) | Patient Portal, Medical Records & Services | 9 | 9 | 0 | 🟢 **PASS** |
| [`test_home_visits.py`](file:///c:/SEM%203/PROJECT/KarunaGrid/tests/selenium/test_home_visits.py) | Shared Nurse Team Visits & Direct Completion | 3 | 3 | 0 | 🟢 **PASS** |
| [`test_telemedicine.py`](file:///c:/SEM%203/PROJECT/KarunaGrid/tests/selenium/test_telemedicine.py) | Telemedicine Consultations & Queue | 2 | 2 | 0 | 🟢 **PASS** |
| [`test_equipment.py`](file:///c:/SEM%203/PROJECT/KarunaGrid/tests/selenium/test_equipment.py) | Medical Equipment Catalog & Requests | 2 | 2 | 0 | 🟢 **PASS** |
| [`test_welfare.py`](file:///c:/SEM%203/PROJECT/KarunaGrid/tests/selenium/test_welfare.py) | Welfare Schemes Publishing & Redirection | 2 | 2 | 0 | 🟢 **PASS** |
| [`test_notifications.py`](file:///c:/SEM%203/PROJECT/KarunaGrid/tests/selenium/test_notifications.py) | Real-time System & Alert Notifications | 1 | 1 | 0 | 🟢 **PASS** |
| [`test_profiles.py`](file:///c:/SEM%203/PROJECT/KarunaGrid/tests/selenium/test_profiles.py) | User Profile Views across All Roles | 4 | 4 | 0 | 🟢 **PASS** |
| [`test_security_authorization.py`](file:///c:/SEM%203/PROJECT/KarunaGrid/tests/selenium/test_security_authorization.py) | RBAC Guardrails & Route Redirection Security | 5 | 5 | 0 | 🟢 **PASS** |
| **TOTAL** | **13 Test Modules** | **61** | **61** | **0** | 🟢 **100% PASS** |

---

## 🧪 3. Detailed Test Cases, Steps & Results

### 3.1 Authentication & Account Lifecycle (`test_authentication.py`)

| # | Test Case ID / Method | Description & Test Steps | Expected Result | Status |
|---|---|---|---|:---:|
| 1 | `test_01_valid_admin_login_and_redirect` | Submit valid Admin credentials via `/login` UI form | Redirects to `/dashboard/admin`, JWT stored | 🟢 **PASS** |
| 2 | `test_02_valid_doctor_login_and_redirect` | Submit valid Doctor credentials via `/login` UI form | Redirects to `/dashboard/doctor`, JWT stored | 🟢 **PASS** |
| 3 | `test_03_valid_nurse_login_and_redirect` | Submit valid Nurse credentials via `/login` UI form | Redirects to `/dashboard/nurse`, JWT stored | 🟢 **PASS** |
| 4 | `test_04_valid_patient_login_and_redirect` | Submit valid Patient credentials via `/login` UI form | Redirects to `/dashboard/patient`, JWT stored | 🟢 **PASS** |
| 5 | `test_05_valid_caregiver_login_and_redirect` | Submit valid Caregiver credentials via `/login` UI form | Redirects to `/dashboard/caregiver`, JWT stored | 🟢 **PASS** |
| 6 | `test_06_invalid_credentials_display_error` | Submit incorrect password on `/login` form | Error banner displayed, user stays on `/login` | 🟢 **PASS** |
| 7 | `test_07_logout_clears_session_and_redirects` | Click Logout button from dashboard header/sidebar | Tokens purged from `localStorage`, redirects | 🟢 **PASS** |
| 8 | `test_08_patient_registration_form_and_submission` | Step through 4-stage Patient registration wizard | Application submitted with APP-PAT ID generated | 🟢 **PASS** |
| 9 | `test_09_check_application_status_page` | Query `/check-application-status` with Application ID | Shows live application status ("Under Review") | 🟢 **PASS** |
| 10 | `test_10_forgot_password_and_otp_flow` | Request password reset OTP, enter OTP, submit new password | Password updated, login permitted with new password | 🟢 **PASS** |

---

### 3.2 Administrator Portal & System Management (`test_admin.py`)

| # | Test Case ID / Method | Description & Test Steps | Expected Result | Status |
|---|---|---|---|:---:|
| 11 | `test_01_admin_dashboard_loads_metrics_and_navigation` | Load Admin dashboard `/dashboard/admin` | Metrics cards, navigation tabs & quick actions visible | 🟢 **PASS** |
| 12 | `test_02_caregiver_approval_workflow` | Select pending Caregiver in Admin Caregivers tab & approve | Caregiver verification status set to `APPROVED` in DB | 🟢 **PASS** |
| 13 | `test_03_doctor_onboarding_and_approval` | Select pending Doctor in Admin Doctors tab & approve | Doctor verification status set to `APPROVED` in DB | 🟢 **PASS** |
| 14 | `test_04_nurse_onboarding_and_approval` | Select pending Nurse in Admin Nurses tab & approve | Nurse verification status set to `APPROVED` in DB | 🟢 **PASS** |
| 15 | `test_05_welfare_scheme_crud_workflow` | Access Welfare Schemes tab and open creation modal | Scheme creation form opens, fields fillable | 🟢 **PASS** |
| 16 | `test_06_user_management_and_patient_view` | Access Users and Patients tabs in Admin portal | User list table and Patient registry visible | 🟢 **PASS** |
| 17 | `test_07_equipment_management_view` | Access Equipment inventory tab in Admin portal | Equipment catalog and units table rendered | 🟢 **PASS** |
| 18 | `test_08_reports_and_analytics_view` | Access Reports and System Analytics tabs | Exportable analytics reports rendered | 🟢 **PASS** |

---

### 3.3 Doctor Portal & Clinical Oversight (`test_doctor.py`)

| # | Test Case ID / Method | Description & Test Steps | Expected Result | Status |
|---|---|---|---|:---:|
| 19 | `test_01_doctor_dashboard_and_availability_toggle` | Load Doctor dashboard and toggle availability status | Doctor availability status reflects change | 🟢 **PASS** |
| 20 | `test_02_patient_registration_review_and_approval` | Open pending patient registration application and approve | Application status transitions to `APPROVED` in DB | 🟢 **PASS** |
| 21 | `test_03_patient_list_and_patient_workspace` | Open approved Patient workspace from patient directory | Clinical workspace loads with diagnoses & vitals tabs | 🟢 **PASS** |
| 22 | `test_04_doctor_telemedicine_view` | Access Telemedicine queue from Doctor dashboard | Consultation requests listed with triage urgency | 🟢 **PASS** |
| 23 | `test_05_doctor_home_visits_oversight` | Access Home Visits oversight view | Scheduled visits and visiting team details visible | 🟢 **PASS** |

---

### 3.4 Nurse Portal & Care Coordination (`test_nurse.py`)

| # | Test Case ID / Method | Description & Test Steps | Expected Result | Status |
|---|---|---|---|:---:|
| 24 | `test_01_nurse_dashboard_and_summary_cards` | Load Nurse dashboard `/dashboard/nurse` | Schedule cards, urgent tasks & quick actions rendered | 🟢 **PASS** |
| 25 | `test_02_nurse_home_visits_shared_team_workflow` | Open All Home Visits table as Nurse | Visits visible without Claim / Self-Allocate button | 🟢 **PASS** |
| 26 | `test_03_nurse_create_recurring_schedule` | Create weekly care schedule for a patient in UI | Schedule created in DB avoiding Sunday dates | 🟢 **PASS** |
| 27 | `test_04_nurse_complete_visit_modal` | Open Complete Visit modal directly and enter vitals | Occurrence status set to `COMPLETED` in DB | 🟢 **PASS** |
| 28 | `test_05_nurse_caregiver_assignments_view` | Access Caregiver Assignments tab in Nurse portal | Caregiver-to-patient allocation list loaded | 🟢 **PASS** |
| 29 | `test_06_nurse_visit_calendar_view` | Navigate to Visit Calendar view | Monthly/weekly schedule calendar loaded | 🟢 **PASS** |

---

### 3.5 Caregiver Portal & Support (`test_caregiver.py`)

| # | Test Case ID / Method | Description & Test Steps | Expected Result | Status |
|---|---|---|---|:---:|
| 30 | `test_01_caregiver_dashboard_loads_assigned_patient` | Load Caregiver dashboard `/dashboard/caregiver` | Assigned patient overview card rendered | 🟢 **PASS** |
| 31 | `test_02_caregiver_assigned_patients_tab` | Open Assigned Patients tab | Patient care notes and instructions displayed | 🟢 **PASS** |
| 32 | `test_03_caregiver_notifications_view` | Open Caregiver Notifications tab | Real-time notification list rendered | 🟢 **PASS** |
| 33 | `test_04_caregiver_profile_view` | Open Caregiver Profile settings | Caregiver contact details and info displayed | 🟢 **PASS** |

---

### 3.6 Patient Portal & Self-Service (`test_patient.py`)

| # | Test Case ID / Method | Description & Test Steps | Expected Result | Status |
|---|---|---|---|:---:|
| 34 | `test_01_patient_dashboard_loads_overview` | Load Patient dashboard `/dashboard/patient` | Health summary & greeting displayed | 🟢 **PASS** |
| 35 | `test_02_patient_medical_history_tab` | Open Medical History tab | Diagnoses, allergies & chronic conditions displayed | 🟢 **PASS** |
| 36 | `test_03_patient_prescriptions_tab` | Open Prescriptions tab | Active medications, dosage & frequency displayed | 🟢 **PASS** |
| 37 | `test_04_patient_lab_reports_tab` | Open Lab Reports tab | Laboratory investigation reports listed | 🟢 **PASS** |
| 38 | `test_05_patient_nutrition_tab` | Open Nutrition tab | Dietary advice & meal plans rendered | 🟢 **PASS** |
| 39 | `test_06_patient_home_visits_tab` | Open Home Visits schedule tab | Scheduled team visits displayed with status | 🟢 **PASS** |
| 40 | `test_07_patient_telemedicine_tab` | Open Telemedicine consultations tab | Request consultation button & history displayed | 🟢 **PASS** |
| 41 | `test_08_patient_equipment_requests_tab` | Open Medical Equipment requests tab | Equipment catalog and existing requests displayed | 🟢 **PASS** |
| 42 | `test_09_patient_welfare_schemes_tab` | Open Welfare Schemes directory tab | Palliative welfare schemes listed with links | 🟢 **PASS** |

---

### 3.7 Shared Nurse Team Home Visits (`test_home_visits.py`)

| # | Test Case ID / Method | Description & Test Steps | Expected Result | Status |
|---|---|---|---|:---:|
| 43 | `test_01_shared_nurse_team_no_claim_button_visible` | Check visit list from both Nurse A and Nurse B sessions | Both see same visit; no locking or Claim button | 🟢 **PASS** |
| 44 | `test_02_assign_doctor_per_occurrence` | Assign a visiting Doctor for a specific visit occurrence | Visiting doctor updated in DB on the occurrence | 🟢 **PASS** |
| 45 | `test_03_completion_records_audit_trail` | Nurse B completes visit; verify audit record | Audit log saves `completed_by = Nurse B` | 🟢 **PASS** |

---

### 3.8 Telemedicine Consultations (`test_telemedicine.py`)

| # | Test Case ID / Method | Description & Test Steps | Expected Result | Status |
|---|---|---|---|:---:|
| 46 | `test_01_patient_creates_telemedicine_consultation_request` | Patient submits telemedicine consultation request form | Consultation request logged with reason & urgency | 🟢 **PASS** |
| 47 | `test_02_doctor_views_and_manages_consultation` | Doctor views consultation queue and opens request details | Doctor sees patient request in pending consultation list | 🟢 **PASS** |

---

### 3.9 Medical Equipment Lifecycle (`test_equipment.py`)

| # | Test Case ID / Method | Description & Test Steps | Expected Result | Status |
|---|---|---|---|:---:|
| 48 | `test_01_patient_views_equipment_catalog_and_request_form` | Patient opens equipment modal to request medical aid | Request form renders with equipment selection | 🟢 **PASS** |
| 49 | `test_02_admin_equipment_inventory_and_allocation_queue` | Admin views equipment inventory & allocation requests | Equipment units table and request queue rendered | 🟢 **PASS** |

---

### 3.10 Welfare Schemes (`test_welfare.py`)

| # | Test Case ID / Method | Description & Test Steps | Expected Result | Status |
|---|---|---|---|:---:|
| 50 | `test_01_admin_creates_and_manages_welfare_schemes` | Admin navigates to welfare management | Schemes directory loaded with creation form | 🟢 **PASS** |
| 51 | `test_02_patient_views_published_welfare_schemes` | Patient views published scheme details & external link | Official portal link and eligibility criteria displayed | 🟢 **PASS** |

---

### 3.11 Real-time Notifications (`test_notifications.py`)

| # | Test Case ID / Method | Description & Test Steps | Expected Result | Status |
|---|---|---|---|:---:|
| 52 | `test_01_nurse_receives_and_views_notifications` | Generate system notification for nurse & check UI | Notification item appears with unread badge in UI | 🟢 **PASS** |

---

### 3.12 User Profiles (`test_profiles.py`)

| # | Test Case ID / Method | Description & Test Steps | Expected Result | Status |
|---|---|---|---|:---:|
| 53 | `test_01_admin_profile_view` | Admin navigates to `/dashboard/admin` -> Profile | Admin profile card renders correct email & role | 🟢 **PASS** |
| 54 | `test_02_doctor_profile_view` | Doctor navigates to `/dashboard/doctor` -> Profile | Doctor profile card renders doctor credentials | 🟢 **PASS** |
| 55 | `test_03_nurse_profile_view` | Nurse navigates to `/dashboard/nurse` -> Profile | Nurse profile card renders nurse details | 🟢 **PASS** |
| 56 | `test_04_patient_profile_view` | Patient navigates to `/dashboard/patient` -> Profile | Patient profile card renders patient details | 🟢 **PASS** |

---

### 3.13 Security & Role-Based Access Control (`test_security_authorization.py`)

| # | Test Case ID / Method | Description & Test Steps | Expected Result | Status |
|---|---|---|---|:---:|
| 57 | `test_01_unauthenticated_user_redirected_to_login` | Access 5 protected dashboard URLs without JWT token | Immediate redirect to `/login` for all 5 routes | 🟢 **PASS** |
| 58 | `test_02_patient_cannot_access_admin_dashboard` | Authenticated Patient tries navigating to `/dashboard/admin` | Prevented; redirected to `/dashboard/patient` | 🟢 **PASS** |
| 59 | `test_03_nurse_cannot_access_doctor_dashboard` | Authenticated Nurse tries navigating to `/dashboard/doctor` | Prevented; redirected to `/dashboard/nurse` | 🟢 **PASS** |
| 60 | `test_04_doctor_cannot_access_admin_dashboard` | Authenticated Doctor tries navigating to `/dashboard/admin` | Prevented; redirected to `/dashboard/doctor` | 🟢 **PASS** |
| 61 | `test_05_caregiver_cannot_access_admin_dashboard` | Authenticated Caregiver tries navigating to `/dashboard/admin`| Prevented; redirected to `/dashboard/caregiver` | 🟢 **PASS** |

---

## 💻 4. How to Execute the Selenium Test Suite

### Command to Run the Complete Selenium E2E Suite:
```bash
# Ensure Backend and Frontend are running:
# Backend: python manage.py runserver (Port 8000)
# Frontend: npm run dev (Port 5173)

# Run all 61 Selenium E2E tests:
python tests/selenium/runner.py
```

### Running Individual Module Tests:
```bash
# Run Authentication tests only:
python -m unittest tests.selenium.test_authentication

# Run Shared Nurse Team Home Visits tests only:
python -m unittest tests.selenium.test_home_visits

# Run Security & Authorization RBAC tests only:
python -m unittest tests.selenium.test_security_authorization
```

### Generated Artifacts:
- **Markdown Report:** [`SELENIUM_TEST_REPORT.md`](file:///c:/SEM%203/PROJECT/KarunaGrid/SELENIUM_TEST_REPORT.md)
- **PDF Report:** `SELENIUM_TEST_REPORT.pdf`
- **Screenshots on Failure:** `test-results/screenshots/`
