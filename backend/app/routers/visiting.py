from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from app.database import get_db
from app.models import VisitingReport, Ticket
from app.schemas import (
    VisitingReportCreate,
    VisitingReportResponse,
    VisitingReportAcknowledge,
    VisitingReportComplete
)
from app.websocket_manager import manager

router = APIRouter(prefix="/visiting", tags=["Visiting Reports"])

def generate_visit_code(db: Session) -> str:
    year = datetime.utcnow().year
    count = db.query(VisitingReport).count() + 1
    return f"VIS-{year}-{count:04d}"

@router.get("", response_model=List[VisitingReportResponse])
def get_visiting_reports(
    role: Optional[str] = Query(None, description="company_admin or super_admin"),
    company_name: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(VisitingReport)

    if role == "company_admin" and company_name:
        query = query.filter(VisitingReport.company_name == company_name)

    if status_filter and status_filter != "All":
        query = query.filter(VisitingReport.status == status_filter)

    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            or_(
                VisitingReport.visit_code.ilike(search_fmt),
                VisitingReport.target_system.ilike(search_fmt),
                VisitingReport.visiting_engineers.ilike(search_fmt),
                VisitingReport.purpose.ilike(search_fmt),
                VisitingReport.company_name.ilike(search_fmt)
            )
        )

    return query.order_by(desc(VisitingReport.created_at)).all()

@router.post("", response_model=VisitingReportResponse, status_code=status.HTTP_201_CREATED)
async def create_visiting_log(
    report_data: VisitingReportCreate,
    db: Session = Depends(get_db)
):
    code = generate_visit_code(db)
    report = VisitingReport(
        visit_code=code,
        ticket_id=report_data.ticket_id,
        company_name=report_data.company_name,
        target_system=report_data.target_system,
        visiting_engineers=report_data.visiting_engineers,
        purpose=report_data.purpose,
        scheduled_date=report_data.scheduled_date,
        estimated_duration=report_data.estimated_duration or "2 Hours",
        entry_requirements=report_data.entry_requirements or "Standard Safety Equipment & Gate Pass",
        status="Pending Acknowledgement",
        super_admin_notes=report_data.super_admin_notes
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # Broadcast global notification to company admin
    await manager.broadcast_global_event("new_visit_request", {
        "id": report.id,
        "visit_code": report.visit_code,
        "company_name": report.company_name,
        "scheduled_date": report.scheduled_date,
        "purpose": report.purpose
    })

    return report

@router.get("/{visit_id}", response_model=VisitingReportResponse)
def get_visiting_report_detail(visit_id: str, db: Session = Depends(get_db)):
    report = db.query(VisitingReport).filter(
        or_(VisitingReport.id == visit_id, VisitingReport.visit_code == visit_id)
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Visiting report not found")
    return report

@router.post("/{visit_id}/acknowledge", response_model=VisitingReportResponse)
async def acknowledge_visit(
    visit_id: str,
    ack_data: VisitingReportAcknowledge,
    db: Session = Depends(get_db)
):
    report = db.query(VisitingReport).filter(
        or_(VisitingReport.id == visit_id, VisitingReport.visit_code == visit_id)
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Visiting report not found")

    report.status = "Acknowledged"
    report.acknowledged_by = ack_data.acknowledged_by
    report.company_acknowledgement_notes = ack_data.company_acknowledgement_notes
    report.acknowledged_at = datetime.utcnow()
    report.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(report)

    await manager.broadcast_global_event("visit_acknowledged", {
        "id": report.id,
        "visit_code": report.visit_code,
        "acknowledged_by": report.acknowledged_by,
        "company_name": report.company_name
    })

    return report

@router.post("/{visit_id}/complete", response_model=VisitingReportResponse)
async def complete_visit(
    visit_id: str,
    comp_data: VisitingReportComplete,
    db: Session = Depends(get_db)
):
    report = db.query(VisitingReport).filter(
        or_(VisitingReport.id == visit_id, VisitingReport.visit_code == visit_id)
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Visiting report not found")

    report.status = "Completed"
    report.service_summary = comp_data.service_summary
    report.completed_at = datetime.utcnow()
    report.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(report)

    await manager.broadcast_global_event("visit_completed", {
        "id": report.id,
        "visit_code": report.visit_code,
        "company_name": report.company_name
    })

    return report
