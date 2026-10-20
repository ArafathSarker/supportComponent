import json
import logging
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from app.database import get_db, SessionLocal
from app.models import Ticket, TicketMessage
from app.websocket_manager import manager

logger = logging.getLogger("support_component.ws_router")
router = APIRouter(tags=["WebSocket Chat"])

@router.websocket("/ws/tickets/{ticket_id}")
async def ticket_chat_websocket(websocket: WebSocket, ticket_id: str):
    await manager.connect_ticket(websocket, ticket_id)
    try:
        while True:
            raw_text = await websocket.receive_text()
            try:
                data = json.loads(raw_text)
            except Exception:
                continue

            msg_type = data.get("type", "chat_message")

            if msg_type == "chat_message":
                sender_name = data.get("sender_name", "Anonymous")
                sender_role = data.get("sender_role", "company_admin")
                message_text = data.get("message", "").strip()
                attachment_url = data.get("attachment_url")
                attachment_name = data.get("attachment_name")

                if not message_text and not attachment_url:
                    continue

                # Save message to database using a dedicated session
                db: Session = SessionLocal()
                try:
                    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
                    if not ticket:
                        # try ticket_code match
                        ticket = db.query(Ticket).filter(Ticket.ticket_code == ticket_id).first()

                    if ticket:
                        db_msg = TicketMessage(
                            ticket_id=ticket.id,
                            sender_name=sender_name,
                            sender_role=sender_role,
                            message=message_text,
                            attachment_url=attachment_url,
                            attachment_name=attachment_name,
                            is_system_event=False,
                            created_at=datetime.utcnow()
                        )
                        db.add(db_msg)
                        ticket.updated_at = datetime.utcnow()
                        db.commit()
                        db.refresh(db_msg)

                        broadcast_payload = {
                            "type": "chat_message",
                            "data": {
                                "id": db_msg.id,
                                "ticket_id": ticket.id,
                                "sender_name": db_msg.sender_name,
                                "sender_role": db_msg.sender_role,
                                "message": db_msg.message,
                                "attachment_url": db_msg.attachment_url,
                                "attachment_name": db_msg.attachment_name,
                                "is_system_event": False,
                                "created_at": db_msg.created_at.isoformat()
                            }
                        }
                        await manager.broadcast_ticket_message(ticket_id, broadcast_payload)
                finally:
                    db.close()

            elif msg_type == "typing":
                # Broadcast typing notification to others
                sender_name = data.get("sender_name", "User")
                is_typing = data.get("is_typing", True)
                await manager.broadcast_ticket_message(ticket_id, {
                    "type": "typing",
                    "sender_name": sender_name,
                    "is_typing": is_typing
                })

    except WebSocketDisconnect:
        manager.disconnect_ticket(websocket, ticket_id)
    except Exception as e:
        logger.error(f"WebSocket error in ticket {ticket_id}: {e}")
        manager.disconnect_ticket(websocket, ticket_id)


@router.websocket("/ws/notifications")
async def global_notifications_websocket(websocket: WebSocket):
    await manager.connect_global(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_global(websocket)
    except Exception as e:
        logger.error(f"Global WS error: {e}")
        manager.disconnect_global(websocket)
