import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer

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
            "message": "Connected to global notifications"
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.GROUP_NAME, self.channel_name)
        logger.info(f"Notification WS client disconnected: {self.channel_name}")

    async def receive(self, text_data=None, bytes_data=None):
        """Handle ping/pong keepalive messages."""
        try:
            data = json.loads(text_data or "{}")
            if data.get("type") == "ping":
                await self.send(text_data=json.dumps({"type": "pong"}))
        except Exception as e:
            logger.debug(f"Notification WS parse error: {e}")

    async def global_notification(self, event):
        """Dispatches global notification to the client."""
        await self.send(text_data=json.dumps({
            "event": event.get("event"),
            "data": event.get("data")
        }))


class TicketChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for live interactive ticket chat rooms and drawer updates.
    Path: /ws/tickets/<ticket_id>
    """
    async def connect(self):
        self.ticket_id = self.scope['url_route']['kwargs']['ticket_id']
        safe_ticket_id = str(self.ticket_id).replace("-", "_")
        self.room_group_name = f"ticket_{safe_ticket_id}"

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()
        logger.info(f"Ticket WS connected for ticket {self.ticket_id} ({self.channel_name})")

        await self.send(text_data=json.dumps({
            "type": "connected",
            "ticket_id": self.ticket_id,
            "message": f"Connected to chat room for ticket {self.ticket_id}"
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
        logger.info(f"Ticket WS disconnected for ticket {self.ticket_id}")

    async def receive(self, text_data=None, bytes_data=None):
        try:
            data = json.loads(text_data or "{}")
            action = data.get("action")
            if action == "ping":
                await self.send(text_data=json.dumps({"action": "pong"}))
        except Exception as e:
            logger.debug(f"Ticket WS parse error: {e}")

    async def chat_message(self, event):
        """Forward real-time message event to connected client."""
        await self.send(text_data=json.dumps({
            "event": event.get("event"),
            "data": event.get("data")
        }))
