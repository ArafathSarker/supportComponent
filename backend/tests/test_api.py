import os
import pytest
from rest_framework.test import APIClient
from django.core.files.uploadedfile import SimpleUploadedFile

@pytest.fixture
def client():
    return APIClient()

@pytest.mark.django_db
def test_health_check(client):
    response = client.get("/api/health/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "Django" in data["service"]

@pytest.mark.django_db
def test_ticket_flow_and_permission_rule(client):
    # 1. Super Admin attempts to create ticket -> MUST BE FORBIDDEN (403)!
    super_admin_create_res = client.post(
        "/api/tickets/",
        data={
            "title": "Super Admin Ticket Attempt",
            "affected_system": "Water Flow Monitoring",
            "category": "Hardware / Sensor / Device Problem",
            "urgency": "Low",
            "description": "Super admin trying to raise ticket.",
            "company_name": "CSI Smart Tech Ltd",
            "created_by_name": "David",
            "created_by_role": "super_admin"
        },
        format="json"
    )
    assert super_admin_create_res.status_code == 403
    assert "cannot raise support tickets" in super_admin_create_res.json()["detail"]

    # 1b. Company Admin creates ticket -> SUCCESS (201)!
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
    create_res = client.post("/api/tickets/", data=ticket_payload, format="json")
    assert create_res.status_code == 201
    ticket_data = create_res.json()
    ticket_id = ticket_data["id"]
    assert ticket_data["status"] == "Open"
    assert ticket_data["ticket_code"].startswith("TCK-")

    # Verify initial system event message
    assert len(ticket_data["messages"]) == 1
    assert ticket_data["messages"][0]["is_system_event"] is True
    assert "opened by Arafath" in ticket_data["messages"][0]["message"]

    # 1c. Super Admin attempts to EDIT the ticket -> MUST BE FORBIDDEN (403)!
    super_edit_res = client.patch(
        f"/api/tickets/{ticket_id}/",
        data={
            "title": "Unauthorized Super Admin Edit",
            "updated_by_role": "super_admin",
            "updated_by_name": "David"
        },
        format="json"
    )
    assert super_edit_res.status_code == 403
    assert "Super Admin" in super_edit_res.json()["detail"]

    # 1d. Company Admin EDITS the ticket -> SUCCESS (200)!
    edit_res = client.patch(
        f"/api/tickets/{ticket_id}/",
        data={
            "title": "High Vibration Warning on Water Pump WP-02 (Updated: Line 4)",
            "urgency": "Critical",
            "description": "Updated description: Vibration frequency spike observed at 120Hz.",
            "updated_by_role": "company_admin",
            "updated_by_name": "Arafath"
        },
        format="json"
    )
    assert edit_res.status_code == 200
    updated_data = edit_res.json()
    assert updated_data["title"] == "High Vibration Warning on Water Pump WP-02 (Updated: Line 4)"
    assert updated_data["urgency"] == "Critical"
    assert "120Hz" in updated_data["description"]

    # 2. Super Admin changes status to "In Progress"
    status_update_res = client.patch(
        f"/api/tickets/{ticket_id}/status/",
        data={
            "status": "In Progress",
            "updated_by_role": "super_admin",
            "updated_by_name": "Super Admin David",
            "comment": "Support team reviewing vibration harmonic analysis."
        },
        format="json"
    )
    assert status_update_res.status_code == 200
    assert status_update_res.json()["status"] == "In Progress"

    # 3. Super Admin attempts to CLOSE the ticket -> MUST BE FORBIDDEN (403)!
    close_attempt_res = client.patch(
        f"/api/tickets/{ticket_id}/status/",
        data={
            "status": "Closed",
            "updated_by_role": "super_admin",
            "updated_by_name": "Super Admin David"
        },
        format="json"
    )
    assert close_attempt_res.status_code == 403
    assert "Super Admin cannot close the ticket" in close_attempt_res.json()["detail"]

    # 4. Post chat messages
    msg1 = client.post(
        f"/api/tickets/{ticket_id}/messages/",
        data={
            "sender_name": "Arafath",
            "sender_role": "company_admin",
            "message": "We have temporarily reduced motor RPM to 1200."
        },
        format="json"
    )
    assert msg1.status_code == 201

    msg2 = client.post(
        f"/api/tickets/{ticket_id}/messages/",
        data={
            "sender_name": "David",
            "sender_role": "super_admin",
            "message": "Received. Readings are stabilized now. You can safely close the ticket when confirmed."
        },
        format="json"
    )
    assert msg2.status_code == 201

    # 5. Company Admin closes the ticket -> SUCCESS!
    close_res = client.post(
        f"/api/tickets/{ticket_id}/close/",
        data={
            "closed_by_name": "Arafath",
            "closed_by_role": "company_admin",
            "satisfaction_rating": 5,
            "close_notes": "Vibration normalized. Thanks!"
        },
        format="json"
    )
    assert close_res.status_code == 200
    assert close_res.json()["status"] == "Closed"

    # 6. Reopen ticket
    reopen_res = client.post(
        f"/api/tickets/{ticket_id}/reopen/",
        data={"user_name": "Arafath", "user_role": "company_admin"},
        format="json"
    )
    assert reopen_res.status_code == 200
    assert reopen_res.json()["status"] == "Open"

@pytest.mark.django_db
def test_ticket_stats_and_filtering(client):
    # Create tickets
    client.post("/api/tickets/", data={
        "title": "Pressure gauge leakage",
        "affected_system": "Boiler Pressure Line",
        "category": "Hardware / Sensor / Device Problem",
        "urgency": "Critical",
        "description": "Boiler steam line pressure drop.",
        "company_name": "Alpha Corp",
        "created_by_name": "Kamal",
        "created_by_role": "company_admin"
    }, format="json")

    client.post("/api/tickets/", data={
        "title": "Software telemetry sync delay",
        "affected_system": "Factory IoT Edge Gateway",
        "category": "Software / Firmware / App Bug",
        "urgency": "Low",
        "description": "Edge gateway delays telemetry by 3 minutes.",
        "company_name": "Beta Industries",
        "created_by_name": "Salam",
        "created_by_role": "company_admin"
    }, format="json")

    # Test stats
    stats_res = client.get("/api/tickets/stats/")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_tickets"] >= 2
    assert stats["active_tickets"] >= 2

    # Filter by search
    search_res = client.get("/api/tickets/?search=leakage")
    assert search_res.status_code == 200
    results = search_res.json()
    assert len(results) == 1
    assert "leakage" in results[0]["title"].lower()

    # Filter by urgency
    urgency_res = client.get("/api/tickets/?urgency=Critical")
    assert urgency_res.status_code == 200
    crit_results = urgency_res.json()
    assert all(t["urgency"] == "Critical" for t in crit_results)

@pytest.mark.django_db
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
    create_res = client.post("/api/visiting/", data=visit_payload, format="json")
    assert create_res.status_code == 201
    visit_data = create_res.json()
    visit_id = visit_data["id"]
    assert visit_data["status"] == "Pending Acknowledgement"

    # 2. Company Admin acknowledges the visit
    ack_res = client.post(
        f"/api/visiting/{visit_id}/acknowledge/",
        data={
            "acknowledged_by": "Arafath",
            "company_acknowledgement_notes": "Gate pass #GP-1044 is registered. Escort: Maintenance Team B."
        },
        format="json"
    )
    assert ack_res.status_code == 200
    assert ack_res.json()["status"] == "Acknowledged"
    assert ack_res.json()["acknowledged_by"] == "Arafath"

    # 3. Super Admin completes the visit
    comp_res = client.post(
        f"/api/visiting/{visit_id}/complete/",
        data={
            "service_summary": "Thermal imaging audit finished without anomalies. Probes calibrated.",
            "completed_by": "Engr. Rezaul Karim"
        },
        format="json"
    )
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "Completed"
    assert "audit finished" in comp_res.json()["service_summary"]

@pytest.mark.django_db
def test_file_upload(client):
    fake_file = SimpleUploadedFile("diagnostic_log.txt", b"Sensor 1: OK\nSensor 2: 120Hz peak", content_type="text/plain")
    upload_res = client.post(
        "/api/upload/",
        data={"file": fake_file, "uploaded_by": "Tester"},
        format="multipart"
    )
    assert upload_res.status_code == 200
    data = upload_res.json()
    assert "url" in data
    assert data["filename"] == "diagnostic_log.txt"
