# KarunaGrid Comprehensive Automated Test Report

**Date & Time:** 2026-09-17  
**Project:** KarunaGrid Healthcare & Palliative Care Network  
**Environment:** Local Development (`Frontend: http://localhost:5173` | `Backend: http://127.0.0.1:8000`)

---

## 📊 1. Executive Summary

| Category | Automation Tool | Scope | Passed | Failed | Status |
|---|---|---|---|---|---|
| **API Regression** | **Postman / Newman** | 10 API Endpoints / 19 Assertions | 19 / 19 | 0 | 🟢 **100% PASS** |
| **End-to-End (E2E) UI** | **Playwright (Chrome)** | 6 Complete User Workflows | 6 / 6 | 0 | 🟢 **100% PASS** |
| **Backend Unit & Logic** | **Django Test Runner** | 147 Unit & Integration Tests | 147 / 147 | 0 | 🟢 **100% PASS** |
| **Static Code Quality** | **Oxlint** | 125 Files (92 Rules) | 0 Errors | 0 | 🟢 **100% PASS** |
| **Production Build** | **Vite / Rollup** | 2,294 Modules Compiled | Built Clean | 0 | 🟢 **100% PASS** |

---

## ⚡ 2. Automated API Regression Test Report (Postman & Newman)

* **Test Suite File:** `tests/postman/karunagrid_collection.json`
* **Execution Engine:** Newman v6.2.2
* **Total Run Duration:** 5.1s
* **Average Latency:** 412ms

### Detailed Endpoint Test Results:

```
✔ 01 - API Root Health Check
     GET http://127.0.0.1:8000/ [200 OK, 482B, 73ms]
     ✓ Status code is 200 OK
     ✓ API is online and healthy

✔ 02 - Doctor Login & Token Acquisition
     POST http://127.0.0.1:8000/api/auth/login/ [200 OK, 912B, 1448ms]
     ✓ Doctor login status is 200 OK
     ✓ Returns JWT access and refresh tokens (Role: Doctor)

✔ 03 - Doctor Profile Verification (/api/me/)
     GET http://127.0.0.1:8000/api/me/ [200 OK, 657B, 111ms]
     ✓ Status code is 200 OK for Authenticated Doctor
     ✓ Returns Doctor identity correctly (doctor@karunagrid.org)

✔ 04 - Doctor Dashboard Metrics
     GET http://127.0.0.1:8000/api/doctor/dashboard/ [200 OK, 2.63kB, 389ms]
     ✓ Status code is 200 OK for Doctor Dashboard
     ✓ Dashboard payload contains metrics & schedule

✔ 05 - Doctor Assigned Patients List
     GET http://127.0.0.1:8000/api/doctor/patients/ [200 OK, 3.54kB, 119ms]
     ✓ Status code is 200 OK for Patient List
     ✓ Response is an array of assigned patients

✔ 06 - Admin Login & Token Acquisition
     POST http://127.0.0.1:8000/api/auth/login/ [200 OK, 892B, 1272ms]
     ✓ Admin login status is 200 OK
     ✓ Returns Admin token and profile (Role: Admin)

✔ 07 - Admin System Stats
     GET http://127.0.0.1:8000/api/admin/stats/ [200 OK, 1.90kB, 152ms]
     ✓ Status code is 200 OK for Admin Stats
     ✓ Returns system overview statistics

✔ 08 - Admin User List Query
     GET http://127.0.0.1:8000/api/admin/users/ [200 OK, 5.15kB, 255ms]
     ✓ Status code is 200 OK for Admin Users list
     ✓ Response contains user list and roles

✔ 09 - Security: Unauthenticated Access Denied
     GET http://127.0.0.1:8000/api/me/ [401 Unauthorized, 429B, 33ms]
     ✓ Status code is 401 Unauthorized for missing token

✔ 10 - Token Refresh Rotation
     POST http://127.0.0.1:8000/api/auth/token/refresh/ [200 OK, 813B, 276ms]
     ✓ Status code is 200 OK on token refresh
     ✓ New access token is issued
```

---

## 🎭 3. Automated End-to-End (E2E) UI Test Report (Playwright)

* **Test Suite File:** `tests/e2e/karunagrid.spec.js`
* **Test Runner:** Playwright v1.63.0 (Google Chrome)
* **Execution Time:** 30.9s
* **Interactive HTML Report:** Generated in `tests/e2e/html-report/index.html`

### Validated User Workflows:

| Workflow | Title | Duration | Details & Assertions | Status |
|---|---|---|---|---|
| **WF-01** | **Landing Page & Navigation** | 5.8s | Verified branding, title, CTA buttons, and smooth transition to Login page. | 🟢 PASS |
| **WF-02** | **Registration Multi-Step Wizard** | 4.5s | Tested role selection (Patient Portal), wizard step progression (Step 1 -> Step 2), and personal detail form input validations. | 🟢 PASS |
| **WF-03** | **Doctor Login & Session Storage** | 4.5s | Verified login with `doctor@karunagrid.org`, auto-redirection to `/dashboard/doctor`, and JWT token persistence in `localStorage`. | 🟢 PASS |
| **WF-04** | **Doctor Dashboard & Clinical Workspace** | 6.6s | Verified Doctor header, metric summary cards, sidebar navigation, and Patient Registry data view. | 🟢 PASS |
| **WF-05** | **Route Protection & Security Guard** | 2.8s | Tested unauthenticated access attempt to `/dashboard/doctor` and confirmed immediate redirection to `/login`. | 🟢 PASS |
| **WF-06** | **Application Status Inquiry** | 2.7s | Tested `/check-application-status` page loading and input elements for tracking applications. | 🟢 PASS |

---

## 🧪 4. Django Backend Unit & Integration Tests

* **Test Configuration:** `test_settings.py` (In-memory SQLite test database)
* **Command:** `python manage.py test --settings=test_settings`
* **Total Tests:** 147
* **Duration:** 6.35s

### App-by-App Test Breakdown:
* **`accounts`**: User models, Role-Based Access Control (Admin, Doctor, Nurse, Caregiver, Patient), JWT authentication, password complexity validation, patient application review & approval lifecycle.
* **`care_coordination`**: Home visit scheduling, team assignments, telemedicine requests, and status lifecycle.
* **`medical_records`**: Vitals recordings, clinical workspace, patient diagnosis records, lab report review and verification workflows.
* **`resources`**: Medical equipment inventory, donor allocation, and welfare schemes.
* **`notifications`**: Emergency alert generation, unread counters, and simulated dispatch.

```
Ran 147 tests in 6.349s
OK (0 failures, 0 errors)
```

---

## 💻 5. Frontend Code Quality & Build Verification

* **Oxlint Static Analysis:** 125 files scanned, **0 errors**.
* **Vite Production Build:** Successfully compiled 2,294 modules into `dist/` bundle in 42.1s with zero build errors.

---

## 🔁 How to Re-Run Tests Anytime

```bash
# 1. Automated API Regression (Newman)
npm run test:api

# 2. Automated End-to-End Tests (Playwright)
npm run test:e2e

# 3. View Playwright Interactive HTML Report
npx playwright show-report tests/e2e/html-report

# 4. Backend Unit & Integration Tests
python manage.py test --settings=test_settings
```
