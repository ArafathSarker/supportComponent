from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from app.database import get_db
from app.models import Ticket, TicketMessage, TicketAttachment
from app.schemas import (
    TicketCreate,
    TicketResponse,
    TicketDetailResponse,
    TicketStatusUpdate,
    TicketCloseRequest,
    TicketStats,
    MessageCreate,
    MessageResponse
)
from app.websocket_manager import manager

router = APIRouter(prefix="/tickets", tags=["Tickets"])

def generate_ticket_code(db: Session) -> str:
    year = datetime.utcnow().year
    count = db.query(Ticket).count() + 1
    return f"TCK-{year}-{count:04d}"

@router.get("/stats", response_model=TicketStats)
def get_ticket_stats(
    company_name: Optional[str] = None,
    role: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Ticket)
    if role == "company_admin" and company_name:
        query = query.filter(Ticket.company_name == company_name)
    
    total = query.count()
    active = query.filter(Ticket.status.in_(["Open", "Under Review"])).count()
    in_progress = query.filter(Ticket.status.in_(["In Progress", "Pending Customer Close"])).count()
    closed = query.filter(Ticket.status == "Closed").count()

    return TicketStats(
        total_tickets=total,
        active_tickets=active,
        in_progress_tickets=in_progress,
        closed_tickets=closed
    )

@router.get("", response_model=List[TicketResponse])
def get_tickets(
    role: Optional[str] = Query(None, description="company_admin or super_admin"),
    company_name: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    urgency_filter: Optional[str] = Query(None, alias="urgency"),
    category_filter: Optional[str] = Query(None, alias="category"),
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Ticket)

    # If company_admin, show tickets for their company
    if role == "company_admin" and company_name:
        query = query.filter(Ticket.company_name == company_name)

    if status_filter and status_filter != "All":
        query = query.filter(Ticket.status == status_filter)

    if urgency_filter and urgency_filter != "All":
        query = query.filter(Ticket.urgency == urgency_filter)

    if category_filter and category_filter != "All":
        query = query.filter(Ticket.category == category_filter)

    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            or_(
                Ticket.ticket_code.ilike(search_fmt),
                Ticket.title.ilike(search_fmt),
                Ticket.affected_system.ilike(search_fmt),
                Ticket.description.ilike(search_fmt)
            )
        )

    tickets = query.order_by(desc(Ticket.created_at)).all()

    # Enrich with message count and latest message snippet
    results = []
    for t in tickets:
        msg_count = db.query(TicketMessage).filter(TicketMessage.ticket_id == t.id).count()
        latest_msg = db.query(TicketMessage).filter(TicketMessage.ticket_id == t.id).order_by(desc(TicketMessage.created_at)).first()
        res = TicketResponse(
            id=t.id,
            ticket_code=t.ticket_code,
            title=t.title,
            affected_system=t.affected_system,
            category=t.category,
            urgency=t.urgency,
            description=t.description,
            status=t.status,
            company_name=t.company_name,
            created_by_name=t.created_by_name,
            created_by_role=t.created_by_role,
            closed_at=t.closed_at,
            closed_by=t.closed_by,
            created_at=t.created_at,
            updated_at=t.updated_at,
            message_count=msg_count,
            latest_message=latest_msg.message if latest_msg else None
        )
        results.append(res)
    return results

@router.post("", response_model=TicketDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket(ticket_data: TicketCreate, db: Session = Depends(get_db)):
    code = generate_ticket_code(db)
    ticket = Ticket(
        ticket_code=code,
        title=ticket_data.title,
        affected_system=ticket_data.affected_system,
        category=ticket_data.category,
        urgency=ticket_data.urgency,
        description=ticket_data.description,
        status="Open",
        company_name=ticket_data.company_name,
        created_by_name=ticket_data.created_by_name,
        created_by_role=ticket_data.created_by_role or "company_admin"
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    # Create initial system event message
    initial_msg = TicketMessage(
        ticket_id=ticket.id,
        sender_name="System",
        sender_role="system",
        message=f"Ticket {code} opened by {ticket.created_by_name} ({ticket.company_name}) for system '{ticket.affected_system}' with urgency '{ticket.urgency}'.",
        is_system_event=True
    )
    db.add(initial_msg)
    db.commit()
    db.refresh(ticket)

    # Broadcast event to global listeners
    await manager.broadcast_global_event("new_ticket", {
        "id": ticket.id,
        "ticket_code": ticket.ticket_code,
        "title": ticket.title,
        "urgency": ticket.urgency,
        "status": ticket.status,
        "company_name": ticket.company_name
    })

    return ticket

@router.get("/{ticket_id}", response_model=TicketDetailResponse)
def get_ticket_detail(ticket_id: str, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(
        or_(Ticket.id == ticket_id, Ticket.ticket_code == ticket_id)
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket

@router.patch("/{ticket_id}/status")
async def update_ticket_status(
    ticket_id: str, 
    update_data: TicketStatusUpdate, 
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(
        or_(Ticket.id == ticket_id, Ticket.ticket_code == ticket_id)
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    new_status = update_data.status

    # Enforce core business rule: Super Admin CANNOT close the ticket!
    # "super admin can't close the ticket untill the company owner or consumer is not closing the ticket ok"
    if new_status == "Closed" and update_data.updated_by_role != "company_admin":
        raise HTTPException(
            status_code=403, 
            detail="Super Admin cannot close the ticket directly. Only the Company Admin/Owner can close this ticket."
        )

    old_status = ticket.status
    ticket.status = new_status
    ticket.updated_at = datetime.utcnow()

    if new_status == "Closed":
        ticket.closed_at = datetime.utcnow()
        ticket.closed_by = update_data.updated_by_name

    # Add system event message in chat log
    role_label = "Company Admin" if update_data.updated_by_role == "company_admin" else "Super Admin"
    event_text = f"Status changed from '{old_status}' to '{new_status}' by {update_data.updated_by_name} ({role_label})."
    if update_data.comment:
        event_text += f" Note: {update_data.comment}"

    sys_msg = TicketMessage(
        ticket_id=ticket.id,
        sender_name="System",
        sender_role="system",
        message=event_text,
        is_system_event=True
    )
    db.add(sys_msg)
    db.commit()
    db.refresh(ticket)
    db.refresh(sys_msg)

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
    await manager.broadcast_ticket_message(ticket.id, {
        "type": "chat_message",
        "data": msg_dict
    })

    # Broadcast status change event to ticket room and global
    status_event = {
        "type": "status_updated",
        "ticket_id": ticket.id,
        "ticket_code": ticket.ticket_code,
        "status": ticket.status,
        "updated_by_name": update_data.updated_by_name,
        "updated_by_role": update_data.updated_by_role
    }
    await manager.broadcast_ticket_message(ticket.id, status_event)
    await manager.broadcast_global_event("ticket_status_updated", status_event)

    return {"message": "Status updated successfully", "status": ticket.status}

@router.post("/{ticket_id}/close")
async def close_ticket_by_company(
    ticket_id: str, 
    close_data: TicketCloseRequest, 
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(
        or_(Ticket.id == ticket_id, Ticket.ticket_code == ticket_id)
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if close_data.closed_by_role != "company_admin":
        raise HTTPException(
            status_code=403, 
            detail="Only Company Admin can close this ticket."
        )

    ticket.status = "Closed"
    ticket.closed_at = datetime.utcnow()
    ticket.closed_by = close_data.closed_by_name
    ticket.updated_at = datetime.utcnow()

    event_msg = f"Ticket closed by Company Owner ({close_data.closed_by_name})."
    if close_data.satisfaction_rating:
        event_msg += f" Satisfaction rating: {close_data.satisfaction_rating}/5 stars."
    if close_data.close_notes:
        event_msg += f" Remarks: {close_data.close_notes}"

    sys_msg = TicketMessage(
        ticket_id=ticket.id,
        sender_name="System",
        sender_role="system",
        message=event_msg,
        is_system_event=True
    )
    db.add(sys_msg)
    db.commit()
    db.refresh(ticket)
    db.refresh(sys_msg)

    # Broadcast
    msg_dict = {
        "id": sys_msg.id,
        "ticket_id": ticket.id,
        "sender_name": sys_msg.sender_name,
        "sender_role": sys_msg.sender_role,
        "message": sys_msg.message,
        "is_system_event": True,
        "created_at": sys_msg.created_at.isoformat()
    }
    await manager.broadcast_ticket_message(ticket.id, {"type": "chat_message", "data": msg_dict})
    await manager.broadcast_ticket_message(ticket.id, {"type": "ticket_closed", "ticket_id": ticket.id})
    await manager.broadcast_global_event("ticket_closed", {"ticket_id": ticket.id, "ticket_code": ticket.ticket_code})

    return {"message": "Ticket closed successfully", "status": "Closed"}

@router.post("/{ticket_id}/reopen")
async def reopen_ticket(
    ticket_id: str, 
    user_name: str = Query("Arafath"),
    user_role: str = Query("company_admin"),
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(
        or_(Ticket.id == ticket_id, Ticket.ticket_code == ticket_id)
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    ticket.status = "Open"
    ticket.closed_at = None
    ticket.closed_by = None
    ticket.updated_at = datetime.utcnow()

    sys_msg = TicketMessage(
        ticket_id=ticket.id,
        sender_name="System",
        sender_role="system",
        message=f"Ticket reopened by {user_name} ({user_role}).",
        is_system_event=True
    )
    db.add(sys_msg)
    db.commit()

    await manager.broadcast_ticket_message(ticket.id, {
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
    await manager.broadcast_global_event("ticket_reopened", {"ticket_id": ticket.id, "ticket_code": ticket.ticket_code})

    return {"message": "Ticket reopened", "status": "Open"}

@router.get("/{ticket_id}/messages", response_model=List[MessageResponse])
def get_messages(ticket_id: str, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(
        or_(Ticket.id == ticket_id, Ticket.ticket_code == ticket_id)
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    messages = db.query(TicketMessage).filter(TicketMessage.ticket_id == ticket.id).order_by(TicketMessage.created_at).all()
    return messages

@router.post("/{ticket_id}/messages", response_model=MessageResponse)
async def post_message(ticket_id: str, msg_in: MessageCreate, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter(
        or_(Ticket.id == ticket_id, Ticket.ticket_code == ticket_id)
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    msg = TicketMessage(
        ticket_id=ticket.id,
        sender_name=msg_in.sender_name,
        sender_role=msg_in.sender_role,
        message=msg_in.message,
        attachment_url=msg_in.attachment_url,
        attachment_name=msg_in.attachment_name,
        is_system_event=False
    )
    db.add(msg)
    ticket.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(msg)

    # Broadcast to WebSocket room
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
    await manager.broadcast_ticket_message(ticket.id, {
        "type": "chat_message",
        "data": msg_dict
    })

    return msg
