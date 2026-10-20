import json
import logging
from typing import Dict, List
from fastapi import WebSocket

logger = logging.getLogger("support_component.ws")

class ConnectionManager:
    def __init__(self):
        # ticket_id -> List[WebSocket]
        self.ticket_rooms: Dict[str, List[WebSocket]] = {}
        # global listeners (dashboard updates)
        self.global_listeners: List[WebSocket] = []

    async def connect_ticket(self, websocket: WebSocket, ticket_id: str):
        await websocket.accept()
        if ticket_id not in self.ticket_rooms:
            self.ticket_rooms[ticket_id] = []
        self.ticket_rooms[ticket_id].append(websocket)
        logger.info(f"WebSocket client connected to ticket {ticket_id}. Total in room: {len(self.ticket_rooms[ticket_id])}")

    def disconnect_ticket(self, websocket: WebSocket, ticket_id: str):
        if ticket_id in self.ticket_rooms:
            if websocket in self.ticket_rooms[ticket_id]:
                self.ticket_rooms[ticket_id].remove(websocket)
            if not self.ticket_rooms[ticket_id]:
                del self.ticket_rooms[ticket_id]
        logger.info(f"WebSocket client disconnected from ticket {ticket_id}")

    async def broadcast_ticket_message(self, ticket_id: str, message_data: dict):
        if ticket_id in self.ticket_rooms:
            payload = json.dumps(message_data, default=str)
            dead_sockets = []
            for connection in self.ticket_rooms[ticket_id]:
                try:
                    await connection.send_text(payload)
                except Exception as e:
                    logger.warning(f"Error sending to websocket client: {e}")
                    dead_sockets.append(connection)
            for dead in dead_sockets:
                self.disconnect_ticket(dead, ticket_id)

    async def connect_global(self, websocket: WebSocket):
        await websocket.accept()
        self.global_listeners.append(websocket)
        logger.info(f"Global WS connected. Total listeners: {len(self.global_listeners)}")

    def disconnect_global(self, websocket: WebSocket):
        if websocket in self.global_listeners:
            self.global_listeners.remove(websocket)

    async def broadcast_global_event(self, event_type: str, data: dict):
        payload = json.dumps({"type": event_type, "data": data}, default=str)
        dead_sockets = []
        for connection in self.global_listeners:
            try:
                await connection.send_text(payload)
            except Exception:
                dead_sockets.append(connection)
        for dead in dead_sockets:
            self.disconnect_global(dead)

manager = ConnectionManager()
