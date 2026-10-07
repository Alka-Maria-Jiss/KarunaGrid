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

        # Ensure PostgreSQL sequences are synchronized to avoid primary key collision
        try:
            from django.db import connection
            if connection.vendor == 'postgresql':
                with connection.cursor() as cursor:
                    cursor.execute("""
                        DO $$
                        DECLARE
                            r RECORD;
                        BEGIN
                            FOR r IN
                                SELECT c.relname AS seq_name, t.relname AS table_name, a.attname AS col_name
                                FROM pg_class c
                                JOIN pg_depend d ON d.objid = c.oid
                                JOIN pg_class t ON t.oid = d.refobjid
                                JOIN pg_attribute a ON (a.attrelid = d.refobjid AND a.attnum = d.refobjsubid)
                                WHERE c.relkind = 'S' AND t.relkind = 'r'
                            LOOP
                                EXECUTE format('SELECT setval(%L, COALESCE((SELECT MAX(%I) FROM %I), 1))', r.seq_name, r.col_name, r.table_name);
                            END LOOP;
                        END $$;
                    """)
                self.stdout.write(self.style.SUCCESS("PostgreSQL sequences synchronized successfully."))
        except Exception as seq_err:
            self.stdout.write(self.style.WARNING(f"Sequence sync warning: {seq_err}"))

        self.stdout.write(self.style.SUCCESS(
            f"\n[OK] Admin Account Ready!\nEmail: {email}\nPassword: {password}\nRole: Administrator"
        ))
