from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response

from apps.tickets.services import TicketService
from .services import ChatService
from .serializers import MessageSerializer, MessageCreateSerializer


class TicketMessagesView(APIView):
    """
    GET /api/tickets/<ticket_id>/messages - Retrieve conversation thread
    POST /api/tickets/<ticket_id>/messages - Post message or attachment
    """
    def get(self, request, ticket_id):
        ticket = TicketService.get_ticket(ticket_id)
        messages = ChatService.get_messages(ticket)
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, ticket_id):
        ticket = TicketService.get_ticket(ticket_id)
        serializer = MessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        sender_name = request.headers.get('x-user-name') or data.get('sender_name', 'Arafath')
        sender_role = request.headers.get('x-user-role') or data.get('sender_role', 'company_admin')

        msg = ChatService.create_message(
            ticket=ticket,
            sender_name=sender_name,
            sender_role=sender_role,
            message=data.get('message', ''),
            attachment_url=data.get('attachment_url'),
            attachment_name=data.get('attachment_name'),
            is_system_event=False
        )

        return Response(MessageSerializer(msg).data, status=status.HTTP_201_CREATED)
