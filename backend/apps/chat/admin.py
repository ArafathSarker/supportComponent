from django.contrib import admin
from .models import TicketMessage


@admin.register(TicketMessage)
class TicketMessageAdmin(admin.ModelAdmin):
    list_display = ['ticket', 'sender_name', 'sender_role', 'is_system_event', 'created_at']
    list_filter = ['sender_role', 'is_system_event', 'created_at']
    search_fields = ['message', 'sender_name', 'ticket__ticket_code']
    readonly_fields = ['id', 'created_at']
