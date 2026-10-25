from django.db import migrations, models
from django.utils import timezone

from apps.core.utils import generate_uuid


# Problem categories and the pre-ticket checks the company must verify before
# raising a ticket for that category. Both are editable from Support Ticket
# Management; this is only the initial seed so the ticket form is usable.
PROBLEM_CATEGORIES = {
    'Hardware / Sensor / Device Problem': [
        'Cleaned optical sensor lens and reflector of fabric lint, thread debris, and machine oil',
        'Checked that 24V DC / 5V DC auxiliary power adapter LED indicator is actively illuminated',
        'Verified sensor alignment and mechanical gap (standard tolerance is 1.5mm - 3.0mm)',
        'Performed a 30-second power-cycle on the sensor junction terminal box',
    ],
    'Software / Firmware / App Bug': [
        'Checked system event logs or tablet crash dialog for exception error codes',
        'Verified edge controller is running certified stable firmware release',
        'Cleared local application cache and restarted the logging application',
        'Tested service connectivity to MQTT broker endpoint',
    ],
    'Network / Connectivity Issue': [
        'Verified physical Ethernet RJ-45 PoE link LED lights are flashing green/amber',
        'Confirmed external LoRaWAN / Wi-Fi antenna is upright and firmly screwed on',
        'Power-cycled the industrial gateway or PoE power injector for 60 seconds',
        'Verified factory floor LAN switch port and upstream gateway route are online',
    ],
    'Data / Export / Reporting Issue': [
        'Checked if raw live telemetry is actively streaming in the dashboard before export',
        'Verified query date range does not exceed standard 90-day archive bounds',
        'Tested exporting data in alternate format (e.g. CSV instead of Excel)',
        'Confirmed browser popup blocker is not suppressing file download',
    ],
    'SCADA / Dashboard / Display Issue': [
        'Verified browser WebSocket status indicator in top-right indicates "Connected"',
        'Performed a hard page reload (Ctrl + Shift + R) on the display computer',
        'Inspected HDMI video cable and power adapter to the display micro-PC',
        'Confirmed SCADA WebSocket server endpoint is accessible from display terminal',
    ],
    'User Account / Access / Permission': [
        'Verified correct spelling of user email address and employee code',
        'Confirmed user account is marked active in company user registry',
        'Checked if password reset link was received in registered inbox',
        'Verified user is accessing system from authorized company network IP',
    ],
    'Billing / Subscription / License': [
        'Checked current active machine count against licensed quota',
        'Reviewed subscription expiration date on billing dashboard',
        'Confirmed official corporate finance contact details are updated',
    ],
    'Installation / Commissioning': [
        'Verified factory floor power drops (24V DC / 220V AC) are pre-wired and tested',
        'Confirmed network cable drop (PoE RJ-45) is installed at gateway mounting point',
        'Inspected sensor bracket clearance with sewing machine mechanical moving parts',
        'Prepared machine asset serial number list for digital twin registration',
    ],
    'Other / General Enquiry': [
        'Reviewed system user guides and troubleshooting documentation',
        'Verified contact phone number and factory location details',
        'Compiled specific requirements or diagnostic notes for support team',
    ],
    'Sewing Machine IoT Tracker & Needle Sensor': [
        'Cleaned optical sensor lens and reflector of fabric lint, thread debris, and machine oil',
        'Verified sensor alignment with handwheel magnet / reflector (gap must be 1.5mm - 3.0mm)',
        'Checked that 24V DC / 5V DC power adapter LED indicator is actively illuminated',
        'Conducted a 15-second power-cycle on the sewing machine IoT junction box',
    ],
    'Factory Floor LoRaWAN / WiFi Edge Gateway': [
        'Verified physical Ethernet RJ-45 link lights (Green/Amber LED) on the gateway port',
        'Confirmed the overhead line electrical power bus and PoE injector are energized',
        'Verified whether adjacent line gateways on the same floor are transmitting data',
        'Pressed the soft reboot switch or cycled AC breaker for the gateway circuit',
    ],
    'Steam Boiler, Steam Iron & Compressor Pressure IoT': [
        'Cross-checked physical analog needle dial gauge with digital IoT telemetry value',
        'Confirmed the manual 1/4-turn isolation ball valve to the pressure sensor is fully open',
        'Inspected the 4-20mA pressure transmitter junction box for steam moisture or heat damage',
        'Verified compressor air dryer dewpoint and condensate auto-drain are functioning',
    ],
    'RFID & Barcode Garment Bundle Tracking Terminal': [
        'Cleaned optical glass scanner exit window with dry lint-free cloth',
        'Tested scanning a known good master barcode calibration sheet',
        'Checked that the scanner battery is above 20% or USB plug is firmly seated',
        'Restarted the Garment Production Tracking tablet application',
    ],
    'Fabric Spreading & CNC Cutting Machine IoT': [
        'Inspected cutting table vacuum exhaust filter and cleared accumulated fabric fluff',
        'Confirmed all safety light curtains and emergency stop push-buttons are released',
        'Verified 3-phase industrial power supply voltage meters are balanced',
        'Checked CNC servo drive display for thermal warning or overcurrent trip',
    ],
}


def create_problem_categories(apps, schema_editor):
    ChecklistOption = apps.get_model('support_management', 'ChecklistOption')
    ProblemCategory = apps.get_model('support_management', 'ProblemCategory')

    # Pre-ticket checks used to be stored as checklist options. The built-in
    # categories are re-seeded from the canonical list below; any category an
    # admin added by hand is carried over as its own problem category.
    existing = {}
    for option in ChecklistOption.objects.filter(kind='prechecklist').order_by(
        'category', 'sort_order', 'label'
    ):
        existing.setdefault(option.category or 'General', []).append(option.label)

    for index, (name, seed_items) in enumerate(PROBLEM_CATEGORIES.items(), start=1):
        existing.pop(name, None)
        ProblemCategory.objects.update_or_create(
            name=name,
            defaults={
                'checklist': list(dict.fromkeys(seed_items)),
                'sort_order': index * 10,
                'is_active': True,
                'created_at': timezone.now(),
            },
        )

    next_order = (len(PROBLEM_CATEGORIES) + 1) * 10
    for name, items in existing.items():
        ProblemCategory.objects.update_or_create(
            name=name,
            defaults={
                'checklist': list(dict.fromkeys(items)),
                'sort_order': next_order,
                'is_active': True,
                'created_at': timezone.now(),
            },
        )
        next_order += 10

    ChecklistOption.objects.filter(kind='prechecklist').delete()


def restore_prechecklist_options(apps, schema_editor):
    ChecklistOption = apps.get_model('support_management', 'ChecklistOption')
    ProblemCategory = apps.get_model('support_management', 'ProblemCategory')

    for category in ProblemCategory.objects.all().order_by('sort_order', 'name'):
        for index, label in enumerate(category.checklist or [], start=1):
            ChecklistOption.objects.get_or_create(
                label=label,
                defaults={
                    'kind': 'prechecklist',
                    'category': category.name,
                    'sort_order': index * 10,
                    'is_active': True,
                    'created_at': timezone.now(),
                },
            )

    ProblemCategory.objects.filter(name__in=PROBLEM_CATEGORIES.keys()).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('support_management', '0003_checklistoption_kind_and_seed_reasons'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProblemCategory',
            fields=[
                ('id', models.CharField(default=generate_uuid, editable=False, max_length=36, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=150, unique=True)),
                ('description', models.CharField(blank=True, default='', max_length=255)),
                ('checklist', models.JSONField(blank=True, default=list, help_text='Pre-ticket checks the company must verify before raising a ticket.')),
                ('sort_order', models.IntegerField(default=0)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(default=timezone.now)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'db_table': 'support_problem_categories',
                'ordering': ['sort_order', 'name'],
            },
        ),
        migrations.RunPython(create_problem_categories, restore_prechecklist_options),
        migrations.AlterField(
            model_name='checklistoption',
            name='kind',
            field=models.CharField(
                choices=[
                    ('visit_reason', 'Reason for visit (visible to client)'),
                    ('internal_reason', 'Confidential reason for visit'),
                ],
                db_index=True,
                default='visit_reason',
                max_length=30,
            ),
        ),
    ]
