from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict

# Attachment schemas
class AttachmentBase(BaseModel):
    file_name: str
    file_path: str
    file_type: Optional[str] = None
    file_size: Optional[int] = 0
    uploaded_by: str

class AttachmentResponse(AttachmentBase):
    id: str
    ticket_id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Message schemas
class MessageCreate(BaseModel):
    sender_name: str
    sender_role: str  # company_admin or super_admin
    message: str
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None

class MessageResponse(BaseModel):
    id: str
    ticket_id: str
    sender_name: str
    sender_role: str
    message: str
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
    is_system_event: bool = False
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# Ticket schemas
class TicketCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    affected_system: str
    category: str
    urgency: str = "Medium"
    description: str = Field(..., min_length=5)
    company_name: str = "CSI Smart Tech Ltd"
    created_by_name: str = "Arafath"
    created_by_role: str = "company_admin"

class TicketStatusUpdate(BaseModel):
    status: str
    updated_by_role: str
    updated_by_name: str
    comment: Optional[str] = None

class TicketCloseRequest(BaseModel):
    closed_by_name: str
    closed_by_role: str  # Must be company_admin as per requirement
    satisfaction_rating: Optional[int] = None
    close_notes: Optional[str] = None

class TicketResponse(BaseModel):
    id: str
    ticket_code: str
    title: str
    affected_system: str
    category: str
    urgency: str
    description: str
    status: str
    company_name: str
    created_by_name: str
    created_by_role: str
    closed_at: Optional[datetime] = None
    closed_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    message_count: Optional[int] = 0
    latest_message: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class TicketDetailResponse(TicketResponse):
    messages: List[MessageResponse] = []
    attachments: List[AttachmentResponse] = []
    model_config = ConfigDict(from_attributes=True)

class TicketStats(BaseModel):
    total_tickets: int
    active_tickets: int
    in_progress_tickets: int
    closed_tickets: int


# Visiting Report schemas
class VisitingReportCreate(BaseModel):
    company_name: str
    target_system: str
    visiting_engineers: str
    purpose: str
    scheduled_date: str
    estimated_duration: Optional[str] = "2 Hours"
    entry_requirements: Optional[str] = "Standard Factory Safety Equipment & Gate Pass"
    super_admin_notes: Optional[str] = None
    ticket_id: Optional[str] = None

class VisitingReportAcknowledge(BaseModel):
    acknowledged_by: str
    company_acknowledgement_notes: Optional[str] = None

class VisitingReportComplete(BaseModel):
    service_summary: str
    completed_by: Optional[str] = None

class VisitingReportResponse(BaseModel):
    id: str
    visit_code: str
    ticket_id: Optional[str] = None
    company_name: str
    target_system: str
    visiting_engineers: str
    purpose: str
    scheduled_date: str
    estimated_duration: str
    entry_requirements: str
    status: str
    super_admin_notes: Optional[str] = None
    company_acknowledgement_notes: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    completed_at: Optional[datetime] = None
    service_summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
