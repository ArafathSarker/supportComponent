from rest_framework import serializers
from .models import VisitingReport


# Fields that must never leak to the company owner / client side.
SUPER_ADMIN_ONLY_FIELDS = (
    'super_admin_checklist',
    'is_flagged',
    'flag_reason',
    'flag_checklist_items',
    'flagged_at',
    'flagged_by',
)


def _clean_visit_checklist(items, is_super_admin: bool):
    """Strip internal audit markers from company-visible checklist items."""
    if is_super_admin or not isinstance(items, list):
        return items
    cleaned = []
    for item in items:
        if isinstance(item, dict):
            cleaned.append({
                key: value
                for key, value in item.items()
                if key not in ('flagged', 'flag_note')
            })
        else:
            cleaned.append(item)
    return cleaned


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
      * Super Admin receives internal checklists, audit flags and live headcount.
      * Company Admin receives only the company checklist and the headcount when
        the super admin has enabled the visibility toggle.
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
        """The company's claimed pre-troubleshooting checks from ticket creation."""
        if not obj.ticket:
            return []
        checklist = obj.ticket.troubleshooting_checklist
        return checklist if isinstance(checklist, list) else []

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
            'visit_checklist',
            'super_admin_checklist',
            'show_visitor_count',
            'is_flagged',
            'flag_reason',
            'flag_checklist_items',
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

            data['visit_checklist'] = _clean_visit_checklist(
                data.get('visit_checklist'), is_super_admin=False
            )
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
    visit_checklist = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    super_admin_checklist = serializers.ListField(
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
    """
    company_acknowledgement_notes = serializers.CharField(required=False, allow_blank=True, default="")
    acknowledged_by = serializers.CharField(max_length=100, default="Arafath", required=False)
    # Company-side confirmation of the pre-visit checklist items. Only the
    # `company_checked` flag is honoured; task text stays provider-owned.
    visit_checklist = serializers.ListField(
        child=serializers.DictField(), required=False
    )


class VisitingReportCompleteSerializer(serializers.Serializer):
    """
    Validation schema for completing a field visit report (Solution Provider).
    """
    service_summary = serializers.CharField(required=False, allow_blank=True, default="")
    visit_checklist = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    super_admin_checklist = serializers.ListField(
        child=serializers.DictField(), required=False, default=list
    )
    is_flagged = serializers.BooleanField(required=False, default=False)
    flag_reason = serializers.CharField(required=False, allow_blank=True, default="")
    flag_checklist_items = serializers.ListField(
        child=serializers.DictField(), required=False, default=list
    )


class VisitingReportUpdateSerializer(serializers.Serializer):
    """
    Super Admin maintenance of a scheduled visit (visibility + internal checklist).
    """
    show_visitor_count = serializers.BooleanField(required=False)
    super_admin_checklist = serializers.ListField(
        child=serializers.DictField(), required=False
    )
    super_admin_notes = serializers.CharField(required=False, allow_blank=True)
