import os
import uuid
from django.utils import timezone
from django.db.models import Q
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import Ticket, TicketMessage, TicketAttachment, VisitingReport
from .serializers import (
    TicketListSerializer,
    TicketDetailSerializer,
    MessageSerializer,
    AttachmentSerializer,
    VisitingReportSerializer
)
from .broadcast import broadcast_global_event, broadcast_ticket_message


def get_ticket_or_404(ticket_id: str):
    return Ticket.objects.filter(Q(id=ticket_id) | Q(ticket_code=ticket_id)).first()


def generate_ticket_code() -> str:
    year = timezone.now().year
    count = Ticket.objects.count() + 1
    return f"TCK-{year}-{count:04d}"


def generate_visit_code() -> str:
    year = timezone.now().year
    count = VisitingReport.objects.count() + 1
    return f"VIS-{year}-{count:04d}"


# ==========================================
# Health Check
# ==========================================
@api_view(['GET'])
def health_check(request):
    db_engine = settings.DATABASES['default']['ENGINE'].split('.')[-1]
    return Response({
        "status": "online",
        "service": "Support Component API (Django)",
        "version": "1.0.0",
        "database": db_engine
    })


# ==========================================
# Tickets Endpoints
# ==========================================
@api_view(['GET'])
def ticket_stats(request):
    company_name = request.query_params.get('company_name')
    role = request.query_params.get('role')

    queryset = Ticket.objects.all()
    if role == 'company_admin' and company_name:
        queryset = queryset.filter(company_name=company_name)

    total = queryset.count()
    active = queryset.filter(status__in=["Open", "Under Review"]).count()
    in_progress = queryset.filter(status__in=["In Progress", "Pending Customer Close"]).count()
    closed = queryset.filter(status="Closed").count()

    return Response({
        "total_tickets": total,
        "active_tickets": active,
        "in_progress_tickets": in_progress,
        "closed_tickets": closed
    })


@api_view(['GET', 'POST'])
def ticket_list_create(request):
    if request.method == 'GET':
        role = request.query_params.get('role')
        company_name = request.query_params.get('company_name')
        status_filter = request.query_params.get('status')
        urgency_filter = request.query_params.get('urgency')
        category_filter = request.query_params.get('category')
        search = request.query_params.get('search')

        queryset = Ticket.objects.all()

        if role == 'company_admin' and company_name:
            queryset = queryset.filter(company_name=company_name)

        if status_filter and status_filter != 'All':
            queryset = queryset.filter(status=status_filter)

        if urgency_filter and urgency_filter != 'All':
            queryset = queryset.filter(urgency=urgency_filter)

        if category_filter and category_filter != 'All':
            queryset = queryset.filter(category=category_filter)

        if search:
            queryset = queryset.filter(
                Q(ticket_code__icontains=search) |
                Q(title__icontains=search) |
                Q(affected_system__icontains=search) |
                Q(description__icontains=search)
            )

        queryset = queryset.order_by('-created_at')
        serializer = TicketListSerializer(queryset, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        data = request.data
        created_by_role = data.get('created_by_role', 'company_admin')

        # ENFORCE RULE: Solution Provider (Super Admin) CANNOT create/raise a support ticket
        if created_by_role == 'super_admin':
            return Response(
                {"detail": "Solution providers (Super Admin) cannot raise support tickets. Only Company Clients/Owners can create tickets."},
                status=status.HTTP_403_FORBIDDEN
            )

        title = data.get('title', '').strip()
        if not title:
            return Response({"detail": "Title is required."}, status=status.HTTP_400_BAD_REQUEST)

        code = generate_ticket_code()
        ticket = Ticket.objects.create(
            ticket_code=code,
            title=title,
            affected_system=data.get('affected_system', 'General System'),
            category=data.get('category', 'General'),
            urgency=data.get('urgency', 'Medium'),
            description=data.get('description', ''),
            status="Open",
            company_name=data.get('company_name', 'CSI Smart Tech Ltd'),
            created_by_name=data.get('created_by_name', 'Arafath'),
            created_by_role=created_by_role,
            created_at=timezone.now()
        )

        # Initial system event message
        initial_msg = TicketMessage.objects.create(
            ticket=ticket,
            sender_name="System",
            sender_role="system",
            message=f"Ticket {code} opened by {ticket.created_by_name} ({ticket.company_name}) for system '{ticket.affected_system}' with urgency '{ticket.urgency}'.",
            is_system_event=True,
            created_at=timezone.now()
        )

        # Broadcast global event
        broadcast_global_event("new_ticket", {
            "id": ticket.id,
            "ticket_code": ticket.ticket_code,
            "title": ticket.title,
            "urgency": ticket.urgency,
            "status": ticket.status,
            "company_name": ticket.company_name
        })

        serializer = TicketDetailSerializer(ticket)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH', 'PUT'])
def ticket_detail(request, ticket_id):
    ticket = get_ticket_or_404(ticket_id)
    if not ticket:
        return Response({"detail": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = TicketDetailSerializer(ticket)
        return Response(serializer.data)

    elif request.method in ('PATCH', 'PUT'):
        data = request.data
        updated_by_role = data.get('updated_by_role', 'company_admin')

        # ENFORCE RULE: Super Admin cannot edit ticket details. Only Company Admin/Owner can edit.
        if updated_by_role != 'company_admin':
            return Response(
                {"detail": "Super Admin (Solution Provider) cannot edit ticket details. Only the Company Owner/Admin can edit their ticket."},
                status=status.HTTP_403_FORBIDDEN
            )

        changes = []
        if 'title' in data and data['title'] and data['title'].strip() != ticket.title:
            changes.append(f"Title: '{data['title'].strip()}'")
            ticket.title = data['title'].strip()

        if 'affected_system' in data and data['affected_system'] != ticket.affected_system:
            changes.append(f"System: '{data['affected_system']}'")
            ticket.affected_system = data['affected_system']

        if 'category' in data and data['category'] != ticket.category:
            changes.append(f"Category: '{data['category']}'")
            ticket.category = data['category']

        if 'urgency' in data and data['urgency'] != ticket.urgency:
            changes.append(f"Urgency: '{data['urgency']}'")
            ticket.urgency = data['urgency']

        if 'description' in data and data['description'] and data['description'].strip() != ticket.description:
            changes.append("Description updated")
            ticket.description = data['description'].strip()

        ticket.updated_at = timezone.now()
        ticket.save()

        user_name = data.get('updated_by_name') or "Company Owner"
        log_text = f"Ticket details updated by {user_name} (Company Admin)."
        if changes:
            log_text += f" ({', '.join(changes)})"

        sys_msg = TicketMessage.objects.create(
            ticket=ticket,
            sender_name="System",
            sender_role="system",
            message=log_text,
            is_system_event=True,
            created_at=timezone.now()
        )

        # Broadcast via WS to ticket chat room
        msg_dict = {
            "id": sys_msg.id,
            "ticket_id": ticket.id,
            "sender_name": sys_msg.sender_name,
            "sender_role": sys_msg.sender_role,
            "message": sys_msg.message,
            "is_system_event": True,
            "created_at": sys_msg.created_at.isoformat()
        }
        broadcast_ticket_message(ticket.id, {
            "type": "chat_message",
            "data": msg_dict
        })

        ticket_update_event = {
            "type": "ticket_updated",
            "ticket_id": ticket.id,
            "ticket_code": ticket.ticket_code,
            "title": ticket.title,
            "affected_system": ticket.affected_system,
            "category": ticket.category,
            "urgency": ticket.urgency,
            "description": ticket.description,
            "status": ticket.status,
            "updated_at": ticket.updated_at.isoformat(),
            "updated_by_name": user_name
        }
        broadcast_ticket_message(ticket.id, ticket_update_event)
        broadcast_global_event("ticket_updated", ticket_update_event)

        serializer = TicketDetailSerializer(ticket)
        return Response(serializer.data)


@api_view(['PATCH'])
def ticket_update_status(request, ticket_id):
    ticket = get_ticket_or_404(ticket_id)
    if not ticket:
        return Response({"detail": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND)

    data = request.data
    new_status = data.get('status')
    updated_by_role = data.get('updated_by_role', 'super_admin')
    updated_by_name = data.get('updated_by_name', 'Admin')
    comment = data.get('comment')

    # ENFORCE RULE: Super Admin cannot close ticket directly!
    if new_status == 'Closed' and updated_by_role != 'company_admin':
        return Response(
            {"detail": "Super Admin cannot close the ticket directly. Only the Company Admin/Owner can close this ticket."},
            status=status.HTTP_403_FORBIDDEN
        )

    old_status = ticket.status
    ticket.status = new_status
    ticket.updated_at = timezone.now()

    if new_status == 'Closed':
        ticket.closed_at = timezone.now()
        ticket.closed_by = updated_by_name

    ticket.save()

    role_label = "Company Admin" if updated_by_role == 'company_admin' else "Super Admin"
    event_text = f"Status changed from '{old_status}' to '{new_status}' by {updated_by_name} ({role_label})."
    if comment:
        event_text += f" Note: {comment}"

    sys_msg = TicketMessage.objects.create(
        ticket=ticket,
        sender_name="System",
        sender_role="system",
        message=event_text,
        is_system_event=True,
        created_at=timezone.now()
    )

    msg_dict = {
        "id": sys_msg.id,
        "ticket_id": ticket.id,
        "sender_name": sys_msg.sender_name,
        "sender_role": sys_msg.sender_role,
        "message": sys_msg.message,
        "is_system_event": True,
        "created_at": sys_msg.created_at.isoformat()
    }
    broadcast_ticket_message(ticket.id, {
        "type": "chat_message",
        "data": msg_dict
    })

    status_event = {
        "type": "status_updated",
        "ticket_id": ticket.id,
        "ticket_code": ticket.ticket_code,
        "status": ticket.status,
        "updated_by_name": updated_by_name,
        "updated_by_role": updated_by_role
    }
    broadcast_ticket_message(ticket.id, status_event)
    broadcast_global_event("ticket_status_updated", status_event)

    return Response({"message": "Status updated successfully", "status": ticket.status})


@api_view(['POST'])
def ticket_close(request, ticket_id):
    ticket = get_ticket_or_404(ticket_id)
    if not ticket:
        return Response({"detail": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND)

    data = request.data
    closed_by_role = data.get('closed_by_role')
    closed_by_name = data.get('closed_by_name', 'Company Admin')
    satisfaction_rating = data.get('satisfaction_rating')
    close_notes = data.get('close_notes')

    if closed_by_role != 'company_admin':
        return Response(
            {"detail": "Only Company Admin can close this ticket."},
            status=status.HTTP_403_FORBIDDEN
        )

    ticket.status = "Closed"
    ticket.closed_at = timezone.now()
    ticket.closed_by = closed_by_name
    ticket.updated_at = timezone.now()
    ticket.save()

    event_msg = f"Ticket closed by Company Owner ({closed_by_name})."
    if satisfaction_rating:
        event_msg += f" Satisfaction rating: {satisfaction_rating}/5 stars."
    if close_notes:
        event_msg += f" Remarks: {close_notes}"

    sys_msg = TicketMessage.objects.create(
        ticket=ticket,
        sender_name="System",
        sender_role="system",
        message=event_msg,
        is_system_event=True,
        created_at=timezone.now()
    )

    msg_dict = {
        "id": sys_msg.id,
        "ticket_id": ticket.id,
        "sender_name": sys_msg.sender_name,
        "sender_role": sys_msg.sender_role,
        "message": sys_msg.message,
        "is_system_event": True,
        "created_at": sys_msg.created_at.isoformat()
    }
    broadcast_ticket_message(ticket.id, {"type": "chat_message", "data": msg_dict})
    broadcast_ticket_message(ticket.id, {"type": "ticket_closed", "ticket_id": ticket.id})
    broadcast_global_event("ticket_closed", {"ticket_id": ticket.id, "ticket_code": ticket.ticket_code})

    return Response({"message": "Ticket closed successfully", "status": "Closed"})


@api_view(['POST'])
def ticket_reopen(request, ticket_id):
    ticket = get_ticket_or_404(ticket_id)
    if not ticket:
        return Response({"detail": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND)

    user_name = request.query_params.get('user_name') or request.data.get('user_name', 'Arafath')
    user_role = request.query_params.get('user_role') or request.data.get('user_role', 'company_admin')

    ticket.status = "Open"
    ticket.closed_at = None
    ticket.closed_by = None
    ticket.updated_at = timezone.now()
    ticket.save()

    sys_msg = TicketMessage.objects.create(
        ticket=ticket,
        sender_name="System",
        sender_role="system",
        message=f"Ticket reopened by {user_name} ({user_role}).",
        is_system_event=True,
        created_at=timezone.now()
    )

    broadcast_ticket_message(ticket.id, {
        "type": "chat_message",
        "data": {
            "id": sys_msg.id,
            "ticket_id": ticket.id,
            "sender_name": sys_msg.sender_name,
            "sender_role": sys_msg.sender_role,
            "message": sys_msg.message,
            "is_system_event": True,
            "created_at": sys_msg.created_at.isoformat()
        }
    })
    broadcast_global_event("ticket_reopened", {"ticket_id": ticket.id, "ticket_code": ticket.ticket_code})

    return Response({"message": "Ticket reopened", "status": "Open"})


@api_view(['GET', 'POST'])
def ticket_messages(request, ticket_id):
    ticket = get_ticket_or_404(ticket_id)
    if not ticket:
        return Response({"detail": "Ticket not found"}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        messages = ticket.messages.all().order_by('created_at')
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        data = request.data
        msg = TicketMessage.objects.create(
            ticket=ticket,
            sender_name=data.get('sender_name', 'Anonymous'),
            sender_role=data.get('sender_role', 'company_admin'),
            message=data.get('message', ''),
            attachment_url=data.get('attachment_url'),
            attachment_name=data.get('attachment_name'),
            is_system_event=False,
            created_at=timezone.now()
        )
        ticket.updated_at = timezone.now()
        ticket.save(update_fields=['updated_at'])

        msg_dict = {
            "id": msg.id,
            "ticket_id": ticket.id,
            "sender_name": msg.sender_name,
            "sender_role": msg.sender_role,
            "message": msg.message,
            "attachment_url": msg.attachment_url,
            "attachment_name": msg.attachment_name,
            "is_system_event": False,
            "created_at": msg.created_at.isoformat()
        }
        broadcast_ticket_message(ticket.id, {
            "type": "chat_message",
            "data": msg_dict
        })

        serializer = MessageSerializer(msg)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


# ==========================================
# File Upload Endpoint
# ==========================================
@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def upload_file(request):
    uploaded_file = request.FILES.get('file')
    if not uploaded_file:
        return Response({"detail": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

    ticket_id = request.data.get('ticket_id')
    uploaded_by = request.data.get('uploaded_by', 'User')

    ext = os.path.splitext(uploaded_file.name)[1]
    unique_filename = f"{uuid.uuid4().hex[:12]}_{uploaded_file.name.replace(' ', '_')}"
    file_path = os.path.join(settings.MEDIA_ROOT, unique_filename)

    with open(file_path, 'wb+') as destination:
        for chunk in uploaded_file.chunks():
            destination.write(chunk)

    file_url = f"/uploads/{unique_filename}"

    if ticket_id:
        ticket = get_ticket_or_404(ticket_id)
        if ticket:
            TicketAttachment.objects.create(
                ticket=ticket,
                file_name=uploaded_file.name,
                file_path=file_url,
                file_type=uploaded_file.content_type,
                file_size=uploaded_file.size,
                uploaded_by=uploaded_by,
                created_at=timezone.now()
            )

    return Response({
        "url": file_url,
        "filename": uploaded_file.name
    })


# ==========================================
# Visiting Reports Endpoints
# ==========================================
@api_view(['GET', 'POST'])
def visiting_list_create(request):
    if request.method == 'GET':
        role = request.query_params.get('role')
        company_name = request.query_params.get('company_name')
        status_filter = request.query_params.get('status')
        search = request.query_params.get('search')

        queryset = VisitingReport.objects.all()

        if role == 'company_admin' and company_name:
            queryset = queryset.filter(company_name=company_name)

        if status_filter and status_filter != 'All':
            queryset = queryset.filter(status=status_filter)

        if search:
            queryset = queryset.filter(
                Q(visit_code__icontains=search) |
                Q(target_system__icontains=search) |
                Q(visiting_engineers__icontains=search) |
                Q(purpose__icontains=search)
            )

        queryset = queryset.order_by('-created_at')
        serializer = VisitingReportSerializer(queryset, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        data = request.data
        code = generate_visit_code()

        ticket = None
        ticket_id = data.get('ticket_id')
        if ticket_id:
            ticket = get_ticket_or_404(ticket_id)

        report = VisitingReport.objects.create(
            visit_code=code,
            ticket=ticket,
            company_name=data.get('company_name', 'CSI Smart Tech Ltd'),
            target_system=data.get('target_system', ''),
            visiting_engineers=data.get('visiting_engineers', ''),
            purpose=data.get('purpose', ''),
            scheduled_date=data.get('scheduled_date', ''),
            estimated_duration=data.get('estimated_duration', '2 Hours'),
            entry_requirements=data.get('entry_requirements', 'Standard Factory Safety Equipment & Gate Pass'),
            status="Pending Acknowledgement",
            super_admin_notes=data.get('super_admin_notes'),
            created_at=timezone.now()
        )

        serializer = VisitingReportSerializer(report)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
def visiting_detail(request, visit_id):
    report = VisitingReport.objects.filter(Q(id=visit_id) | Q(visit_code=visit_id)).first()
    if not report:
        return Response({"detail": "Visiting report not found"}, status=status.HTTP_404_NOT_FOUND)
    serializer = VisitingReportSerializer(report)
    return Response(serializer.data)


@api_view(['POST'])
def visiting_acknowledge(request, visit_id):
    report = VisitingReport.objects.filter(Q(id=visit_id) | Q(visit_code=visit_id)).first()
    if not report:
        return Response({"detail": "Visiting report not found"}, status=status.HTTP_404_NOT_FOUND)

    data = request.data
    report.status = "Acknowledged"
    report.acknowledged_by = data.get('acknowledged_by', 'Arafath')
    report.company_acknowledgement_notes = data.get('company_acknowledgement_notes')
    report.acknowledged_at = timezone.now()
    report.updated_at = timezone.now()
    report.save()

    serializer = VisitingReportSerializer(report)
    return Response(serializer.data)


@api_view(['POST'])
def visiting_complete(request, visit_id):
    report = VisitingReport.objects.filter(Q(id=visit_id) | Q(visit_code=visit_id)).first()
    if not report:
        return Response({"detail": "Visiting report not found"}, status=status.HTTP_404_NOT_FOUND)

    data = request.data
    report.status = "Completed"
    report.service_summary = data.get('service_summary', '')
    report.completed_at = timezone.now()
    report.updated_at = timezone.now()
    report.save()

    serializer = VisitingReportSerializer(report)
    return Response(serializer.data)
