import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.models import Ticket

@pytest.fixture(scope="module")
def client():
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c

def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

def test_ticket_flow_and_permission_rule(client):
    # 1. Company Admin creates ticket
    ticket_payload = {
        "title": "High Vibration Warning on Water Pump WP-02",
        "affected_system": "Water Flow Monitoring",
        "category": "Hardware / Sensor / Device Problem",
        "urgency": "High",
        "description": "Accelerometer telemetry shows 6.8 mm/s RMS vibration exceeding safe threshold.",
        "company_name": "CSI Smart Tech Ltd",
        "created_by_name": "Arafath",
        "created_by_role": "company_admin"
    }
    create_res = client.post("/api/tickets", json=ticket_payload)
    assert create_res.status_code == 201
    ticket_data = create_res.json()
    ticket_id = ticket_data["id"]
    assert ticket_data["status"] == "Open"
    assert ticket_data["ticket_code"].startswith("TCK-")

    # 2. Super Admin changes status to "In Progress"
    status_update_res = client.patch(
        f"/api/tickets/{ticket_id}/status",
        json={
            "status": "In Progress",
            "updated_by_role": "super_admin",
            "updated_by_name": "Super Admin David",
            "comment": "Support team reviewing vibration harmonic analysis."
        }
    )
    assert status_update_res.status_code == 200
    assert status_update_res.json()["status"] == "In Progress"

    # 3. Super Admin attempts to CLOSE the ticket -> MUST BE FORBIDDEN (403)!
    close_attempt_res = client.patch(
        f"/api/tickets/{ticket_id}/status",
        json={
            "status": "Closed",
            "updated_by_role": "super_admin",
            "updated_by_name": "Super Admin David"
        }
    )
    assert close_attempt_res.status_code == 403
    assert "Super Admin cannot close the ticket" in close_attempt_res.json()["detail"]

    # 4. Post chat messages
    msg1 = client.post(
        f"/api/tickets/{ticket_id}/messages",
        json={
            "sender_name": "Arafath",
            "sender_role": "company_admin",
            "message": "We have temporarily reduced motor RPM to 1200."
        }
    )
    assert msg1.status_code == 200

    msg2 = client.post(
        f"/api/tickets/{ticket_id}/messages",
        json={
            "sender_name": "David",
            "sender_role": "super_admin",
            "message": "Received. Readings are stabilized now. You can safely close the ticket when confirmed."
        }
    )
    assert msg2.status_code == 200

    # 5. Company Admin closes the ticket -> SUCCESS!
    close_res = client.post(
        f"/api/tickets/{ticket_id}/close",
        json={
            "closed_by_name": "Arafath",
            "closed_by_role": "company_admin",
            "satisfaction_rating": 5,
            "close_notes": "Vibration normalized. Thanks!"
        }
    )
    assert close_res.status_code == 200
    assert close_res.json()["status"] == "Closed"

def test_visiting_report_workflow(client):
    # 1. Super Admin schedules visiting log
    visit_payload = {
        "company_name": "CSI Smart Tech Ltd",
        "target_system": "Boiler SCADA Terminal B",
        "visiting_engineers": "Engr. Rezaul Karim, Engr. Shahin",
        "purpose": "Sensor probe calibration and thermal imaging audit",
        "scheduled_date": "2026-10-26 11:00 AM",
        "estimated_duration": "4 Hours",
        "entry_requirements": "Boiler room safety pass",
        "super_admin_notes": "Engineers carry calibrated IR camera."
    }
    create_res = client.post("/api/visiting", json=visit_payload)
    assert create_res.status_code == 201
    visit_data = create_res.json()
    visit_id = visit_data["id"]
    assert visit_data["status"] == "Pending Acknowledgement"

    # 2. Company Admin acknowledges the visit
    ack_res = client.post(
        f"/api/visiting/{visit_id}/acknowledge",
        json={
            "acknowledged_by": "Arafath",
            "company_acknowledgement_notes": "Gate pass #GP-1044 is registered. Escort: Maintenance Team B."
        }
    )
    assert ack_res.status_code == 200
    assert ack_res.json()["status"] == "Acknowledged"
    assert ack_res.json()["acknowledged_by"] == "Arafath"

    # 3. Super Admin completes the visit
    comp_res = client.post(
        f"/api/visiting/{visit_id}/complete",
        json={
            "service_summary": "Thermal imaging audit finished without anomalies. Probes calibrated.",
            "completed_by": "Engr. Rezaul Karim"
        }
    )
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "Completed"
    assert "audit finished" in comp_res.json()["service_summary"]
