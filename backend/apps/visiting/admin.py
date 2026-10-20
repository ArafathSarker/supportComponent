from django.contrib import admin
from .models import VisitingReport


@admin.register(VisitingReport)
class VisitingReportAdmin(admin.ModelAdmin):
    list_display = [
        'visit_code',
        'company_name',
        'target_system',
        'visiting_engineers',
        'scheduled_date',
        'status',
        'created_at',
    ]
    list_filter = ['status', 'company_name']
    search_fields = ['visit_code', 'company_name', 'target_system', 'visiting_engineers']
    readonly_fields = ['id', 'visit_code', 'created_at', 'updated_at']
