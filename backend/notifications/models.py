from django.db import models


class Notification(models.Model):
    notification_id = models.AutoField(primary_key=True)
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, db_column='user_id')
    type = models.CharField(max_length=50, null=True, blank=True)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'

    def __str__(self):
        return f"Notification #{self.notification_id} for User #{self.user_id} - Read: {self.is_read}"
