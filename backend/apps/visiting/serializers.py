from rest_framework import serializers
from .models import VisitingReport


# Fields that must never leak to the company owner / client side.
SUPER_ADMIN_ONLY_FIELDS = (
    'internal_visit_reasons',
    'prechecklist_audit',
    'is_flagged',
    'flag_reason',
    'flagged_at',
    'flagged_by',
)


def _clean_team_members(members, is_super_admin: bool):
    """Company side sees who is visiting, but not every member's phone number."""
    if is_super_admin or not isinstance(members, list):
        return members
    cleaned = []
    for member in members:
        if isinstance(member, dict):
            cleaned.append({
                'employee_id': member.get('employee_id', ''),
                'name': member.get('name', ''),
                'designation': member.get('designation', ''),
            })
        else:
            cleaned.append(member)
    return cleaned


class VisitingReportSerializer(serializers.ModelSerializer):
    """
    Full serializer for field visiting inspection reports.

    Role-aware output:
      * Super Admin receives the confidential visit reason, the prechecklist
        audit and live headcount.
      * Company Admin receives only the visit reason shared with them and the
        headcount when the super admin has enabled the visibility toggle.
    """
    ticket_id = serializers.CharField(source='ticket.id', read_only=True, allow_null=True)
    ticket_code = serializers.SerializerMethodField()
    ticket_title = serializers.SerializerMethodField()
    ticket_prechecklist = serializers.SerializerMethodField()
    lead_employee_id = serializers.SerializerMethodField()

    def get_ticket_code(self, obj):
        return obj.ticket.ticket_code if obj.ticket else None

    def get_ticket_title(self, obj):
        return obj.ticket.title if obj.ticket else None

    def get_ticket_prechecklist(self, obj):
        """The problem-category checks recorded on the linked ticket."""
        if not obj.ticket:
            return []
        items = obj.ticket.prechecklist
        if isinstance(items, list) and items:
            return items
        # Legacy tickets only stored the verified labels.
        checklist = obj.ticket.troubleshooting_checklist
        if isinstance(checklist, list):
            return [{'label': label, 'checked': True} for label in checklist]
        return []

    def get_lead_employee_id(self, obj):
        return obj.lead_employee_id

    class Meta:
        model = VisitingReport
        fields = [
            'id',
            'visit_code',
            'ticket_id',
            'ticket_code',
            'ticket_title',
            'ticket_prechecklist',
            'company_name',
            'target_system',
            'priority',
            'line_number',
            'floor_location',
            'visiting_engineers',
            'lead_engineer',
            'lead_engineer_phone',
            'lead_employee_id',
            'visiting_team_names',
            'visiting_team_members',
            'total_visitors',
            'visit_reasons',
            'internal_visit_reasons',
            'show_visitor_count',
            'host_name',
            'host_phone',
            'prechecklist_audit',
            'is_flagged',
            'flag_reason',
            'flagged_at',
            'flagged_by',
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
            'is_resolved',
            'resolution_notes',
            'client_is_resolved',
            'client_resolution_notes',
            'client_resolved_at',
            'client_resolved_by',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'visit_code', 'created_at', 'updated_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        role = self.context.get('role') or 'super_admin'
        is_super_admin = role == 'super_admin'

        if not is_super_admin:
            for field_name in SUPER_ADMIN_ONLY_FIELDS:
                data.pop(field_name, None)

            # Headcount toggle: hide the total visitor number from the client.
            if not instance.show_visitor_count:
                data.pop('total_visitors', None)

            data['visiting_team_members'] = _clean_team_members(
                data.get('visiting_team_members'), is_super_admin=False
            )

        return data


class VisitingReportCreateSerializer(serializers.Serializer):
    """
    Validation schema for scheduling a visiting report (Solution Provider only).
    """
    company_name = serializers.CharField(max_length=150)
    target_system = serializers.CharField(max_length=150)
    priority = serializers.CharField(max_length=30, default="High", required=False)
    line_number = serializers.CharField(max_length=100, default="", required=False, allow_blank=True)
    floor_location = serializers.CharField(max_length=100, default="", required=False, allow_blank=True)
    visiting_engineers = serializers.CharField(max_length=255, required=False, default="")
    lead_engineer = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    lead_engineer_phone = serializers.CharField(max_length=50, required=False, allow_blank=True, default="")
    lead_employee_id = serializers.CharField(
        max_length=36, required=False, allow_blank=True, allow_null=True, default=None
    )
    visiting_team_names = serializers.CharField(required=False, allow_blank=True, default="")
    visiting_team_members = serializers.ListField(
        child=serializers.DictField(), required=False, default=list
    )
    total_visitors = serializers.IntegerField(required=False, default=1)
    host_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    host_phone = serializers.CharField(max_length=50, required=False, allow_blank=True, default="")
    visit_reasons = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    internal_visit_reasons = serializers.ListField(
        child=serializers.DictField(), required=False, default=list
    )
    show_visitor_count = serializers.BooleanField(required=False, default=True)
    purpose = serializers.CharField(required=False, allow_blank=True, default="")
    scheduled_date = serializers.CharField(max_length=100)
    estimated_duration = serializers.CharField(max_length=50, default="2 Hours", required=False, allow_blank=True)
    entry_requirements = serializers.CharField(
        max_length=255,
        default="Standard Factory Safety Equipment & Gate Pass",
        required=False,
        allow_blank=True
    )
    super_admin_notes = serializers.CharField(required=False, allow_blank=True, default="")
    ticket_id = serializers.CharField(required=False, allow_blank=True, allow_null=True, default=None)


class VisitingReportAcknowledgeSerializer(serializers.Serializer):
    """
    Validation schema for acknowledging a scheduled report (Company Admin).

    The company names the person who will welcome the visiting team on site.
    """
    company_acknowledgement_notes = serializers.CharField(required=False, allow_blank=True, default="")
    acknowledged_by = serializers.CharField(max_length=100, default="", required=False, allow_blank=True)
    host_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    host_phone = serializers.CharField(max_length=50, required=False, allow_blank=True, default="")


class VisitingReportCompleteSerializer(serializers.Serializer):
    """
    Validation schema for completing a field visit report (Solution Provider).

    Flags only: a pre-ticket check is either flagged (claimed by the company but
    not actually done) or left clean. `is_resolved` records the final verdict on
    whether the visit solved the reported problem.
    """
    service_summary = serializers.CharField(required=False, allow_blank=True, default="")
    prechecklist_audit = serializers.ListField(
        child=serializers.DictField(), required=False, default=list
    )
    is_flagged = serializers.BooleanField(required=False, default=False)
    flag_reason = serializers.CharField(required=False, allow_blank=True, default="")
    is_resolved = serializers.BooleanField()
    resolution_notes = serializers.CharField(required=False, allow_blank=True, default="")
    host_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default="")
    host_phone = serializers.CharField(max_length=50, required=False, allow_blank=True, default="")


class VisitingReportClientConfirmSerializer(serializers.Serializer):
    """
    Validation schema for company admin confirmation of resolution.
    """
    client_is_resolved = serializers.BooleanField()
    client_resolution_notes = serializers.CharField(required=False, allow_blank=True, default="")
    client_resolved_by = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")


class VisitingReportUpdateSerializer(serializers.Serializer):
    """
    Super Admin maintenance of a scheduled visit (visibility + confidential reason).
    """
    show_visitor_count = serializers.BooleanField(required=False)
    internal_visit_reasons = serializers.ListField(
        child=serializers.DictField(), required=False
    )
    super_admin_notes = serializers.CharField(required=False, allow_blank=True)
    host_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    host_phone = serializers.CharField(max_length=50, required=False, allow_blank=True)
