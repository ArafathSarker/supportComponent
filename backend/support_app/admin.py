from django.contrib import admin
from .models import Ticket, TicketMessage, TicketAttachment, VisitingReport

@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ('ticket_code', 'title', 'company_name', 'affected_system', 'category', 'urgency', 'status', 'created_at')
    list_filter = ('status', 'urgency', 'category', 'company_name')
    search_fields = ('ticket_code', 'title', 'description', 'company_name', 'affected_system')


@admin.register(TicketMessage)
class TicketMessageAdmin(admin.ModelAdmin):
    list_display = ('ticket', 'sender_name', 'sender_role', 'is_system_event', 'created_at')
    list_filter = ('sender_role', 'is_system_event')
    search_fields = ('message', 'sender_name')


@admin.register(TicketAttachment)
class TicketAttachmentAdmin(admin.ModelAdmin):
    list_display = ('ticket', 'file_name', 'file_size', 'uploaded_by', 'created_at')
    search_fields = ('file_name', 'uploaded_by')


@admin.register(VisitingReport)
class VisitingReportAdmin(admin.ModelAdmin):
    list_display = ('visit_code', 'company_name', 'target_system', 'status', 'scheduled_date', 'acknowledged_by')
    list_filter = ('status', 'company_name')
    search_fields = ('visit_code', 'company_name', 'target_system', 'visiting_engineers')
