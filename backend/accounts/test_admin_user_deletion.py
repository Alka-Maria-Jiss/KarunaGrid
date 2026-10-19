from django.test import TestCase
from django.core.management import call_command
from rest_framework.test import APIClient
from rest_framework import status

from accounts.models import (
    User,
    Role,
    Doctor,
    Nurse,
    Administrator,
    VerificationStatus,
)


class AdminUserDeletionAndFormattingTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create Admin
        self.admin_user = User.objects.create_user(
            email='admin.system@karunagrid.org',
            password='AdminPassword123!',
            role=Role.ADMIN,
            is_active=True,
            is_staff=True,
            is_superuser=True,
        )
        self.admin_profile = Administrator.objects.create(
            user=self.admin_user,
            name='Master Admin',
            phone='9876543210',
            gender='Other',
            qualification='Healthcare Admin',
            experience=5,
        )

        # Create Doctor with "Dr. " already in name
        self.doc_user_prefixed = User.objects.create_user(
            email='dr.testlive7@karunagrid.org',
            password='DoctorPassword123!',
            role=Role.DOCTOR,
            is_active=True,
        )
        self.doctor_prefixed = Doctor.objects.create(
            user=self.doc_user_prefixed,
            name='Dr. Test Live',
            phone='9876543210',
            specialization='Palliative Medicine',
            verification_status=VerificationStatus.APPROVED,
        )

        # Create Doctor without "Dr. " in name
        self.doc_user_normal = User.objects.create_user(
            email='alkamariajiss85@gmail.com',
            password='DoctorPassword123!',
            role=Role.DOCTOR,
            is_active=True,
        )
        self.doctor_normal = Doctor.objects.create(
            user=self.doc_user_normal,
            name='Franco Devis',
            phone='9876543210',
            specialization='Palliative Medicine',
            verification_status=VerificationStatus.APPROVED,
        )

    def test_admin_user_list_avoids_duplicate_title_prefix(self):
        """Verifies that Dr. prefix is not duplicated when name already starts with Dr."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/admin/users/?role=doctor')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.data
        users = data if isinstance(data, list) else data.get('users', [])
        name_map = {u['email']: u['name'] for u in users}

        self.assertEqual(name_map['dr.testlive7@karunagrid.org'], 'Dr. Test Live')
        self.assertNotEqual(name_map['dr.testlive7@karunagrid.org'], 'Dr. Dr. Test Live')
        self.assertEqual(name_map['alkamariajiss85@gmail.com'], 'Dr. Franco Devis')

    def test_admin_can_delete_doctor_user(self):
        """Administrator can permanently delete a doctor account and cascade-clean doctor profile."""
        self.client.force_authenticate(user=self.admin_user)
        doc_id = self.doc_user_prefixed.user_id

        response = self.client.delete(f'/api/admin/users/{doc_id}/delete/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("permanently deleted", response.data.get('message', ''))

        self.assertFalse(User.objects.filter(user_id=doc_id).exists())
        self.assertFalse(Doctor.objects.filter(user_id=doc_id).exists())

    def test_non_admin_cannot_delete_user(self):
        """Non-admin roles are forbidden from deleting users."""
        self.client.force_authenticate(user=self.doc_user_normal)
        doc_id = self.doc_user_prefixed.user_id

        response = self.client.delete(f'/api/admin/users/{doc_id}/delete/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(User.objects.filter(user_id=doc_id).exists())

    def test_admin_cannot_delete_self(self):
        """Admin cannot delete their own account."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/admin/users/{self.admin_user.user_id}/delete/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cannot delete your own", response.data.get('detail', ''))

    def test_delete_nonexistent_user_returns_404(self):
        """Deleting a non-existent user returns 404."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete('/api/admin/users/999999/delete/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_seed_admin_purges_test_doctors(self):
        """Running seed_admin purges target test doctors while preserving real doctors."""
        # Ensure target test doctor exists before seed
        self.assertTrue(User.objects.filter(email='dr.testlive7@karunagrid.org').exists())
        self.assertTrue(User.objects.filter(email='alkamariajiss85@gmail.com').exists())

        call_command('seed_admin', email='admin.system@karunagrid.org', password='AdminPassword123!')

        # Test doctor should be purged
        self.assertFalse(User.objects.filter(email='dr.testlive7@karunagrid.org').exists())
        # Legitimate doctor must be preserved
        self.assertTrue(User.objects.filter(email='alkamariajiss85@gmail.com').exists())
