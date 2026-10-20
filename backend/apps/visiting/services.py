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
    def list_reports(role: str = None, company_name: str = None):
        queryset = VisitingReport.objects.all().select_related('ticket')
        if role == 'company_admin' and company_name:
            queryset = queryset.filter(company_name=company_name)
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

        report = VisitingReport.objects.create(
            visit_code=visit_code,
            ticket=ticket,
            company_name=data['company_name'],
            target_system=data['target_system'],
            priority=data.get('priority', 'High'),
            line_number=data.get('line_number', ''),
            floor_location=data.get('floor_location', ''),
            visiting_engineers=data['visiting_engineers'],
            purpose=data['purpose'],
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
    def complete_report(report: VisitingReport, service_summary: str, user_name: str, user_role: str) -> VisitingReport:
        if user_role == 'company_admin':
            raise PermissionDenied("Only Solution Provider engineers (super_admin) can mark visiting reports completed.")

        report.status = "Completed"
        report.service_summary = service_summary
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
