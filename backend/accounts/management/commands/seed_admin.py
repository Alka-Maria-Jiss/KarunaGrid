from django.core.management.base import BaseCommand
from accounts.models import User, Role, Administrator


class Command(BaseCommand):
    help = 'Seeds or resets default administrator account'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, default='admin@karunagrid.com', help='Admin email address')
        parser.add_argument('--password', type=str, default='Admin@12345', help='Admin password')
        parser.add_argument('--name', type=str, default='System Administrator', help='Admin display name')

    def handle(self, *args, **options):
        email = options['email']
        password = options['password']
        name = options['name']

        user = User.objects.filter(email=email).first()
        if not user:
            user = User.objects.create_superuser(
                email=email,
                password=password,
                role=Role.ADMIN,
            )
            self.stdout.write(self.style.SUCCESS(f"Created new superuser: {email}"))
        else:
            user.set_password(password)
            user.role = Role.ADMIN
            user.is_staff = True
            user.is_superuser = True
            user.save()
            self.stdout.write(self.style.SUCCESS(f"Updated password and permissions for: {email}"))

        admin_profile, created = Administrator.objects.get_or_create(
            user=user,
            defaults={
                'name': name,
                'phone': '9876543210',
                'gender': 'Other',
                'qualification': 'Healthcare Administration',
                'experience': 5,
            }
        )
        if not created and admin_profile.name != name:
            admin_profile.name = name
            admin_profile.save()

        self.stdout.write(self.style.SUCCESS(
            f"\n[OK] Admin Account Ready!\nEmail: {email}\nPassword: {password}\nRole: Administrator"
        ))
