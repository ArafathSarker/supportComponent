import logging
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger('support.events')


def broadcast_global_event(event_type: str, payload: dict) -> None:
    """
    Broadcast an event to all subscribers listening on global notifications.
    Safe: handles cases where channel layer is not available or fails gracefully.
    """
    channel_layer = get_channel_layer()
    if not channel_layer:
        logger.debug("No channel layer configured; skipping global event.")
        return

    try:
        async_to_sync(channel_layer.group_send)(
            "global_notifications",
            {
                "type": "global_notification",
                "event": event_type,
                "data": payload,
            }
        )
    except Exception as e:
        logger.warning(f"Error broadcasting global event '{event_type}': {e}")


def broadcast_ticket_event(ticket_id: str, event_type: str, payload: dict) -> None:
    """
    Broadcast an event to subscribers of a specific ticket chat/drawer room.
    """
    channel_layer = get_channel_layer()
    if not channel_layer:
        logger.debug("No channel layer configured; skipping ticket event.")
        return

    safe_ticket_id = str(ticket_id).replace("-", "_")
    room_name = f"ticket_{safe_ticket_id}"

    try:
        async_to_sync(channel_layer.group_send)(
            room_name,
            {
                "type": "chat_message",
                "event": event_type,
                "data": payload,
            }
        )
    except Exception as e:
        logger.warning(f"Error broadcasting ticket event '{event_type}' to '{room_name}': {e}")
