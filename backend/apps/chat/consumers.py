import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

logger = logging.getLogger('support.consumers')


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for system-wide real-time updates and notification banners.
    Path: /ws/notifications
    """
    GROUP_NAME = "global_notifications"

    async def connect(self):
        await self.channel_layer.group_add(self.GROUP_NAME, self.channel_name)
        await self.accept()
        logger.info(f"Notification WS client connected: {self.channel_name}")
        await self.send(text_data=json.dumps({
            "type": "connected",
            "event": "connected",
            "message": "Connected to global notifications"
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.GROUP_NAME, self.channel_name)
        logger.info(f"Notification WS client disconnected: {self.channel_name}")

    async def receive(self, text_data=None, bytes_data=None):
        """Handle ping/pong keepalive messages."""
        try:
            data = json.loads(text_data or "{}")
            action = data.get("action") or data.get("type")
            if action == "ping":
                await self.send(text_data=json.dumps({"type": "pong", "action": "pong"}))
        except Exception as e:
            logger.debug(f"Notification WS parse error: {e}")

    async def global_notification(self, event):
        """Dispatches global notification to the client."""
        event_name = event.get("event")
        data = event.get("data")

        payload = {
            "type": event_name,
            "event": event_name,
            "data": data,
        }

        # Normalize event types for all frontend listener variants
        if event_name == "ticket_created":
            payload["type"] = "new_ticket"
        elif event_name in ("ticket_updated", "status_updated"):
            payload["type"] = "ticket_status_updated"
        elif event_name == "ticket_closed":
            payload["type"] = "ticket_closed"
        elif event_name == "ticket_reopened":
            payload["type"] = "ticket_reopened"

        await self.send(text_data=json.dumps(payload))


class TicketChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for live interactive ticket chat rooms and drawer updates.
    Path: /ws/tickets/<ticket_id>
    """

    @database_sync_to_async
    def get_ticket_canonical_id(self, identifier):
        from apps.tickets.models import Ticket
        from django.db.models import Q
        ticket = Ticket.objects.filter(Q(id=identifier) | Q(ticket_code=identifier)).first()
        if ticket:
            return str(ticket.id)
        return str(identifier)

    @database_sync_to_async
    def save_chat_message(self, sender_name, sender_role, message, attachment_url=None, attachment_name=None):
        from apps.tickets.services import TicketService
        from apps.chat.services import ChatService
        ticket = TicketService.get_ticket(self.ticket_id)
        return ChatService.create_message(
            ticket=ticket,
            sender_name=sender_name,
            sender_role=sender_role,
            message=message,
            attachment_url=attachment_url,
            attachment_name=attachment_name,
            is_system_event=False
        )

    async def connect(self):
        self.ticket_id = self.scope['url_route']['kwargs']['ticket_id']
        canonical_id = await self.get_ticket_canonical_id(self.ticket_id)
        self.room_group_name = f"ticket_{canonical_id.replace('-', '_')}"

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        logger.info(f"Ticket WS connected for ticket {self.ticket_id} (group: {self.room_group_name})")

        await self.send(text_data=json.dumps({
            "type": "connected",
            "event": "connected",
            "ticket_id": self.ticket_id,
            "message": f"Connected to chat room for ticket {self.ticket_id}"
        }))

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        logger.info(f"Ticket WS disconnected for ticket {self.ticket_id}")

    async def receive(self, text_data=None, bytes_data=None):
        try:
            data = json.loads(text_data or "{}")
            msg_type = data.get("type") or data.get("action")

            if msg_type == "ping":
                await self.send(text_data=json.dumps({"type": "pong", "action": "pong"}))
                return

            if msg_type == "typing":
                # Broadcast typing indicator to all subscribers in this ticket room
                typing_payload = {
                    "type": "typing",
                    "sender_name": data.get("sender_name", "User"),
                    "is_typing": data.get("is_typing", True)
                }
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "chat_message",
                        "event": "typing",
                        "data": typing_payload
                    }
                )
                return

            if msg_type in ("chat_message", "new_message"):
                sender_name = data.get("sender_name", "Arafath")
                sender_role = data.get("sender_role", "company_admin")
                message = data.get("message", "")
                attachment_url = data.get("attachment_url")
                attachment_name = data.get("attachment_name")

                # Persist to PostgreSQL (ChatService also triggers broadcasts)
                await self.save_chat_message(
                    sender_name=sender_name,
                    sender_role=sender_role,
                    message=message,
                    attachment_url=attachment_url,
                    attachment_name=attachment_name
                )
                return
        except Exception as e:
            logger.error(f"Error handling WS message in ticket {self.ticket_id}: {e}")

    async def chat_message(self, event):
        """Forward real-time message event to connected client."""
        event_name = event.get("event")
        data = event.get("data")

        # Typing indicator
        if event_name == "typing":
            await self.send(text_data=json.dumps({
                "type": "typing",
                "event": "typing",
                "sender_name": data.get("sender_name"),
                "is_typing": data.get("is_typing", True)
            }))
            return

        # New message received
        if event_name in ("new_message", "chat_message"):
            await self.send(text_data=json.dumps({
                "type": "chat_message",
                "event": "new_message",
                "data": data
            }))
            return

        # Ticket status / details update / closed / reopened
        response_payload = {
            "type": event_name,
            "event": event_name,
            "data": data,
        }
        if isinstance(data, dict):
            response_payload.update(data)

        await self.send(text_data=json.dumps(response_payload))
