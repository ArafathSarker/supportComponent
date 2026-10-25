from django.db import migrations, models
from django.utils import timezone


VISIT_REASONS = [
    ('Scheduled preventive maintenance of IoT hardware', 'Maintenance', 10),
    ('Recurring telemetry / sensor fault investigation', 'Diagnostics', 20),
    ('Network and gateway connectivity troubleshooting', 'Network', 30),
    ('New machine IoT installation and commissioning', 'Installation', 40),
    ('Production reporting and data reconciliation', 'Reporting', 50),
    ('Operator and supervisor system training', 'Training', 60),
    ('Safety audit and compliance verification', 'Safety', 70),
]

INTERNAL_REASONS = [
    ('Verify the factory followed the pre-ticket checks before raising the ticket', 'Audit', 10),
    ('Inspect recurring faults that the pre-ticket checks should have prevented', 'Audit', 20),
    ('Assess whether the reported fault was actually a simple user-side issue', 'Assessment', 30),
    ('Evaluate sensor placement and installation quality on site', 'Assessment', 40),
    ('Validate the customer-reported telemetry readings against the physical gauges', 'Validation', 50),
]

PRECHECKLIST = {
    'Hardware / Sensor / Device Problem': [
        ('Cleaned optical sensor lens and reflector of lint, thread debris, and machine oil', 10),
        ('Verified the auxiliary power adapter LED indicator is illuminated', 20),
        ('Checked sensor alignment and mechanical gap (1.5mm - 3.0mm)', 30),
        ('Performed a 30-second power-cycle on the sensor junction box', 40),
    ],
    'Software / Firmware / App Bug': [
        ('Checked system event logs or tablet crash dialog for error codes', 10),
        ('Verified the edge controller runs a certified stable firmware release', 20),
        ('Cleared the local application cache and restarted the logging application', 30),
        ('Tested connectivity to the MQTT broker endpoint', 40),
    ],
    'Network / Connectivity Issue': [
        ('Verified physical Ethernet PoE link LED lights are flashing green/amber', 10),
        ('Confirmed the external antenna is upright and firmly screwed on', 20),
        ('Power-cycled the industrial gateway or PoE injector for 60 seconds', 30),
        ('Verified the floor LAN switch port and upstream route are online', 40),
    ],
    'Sewing Machine IoT Tracker & Needle Sensor': [
        ('Cleaned the optical sensor lens and reflector of lint and machine oil', 10),
        ('Verified sensor alignment with the handwheel magnet / reflector', 20),
        ('Checked the 24V DC / 5V DC power adapter LED indicator', 30),
        ('Conducted a 15-second power-cycle on the machine IoT junction box', 40),
    ],
    'Factory Floor LoRaWAN / WiFi Edge Gateway': [
        ('Verified physical Ethernet RJ-45 link lights on the gateway port', 10),
        ('Confirmed the overhead power bus and PoE injector are energized', 20),
        ('Checked whether adjacent line gateways are transmitting data', 30),
        ('Pressed the soft reboot switch or cycled the gateway breaker', 40),
    ],
    'Steam Boiler, Steam Iron & Compressor Pressure IoT': [
        ('Cross-checked the physical analog gauge with the IoT telemetry value', 10),
        ('Confirmed the isolation ball valve to the pressure sensor is fully open', 20),
        ('Inspected the 4-20mA transmitter junction box for moisture or heat damage', 30),
        ('Verified the air dryer dewpoint and condensate auto-drain', 40),
    ],
}


def seed_reasons_and_prechecks(apps, schema_editor):
    ChecklistOption = apps.get_model('support_management', 'ChecklistOption')

    # The options that existed before this change were the internal (confidential)
    # on-site checks, so keep them provider-only.
    ChecklistOption.objects.filter(kind='visit_reason').update(kind='internal_reason')

    for label, category, sort_order in VISIT_REASONS:
        ChecklistOption.objects.get_or_create(
            label=label,
            defaults={
                'kind': 'visit_reason',
                'category': category,
                'sort_order': sort_order,
                'is_active': True,
                'created_at': timezone.now(),
            },
        )

    for label, category, sort_order in INTERNAL_REASONS:
        ChecklistOption.objects.get_or_create(
            label=label,
            defaults={
                'kind': 'internal_reason',
                'category': category,
                'sort_order': sort_order,
                'is_active': True,
                'created_at': timezone.now(),
            },
        )

    for problem_category, items in PRECHECKLIST.items():
        for label, sort_order in items:
            ChecklistOption.objects.get_or_create(
                label=label,
                defaults={
                    'kind': 'prechecklist',
                    'category': problem_category,
                    'sort_order': sort_order,
                    'is_active': True,
                    'created_at': timezone.now(),
                },
            )


def unseed_reasons_and_prechecks(apps, schema_editor):
    ChecklistOption = apps.get_model('support_management', 'ChecklistOption')
    labels = (
        [item[0] for item in VISIT_REASONS]
        + [item[0] for item in INTERNAL_REASONS]
        + [label for items in PRECHECKLIST.values() for label, _ in items]
    )
    ChecklistOption.objects.filter(label__in=labels).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('support_management', '0002_seed_demo_directory'),
    ]

    operations = [
        migrations.AddField(
            model_name='checklistoption',
            name='kind',
            field=models.CharField(
                choices=[
                    ('visit_reason', 'Reason for visit (visible to client)'),
                    ('internal_reason', 'Confidential reason for visit'),
                    ('prechecklist', 'Problem category pre-ticket check'),
                ],
                db_index=True,
                default='visit_reason',
                max_length=30,
            ),
        ),
        migrations.RunPython(seed_reasons_and_prechecks, unseed_reasons_and_prechecks),
    ]
