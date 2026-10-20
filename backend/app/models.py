import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_code = Column(String(30), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    affected_system = Column(String(100), nullable=False, default="General System")
    category = Column(String(100), nullable=False)
    urgency = Column(String(30), nullable=False, default="Medium")
    description = Column(Text, nullable=False)
    status = Column(String(50), nullable=False, default="Open")  # Open, In Progress, Under Review, Pending Customer Close, Closed
    company_name = Column(String(150), nullable=False, default="CSI Smart Tech Ltd")
    created_by_name = Column(String(100), nullable=False, default="Arafath")
    created_by_role = Column(String(50), nullable=False, default="company_admin")
    closed_at = Column(DateTime, nullable=True)
    closed_by = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    messages = relationship("TicketMessage", back_populates="ticket", cascade="all, delete-orphan", order_by="TicketMessage.created_at")
    attachments = relationship("TicketAttachment", back_populates="ticket", cascade="all, delete-orphan")
    visiting_reports = relationship("VisitingReport", back_populates="ticket")


class TicketMessage(Base):
    __tablename__ = "ticket_messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_id = Column(String(36), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_name = Column(String(100), nullable=False)
    sender_role = Column(String(50), nullable=False)  # "company_admin" or "super_admin"
    message = Column(Text, nullable=False)
    attachment_url = Column(String(500), nullable=True)
    attachment_name = Column(String(255), nullable=True)
    is_system_event = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    ticket = relationship("Ticket", back_populates="messages")


class TicketAttachment(Base):
    __tablename__ = "ticket_attachments"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_id = Column(String(36), ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(100), nullable=True)
    file_size = Column(Integer, default=0)
    uploaded_by = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    ticket = relationship("Ticket", back_populates="attachments")


class VisitingReport(Base):
    __tablename__ = "visiting_reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    visit_code = Column(String(30), unique=True, index=True, nullable=False)
    ticket_id = Column(String(36), ForeignKey("tickets.id", ondelete="SET NULL"), nullable=True)
    company_name = Column(String(150), nullable=False)
    target_system = Column(String(150), nullable=False)
    visiting_engineers = Column(String(255), nullable=False)
    purpose = Column(Text, nullable=False)
    scheduled_date = Column(String(100), nullable=False)
    estimated_duration = Column(String(50), default="2 Hours")
    entry_requirements = Column(String(255), default="Standard Factory Safety Equipment & Gate Pass")
    status = Column(String(50), default="Pending Acknowledgement")  # Pending Acknowledgement, Acknowledged, Completed, Cancelled
    super_admin_notes = Column(Text, nullable=True)
    company_acknowledgement_notes = Column(Text, nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    acknowledged_by = Column(String(100), nullable=True)
    completed_at = Column(DateTime, nullable=True)
    service_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    ticket = relationship("Ticket", back_populates="visiting_reports")
