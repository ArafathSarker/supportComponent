import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone

logger = logging.getLogger("support_app.consumers")

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = "global_notifications"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.info(f"Notification WS client connected: {self.channel_name}")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)
        logger.info(f"Notification WS client disconnected: {self.channel_name}")

    async def receive(self, text_data=None, bytes_data=None):
        if text_data:
            try:
                data = json.loads(text_data)
                if data.get("type") == "ping":
                    await self.send(text_data=json.dumps({"type": "pong"}))
            except Exception:
                pass

    async def notification_message(self, event):
        await self.send(text_data=json.dumps(event["payload"]))


class TicketChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.ticket_id = self.scope['url_route']['kwargs'].get('ticket_id')
        if not self.ticket_id:
            await self.close()
            return

        self.group_name = f"ticket_{self.ticket_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        logger.info(f"Ticket WS connected for ticket {self.ticket_id} ({self.channel_name})")

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            logger.info(f"Ticket WS disconnected for ticket {self.ticket_id}")

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return

        try:
            payload = json.loads(text_data)
            msg_type = payload.get("type")

            if msg_type == "chat_message":
                sender_name = payload.get("sender_name", "Anonymous")
                sender_role = payload.get("sender_role", "company_admin")
                message = payload.get("message", "")
                attachment_url = payload.get("attachment_url")
                attachment_name = payload.get("attachment_name")

                # Save message to database
                saved_msg = await self.save_message(
                    self.ticket_id,
                    sender_name,
                    sender_role,
                    message,
                    attachment_url,
                    attachment_name
                )

                if saved_msg:
                    # Broadcast to ticket group
                    broadcast_payload = {
                        "type": "chat_message",
                        "data": saved_msg
                    }
                    await self.channel_layer.group_send(
                        self.group_name,
                        {
                            "type": "ticket_event",
                            "payload": broadcast_payload
                        }
                    )

            elif msg_type == "typing":
                # Forward typing indicators
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        "type": "ticket_event",
                        "payload": payload
                    }
                )

        except Exception as e:
            logger.error(f"Error processing WS message for ticket {self.ticket_id}: {e}")

    async def ticket_event(self, event):
        await self.send(text_data=json.dumps(event["payload"]))

    @database_sync_to_async
    def save_message(self, ticket_id, sender_name, sender_role, message, attachment_url, attachment_name):
        from .models import Ticket, TicketMessage
        try:
            ticket = Ticket.objects.filter(models_q(ticket_id)).first()
            if not ticket:
                return None

            msg = TicketMessage.objects.create(
                ticket=ticket,
                sender_name=sender_name,
                sender_role=sender_role,
                message=message,
                attachment_url=attachment_url,
                attachment_name=attachment_name,
                is_system_event=False,
                created_at=timezone.now()
            )
            ticket.updated_at = timezone.now()
            ticket.save(update_fields=['updated_at'])

            return {
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
        except Exception as e:
            logger.error(f"Failed to save WS message: {e}")
            return None


def models_q(ticket_id):
    from django.db.models import Q
    return Q(id=ticket_id) | Q(ticket_code=ticket_id)
