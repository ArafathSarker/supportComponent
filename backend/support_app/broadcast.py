import logging
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger("support_app.broadcast")

def broadcast_global_event(event_type: str, data: dict):
    """
    Broadcasts a real-time event to the global notifications channel group.
    """
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            return

        payload = {
            "type": event_type,
            **data
        }
        async_to_sync(channel_layer.group_send)(
            "global_notifications",
            {
                "type": "notification_message",
                "payload": payload
            }
        )
    except Exception as e:
        logger.warning(f"Failed to broadcast global event {event_type}: {e}")


def broadcast_ticket_message(ticket_id: str, payload: dict):
    """
    Broadcasts a chat or status message to all users viewing a specific ticket.
    """
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            return

        group_name = f"ticket_{ticket_id}"
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "ticket_event",
                "payload": payload
            }
        )
    except Exception as e:
        logger.warning(f"Failed to broadcast ticket event to {ticket_id}: {e}")
