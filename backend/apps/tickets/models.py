from django.db import models
from django.utils import timezone
from apps.core.utils import generate_uuid


class Ticket(models.Model):
    """
    Core support ticket entity representing customer issues and requests.
    """
    id = models.CharField(primary_key=True, default=generate_uuid, max_length=36, editable=False)
    ticket_code = models.CharField(max_length=30, unique=True, db_index=True)
    title = models.CharField(max_length=255)
    affected_system = models.CharField(max_length=100, default="General System")
    category = models.CharField(max_length=100)
    urgency = models.CharField(max_length=30, default="Medium")
    description = models.TextField()
    status = models.CharField(max_length=50, default="Open")
    company_name = models.CharField(max_length=150, default="CSI Smart Tech Ltd")
    created_by_name = models.CharField(max_length=100, default="Arafath")
    created_by_role = models.CharField(max_length=50, default="company_admin")
    closed_at = models.DateTimeField(null=True, blank=True)
    closed_by = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tickets'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.ticket_code} - {self.title} ({self.status})"


class TicketAttachment(models.Model):
    """
    Attachments and media evidence linked to a support ticket.
    """
    id = models.CharField(primary_key=True, default=generate_uuid, max_length=36, editable=False)
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='attachments')
    file_name = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    file_type = models.CharField(max_length=100, blank=True, null=True)
    file_size = models.IntegerField(default=0)
    uploaded_by = models.CharField(max_length=100)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'ticket_attachments'
        ordering = ['created_at']

    def __str__(self):
        return f"{self.file_name} for {self.ticket.ticket_code}"
