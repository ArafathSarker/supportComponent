import uuid
from django.db import models
from django.utils import timezone

def generate_uuid_str():
    return str(uuid.uuid4())

class Ticket(models.Model):
    id = models.CharField(max_length=36, primary_key=True, default=generate_uuid_str, editable=False)
    ticket_code = models.CharField(max_length=30, unique=True, db_index=True)
    title = models.CharField(max_length=255)
    affected_system = models.CharField(max_length=100, default="General System")
    category = models.CharField(max_length=100)
    urgency = models.CharField(max_length=30, default="Medium")
    description = models.TextField()
    status = models.CharField(max_length=50, default="Open")  # Open, Under Review, In Progress, Pending Customer Close, Closed
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
        return f"{self.ticket_code} - {self.title}"


class TicketMessage(models.Model):
    id = models.CharField(max_length=36, primary_key=True, default=generate_uuid_str, editable=False)
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="messages", db_index=True)
    sender_name = models.CharField(max_length=100)
    sender_role = models.CharField(max_length=50)  # company_admin, super_admin, system
    message = models.TextField()
    attachment_url = models.CharField(max_length=500, null=True, blank=True)
    attachment_name = models.CharField(max_length=255, null=True, blank=True)
    is_system_event = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'ticket_messages'
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.ticket.ticket_code}] {self.sender_name}: {self.message[:30]}"


class TicketAttachment(models.Model):
    id = models.CharField(max_length=36, primary_key=True, default=generate_uuid_str, editable=False)
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="attachments", db_index=True)
    file_name = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    file_type = models.CharField(max_length=100, null=True, blank=True)
    file_size = models.IntegerField(default=0)
    uploaded_by = models.CharField(max_length=100)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'ticket_attachments'
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.ticket.ticket_code}] {self.file_name}"


class VisitingReport(models.Model):
    id = models.CharField(max_length=36, primary_key=True, default=generate_uuid_str, editable=False)
    visit_code = models.CharField(max_length=30, unique=True, db_index=True)
    ticket = models.ForeignKey(Ticket, on_delete=models.SET_NULL, null=True, blank=True, related_name="visiting_reports")
    company_name = models.CharField(max_length=150)
    target_system = models.CharField(max_length=150)
    visiting_engineers = models.CharField(max_length=255)
    purpose = models.TextField()
    scheduled_date = models.CharField(max_length=100)
    estimated_duration = models.CharField(max_length=50, default="2 Hours")
    entry_requirements = models.CharField(max_length=255, default="Standard Factory Safety Equipment & Gate Pass")
    status = models.CharField(max_length=50, default="Pending Acknowledgement")  # Pending Acknowledgement, Acknowledged, Completed, Cancelled
    super_admin_notes = models.TextField(null=True, blank=True)
    company_acknowledgement_notes = models.TextField(null=True, blank=True)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    acknowledged_by = models.CharField(max_length=100, null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    service_summary = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'visiting_reports'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.visit_code} - {self.company_name}"
