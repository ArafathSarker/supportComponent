from django.db import models
from django.utils import timezone
from apps.core.utils import generate_uuid


class VisitingReport(models.Model):
    """
    On-site field engineering visit reports and scheduled inspections.
    """
    id = models.CharField(primary_key=True, default=generate_uuid, max_length=36, editable=False)
    visit_code = models.CharField(max_length=30, unique=True, db_index=True)
    ticket = models.ForeignKey(
        'tickets.Ticket',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='visiting_reports'
    )
    company_name = models.CharField(max_length=150)
    target_system = models.CharField(max_length=150)
    priority = models.CharField(max_length=30, default="High", blank=True)
    line_number = models.CharField(max_length=100, blank=True, default="")
    floor_location = models.CharField(max_length=100, blank=True, default="")
    visiting_engineers = models.CharField(max_length=255)
    purpose = models.TextField()
    scheduled_date = models.CharField(max_length=100)
    estimated_duration = models.CharField(max_length=50, default="2 Hours")
    entry_requirements = models.CharField(
        max_length=255,
        default="Standard Factory Safety Equipment & Gate Pass"
    )
    status = models.CharField(max_length=50, default="Pending Acknowledgement")
    super_admin_notes = models.TextField(blank=True, null=True)
    company_acknowledgement_notes = models.TextField(blank=True, null=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    acknowledged_by = models.CharField(max_length=100, null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    service_summary = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'visiting_reports'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.visit_code} - {self.company_name} ({self.status})"
