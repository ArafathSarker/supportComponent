import os
import uuid
import shutil
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models import Ticket, TicketAttachment

router = APIRouter(prefix="/upload", tags=["Uploads"])

UPLOAD_DIR = settings.UPLOAD_DIR
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    ticket_id: Optional[str] = Form(None),
    uploaded_by: Optional[str] = Form("Anonymous"),
    db: Session = Depends(get_db)
):
    try:
        # Generate safe unique filename
        ext = os.path.splitext(file.filename)[1]
        unique_name = f"{uuid.uuid4().hex[:12]}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, unique_name)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_size = os.path.getsize(file_path)
        file_url = f"/uploads/{unique_name}"

        # If linked to a ticket, record attachment
        if ticket_id:
            ticket = db.query(Ticket).filter(
                (Ticket.id == ticket_id) | (Ticket.ticket_code == ticket_id)
            ).first()
            if ticket:
                attachment = TicketAttachment(
                    ticket_id=ticket.id,
                    file_name=file.filename,
                    file_path=file_url,
                    file_type=file.content_type,
                    file_size=file_size,
                    uploaded_by=uploaded_by
                )
                db.add(attachment)
                db.commit()

        return {
            "success": True,
            "filename": file.filename,
            "url": file_url,
            "size": file_size,
            "content_type": file.content_type
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")
