from django.db import models
from django.utils import timezone

from apps.core.utils import generate_uuid


class SupportEmployee(models.Model):
    """
    Master directory of support employees maintained by the Super Admin.

    These records power the searchable employee pickers used while dispatching
    a factory visit, so names and phone numbers never have to be typed manually.
    """
    id = models.CharField(primary_key=True, default=generate_uuid, max_length=36, editable=False)
    name = models.CharField(max_length=150, db_index=True)
    phone = models.CharField(max_length=50)
    designation = models.CharField(max_length=100, blank=True, default='')
    department = models.CharField(max_length=100, blank=True, default='')
    is_lead_engineer = models.BooleanField(
        default=True,
        help_text='Can this employee be selected as the main / lead visiting engineer?'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'support_employees'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.phone})"


class ChecklistOption(models.Model):
    """
    Dynamic dropdown option for the Super Admin's internal visit checklist.

    Options are managed in Support Ticket Management and are never exposed to
    company admins; they are used to build the internal on-site checklist.
    """
    id = models.CharField(primary_key=True, default=generate_uuid, max_length=36, editable=False)
    label = models.CharField(max_length=255, unique=True)
    category = models.CharField(max_length=100, blank=True, default='General')
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'support_checklist_options'
        ordering = ['sort_order', 'label']

    def __str__(self):
        return self.label
