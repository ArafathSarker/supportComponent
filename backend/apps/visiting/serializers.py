from rest_framework import serializers
from .models import VisitingReport


class VisitingReportSerializer(serializers.ModelSerializer):
    """
    Full serializer for field visiting inspection reports.
    """
    ticket_id = serializers.CharField(source='ticket.id', read_only=True, allow_null=True)

    class Meta:
        model = VisitingReport
        fields = [
            'id',
            'visit_code',
            'ticket_id',
            'company_name',
            'target_system',
            'priority',
            'line_number',
            'floor_location',
            'visiting_engineers',
            'purpose',
            'scheduled_date',
            'estimated_duration',
            'entry_requirements',
            'status',
            'super_admin_notes',
            'company_acknowledgement_notes',
            'acknowledged_at',
            'acknowledged_by',
            'completed_at',
            'service_summary',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'visit_code', 'created_at', 'updated_at']


class VisitingReportCreateSerializer(serializers.Serializer):
    """
    Validation schema for scheduling a visiting report (Solution Provider only).
    """
    company_name = serializers.CharField(max_length=150)
    target_system = serializers.CharField(max_length=150)
    priority = serializers.CharField(max_length=30, default="High", required=False)
    line_number = serializers.CharField(max_length=100, default="", required=False, allow_blank=True)
    floor_location = serializers.CharField(max_length=100, default="", required=False, allow_blank=True)
    visiting_engineers = serializers.CharField(max_length=255)
    purpose = serializers.CharField()
    scheduled_date = serializers.CharField(max_length=100)
    estimated_duration = serializers.CharField(max_length=50, default="2 Hours", required=False)
    entry_requirements = serializers.CharField(
        max_length=255,
        default="Standard Factory Safety Equipment & Gate Pass",
        required=False
    )
    super_admin_notes = serializers.CharField(required=False, allow_blank=True, default="")
    ticket_id = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)


class VisitingReportAcknowledgeSerializer(serializers.Serializer):
    """
    Validation schema for acknowledging a scheduled report (Company Admin).
    """
    company_acknowledgement_notes = serializers.CharField(required=False, allow_blank=True, default="")
    acknowledged_by = serializers.CharField(max_length=100, default="Arafath", required=False)


class VisitingReportCompleteSerializer(serializers.Serializer):
    """
    Validation schema for completing a field visit report (Solution Provider).
    """
    service_summary = serializers.CharField(required=True)
