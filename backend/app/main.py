import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models import Ticket, TicketMessage, VisitingReport
from app.routers import tickets, visiting, chat_ws, upload

def seed_initial_data():
    """Seed realistic IoT support tickets & visit logs if database is empty."""
    db = SessionLocal()
    try:
        if db.query(Ticket).count() == 0:
            # 1. Sample Closed Ticket (Matches the screenshot showing 1 resolved ticket!)
            t1 = Ticket(
                ticket_code="TCK-2026-0001",
                title="Pressure Sensor Drift on Main Line SCADA",
                affected_system="SCADA / Dashboard / Display Issue",
                category="SCADA / Dashboard / Display Issue",
                urgency="Medium",
                description="The pressure reading on the SCADA dashboard displays periodic drifts of +/- 1.2 bar compared to analog gauge.",
                status="Closed",
                company_name="CSI Smart Tech Ltd",
                created_by_name="Arafath",
                created_by_role="company_admin",
                closed_by="Arafath"
            )
            db.add(t1)
            db.flush()

            db.add(TicketMessage(
                ticket_id=t1.id,
                sender_name="System",
                sender_role="system",
                message="Ticket TCK-2026-0001 opened by Arafath (CSI Smart Tech Ltd).",
                is_system_event=True
            ))
            db.add(TicketMessage(
                ticket_id=t1.id,
                sender_name="Alex (Support Lead)",
                sender_role="super_admin",
                message="Hello Arafath, we reviewed the telemetry calibration factor and adjusted the zero-offset via remote gateway."
            ))
            db.add(TicketMessage(
                ticket_id=t1.id,
                sender_name="Arafath",
                sender_role="company_admin",
                message="Thank you Alex! The readings now match our mechanical gauge perfectly. Closing ticket now."
            ))
            db.add(TicketMessage(
                ticket_id=t1.id,
                sender_name="System",
                sender_role="system",
                message="Ticket closed by Company Owner (Arafath). Satisfaction rating: 5/5 stars.",
                is_system_event=True
            ))

            # 2. Sample In-Progress Ticket
            t2 = Ticket(
                ticket_code="TCK-2026-0002",
                title="Water Flow Meter Telemetry Intermittent Disconnection",
                affected_system="Water Flow Monitoring",
                category="Hardware / Sensor / Device Problem",
                urgency="High",
                description="Modbus RS485 communication with flow meter FM-03 drops packets every 10-15 minutes. Gateway logs show timeout errors.",
                status="In Progress",
                company_name="CSI Smart Tech Ltd",
                created_by_name="Arafath",
                created_by_role="company_admin"
            )
            db.add(t2)
            db.flush()

            db.add(TicketMessage(
                ticket_id=t2.id,
                sender_name="System",
                sender_role="system",
                message="Ticket TCK-2026-0002 opened by Arafath (CSI Smart Tech Ltd).",
                is_system_event=True
            ))
            db.add(TicketMessage(
                ticket_id=t2.id,
                sender_name="Super Admin (David)",
                sender_role="super_admin",
                message="Hi Arafath! We detected noise on the RS485 termination resistor. We are scheduling an on-site engineer visit to install shielded cabling."
            ))

            # 3. Sample Visiting Report (Pending Acknowledgement by Company Admin)
            v1 = VisitingReport(
                visit_code="VIS-2026-0001",
                ticket_id=t2.id,
                company_name="CSI Smart Tech Ltd",
                target_system="Water Flow Monitoring (FM-03 line)",
                visiting_engineers="Engr. Tanvir Ahmed (Senior IoT Specialist), Engr. Kabir Hossain",
                purpose="On-site diagnostic inspection, cable shielding replacement, and RS485 bus impedance re-termination.",
                scheduled_date="2026-10-24 10:30 AM",
                estimated_duration="3 Hours",
                entry_requirements="Factory Safety Boots, High-Vis Vest, Security Gate Pass",
                status="Pending Acknowledgement",
                super_admin_notes="Engineers will carry calibrated fluke multimeter and oscilloscope."
            )
            db.add(v1)

            # 4. Sample Completed Visiting Report
            v2 = VisitingReport(
                visit_code="VIS-2026-0002",
                company_name="CSI Smart Tech Ltd",
                target_system="Main Electrical Substation Energy Meter",
                visiting_engineers="Engr. Mahfuzur Rahman",
                purpose="Quarterly preventative maintenance and CT clamp ratio calibration.",
                scheduled_date="2026-10-10 02:00 PM",
                estimated_duration="2 Hours",
                entry_requirements="Standard Safety Equipment",
                status="Completed",
                acknowledged_by="Arafath",
                company_acknowledgement_notes="Gate pass #GP-9912 approved.",
                service_summary="Successfully recalibrated CT sensor ratios. SCADA power factor and active power calculations verified within 0.2% tolerance."
            )
            db.add(v2)

            db.commit()
    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database tables exist
    Base.metadata.create_all(bind=engine)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    seed_initial_data()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Modular Plug-and-Play Support & Visiting Component Backend with WebSockets",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for seamless integration into any frontend host
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for evidence attachments
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Modular Routers
app.include_router(tickets.router, prefix=settings.API_V1_STR)
app.include_router(visiting.router, prefix=settings.API_V1_STR)
app.include_router(upload.router, prefix=settings.API_V1_STR)
app.include_router(chat_ws.router)

@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "online",
        "service": "Support Component API",
        "version": "1.0.0",
        "database": engine.url.drivername
    }
