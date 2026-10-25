from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, NotFound, ValidationError

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


def _normalize_reasons(raw_reasons) -> list:
    """
    Normalize the visit reasons picked from the managed option lists.

    Reasons are not tasks: they keep only their identity and their text.
    """
    normalized = []
    seen = set()
    for index, reason in enumerate(raw_reasons or []):
        if isinstance(reason, str):
            reason = {'label': reason}
        if not isinstance(reason, dict):
            continue
        label = (reason.get('label') or reason.get('task') or '').strip()
        if not label:
            continue
        option_id = reason.get('option_id') or ''
        dedupe_key = option_id or label.lower()
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)
        normalized.append({
            'id': reason.get('id') or f'reason-{index + 1}',
            'label': label,
            'option_id': option_id,
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

        visit_reasons = _normalize_reasons(data.get('visit_reasons'))
        if not visit_reasons:
            raise ValidationError(
                {'visit_reasons': 'Select at least one reason for the factory visit.'}
            )
        internal_visit_reasons = _normalize_reasons(data.get('internal_visit_reasons'))
        purpose = (data.get('purpose') or '').strip() or '; '.join(
            reason['label'] for reason in visit_reasons
        )

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
            host_name=(data.get('host_name') or '').strip(),
            host_phone=(data.get('host_phone') or '').strip(),
            visit_reasons=visit_reasons,
            internal_visit_reasons=internal_visit_reasons,
            show_visitor_count=data.get('show_visitor_count', True),
            purpose=purpose,
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
    def acknowledge_report(
        report: VisitingReport,
        notes: str,
        user_name: str,
        user_role: str,
        host_name: str = '',
        host_phone: str = '',
    ) -> VisitingReport:
        if user_role == 'super_admin':
            raise PermissionDenied("Only Company Owner/Admin can acknowledge visiting reports.")

        report.status = "Acknowledged"
        report.company_acknowledgement_notes = notes
        report.acknowledged_at = timezone.now()
        report.acknowledged_by = user_name or "Company Admin"
        report.host_name = (host_name or '').strip()
        report.host_phone = (host_phone or '').strip()
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
    def _normalize_prechecklist_audit(raw_audit) -> list:
        """
        Normalize the audit of the problem-category pre-ticket checks.

        Each item is `{id, task, status, note}` where status is `flagged` (the
        company claimed the check was done but the on-site team found it was not)
        or `unverified` for every check left clean.
        """
        normalized = []
        for index, item in enumerate(raw_audit or []):
            if not isinstance(item, dict):
                continue
            task = (item.get('task') or item.get('label') or '').strip()
            if not task:
                continue
            status = 'flagged' if item.get('status') == 'flagged' else 'unverified'
            normalized.append({
                'id': item.get('id') or f'pre-{index + 1}',
                'task': task,
                'status': status,
                'note': (item.get('note') or '').strip(),
            })
        return normalized

    @staticmethod
    def complete_report(
        report: VisitingReport,
        service_summary: str,
        user_name: str,
        user_role: str,
        prechecklist_audit: list = None,
        is_flagged: bool = False,
        flag_reason: str = '',
        is_resolved: bool = False,
        resolution_notes: str = '',
        host_name: str = '',
        host_phone: str = '',
    ) -> VisitingReport:
        if user_role == 'company_admin':
            raise PermissionDenied("Only Solution Provider engineers (super_admin) can mark visiting reports completed.")

        report.status = "Completed"
        audit = VisitingReportService._normalize_prechecklist_audit(prechecklist_audit)
        report.prechecklist_audit = audit

        if service_summary:
            report.service_summary = service_summary
        elif not report.service_summary:
            report.service_summary = "On-site visit completed."

        # Audit flag: the company claimed a pre-ticket check was handled, but the
        # on-site team found it was not. Visible to super admins only.
        has_flagged_items = any(item['status'] == 'flagged' for item in audit)
        report.is_flagged = bool(is_flagged) or has_flagged_items
        report.flag_reason = (flag_reason or '') if report.is_flagged else ''
        report.flagged_at = timezone.now() if report.is_flagged else None
        report.flagged_by = (user_name or 'Field Engineer') if report.is_flagged else ''

        # Final verdict on the reported problem, shared with both sides.
        report.is_resolved = bool(is_resolved)
        report.resolution_notes = (resolution_notes or '').strip()
        if host_name:
            report.host_name = host_name.strip()
        if host_phone:
            report.host_phone = host_phone.strip()

        report.completed_at = timezone.now()
        report.save()

        if report.ticket:
            from apps.chat.services import ChatService
            verdict = 'the problem was solved' if report.is_resolved else 'the problem is not solved'
            ChatService.create_message(
                ticket=report.ticket,
                sender_name="System",
                sender_role="system",
                message=f"Visiting Report {report.visit_code} marked COMPLETED: {verdict}.",
                is_system_event=True
            )

        # Broadcast a company-safe payload; audit flags stay in the super-admin API response only.
        serialized = VisitingReportSerializer(report, context={'role': 'company_admin'}).data
        broadcast_global_event('visiting_report_completed', serialized)
        return report

    @staticmethod
    def confirm_client_resolution(
        report: VisitingReport,
        client_is_resolved: bool,
        client_resolution_notes: str,
        user_name: str,
        user_role: str,
    ) -> VisitingReport:
        """Company admin signs off on whether the visit solved the problem from their side."""
        report.client_is_resolved = bool(client_is_resolved)
        report.client_resolution_notes = (client_resolution_notes or '').strip()
        report.client_resolved_at = timezone.now()
        report.client_resolved_by = user_name or 'Company Admin'
        report.save()

        if report.ticket:
            from apps.chat.services import ChatService
            verdict = 'client confirmed the problem is solved' if report.client_is_resolved else 'client reported the problem is still not solved'
            ChatService.create_message(
                ticket=report.ticket,
                sender_name=user_name or "Company Admin",
                sender_role="company_admin",
                message=f"Visiting Report {report.visit_code}: {verdict}.",
                is_system_event=True
            )

        serialized = VisitingReportSerializer(report, context={'role': 'company_admin'}).data
        broadcast_global_event('visiting_report_client_confirmed', serialized)
        return report

    @staticmethod
    def update_report(report: VisitingReport, data: dict, user_role: str) -> VisitingReport:
        """Super admin maintenance of a scheduled visit (headcount visibility, confidential reason, host)."""
        if user_role == 'company_admin':
            raise PermissionDenied("Only Solution Provider engineers (super_admin) can update visiting reports.")

        if 'show_visitor_count' in data:
            report.show_visitor_count = data['show_visitor_count']
        if 'internal_visit_reasons' in data:
            report.internal_visit_reasons = _normalize_reasons(data['internal_visit_reasons'])
        if 'super_admin_notes' in data:
            report.super_admin_notes = data['super_admin_notes']
        if 'host_name' in data:
            report.host_name = (data['host_name'] or '').strip()
        if 'host_phone' in data:
            report.host_phone = (data['host_phone'] or '').strip()

        report.save()

        serialized = VisitingReportSerializer(report, context={'role': 'company_admin'}).data
        broadcast_global_event('visiting_report_updated', serialized)
        return report
