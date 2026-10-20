from apps.core.events import broadcast_global_event, broadcast_ticket_event
from .models import TicketMessage
from .serializers import MessageSerializer


class ChatService:
    """
    Business logic for ticket chat messages and timeline event broadcasting.
    """

    @staticmethod
    def get_messages(ticket):
        return ticket.messages.all().order_by('created_at')

    @staticmethod
    def create_message(
        ticket,
        sender_name: str,
        sender_role: str,
        message: str,
        attachment_url: str = None,
        attachment_name: str = None,
        is_system_event: bool = False
    ) -> TicketMessage:
        msg = TicketMessage.objects.create(
            ticket=ticket,
            sender_name=sender_name,
            sender_role=sender_role,
            message=message,
            attachment_url=attachment_url,
            attachment_name=attachment_name,
            is_system_event=is_system_event,
        )

        serialized = MessageSerializer(msg).data

        # Broadcast to canonical ticket room
        broadcast_ticket_event(ticket.id, 'new_message', serialized)

        # Broadcast global notification
        if not is_system_event:
            broadcast_global_event('new_chat_message', {
                'ticket_id': str(ticket.id),
                'ticket_code': ticket.ticket_code,
                'message': serialized,
            })

        return msg
