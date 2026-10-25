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
    Dynamic option managed in Support Ticket Management.

    These are reasons for a factory visit, not task checklists:
      * `visit_reason`     - the reason shared with the company owner.
      * `internal_reason`  - the confidential reason the visit is really made for.
      * `prechecklist`     - a pre-ticket check item that belongs to a problem
        category (`category`). It must be verified before a ticket is raised.
    """
    KIND_VISIT_REASON = 'visit_reason'
    KIND_INTERNAL_REASON = 'internal_reason'
    KIND_PRECHECKLIST = 'prechecklist'
    KIND_CHOICES = [
        (KIND_VISIT_REASON, 'Reason for visit (visible to client)'),
        (KIND_INTERNAL_REASON, 'Confidential reason for visit'),
        (KIND_PRECHECKLIST, 'Problem category pre-ticket check'),
    ]

    id = models.CharField(primary_key=True, default=generate_uuid, max_length=36, editable=False)
    kind = models.CharField(
        max_length=30,
        choices=KIND_CHOICES,
        default=KIND_VISIT_REASON,
        db_index=True,
    )
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
