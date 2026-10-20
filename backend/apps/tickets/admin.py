from django.contrib import admin
from .models import Ticket, TicketAttachment


class TicketAttachmentInline(admin.TabularInline):
    model = TicketAttachment
    extra = 0
    readonly_fields = ['id', 'created_at']


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ['ticket_code', 'title', 'company_name', 'category', 'urgency', 'status', 'created_at']
    list_filter = ['status', 'urgency', 'category', 'company_name']
    search_fields = ['ticket_code', 'title', 'description', 'company_name', 'created_by_name']
    inlines = [TicketAttachmentInline]
    readonly_fields = ['id', 'ticket_code', 'created_at', 'updated_at']


@admin.register(TicketAttachment)
class TicketAttachmentAdmin(admin.ModelAdmin):
    list_display = ['file_name', 'ticket', 'file_type', 'file_size', 'uploaded_by', 'created_at']
    search_fields = ['file_name', 'uploaded_by', 'ticket__ticket_code']
