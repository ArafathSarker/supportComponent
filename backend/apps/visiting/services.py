from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, NotFound

from apps.core.utils import generate_visit_code
from apps.core.events import broadcast_global_event
from apps.tickets.models import Ticket
from .models import VisitingReport
from .serializers import VisitingReportSerializer


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

        queryset = VisitingReport.objects.all().select_related('ticket')

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

        lead_engineer = data.get('lead_engineer') or data.get('visiting_engineers', '')
        visiting_engineers = data.get('visiting_engineers') or lead_engineer

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
            lead_engineer_phone=data.get('lead_engineer_phone', ''),
            visiting_team_names=data.get('visiting_team_names', ''),
            total_visitors=data.get('total_visitors', 1),
            visit_checklist=data.get('visit_checklist', []),
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
                    f"by {data['visiting_engineers']}."
                ),
                is_system_event=True
            )

        serialized = VisitingReportSerializer(report).data
        broadcast_global_event('visiting_report_scheduled', serialized)
        return report

    @staticmethod
    def acknowledge_report(report: VisitingReport, notes: str, user_name: str, user_role: str) -> VisitingReport:
        if user_role == 'super_admin':
            raise PermissionDenied("Only Company Owner/Admin can acknowledge visiting reports.")

        report.status = "Acknowledged"
        report.company_acknowledgement_notes = notes
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

        serialized = VisitingReportSerializer(report).data
        broadcast_global_event('visiting_report_acknowledged', serialized)
        return report

    @staticmethod
    def complete_report(report: VisitingReport, service_summary: str, user_name: str, user_role: str, visit_checklist: list = None) -> VisitingReport:
        if user_role == 'company_admin':
            raise PermissionDenied("Only Solution Provider engineers (super_admin) can mark visiting reports completed.")

        report.status = "Completed"
        if visit_checklist is not None:
            report.visit_checklist = visit_checklist
        if service_summary:
            report.service_summary = service_summary
        elif not report.service_summary and visit_checklist:
            solved_count = sum(1 for item in visit_checklist if item.get('status') == 'solved')
            total_count = len(visit_checklist)
            report.service_summary = f"{solved_count} of {total_count} checklist objectives resolved."
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

        serialized = VisitingReportSerializer(report).data
        broadcast_global_event('visiting_report_completed', serialized)
        return report
