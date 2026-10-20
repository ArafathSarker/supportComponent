from django.db import models
from django.utils import timezone
from apps.core.utils import generate_uuid


class TicketMessage(models.Model):
    """
    Real-time chat messages and audit timeline events attached to a ticket.
    """
    id = models.CharField(primary_key=True, default=generate_uuid, max_length=36, editable=False)
    ticket = models.ForeignKey(
        'tickets.Ticket',
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender_name = models.CharField(max_length=100)
    sender_role = models.CharField(max_length=50)
    message = models.TextField()
    attachment_url = models.CharField(max_length=500, blank=True, null=True)
    attachment_name = models.CharField(max_length=255, blank=True, null=True)
    is_system_event = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'ticket_messages'
        ordering = ['created_at']

    def __str__(self):
        return f"[{self.sender_role}] {self.sender_name}: {self.message[:30]}"
