from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User, Caregiver, Role, VerificationStatus


@override_settings(
    EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
    DEFAULT_FROM_EMAIL='karunagrid@gmail.com'
)
class CaregiverProfileTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.caregiver_user = User.objects.create_user(
            email='test.caregiver@karunagrid.org',
            password='InitialPassword123!',
            role=Role.CAREGIVER,
            is_active=True,
        )
        self.caregiver = Caregiver.objects.create(
            user=self.caregiver_user,
            name='Test Caregiver',
            phone='9847112233',
            house_name='Test Villa',
            place='Kottayam',
            panchayath='Pala',
            ward_no=4,
            pincode='686575',
            qualifications='Certified Palliative Caregiver',
            certifications='BLS, First Aid',
            specialization='Bedridden Patient Care',
            experience_years='3+ years',
            availability_notes='Available day shift',
            verification_status=VerificationStatus.APPROVED,
        )

    def test_01_get_caregiver_profile(self):
        self.client.force_authenticate(user=self.caregiver_user)
        res = self.client.get('/api/caregiver/profile/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['name'], 'Test Caregiver')
        self.assertEqual(res.data['email'], 'test.caregiver@karunagrid.org')
        self.assertEqual(res.data['phone'], '9847112233')
        self.assertEqual(res.data['specialization'], 'Bedridden Patient Care')
        self.assertEqual(res.data['experience_years'], '3+ years')
        self.assertEqual(res.data['verification_status'], 'APPROVED')

    def test_02_update_caregiver_profile(self):
        self.client.force_authenticate(user=self.caregiver_user)
        payload = {
            'name': 'Updated Caregiver Name',
            'phone': '9847998877',
            'house_name': 'New Haven',
            'place': 'Ramapuram',
            'panchayath': 'Ramapuram GP',
            'ward_no': 7,
            'pincode': '686576',
            'qualifications': 'Senior GNA & Palliative Specialist',
            'certifications': 'Advanced Palliative Care Certificate',
            'specialization': 'Palliative Comfort Support',
            'experience_years': '5+ years',
            'availability_notes': 'Available 24/7 on call',
        }
        res = self.client.put('/api/caregiver/profile/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['profile']['name'], 'Updated Caregiver Name')
        self.assertEqual(res.data['profile']['phone'], '9847998877')
        self.assertEqual(res.data['profile']['place'], 'Ramapuram')
        self.assertEqual(res.data['profile']['specialization'], 'Palliative Comfort Support')
        self.assertEqual(res.data['profile']['experience_years'], '5+ years')

        # Verify DB persisted
        self.caregiver.refresh_from_db()
        self.assertEqual(self.caregiver.name, 'Updated Caregiver Name')
        self.assertEqual(self.caregiver.phone, '9847998877')
        self.assertEqual(self.caregiver.place, 'Ramapuram')
        self.assertEqual(self.caregiver.specialization, 'Palliative Comfort Support')

    def test_03_update_caregiver_password(self):
        self.client.force_authenticate(user=self.caregiver_user)
        new_pwd = 'BrandNewPassword123!'
        payload = {
            'name': 'Test Caregiver',
            'current_password': 'InitialPassword123!',
            'new_password': new_pwd,
            'confirm_password': new_pwd,
        }
        res = self.client.put('/api/caregiver/profile/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Check new password works
        self.caregiver_user.refresh_from_db()
        self.assertTrue(self.caregiver_user.check_password(new_pwd))

    def test_04_validation_errors(self):
        self.client.force_authenticate(user=self.caregiver_user)
        # Invalid phone and invalid pincode
        payload = {
            'name': '',
            'phone': '123',
            'pincode': 'abc',
        }
        res = self.client.put('/api/caregiver/profile/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name', res.data['errors'])
        self.assertIn('phone', res.data['errors'])
        self.assertIn('pincode', res.data['errors'])

    def test_05_unauthorized_role_forbidden(self):
        # Create non-caregiver (e.g. Patient)
        patient_user = User.objects.create_user(
            email='patient@karunagrid.org',
            password='Password123!',
            role=Role.PATIENT,
            is_active=True,
        )
        self.client.force_authenticate(user=patient_user)
        res = self.client.get('/api/caregiver/profile/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
