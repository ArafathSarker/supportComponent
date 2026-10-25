from django.db import migrations, models


def convert_checklists_to_reasons(apps, schema_editor):
    """
    The old lists held on-site tasks with solved/unsolved + company_checked marks.
    They now hold reasons for the visit, so keep only the identity and the text.
    """
    VisitingReport = apps.get_model('visiting', 'VisitingReport')

    for report in VisitingReport.objects.all():
        changed = False

        for field in ('visit_reasons', 'internal_visit_reasons'):
            items = getattr(report, field) or []
            converted = []
            for index, item in enumerate(items):
                if isinstance(item, dict):
                    converted.append({
                        'id': item.get('id') or f'reason-{index + 1}',
                        'label': item.get('label') or item.get('task') or '',
                        'option_id': item.get('option_id'),
                    })
                elif isinstance(item, str):
                    converted.append({
                        'id': f'reason-{index + 1}',
                        'label': item,
                        'option_id': None,
                    })
            setattr(report, field, converted)
            changed = True

        flagged = report.flag_checklist_items or []
        audit = []
        for index, item in enumerate(flagged):
            if isinstance(item, dict):
                audit.append({
                    'id': item.get('id') or f'pre-{index + 1}',
                    'task': item.get('task') or item.get('label') or '',
                    'status': 'flagged',
                    'note': item.get('flag_note') or '',
                })
        report.prechecklist_audit = audit
        changed = True

        if changed:
            report.save()


class Migration(migrations.Migration):

    dependencies = [
        ('visiting', '0004_visitingreport_flag_checklist_items_and_more'),
    ]

    operations = [
        migrations.RenameField(
            model_name='visitingreport',
            old_name='visit_checklist',
            new_name='visit_reasons',
        ),
        migrations.RenameField(
            model_name='visitingreport',
            old_name='super_admin_checklist',
            new_name='internal_visit_reasons',
        ),
        migrations.AddField(
            model_name='visitingreport',
            name='prechecklist_audit',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.RunPython(convert_checklists_to_reasons, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='visitingreport',
            name='flag_checklist_items',
        ),
    ]
