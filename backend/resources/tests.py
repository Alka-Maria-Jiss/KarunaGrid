from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import User, Role, Administrator, Patient, Nurse, Doctor
from resources.models import (
    WelfareScheme,
    WelfareSchemeStatus,
    EquipmentType,
    EquipmentUnit,
    EquipmentRequest,
    EquipmentUnitStatus,
    DoctorApprovalStatus,
    DeliveryStatus,
)


class WelfareSchemeRedirectionTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # 1. Admin User & Profile
        self.admin_user = User.objects.create_user(
            email='admin_welfare@karunagrid.org',
            password='AdminPassword123!',
            role=Role.ADMIN,
        )
        self.admin_profile = Administrator.objects.create(
            user=self.admin_user,
            name='Central Welfare Admin',
            phone='9876543210',
        )

        # 2. Patient User & Profile
        self.patient_user = User.objects.create_user(
            email='patient_welfare@karunagrid.org',
            password='PatientPassword123!',
            role=Role.PATIENT,
        )
        self.patient_profile = Patient.objects.create(
            user=self.patient_user,
            registration_id='KG-PAT-WEL-001',
            name='Anoop Varma',
            phone='9876500001',
            place='Thrissur',
            panchayath='Puzhakkal',
            ward_no='4',
            pincode='680553',
            registration_status='Approved',
        )

        # 3. Nurse User
        self.nurse_user = User.objects.create_user(
            email='nurse_welfare@karunagrid.org',
            password='NursePassword123!',
            role=Role.NURSE,
        )
        self.nurse_profile = Nurse.objects.create(
            user=self.nurse_user,
            name='Nurse Mary',
            phone='9876500002',
            service_area='Thrissur',
        )

    # -------------------------------------------------------------
    # ADMIN TESTS
    # -------------------------------------------------------------
    def test_admin_can_create_draft_scheme(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "name": "Karunya Arogya Suraksha Padhathi (KASP)",
            "category": "Medical Subsidies",
            "description": "Comprehensive health insurance cover for vulnerable families in Kerala.",
            "benefits": "Up to Rs. 5 Lakh per family per year for secondary and tertiary hospitalization.",
            "eligibility_criteria": "Families listed in SECC database and BPL ration card holders.",
            "required_documents": "Ration Card, Aadhaar Card, Income Certificate.",
            "application_instructions": "Visit Akshaya Centre or the official portal with biometric authentication.",
            "official_application_url": "https://sha.kerala.gov.in/kasp/",
            "government_department": "State Health Agency, Govt of Kerala",
            "contact_info": "Toll-Free Helpline: 1056 or 1800-425-1056",
            "status": "Draft",
        }
        res = self.client.post('/api/admin/welfare-schemes/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['status'], 'Draft')

        scheme = WelfareScheme.objects.filter(name="Karunya Arogya Suraksha Padhathi (KASP)").first()
        self.assertIsNotNone(scheme)
        self.assertEqual(scheme.status, WelfareSchemeStatus.DRAFT)
        self.assertIsNone(scheme.published_at)

    def test_admin_can_publish_scheme_with_valid_url(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "name": "Social Security Palliative Pension",
            "category": "Palliative Grants",
            "description": "Monthly direct cash transfer for bedridden and chronically ill palliative patients.",
            "benefits": "Rs. 1,600 monthly pension directly deposited into beneficiary bank account.",
            "eligibility_criteria": "Bedridden palliative patients certified by Primary Health Centre medical officer.",
            "required_documents": "Medical Certificate, Bank Passbook, Aadhaar Card.",
            "application_instructions": "Apply online via Sevana pension portal or local grama panchayath office.",
            "official_application_url": "https://welfarepension.lsgkerala.gov.in/",
            "government_department": "Local Self Government Department, Kerala",
            "contact_info": "Phone: 0471-2321234",
            "status": "Published",
        }
        res = self.client.post('/api/admin/welfare-schemes/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['status'], 'Published')

        scheme = WelfareScheme.objects.filter(name="Social Security Palliative Pension").first()
        self.assertIsNotNone(scheme)
        self.assertEqual(scheme.status, WelfareSchemeStatus.PUBLISHED)
        self.assertIsNotNone(scheme.published_at)

    def test_admin_cannot_publish_scheme_without_official_url(self):
        self.client.force_authenticate(user=self.admin_user)
        payload = {
            "name": "Incomplete Scheme",
            "status": "Published",
            "official_application_url": "",
        }
        res = self.client.post('/api/admin/welfare-schemes/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("official_application_url", res.data.get('errors', {}))

    def test_admin_can_edit_and_unpublish_scheme(self):
        self.client.force_authenticate(user=self.admin_user)
        scheme = WelfareScheme.objects.create(
            name="Sample Welfare Scheme",
            category="Financial Aid",
            official_application_url="https://gov.in/scheme",
            status=WelfareSchemeStatus.PUBLISHED,
            published_at=timezone.now(),
            created_by_admin=self.admin_profile,
        )

        # Unpublish
        res = self.client.put(f'/api/admin/welfare-schemes/{scheme.scheme_id}/', {
            "name": "Sample Welfare Scheme (Updated)",
            "status": "Unpublished",
            "official_application_url": "https://gov.in/scheme",
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        scheme.refresh_from_db()
        self.assertEqual(scheme.status, WelfareSchemeStatus.UNPUBLISHED)
        self.assertEqual(scheme.name, "Sample Welfare Scheme (Updated)")

    def test_admin_can_delete_scheme(self):
        self.client.force_authenticate(user=self.admin_user)
        scheme = WelfareScheme.objects.create(
            name="Deprecated Scheme",
            created_by_admin=self.admin_profile,
        )
        res = self.client.delete(f'/api/admin/welfare-schemes/{scheme.scheme_id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertFalse(WelfareScheme.objects.filter(scheme_id=scheme.scheme_id).exists())

    def test_unauthorized_users_cannot_access_admin_welfare_endpoints(self):
        # Patient
        self.client.force_authenticate(user=self.patient_user)
        res = self.client.get('/api/admin/welfare-schemes/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Nurse
        self.client.force_authenticate(user=self.nurse_user)
        res = self.client.get('/api/admin/welfare-schemes/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

        # Anonymous
        self.client.logout()
        res = self.client.get('/api/admin/welfare-schemes/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    # -------------------------------------------------------------
    # PATIENT PORTAL TESTS
    # -------------------------------------------------------------
    def test_patient_receives_only_published_schemes(self):
        # Create Draft, Published, and Unpublished schemes
        draft = WelfareScheme.objects.create(
            name="Draft Scheme Under Preparation",
            status=WelfareSchemeStatus.DRAFT,
            created_by_admin=self.admin_profile,
        )
        published = WelfareScheme.objects.create(
            name="Published Karunya Palliative Grant",
            category="Palliative Grants",
            description="Grant for palliative essentials.",
            benefits="Rs. 1,000 monthly.",
            eligibility_criteria="BPL card holders.",
            required_documents="Ration card copy.",
            application_instructions="Apply online at portal.",
            official_application_url="https://kerala.gov.in/karunya-palliative",
            government_department="Health Department, Kerala",
            contact_info="1056",
            status=WelfareSchemeStatus.PUBLISHED,
            published_at=timezone.now(),
            created_by_admin=self.admin_profile,
        )
        unpublished = WelfareScheme.objects.create(
            name="Discontinued Scheme",
            status=WelfareSchemeStatus.UNPUBLISHED,
            created_by_admin=self.admin_profile,
        )

        self.client.force_authenticate(user=self.patient_user)
        res = self.client.get('/api/patient/welfare/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        schemes_data = res.data.get('schemes', [])
        scheme_names = [s['name'] for s in schemes_data]

        self.assertIn("Published Karunya Palliative Grant", scheme_names)
        self.assertNotIn("Draft Scheme Under Preparation", scheme_names)
        self.assertNotIn("Discontinued Scheme", scheme_names)

        # Verify all rich fields returned to Patient
        target = next(s for s in schemes_data if s['name'] == "Published Karunya Palliative Grant")
        self.assertEqual(target['category'], "Palliative Grants")
        self.assertEqual(target['official_application_url'], "https://kerala.gov.in/karunya-palliative")
        self.assertEqual(target['government_department'], "Health Department, Kerala")
        self.assertEqual(target['contact_info'], "1056")

    def test_patient_cannot_post_or_create_welfare_applications(self):
        self.client.force_authenticate(user=self.patient_user)
        # Attempting POST on patient welfare endpoint should fail with 405 Method Not Allowed
        res = self.client.post('/api/patient/welfare/', {"scheme_id": 1}, format='json')
        self.assertEqual(res.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class EquipmentManagementTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # 1. Admin User
        self.admin_user = User.objects.create_user(
            email='admin_eq@karunagrid.org',
            password='AdminPassword123!',
            role=Role.ADMIN,
        )
        self.admin_profile = Administrator.objects.create(
            user=self.admin_user,
            name='Central Equipment Admin',
            phone='9876543210',
        )

        # 2. Doctor User
        self.doctor_user = User.objects.create_user(
            email='doctor_eq@karunagrid.org',
            password='DoctorPassword123!',
            role=Role.DOCTOR,
        )
        self.doctor_profile = Doctor.objects.create(
            user=self.doctor_user,
            name='Dr. Asha Menon',
            qualification='MD Palliative Care',
            specialization='Palliative Medicine',
            phone='9876500003',
        )

        # 3. Patient User
        self.patient_user = User.objects.create_user(
            email='patient_eq@karunagrid.org',
            password='PatientPassword123!',
            role=Role.PATIENT,
        )
        self.patient_profile = Patient.objects.create(
            user=self.patient_user,
            registration_id='KG-PAT-EQ-001',
            name='John Doe',
            phone='9876500001',
            place='Ernakulam',
            panchayath='Kakkanad',
            ward_no='12',
            pincode='682030',
            registration_status='Approved',
        )

        # 4. Equipment Types
        self.eq_type_oxy = EquipmentType.objects.create(
            name='Oxygen Concentrator',
            description='High purity 5L home oxygen concentrator',
        )
        self.eq_type_whl = EquipmentType.objects.create(
            name='Wheelchair',
            description='Foldable lightweight wheelchair',
        )
        self.eq_type_wal = EquipmentType.objects.create(
            name='Walking Stick',
            description='Quad tripod support walking stick',
        )

        # 5. Physical Equipment Units
        self.unit_oxy_101 = EquipmentUnit.objects.create(
            equipment_type=self.eq_type_oxy,
            serial_number='KG-OXY-101',
            status=EquipmentUnitStatus.AVAILABLE,
        )
        self.unit_oxy_102 = EquipmentUnit.objects.create(
            equipment_type=self.eq_type_oxy,
            serial_number='KG-OXY-102',
            status=EquipmentUnitStatus.AVAILABLE,
        )
        self.unit_whl_101 = EquipmentUnit.objects.create(
            equipment_type=self.eq_type_whl,
            serial_number='KG-WHL-101',
            status=EquipmentUnitStatus.AVAILABLE,
        )
        self.unit_wal_106 = EquipmentUnit.objects.create(
            equipment_type=self.eq_type_wal,
            serial_number='KG-WAL-106',
            status=EquipmentUnitStatus.AVAILABLE,
        )

    # -------------------------------------------------------------
    # DOCTOR WORKFLOW TESTS
    # -------------------------------------------------------------
    def test_doctor_can_approve_equipment_request(self):
        req = EquipmentRequest.objects.create(
            patient=self.patient_profile,
            equipment_type=self.eq_type_whl,
            requested_by=self.patient_user,
            doctor_approval_status=DoctorApprovalStatus.PENDING,
            delivery_status=DeliveryStatus.REQUESTED,
        )

        self.client.force_authenticate(user=self.doctor_user)
        res = self.client.post(f'/api/resources/doctor/equipment-requests/{req.request_id}/review/', {
            'action': 'approve'
        }, format='json')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        req.refresh_from_db()
        self.assertEqual(req.doctor_approval_status, DoctorApprovalStatus.APPROVED)
        self.assertEqual(req.approved_by_doctor, self.doctor_profile)
        self.assertIsNone(req.allocated_unit)  # Doctor does NOT allocate unit

    def test_doctor_can_reject_equipment_request_with_mandatory_reason(self):
        req = EquipmentRequest.objects.create(
            patient=self.patient_profile,
            equipment_type=self.eq_type_wal,
            requested_by=self.patient_user,
            doctor_approval_status=DoctorApprovalStatus.PENDING,
            delivery_status=DeliveryStatus.REQUESTED,
        )

        self.client.force_authenticate(user=self.doctor_user)
        # Without reason -> 400
        res_fail = self.client.post(f'/api/resources/doctor/equipment-requests/{req.request_id}/review/', {
            'action': 'reject',
            'rejection_reason': '',
        }, format='json')
        self.assertEqual(res_fail.status_code, status.HTTP_400_BAD_REQUEST)

        # With reason -> 200
        res_ok = self.client.post(f'/api/resources/doctor/equipment-requests/{req.request_id}/review/', {
            'action': 'reject',
            'rejection_reason': 'Patient already has functional mobility aid.',
        }, format='json')
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)

        req.refresh_from_db()
        self.assertEqual(req.doctor_approval_status, DoctorApprovalStatus.REJECTED)
        self.assertEqual(req.approved_by_doctor, self.doctor_profile)

    # -------------------------------------------------------------
    # ADMIN REQUEST LISTING & SUMMARY TESTS
    # -------------------------------------------------------------
    def test_admin_equipment_list_returns_types_units_and_requests(self):
        req1 = EquipmentRequest.objects.create(
            patient=self.patient_profile,
            equipment_type=self.eq_type_oxy,
            requested_by=self.patient_user,
            doctor_approval_status=DoctorApprovalStatus.APPROVED,
            approved_by_doctor=self.doctor_profile,
            delivery_status=DeliveryStatus.REQUESTED,
        )

        self.client.force_authenticate(user=self.admin_user)
        res = self.client.get('/api/admin/equipment/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('types', res.data)
        self.assertIn('units', res.data)
        self.assertIn('requests', res.data)

        # Verify request structure
        requests_list = res.data['requests']
        self.assertEqual(len(requests_list), 1)
        target_req = requests_list[0]
        self.assertEqual(target_req['request_id'], req1.request_id)
        self.assertEqual(target_req['patient_name'], 'John Doe')
        self.assertEqual(target_req['equipment_type_name'], 'Oxygen Concentrator')
        self.assertEqual(target_req['doctor_approval_status'], 'Approved')
        self.assertEqual(target_req['delivery_status'], 'Requested')
        self.assertIsNone(target_req['allocated_unit_id'])

    # -------------------------------------------------------------
    # ADMIN ALLOCATION TESTS
    # -------------------------------------------------------------
    def test_admin_can_allocate_available_unit_to_approved_request(self):
        req = EquipmentRequest.objects.create(
            patient=self.patient_profile,
            equipment_type=self.eq_type_oxy,
            requested_by=self.patient_user,
            doctor_approval_status=DoctorApprovalStatus.APPROVED,
            approved_by_doctor=self.doctor_profile,
            delivery_status=DeliveryStatus.REQUESTED,
        )

        self.client.force_authenticate(user=self.admin_user)
        payload = {'unit_id': self.unit_oxy_101.unit_id}
        res = self.client.post(f'/api/admin/equipment/requests/{req.request_id}/allocate/', payload, format='json')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['delivery_status'], DeliveryStatus.ALLOCATED)
        self.assertEqual(res.data['allocated_unit_id'], self.unit_oxy_101.unit_id)

        # Check database consistency
        req.refresh_from_db()
        self.unit_oxy_101.refresh_from_db()
        self.assertEqual(req.delivery_status, DeliveryStatus.ALLOCATED)
        self.assertEqual(req.allocated_unit, self.unit_oxy_101)
        self.assertEqual(req.allocated_by_admin, self.admin_profile)
        self.assertEqual(self.unit_oxy_101.status, EquipmentUnitStatus.ALLOCATED)

    def test_admin_cannot_allocate_pending_request(self):
        req = EquipmentRequest.objects.create(
            patient=self.patient_profile,
            equipment_type=self.eq_type_oxy,
            requested_by=self.patient_user,
            doctor_approval_status=DoctorApprovalStatus.PENDING,
            delivery_status=DeliveryStatus.REQUESTED,
        )

        self.client.force_authenticate(user=self.admin_user)
        payload = {'unit_id': self.unit_oxy_101.unit_id}
        res = self.client.post(f'/api/admin/equipment/requests/{req.request_id}/allocate/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("clinically approved", res.data.get('detail', ''))

    def test_admin_cannot_allocate_rejected_request(self):
        req = EquipmentRequest.objects.create(
            patient=self.patient_profile,
            equipment_type=self.eq_type_oxy,
            requested_by=self.patient_user,
            doctor_approval_status=DoctorApprovalStatus.REJECTED,
            delivery_status=DeliveryStatus.REQUESTED,
        )

        self.client.force_authenticate(user=self.admin_user)
        payload = {'unit_id': self.unit_oxy_101.unit_id}
        res = self.client.post(f'/api/admin/equipment/requests/{req.request_id}/allocate/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_cannot_allocate_mismatched_equipment_type(self):
        # Request is for Wheelchair, Admin tries to assign Oxygen Concentrator
        req = EquipmentRequest.objects.create(
            patient=self.patient_profile,
            equipment_type=self.eq_type_whl,
            requested_by=self.patient_user,
            doctor_approval_status=DoctorApprovalStatus.APPROVED,
            delivery_status=DeliveryStatus.REQUESTED,
        )

        self.client.force_authenticate(user=self.admin_user)
        payload = {'unit_id': self.unit_oxy_101.unit_id}
        res = self.client.post(f'/api/admin/equipment/requests/{req.request_id}/allocate/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("does not match", res.data.get('detail', ''))

    def test_admin_cannot_allocate_non_available_unit(self):
        req = EquipmentRequest.objects.create(
            patient=self.patient_profile,
            equipment_type=self.eq_type_oxy,
            requested_by=self.patient_user,
            doctor_approval_status=DoctorApprovalStatus.APPROVED,
            delivery_status=DeliveryStatus.REQUESTED,
        )

        # 1. Maintenance unit -> 409 Conflict
        self.unit_oxy_101.status = EquipmentUnitStatus.MAINTENANCE
        self.unit_oxy_101.save()

        self.client.force_authenticate(user=self.admin_user)
        res = self.client.post(f'/api/admin/equipment/requests/{req.request_id}/allocate/', {
            'unit_id': self.unit_oxy_101.unit_id
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)

        # 2. Retired unit -> 409 Conflict
        self.unit_oxy_101.status = EquipmentUnitStatus.RETIRED
        self.unit_oxy_101.save()
        res = self.client.post(f'/api/admin/equipment/requests/{req.request_id}/allocate/', {
            'unit_id': self.unit_oxy_101.unit_id
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)

        # 3. Already allocated unit -> 409 Conflict
        self.unit_oxy_101.status = EquipmentUnitStatus.ALLOCATED
        self.unit_oxy_101.save()
        res = self.client.post(f'/api/admin/equipment/requests/{req.request_id}/allocate/', {
            'unit_id': self.unit_oxy_101.unit_id
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)

    def test_admin_concurrent_allocation_conflict_returns_409(self):
        req1 = EquipmentRequest.objects.create(
            patient=self.patient_profile,
            equipment_type=self.eq_type_oxy,
            requested_by=self.patient_user,
            doctor_approval_status=DoctorApprovalStatus.APPROVED,
            delivery_status=DeliveryStatus.REQUESTED,
        )
        req2 = EquipmentRequest.objects.create(
            patient=self.patient_profile,
            equipment_type=self.eq_type_oxy,
            requested_by=self.patient_user,
            doctor_approval_status=DoctorApprovalStatus.APPROVED,
            delivery_status=DeliveryStatus.REQUESTED,
        )

        self.client.force_authenticate(user=self.admin_user)

        # Admin 1 allocates unit
        res1 = self.client.post(f'/api/admin/equipment/requests/{req1.request_id}/allocate/', {
            'unit_id': self.unit_oxy_101.unit_id
        }, format='json')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # Admin 2 tries to allocate same unit -> 409 Conflict
        res2 = self.client.post(f'/api/admin/equipment/requests/{req2.request_id}/allocate/', {
            'unit_id': self.unit_oxy_101.unit_id
        }, format='json')
        self.assertEqual(res2.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("no longer available", res2.data.get('detail', ''))

    # -------------------------------------------------------------
    # CHANGE PHYSICAL UNIT STATUS TESTS
    # -------------------------------------------------------------
    def test_admin_can_update_unit_status_available_to_maintenance(self):
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.patch(f'/api/admin/equipment/units/{self.unit_wal_106.unit_id}/status/', {
            'status': 'Maintenance'
        }, format='json')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.unit_wal_106.refresh_from_db()
        self.assertEqual(self.unit_wal_106.status, EquipmentUnitStatus.MAINTENANCE)

    def test_admin_can_update_unit_status_maintenance_to_available_or_retired(self):
        self.unit_wal_106.status = EquipmentUnitStatus.MAINTENANCE
        self.unit_wal_106.save()

        self.client.force_authenticate(user=self.admin_user)
        # Maintenance -> Available
        res1 = self.client.patch(f'/api/admin/equipment/units/{self.unit_wal_106.unit_id}/status/', {
            'status': 'Available'
        }, format='json')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.unit_wal_106.refresh_from_db()
        self.assertEqual(self.unit_wal_106.status, EquipmentUnitStatus.AVAILABLE)

        # Available -> Maintenance -> Retired
        self.unit_wal_106.status = EquipmentUnitStatus.MAINTENANCE
        self.unit_wal_106.save()
        res2 = self.client.patch(f'/api/admin/equipment/units/{self.unit_wal_106.unit_id}/status/', {
            'status': 'Retired'
        }, format='json')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.unit_wal_106.refresh_from_db()
        self.assertEqual(self.unit_wal_106.status, EquipmentUnitStatus.RETIRED)

    def test_admin_cannot_manually_allocate_unit_via_change_status(self):
        self.client.force_authenticate(user=self.admin_user)
        res = self.client.patch(f'/api/admin/equipment/units/{self.unit_wal_106.unit_id}/status/', {
            'status': 'Allocated'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Direct manual allocation is not permitted", res.data.get('detail', ''))

    def test_admin_cannot_change_status_of_actively_allocated_unit(self):
        # Assign unit to active request
        req = EquipmentRequest.objects.create(
            patient=self.patient_profile,
            equipment_type=self.eq_type_oxy,
            requested_by=self.patient_user,
            doctor_approval_status=DoctorApprovalStatus.APPROVED,
            allocated_unit=self.unit_oxy_101,
            delivery_status=DeliveryStatus.ALLOCATED,
        )
        self.unit_oxy_101.status = EquipmentUnitStatus.ALLOCATED
        self.unit_oxy_101.save()

        self.client.force_authenticate(user=self.admin_user)
        # Attempt to change to Available
        res = self.client.patch(f'/api/admin/equipment/units/{self.unit_oxy_101.unit_id}/status/', {
            'status': 'Available'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("currently allocated to an active patient request", res.data.get('detail', ''))

    def test_admin_cannot_revive_retired_unit(self):
        self.unit_wal_106.status = EquipmentUnitStatus.RETIRED
        self.unit_wal_106.save()

        self.client.force_authenticate(user=self.admin_user)
        res = self.client.patch(f'/api/admin/equipment/units/{self.unit_wal_106.unit_id}/status/', {
            'status': 'Available'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Retired equipment units cannot be reactivated", res.data.get('detail', ''))

    def test_summary_counts_stay_synchronized(self):
        self.client.force_authenticate(user=self.admin_user)
        # Initially Walking stick: total 1, available 1, maintenance 0
        res1 = self.client.get('/api/admin/equipment/')
        wal_type = next(t for t in res1.data['types'] if t['name'] == 'Walking Stick')
        self.assertEqual(wal_type['total_units'], 1)
        self.assertEqual(wal_type['available'], 1)
        self.assertEqual(wal_type['maintenance'], 0)

        # Change unit status to Maintenance
        self.client.patch(f'/api/admin/equipment/units/{self.unit_wal_106.unit_id}/status/', {
            'status': 'Maintenance'
        }, format='json')

        # Refetch summary
        res2 = self.client.get('/api/admin/equipment/')
        wal_type_updated = next(t for t in res2.data['types'] if t['name'] == 'Walking Stick')
        self.assertEqual(wal_type_updated['total_units'], 1)
        self.assertEqual(wal_type_updated['available'], 0)
        self.assertEqual(wal_type_updated['maintenance'], 1)

    # -------------------------------------------------------------
    # EDIT ALLOCATION & REALLOCATION TESTS (PATCH)
    # -------------------------------------------------------------
    def test_admin_can_edit_and_reassign_allocated_unit(self):
        req = EquipmentRequest.objects.create(
            patient=self.patient_profile,
            equipment_type=self.eq_type_oxy,
            requested_by=self.patient_user,
            doctor_approval_status=DoctorApprovalStatus.APPROVED,
            approved_by_doctor=self.doctor_profile,
            allocated_unit=self.unit_oxy_101,
            allocated_by_admin=self.admin_profile,
            delivery_status=DeliveryStatus.ALLOCATED,
        )
        self.unit_oxy_101.status = EquipmentUnitStatus.ALLOCATED
        self.unit_oxy_101.save()

        self.client.force_authenticate(user=self.admin_user)
        # Reassign to self.unit_oxy_102 (which is Available)
        res = self.client.patch(f'/api/admin/equipment/requests/{req.request_id}/allocate/', {
            'unit_id': self.unit_oxy_102.unit_id
        }, format='json')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['allocated_unit_id'], self.unit_oxy_102.unit_id)

        # Check database consistency: old unit freed, new unit allocated
        req.refresh_from_db()
        self.unit_oxy_101.refresh_from_db()
        self.unit_oxy_102.refresh_from_db()

        self.assertEqual(req.allocated_unit, self.unit_oxy_102)
        self.assertEqual(self.unit_oxy_101.status, EquipmentUnitStatus.AVAILABLE)
        self.assertEqual(self.unit_oxy_102.status, EquipmentUnitStatus.ALLOCATED)

    def test_admin_can_update_delivery_status_to_delivered(self):
        req = EquipmentRequest.objects.create(
            patient=self.patient_profile,
            equipment_type=self.eq_type_oxy,
            requested_by=self.patient_user,
            doctor_approval_status=DoctorApprovalStatus.APPROVED,
            approved_by_doctor=self.doctor_profile,
            allocated_unit=self.unit_oxy_101,
            allocated_by_admin=self.admin_profile,
            delivery_status=DeliveryStatus.ALLOCATED,
        )
        self.unit_oxy_101.status = EquipmentUnitStatus.ALLOCATED
        self.unit_oxy_101.save()

        self.client.force_authenticate(user=self.admin_user)
        res = self.client.patch(f'/api/admin/equipment/requests/{req.request_id}/allocate/', {
            'delivery_status': 'Delivered'
        }, format='json')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['delivery_status'], DeliveryStatus.DELIVERED)

        req.refresh_from_db()
        self.assertEqual(req.delivery_status, DeliveryStatus.DELIVERED)
        self.assertEqual(req.allocated_unit, self.unit_oxy_101)

    def test_admin_can_update_delivery_status_to_returned_and_unit_becomes_available(self):
        req = EquipmentRequest.objects.create(
            patient=self.patient_profile,
            equipment_type=self.eq_type_oxy,
            requested_by=self.patient_user,
            doctor_approval_status=DoctorApprovalStatus.APPROVED,
            approved_by_doctor=self.doctor_profile,
            allocated_unit=self.unit_oxy_101,
            allocated_by_admin=self.admin_profile,
            delivery_status=DeliveryStatus.DELIVERED,
        )
        self.unit_oxy_101.status = EquipmentUnitStatus.ALLOCATED
        self.unit_oxy_101.save()

        self.client.force_authenticate(user=self.admin_user)
        res = self.client.patch(f'/api/admin/equipment/requests/{req.request_id}/allocate/', {
            'delivery_status': 'Returned'
        }, format='json')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['delivery_status'], DeliveryStatus.RETURNED)

        # Check database: request marked Returned, returned_at set, unit freed to Available
        req.refresh_from_db()
        self.unit_oxy_101.refresh_from_db()

        self.assertEqual(req.delivery_status, DeliveryStatus.RETURNED)
        self.assertIsNotNone(req.returned_at)
        self.assertEqual(self.unit_oxy_101.status, EquipmentUnitStatus.AVAILABLE)

    def test_admin_cannot_edit_unapproved_request(self):
        req = EquipmentRequest.objects.create(
            patient=self.patient_profile,
            equipment_type=self.eq_type_oxy,
            requested_by=self.patient_user,
            doctor_approval_status=DoctorApprovalStatus.PENDING,
            delivery_status=DeliveryStatus.REQUESTED,
        )

        self.client.force_authenticate(user=self.admin_user)
        res = self.client.patch(f'/api/admin/equipment/requests/{req.request_id}/allocate/', {
            'delivery_status': 'Allocated'
        }, format='json')

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("approved", res.data.get('detail', ''))

    def test_admin_cannot_alter_doctor_clinical_approval(self):
        req = EquipmentRequest.objects.create(
            patient=self.patient_profile,
            equipment_type=self.eq_type_oxy,
            requested_by=self.patient_user,
            doctor_approval_status=DoctorApprovalStatus.APPROVED,
            approved_by_doctor=self.doctor_profile,
            allocated_unit=self.unit_oxy_101,
            delivery_status=DeliveryStatus.ALLOCATED,
        )

        self.client.force_authenticate(user=self.admin_user)
        # Attempt to inject doctor_approval_status = 'Pending' or 'Rejected'
        res = self.client.patch(f'/api/admin/equipment/requests/{req.request_id}/allocate/', {
            'doctor_approval_status': 'Rejected',
            'delivery_status': 'Delivered'
        }, format='json')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        req.refresh_from_db()
        # Doctor approval remains Approved (Admin cannot overwrite Doctor clinical decision)
        self.assertEqual(req.doctor_approval_status, DoctorApprovalStatus.APPROVED)

    def test_admin_reallocation_conflict_returns_409(self):
        # Set self.unit_oxy_102 status to ALLOCATED (already in use)
        self.unit_oxy_102.status = EquipmentUnitStatus.ALLOCATED
        self.unit_oxy_102.save()

        req = EquipmentRequest.objects.create(
            patient=self.patient_profile,
            equipment_type=self.eq_type_oxy,
            requested_by=self.patient_user,
            doctor_approval_status=DoctorApprovalStatus.APPROVED,
            approved_by_doctor=self.doctor_profile,
            allocated_unit=self.unit_oxy_101,
            delivery_status=DeliveryStatus.ALLOCATED,
        )

        self.client.force_authenticate(user=self.admin_user)
        res = self.client.patch(f'/api/admin/equipment/requests/{req.request_id}/allocate/', {
            'unit_id': self.unit_oxy_102.unit_id
        }, format='json')

        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("no longer available", res.data.get('detail', ''))

    def test_unauthorized_user_cannot_perform_admin_allocation_actions(self):
        req = EquipmentRequest.objects.create(
            patient=self.patient_profile,
            equipment_type=self.eq_type_oxy,
            requested_by=self.patient_user,
            doctor_approval_status=DoctorApprovalStatus.APPROVED,
            delivery_status=DeliveryStatus.REQUESTED,
        )

        # Unauthenticated
        res1 = self.client.post(f'/api/admin/equipment/requests/{req.request_id}/allocate/', {'unit_id': self.unit_oxy_101.unit_id})
        self.assertEqual(res1.status_code, status.HTTP_401_UNAUTHORIZED)

        # Patient user
        self.client.force_authenticate(user=self.patient_user)
        res2 = self.client.post(f'/api/admin/equipment/requests/{req.request_id}/allocate/', {'unit_id': self.unit_oxy_101.unit_id})
        self.assertEqual(res2.status_code, status.HTTP_403_FORBIDDEN)

        # Doctor user
        self.client.force_authenticate(user=self.doctor_user)
        res3 = self.client.post(f'/api/admin/equipment/requests/{req.request_id}/allocate/', {'unit_id': self.unit_oxy_101.unit_id})
        self.assertEqual(res3.status_code, status.HTTP_403_FORBIDDEN)



