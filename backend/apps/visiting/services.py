from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, NotFound

from apps.core.utils import generate_visit_code
from apps.core.events import broadcast_global_event
from apps.support_management.models import SupportEmployee
from apps.tickets.models import Ticket
from .models import VisitingReport
from .serializers import VisitingReportSerializer


def _normalize_team_members(raw_members) -> list:
    """Normalize employee snapshots sent by the UI into a stable JSON shape."""
    normalized = []
    seen = set()
    for member in raw_members or []:
        if isinstance(member, str):
            member = {'name': member}
        if not isinstance(member, dict):
            continue
        name = (member.get('name') or '').strip()
        if not name:
            continue
        employee_id = member.get('employee_id') or member.get('id') or ''
        dedupe_key = employee_id or name.lower()
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)
        normalized.append({
            'employee_id': employee_id,
            'name': name,
            'phone': (member.get('phone') or '').strip(),
            'designation': (member.get('designation') or '').strip(),
        })
    return normalized


class VisitingReportService:
    """
    Business logic for field visiting reports and engineer on-site inspections.
    """

    @staticmethod
    def get_report(identifier: str) -> VisitingReport:
        report = VisitingReport.objects.filter(id=identifier).first() or \
                 VisitingReport.objects.filter(visit_code=identifier).first()
        if not report:
            raise NotFound(f"Visiting report '{identifier}' not found.")
        return report

    @staticmethod
    def list_reports(filters: dict = None, role: str = None, company_name: str = None):
        if filters is None:
            filters = {}

        queryset = VisitingReport.objects.all().select_related('ticket', 'lead_employee')

        role_val = filters.get('role') or role
        company_val = filters.get('company_name') or company_name
        if role_val == 'company_admin' and company_val:
            queryset = queryset.filter(company_name=company_val)

        status_val = filters.get('status')
        if status_val and status_val != 'All':
            queryset = queryset.filter(status=status_val)

        priority_val = filters.get('priority')
        if priority_val and priority_val != 'All':
            queryset = queryset.filter(priority=priority_val)

        search_val = filters.get('search')
        if search_val:
            from django.db.models import Q
            search_val = search_val.strip()
            queryset = queryset.filter(
                Q(visit_code__icontains=search_val) |
                Q(target_system__icontains=search_val) |
                Q(company_name__icontains=search_val) |
                Q(visiting_engineers__icontains=search_val) |
                Q(lead_engineer__icontains=search_val) |
                Q(visiting_team_names__icontains=search_val) |
                Q(purpose__icontains=search_val) |
                Q(line_number__icontains=search_val) |
                Q(floor_location__icontains=search_val) |
                Q(status__icontains=search_val) |
                Q(priority__icontains=search_val)
            )

        return queryset

    @staticmethod
    def create_report(data: dict, user_name: str, user_role: str) -> VisitingReport:
        # Business rule: Only super_admin can schedule visiting reports
        if user_role == 'company_admin':
            raise PermissionDenied("Only Solution Provider engineers (super_admin) can schedule field visiting reports.")

        ticket = None
        ticket_id = data.get('ticket_id')
        if ticket_id:
            ticket = Ticket.objects.filter(id=ticket_id).first() or Ticket.objects.filter(ticket_code=ticket_id).first()

        visit_code = generate_visit_code(VisitingReport)

        # Resolve the main engineer from the managed employee directory when an ID is supplied.
        lead_employee = None
        lead_employee_id = data.get('lead_employee_id')
        if lead_employee_id:
            lead_employee = SupportEmployee.objects.filter(id=lead_employee_id).first()

        team_members = _normalize_team_members(data.get('visiting_team_members'))
        team_names = ", ".join(member['name'] for member in team_members)

        lead_engineer = (
            lead_employee.name if lead_employee
            else (data.get('lead_engineer') or data.get('visiting_engineers', ''))
        )
        lead_engineer_phone = (
            lead_employee.phone if lead_employee
            else data.get('lead_engineer_phone', '')
        )

        if lead_employee or team_members:
            visiting_engineers = ", ".join(
                [name for name in [lead_engineer, *(m['name'] for m in team_members)] if name]
            )
        else:
            visiting_engineers = data.get('visiting_engineers') or lead_engineer

        # Main engineer + accompanying employees = total delegation headcount.
        total_visitors = 1 + len(team_members) if team_members else data.get('total_visitors', 1)

        report = VisitingReport.objects.create(
            visit_code=visit_code,
            ticket=ticket,
            company_name=data['company_name'],
            target_system=data['target_system'],
            priority=data.get('priority', 'High'),
            line_number=data.get('line_number', ''),
            floor_location=data.get('floor_location', ''),
            visiting_engineers=visiting_engineers,
            lead_engineer=lead_engineer,
            lead_engineer_phone=lead_engineer_phone,
            lead_employee=lead_employee,
            visiting_team_names=team_names or data.get('visiting_team_names', ''),
            visiting_team_members=team_members,
            total_visitors=total_visitors,
            visit_checklist=data.get('visit_checklist', []),
            super_admin_checklist=data.get('super_admin_checklist', []),
            show_visitor_count=data.get('show_visitor_count', True),
            purpose=data.get('purpose', ''),
            scheduled_date=data['scheduled_date'],
            estimated_duration=data.get('estimated_duration', '2 Hours'),
            entry_requirements=data.get('entry_requirements', 'Standard Factory Safety Equipment & Gate Pass'),
            status="Pending Acknowledgement",
            super_admin_notes=data.get('super_admin_notes', ''),
        )

        # Notify via ticket timeline if ticket is linked
        if ticket:
            from apps.chat.services import ChatService
            ChatService.create_message(
                ticket=ticket,
                sender_name="System",
                sender_role="system",
                message=(
                    f"Field Visiting Report {visit_code} scheduled for {report.scheduled_date} "
                    f"by {visiting_engineers}."
                ),
                is_system_event=True
            )

        serialized = VisitingReportSerializer(report, context={'role': 'company_admin'}).data
        broadcast_global_event('visiting_report_scheduled', serialized)
        return report

    @staticmethod
    def _merge_company_checklist(existing, company_items) -> list:
        """
        Apply the company's `company_checked` confirmations to the provider-owned
        checklist. Task text, ids and status are never rewritten by the client.
        """
        if not isinstance(existing, list):
            return existing

        confirmations = {}
        for index, item in enumerate(company_items or []):
            if not isinstance(item, dict):
                continue
            key = item.get('id') or index
            confirmations[key] = bool(item.get('company_checked'))

        merged = []
        for index, item in enumerate(existing):
            if not isinstance(item, dict):
                merged.append(item)
                continue
            key = item.get('id') or index
            merged_item = dict(item)
            if key in confirmations:
                merged_item['company_checked'] = confirmations[key]
            merged.append(merged_item)
        return merged

    @staticmethod
    def acknowledge_report(
        report: VisitingReport,
        notes: str,
        user_name: str,
        user_role: str,
        visit_checklist: list = None,
    ) -> VisitingReport:
        if user_role == 'super_admin':
            raise PermissionDenied("Only Company Owner/Admin can acknowledge visiting reports.")

        report.status = "Acknowledged"
        report.company_acknowledgement_notes = notes
        if visit_checklist is not None:
            report.visit_checklist = VisitingReportService._merge_company_checklist(
                report.visit_checklist, visit_checklist
            )
        report.acknowledged_at = timezone.now()
        report.acknowledged_by = user_name or "Company Admin"
        report.save()

        if report.ticket:
            from apps.chat.services import ChatService
            ChatService.create_message(
                ticket=report.ticket,
                sender_name="System",
                sender_role="system",
                message=f"Visiting Report {report.visit_code} was ACKNOWLEDGED by {report.acknowledged_by}.",
                is_system_event=True
            )

        serialized = VisitingReportSerializer(report, context={'role': user_role}).data
        broadcast_global_event('visiting_report_acknowledged', serialized)
        return report

    @staticmethod
    def complete_report(
        report: VisitingReport,
        service_summary: str,
        user_name: str,
        user_role: str,
        visit_checklist: list = None,
        super_admin_checklist: list = None,
        is_flagged: bool = False,
        flag_reason: str = '',
        flag_checklist_items: list = None,
    ) -> VisitingReport:
        if user_role == 'company_admin':
            raise PermissionDenied("Only Solution Provider engineers (super_admin) can mark visiting reports completed.")

        report.status = "Completed"
        if visit_checklist is not None:
            report.visit_checklist = visit_checklist
        if super_admin_checklist is not None:
            report.super_admin_checklist = super_admin_checklist
        if service_summary:
            report.service_summary = service_summary
        elif not report.service_summary and visit_checklist:
            solved_count = sum(1 for item in visit_checklist if item.get('status') == 'solved')
            total_count = len(visit_checklist)
            report.service_summary = f"{solved_count} of {total_count} checklist objectives resolved."

        # Audit flag: the company claimed a pre-visit checklist item was handled,
        # but the on-site team found it was not. Visible to super admins only.
        report.is_flagged = bool(is_flagged)
        report.flag_reason = (flag_reason or '') if is_flagged else ''
        report.flag_checklist_items = list(flag_checklist_items or []) if is_flagged else []
        report.flagged_at = timezone.now() if is_flagged else None
        report.flagged_by = (user_name or 'Field Engineer') if is_flagged else ''

        report.completed_at = timezone.now()
        report.save()

        if report.ticket:
            from apps.chat.services import ChatService
            ChatService.create_message(
                ticket=report.ticket,
                sender_name="System",
                sender_role="system",
                message=f"Visiting Report {report.visit_code} marked COMPLETED. Summary: {service_summary}",
                is_system_event=True
            )

        # Broadcast a company-safe payload; audit flags stay in the super-admin API response only.
        serialized = VisitingReportSerializer(report, context={'role': 'company_admin'}).data
        broadcast_global_event('visiting_report_completed', serialized)
        return report

    @staticmethod
    def update_report(report: VisitingReport, data: dict, user_role: str) -> VisitingReport:
        """Super admin maintenance of a scheduled visit (headcount visibility, internal checklist)."""
        if user_role == 'company_admin':
            raise PermissionDenied("Only Solution Provider engineers (super_admin) can update visiting reports.")

        if 'show_visitor_count' in data:
            report.show_visitor_count = data['show_visitor_count']
        if 'super_admin_checklist' in data:
            report.super_admin_checklist = data['super_admin_checklist']
        if 'super_admin_notes' in data:
            report.super_admin_notes = data['super_admin_notes']

        report.save()

        serialized = VisitingReportSerializer(report, context={'role': 'company_admin'}).data
        broadcast_global_event('visiting_report_updated', serialized)
        return report
