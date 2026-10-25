from django.db import migrations
from django.utils import timezone


EMPLOYEES = [
    {
        'id': 'emp-rezaul-karim',
        'name': 'Engr. Rezaul Karim',
        'phone': '+880 1712-345678',
        'designation': 'Lead Field Engineer',
        'department': 'Field Service',
        'is_lead_engineer': True,
    },
    {
        'id': 'emp-shahin-alam',
        'name': 'Engr. Shahin Alam',
        'phone': '+880 1811-223344',
        'designation': 'Hardware Specialist',
        'department': 'Field Service',
        'is_lead_engineer': True,
    },
    {
        'id': 'emp-md-kabir',
        'name': 'Md. Kabir',
        'phone': '+880 1912-556677',
        'designation': 'Field Electrician',
        'department': 'Electrical',
        'is_lead_engineer': False,
    },
    {
        'id': 'emp-sumaiya-akter',
        'name': 'Sumaiya Akter',
        'phone': '+880 1611-889900',
        'designation': 'IoT Support Engineer',
        'department': 'Field Service',
        'is_lead_engineer': True,
    },
]

CHECKLIST_OPTIONS = [
    ('Verify control panel wiring and terminal tightness', 'Electrical', 10),
    ('Inspect sensor mounting and optical alignment', 'Sensors', 20),
    ('Calibrate telemetry / SCADA readings', 'Calibration', 30),
    ('Check gateway network and signal strength', 'Network', 40),
    ('Update device firmware to latest stable release', 'Firmware', 50),
    ('Validate safety interlocks before handover', 'Safety', 60),
    ('Clean and service enclosure / cabinet', 'Maintenance', 70),
    ('Capture before/after photo evidence', 'Documentation', 80),
]


def seed_demo_directory(apps, schema_editor):
    """
    Seed a small starter directory so the plug-and-play demo works out of the box.
    Everything here can be edited or removed from Support Ticket Management.
    """
    SupportEmployee = apps.get_model('support_management', 'SupportEmployee')
    ChecklistOption = apps.get_model('support_management', 'ChecklistOption')

    for employee in EMPLOYEES:
        SupportEmployee.objects.get_or_create(
            id=employee['id'],
            defaults={
                'name': employee['name'],
                'phone': employee['phone'],
                'designation': employee['designation'],
                'department': employee['department'],
                'is_lead_engineer': employee['is_lead_engineer'],
                'is_active': True,
                'created_at': timezone.now(),
            },
        )

    for label, category, sort_order in CHECKLIST_OPTIONS:
        ChecklistOption.objects.get_or_create(
            label=label,
            defaults={
                'category': category,
                'sort_order': sort_order,
                'is_active': True,
                'created_at': timezone.now(),
            },
        )


def unseed_demo_directory(apps, schema_editor):
    SupportEmployee = apps.get_model('support_management', 'SupportEmployee')
    ChecklistOption = apps.get_model('support_management', 'ChecklistOption')

    SupportEmployee.objects.filter(id__in=[e['id'] for e in EMPLOYEES]).delete()
    ChecklistOption.objects.filter(label__in=[o[0] for o in CHECKLIST_OPTIONS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('support_management', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_demo_directory, unseed_demo_directory),
    ]
