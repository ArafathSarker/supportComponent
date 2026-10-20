from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, NotFound

from apps.core.utils import generate_ticket_code
from apps.core.events import broadcast_global_event, broadcast_ticket_event
from .models import Ticket, TicketAttachment


class TicketService:
    """
    Business logic and lifecycle management for support tickets.
    """

    @staticmethod
    def get_ticket(identifier: str) -> Ticket:
        ticket = Ticket.objects.filter(Q(id=identifier) | Q(ticket_code=identifier)).first()
        if not ticket:
            raise NotFound(detail=f"Ticket '{identifier}' not found.")
        return ticket

    @staticmethod
    def get_stats(role: str = None, company_name: str = None) -> dict:
        queryset = Ticket.objects.all()
        if role == 'company_admin' and company_name:
            queryset = queryset.filter(company_name=company_name)

        return {
            "total_tickets": queryset.count(),
            "active_tickets": queryset.filter(status__in=["Open", "Under Review"]).count(),
            "in_progress_tickets": queryset.filter(status__in=["In Progress", "Pending Customer Close"]).count(),
            "closed_tickets": queryset.filter(status="Closed").count(),
        }

    @staticmethod
    def list_tickets(filters: dict):
        queryset = Ticket.objects.all().prefetch_related('messages', 'attachments')

        role = filters.get('role')
        company = filters.get('company_name')
        if role == 'company_admin' and company:
            queryset = queryset.filter(company_name=company)

        status_val = filters.get('status')
        if status_val and status_val != 'All':
            queryset = queryset.filter(status=status_val)

        urgency_val = filters.get('urgency')
        if urgency_val and urgency_val != 'All':
            queryset = queryset.filter(urgency=urgency_val)

        priority_val = filters.get('priority')
        if priority_val and priority_val != 'All':
            queryset = queryset.filter(priority=priority_val)

        category_val = filters.get('category')
        if category_val and category_val != 'All':
            queryset = queryset.filter(category=category_val)

        search_val = filters.get('search')
        if search_val:
            search_val = search_val.strip()
            queryset = queryset.filter(
                Q(title__icontains=search_val) |
                Q(description__icontains=search_val) |
                Q(ticket_code__icontains=search_val) |
                Q(company_name__icontains=search_val) |
                Q(affected_system__icontains=search_val) |
                Q(category__icontains=search_val) |
                Q(machine_id__icontains=search_val) |
                Q(line_number__icontains=search_val) |
                Q(floor_location__icontains=search_val) |
                Q(created_by_name__icontains=search_val) |
                Q(priority__icontains=search_val) |
                Q(status__icontains=search_val)
            )

        return queryset

    @staticmethod
    def create_ticket(data: dict, user_name: str, user_role: str, user_company: str) -> Ticket:
        # Business rule: Solution provider (super_admin) cannot raise support tickets
        if user_role == 'super_admin':
            raise PermissionDenied("Solution Providers (super_admin) cannot raise support tickets. Only clients can submit support requests.")

        effective_company = user_company or data.get('company_name', 'CSI Smart Tech Ltd')
        author_name = user_name or data.get('created_by_name', 'Arafath')
        author_role = user_role or data.get('created_by_role', 'company_admin')
        code = generate_ticket_code(Ticket)

        ticket = Ticket.objects.create(
            ticket_code=code,
            title=data['title'],
            affected_system=data.get('affected_system', 'General System'),
            category=data['category'],
            urgency=data.get('urgency', data.get('priority', 'Medium')),
            priority=data.get('priority', data.get('urgency', 'Medium')),
            production_impact=data.get('production_impact', 'No Production Loss'),
            line_number=data.get('line_number', ''),
            floor_location=data.get('floor_location', ''),
            machine_id=data.get('machine_id', ''),
            iot_details=data.get('iot_details', {}),
            troubleshooting_checklist=data.get('troubleshooting_checklist', []),
            description=data['description'],
            status='Open',
            company_name=effective_company,
            created_by_name=author_name,
            created_by_role=author_role,
        )

        # Attachments creation
        attachments_data = data.get('attachments', [])
        for att in attachments_data:
            TicketAttachment.objects.create(
                ticket=ticket,
                file_name=att.get('file_name', 'file'),
                file_path=att.get('file_path', ''),
                file_type=att.get('file_type', ''),
                file_size=att.get('file_size', 0),
                uploaded_by=author_name,
            )

        # Post initial system event
        from apps.chat.services import ChatService
        ChatService.create_message(
            ticket=ticket,
            sender_name="System",
            sender_role="system",
            message=f"Ticket {ticket.ticket_code} opened by {author_name} with status 'Open'.",
            is_system_event=True
        )

        # Global real-time broadcast
        from .serializers import TicketDetailSerializer
        serialized = TicketDetailSerializer(ticket).data
        broadcast_global_event('ticket_created', serialized)

        return ticket

    @staticmethod
    def update_ticket(ticket: Ticket, data: dict, user_name: str, user_role: str, user_company: str) -> Ticket:
        # Business rule: Only company_admin of the owning company can edit ticket details
        if user_role == 'super_admin':
            raise PermissionDenied("Super Admin cannot edit client ticket details. Only Company Owner/Admin can edit.")
        if user_company and ticket.company_name and user_company != ticket.company_name:
            raise PermissionDenied("You can only edit tickets belonging to your company.")

        changed_fields = []
        updatable = [
            'title', 'affected_system', 'category', 'urgency', 'priority',
            'production_impact', 'line_number', 'floor_location', 'machine_id',
            'description', 'iot_details', 'troubleshooting_checklist'
        ]
        for field in updatable:
            if field in data and data[field] is not None:
                old_val = getattr(ticket, field)
                new_val = data[field]
                if old_val != new_val:
                    setattr(ticket, field, new_val)
                    changed_fields.append(f"{field.replace('_', ' ').capitalize()}: '{old_val}' -> '{new_val}'")

        if changed_fields:
            ticket.save()
            audit_message = f"Ticket updated by {user_name} ({', '.join(changed_fields)})"

            from apps.chat.services import ChatService
            ChatService.create_message(
                ticket=ticket,
                sender_name="System",
                sender_role="system",
                message=audit_message,
                is_system_event=True
            )

            from .serializers import TicketDetailSerializer
            serialized = TicketDetailSerializer(ticket).data
            broadcast_ticket_event(ticket.id, 'ticket_updated', serialized)
            broadcast_global_event('ticket_updated', serialized)

        return ticket

    @staticmethod
    def update_status(ticket: Ticket, new_status: str, user_name: str, user_role: str, notes: str = None) -> Ticket:
        if new_status.lower() == 'closed' and user_role == 'super_admin':
            raise PermissionDenied("Super Admin cannot close the ticket. Only Company Owner/Admin can close the ticket.")

        old_status = ticket.status
        ticket.status = new_status
        if new_status.lower() == 'closed':
            ticket.closed_at = timezone.now()
            ticket.closed_by = user_name
        ticket.save()

        msg_text = f"Status changed from '{old_status}' to '{new_status}' by {user_name}."
        if notes:
            msg_text += f" Notes: {notes}"

        from apps.chat.services import ChatService
        ChatService.create_message(
            ticket=ticket,
            sender_name="System",
            sender_role="system",
            message=msg_text,
            is_system_event=True
        )

        from .serializers import TicketDetailSerializer
        serialized = TicketDetailSerializer(ticket).data
        broadcast_ticket_event(ticket.id, 'ticket_updated', serialized)
        broadcast_global_event('ticket_updated', serialized)

        return ticket

    @staticmethod
    def close_ticket(ticket: Ticket, user_name: str, user_role: str, notes: str = None) -> Ticket:
        if user_role == 'super_admin':
            raise PermissionDenied("Super Admin cannot close the ticket. Only Company Owner/Admin can close the ticket.")

        ticket.status = "Closed"
        ticket.closed_at = timezone.now()
        ticket.closed_by = user_name or "Client"
        ticket.save()

        msg_text = f"Ticket closed by {user_name}."
        if notes:
            msg_text += f" Resolution: {notes}"

        from apps.chat.services import ChatService
        ChatService.create_message(
            ticket=ticket,
            sender_name="System",
            sender_role="system",
            message=msg_text,
            is_system_event=True
        )

        from .serializers import TicketDetailSerializer
        serialized = TicketDetailSerializer(ticket).data
        broadcast_ticket_event(ticket.id, 'ticket_closed', serialized)
        broadcast_global_event('ticket_closed', serialized)

        return ticket

    @staticmethod
    def reopen_ticket(ticket: Ticket, user_name: str, user_role: str, reason: str = None) -> Ticket:
        ticket.status = "Open"
        ticket.closed_at = None
        ticket.closed_by = None
        ticket.save()

        msg_text = f"Ticket reopened by {user_name}."
        if reason:
            msg_text += f" Reason: {reason}"

        from apps.chat.services import ChatService
        ChatService.create_message(
            ticket=ticket,
            sender_name="System",
            sender_role="system",
            message=msg_text,
            is_system_event=True
        )

        from .serializers import TicketDetailSerializer
        serialized = TicketDetailSerializer(ticket).data
        broadcast_ticket_event(ticket.id, 'ticket_reopened', serialized)
        broadcast_global_event('ticket_reopened', serialized)

        return ticket
