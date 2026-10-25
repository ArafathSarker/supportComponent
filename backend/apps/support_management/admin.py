from django.contrib import admin

from .models import SupportEmployee, ChecklistOption, ProblemCategory


@admin.register(SupportEmployee)
class SupportEmployeeAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'designation', 'department', 'is_lead_engineer', 'is_active']
    list_filter = ['is_lead_engineer', 'is_active', 'department']
    search_fields = ['name', 'phone', 'designation', 'department']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(ChecklistOption)
class ChecklistOptionAdmin(admin.ModelAdmin):
    list_display = ['label', 'kind', 'category', 'sort_order', 'is_active']
    list_filter = ['is_active', 'kind', 'category']
    search_fields = ['label', 'category']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(ProblemCategory)
class ProblemCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'sort_order', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']
