from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User, Role
from notifications.models import Notification


class NotificationSystemTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create primary user
        self.user = User.objects.create_user(
            email='patient.test@karunagrid.org',
            password='StrongPassword123!',
            role=Role.PATIENT,
        )

        # Create another user for permission testing
        self.other_user = User.objects.create_user(
            email='other.patient@karunagrid.org',
            password='StrongPassword123!',
            role=Role.PATIENT,
        )

        # Create 30 notifications for primary user: 27 unread, 3 read
        self.user_notifications = []
        for i in range(27):
            n = Notification.objects.create(
                user=self.user,
                type='visit_update',
                message=f'Unread visit notification #{i+1}',
                is_read=False,
            )
            self.user_notifications.append(n)

        for i in range(3):
            n = Notification.objects.create(
                user=self.user,
                type='prescription',
                message=f'Read prescription notification #{i+1}',
                is_read=True,
            )
            self.user_notifications.append(n)

        # Create notifications for other user (to ensure strict isolation)
        self.other_notif = Notification.objects.create(
            user=self.other_user,
            type='admin_alert',
            message='Other user private notification',
            is_read=False,
        )

    def test_unauthenticated_access_denied(self):
        res = self.client.get('/api/notifications/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        res_count = self.client.get('/api/notifications/unread-count/')
        self.assertEqual(res_count.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_notifications_list_and_unread_count(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/notifications/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('unread_count', response.data)
        self.assertIn('notifications', response.data)
        self.assertEqual(response.data['unread_count'], 27)
        self.assertEqual(len(response.data['notifications']), 30)

        # Verify notification item fields
        item = response.data['notifications'][0]
        self.assertIn('notification_id', item)
        self.assertIn('id', item)
        self.assertIn('type', item)
        self.assertIn('message', item)
        self.assertIn('is_read', item)
        self.assertIn('created_at', item)
        self.assertEqual(item['recipient_email'], self.user.email)

        # Verify other user's notification is NOT included
        returned_ids = [n['notification_id'] for n in response.data['notifications']]
        self.assertNotIn(self.other_notif.notification_id, returned_ids)

    def test_get_unread_count_endpoint(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/notifications/unread-count/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"unread_count": 27})

    def test_unread_only_filter_and_limit(self):
        self.client.force_authenticate(user=self.user)

        # Test unread_only=true
        res = self.client.get('/api/notifications/?unread_only=true')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['unread_count'], 27)
        self.assertEqual(len(res.data['notifications']), 27)
        self.assertTrue(all(not n['is_read'] for n in res.data['notifications']))

        # Test limit=5
        res_limit = self.client.get('/api/notifications/?limit=5')
        self.assertEqual(res_limit.status_code, status.HTTP_200_OK)
        self.assertEqual(res_limit.data['unread_count'], 27)
        self.assertEqual(len(res_limit.data['notifications']), 5)

    def test_mark_individual_notification_as_read_via_patch(self):
        self.client.force_authenticate(user=self.user)
        target_notif = self.user_notifications[0]
        self.assertFalse(target_notif.is_read)

        # Mark single notification as read using PATCH
        url = f'/api/notifications/{target_notif.notification_id}/read/'
        response = self.client.patch(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['notification_id'], target_notif.notification_id)
        self.assertTrue(response.data['is_read'])

        # Verify in database: record must NOT be deleted, only is_read updated to True
        target_notif.refresh_from_db()
        self.assertTrue(target_notif.is_read)
        self.assertEqual(Notification.objects.filter(user=self.user).count(), 30)

        # Check updated unread count: now 26
        count_res = self.client.get('/api/notifications/unread-count/')
        self.assertEqual(count_res.data['unread_count'], 26)

        list_res = self.client.get('/api/notifications/')
        self.assertEqual(list_res.data['unread_count'], 26)
        self.assertEqual(len(list_res.data['notifications']), 30)

    def test_mark_individual_notification_as_read_via_post(self):
        self.client.force_authenticate(user=self.user)
        target_notif = self.user_notifications[1]
        self.assertFalse(target_notif.is_read)

        url = f'/api/notifications/{target_notif.notification_id}/read/'
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        target_notif.refresh_from_db()
        self.assertTrue(target_notif.is_read)

    def test_marking_already_read_notification_is_idempotent(self):
        self.client.force_authenticate(user=self.user)
        read_notif = self.user_notifications[27]  # this was created as is_read=True
        self.assertTrue(read_notif.is_read)

        url = f'/api/notifications/{read_notif.notification_id}/read/'
        response = self.client.patch(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_read'])

        count_res = self.client.get('/api/notifications/unread-count/')
        self.assertEqual(count_res.data['unread_count'], 27)

    def test_sequential_individual_mark_read_down_to_zero(self):
        self.client.force_authenticate(user=self.user)

        for i in range(27):
            target = self.user_notifications[i]
            res = self.client.patch(f'/api/notifications/{target.notification_id}/read/')
            self.assertEqual(res.status_code, status.HTTP_200_OK)

            # Check unread count after each step
            expected_unread = 27 - (i + 1)
            count_res = self.client.get('/api/notifications/unread-count/')
            self.assertEqual(count_res.data['unread_count'], expected_unread)

        # At the end, total notifications must still be 30, unread count 0
        self.assertEqual(Notification.objects.filter(user=self.user).count(), 30)
        final_list = self.client.get('/api/notifications/')
        self.assertEqual(final_list.data['unread_count'], 0)
        self.assertEqual(len(final_list.data['notifications']), 30)

    def test_cannot_mark_other_users_notification_as_read(self):
        self.client.force_authenticate(user=self.user)
        # Attempt to mark other_notif as read
        url = f'/api/notifications/{self.other_notif.notification_id}/read/'
        response = self.client.patch(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.other_notif.refresh_from_db()
        self.assertFalse(self.other_notif.is_read)

    def test_mark_non_existent_notification_returns_404(self):
        self.client.force_authenticate(user=self.user)
        url = '/api/notifications/999999/read/'
        response = self.client.patch(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_mark_all_notifications_as_read(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/notifications/read-all/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Notification.objects.filter(user=self.user, is_read=False).count(), 0)
        self.assertEqual(Notification.objects.filter(user=self.user, is_read=True).count(), 30)

        # Verify other user's notification remained untouched
        self.other_notif.refresh_from_db()
        self.assertFalse(self.other_notif.is_read)

        count_res = self.client.get('/api/notifications/unread-count/')
        self.assertEqual(count_res.data['unread_count'], 0)
