import pytest


def _verified_prechecks(client, category="Hardware / Sensor / Device Problem"):
    """Every managed pre-ticket check for a category, all verified."""
    response = client.get(
        "/api/support/checklist-options/",
        data={"kind": "prechecklist", "category": category, "active_only": 1},
        headers={"x-user-role": "company_admin"},
    )
    assert response.status_code == 200
    return [{"label": item["label"], "checked": True} for item in response.json()]


@pytest.mark.django_db
def test_super_admin_cannot_create_ticket(client):
    """
    Ensure Solution Provider (super_admin) cannot raise support tickets.
    """
    res = client.post(
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
    assert res.status_code == 403
    assert "cannot raise support tickets" in res.json()["detail"]


@pytest.mark.django_db
def test_company_admin_ticket_lifecycle(client):
    """
    Test complete lifecycle: Create -> Edit -> Update Status -> Close -> Reopen.
    """
    # 1. Company Admin creates ticket
    create_res = client.post(
        "/api/tickets/",
        data={
            "title": "High Vibration Warning on Water Pump WP-02",
            "affected_system": "Water Flow Monitoring",
            "category": "Hardware / Sensor / Device Problem",
            "urgency": "High",
            "description": "Accelerometer telemetry shows 6.8 mm/s RMS vibration exceeding safe threshold.",
            "company_name": "CSI Smart Tech Ltd",
            "created_by_name": "Arafath",
            "created_by_role": "company_admin",
            "prechecklist": _verified_prechecks(client),
        },
        format="json"
    )
    assert create_res.status_code == 201
    ticket = create_res.json()
    ticket_id = ticket["id"]
    assert ticket["status"] == "Open"
    assert ticket["ticket_code"].startswith("TCK-")

    # 2. Super Admin attempts to edit ticket details -> FORBIDDEN (403)
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

    # 3. Company Admin edits ticket -> SUCCESS (200)
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
    assert edit_res.json()["title"] == "High Vibration Warning on Water Pump WP-02 (Updated: Line 4)"
    assert edit_res.json()["urgency"] == "Critical"

    # 4. Super Admin changes status to "In Progress"
    status_res = client.patch(
        f"/api/tickets/{ticket_id}/status/",
        data={
            "status": "In Progress",
            "updated_by_role": "super_admin",
            "updated_by_name": "David",
            "comment": "Support team reviewing vibration harmonic analysis."
        },
        format="json"
    )
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "In Progress"

    # 5. Super Admin attempts to CLOSE ticket -> FORBIDDEN (403)
    close_attempt = client.patch(
        f"/api/tickets/{ticket_id}/status/",
        data={
            "status": "Closed",
            "updated_by_role": "super_admin",
            "updated_by_name": "David"
        },
        format="json"
    )
    assert close_attempt.status_code == 403

    # 6. Company Admin closes ticket -> SUCCESS (200)
    close_res = client.post(
        f"/api/tickets/{ticket_id}/close/",
        data={
            "closed_by_name": "Arafath",
            "closed_by_role": "company_admin",
            "close_notes": "Vibration normalized. Thanks!"
        },
        format="json"
    )
    assert close_res.status_code == 200
    assert close_res.json()["status"] == "Closed"

    # 7. Reopen ticket
    reopen_res = client.post(
        f"/api/tickets/{ticket_id}/reopen/",
        data={"user_name": "Arafath", "user_role": "company_admin", "reason": "Slight recurrence"},
        format="json"
    )
    assert reopen_res.status_code == 200
    assert reopen_res.json()["status"] == "Open"


@pytest.mark.django_db
def test_garment_iot_dynamic_fields_and_troubleshooting_checklist(client):
    """
    Test Garment IoT ticket creation with dynamic IoT sensor telemetry,
    troubleshooting checklist, urgent priority, line & machine tracking, and filtering.
    """
    # 1. Create Garment IoT ticket with urgent priority & dynamic fields
    payload = {
        "title": "Needle Sensor Telemetry Drop on Juki Overlock Machine",
        "affected_system": "Smart Sewing Machine Telemetry",
        "category": "Sewing Machine IoT Telemetry / Needle Sensor Failure",
        "priority": "Urgent",
        "urgency": "High",
        "production_impact": "Single Station Down",
        "line_number": "Sewing Line 04",
        "floor_location": "Floor 2 - Sewing Section A",
        "machine_id": "JUKI-DLN-9010A-44",
        "iot_details": {
            "sensor_id": "SN-OP-9988",
            "telemetry_protocol": "MQTT over TLS",
            "error_code_display": "ERR-OPTICAL-LINT",
            "rpm_speed": "4500 RPM"
        },
        "troubleshooting_checklist": [
            "Cleaned optical lint collector with compressed air nozzle",
            "Checked 24V DC auxiliary power supply voltage",
            "Verified needle position sensor LED is illuminating green"
        ],
        "description": "Optical sensor is not sending stitch telemetry packets to MQTT broker since 10:15 AM.",
        "company_name": "CSI Smart Tech Ltd",
        "created_by_name": "Arafath",
        "created_by_role": "company_admin"
    }

    create_res = client.post("/api/tickets/", data=payload, format="json")
    assert create_res.status_code == 201
    ticket = create_res.json()
    ticket_id = ticket["id"]

    assert ticket["priority"] == "Urgent"
    assert ticket["production_impact"] == "Single Station Down"
    assert ticket["line_number"] == "Sewing Line 04"
    assert ticket["floor_location"] == "Floor 2 - Sewing Section A"
    assert ticket["machine_id"] == "JUKI-DLN-9010A-44"
    assert ticket["iot_details"]["sensor_id"] == "SN-OP-9988"
    assert ticket["iot_details"]["error_code_display"] == "ERR-OPTICAL-LINT"
    assert len(ticket["troubleshooting_checklist"]) == 3
    assert "Cleaned optical lint collector" in ticket["troubleshooting_checklist"][0]

    # 2. Retrieve ticket detail
    get_res = client.get(f"/api/tickets/{ticket_id}/")
    assert get_res.status_code == 200
    detail = get_res.json()
    assert detail["priority"] == "Urgent"
    assert detail["machine_id"] == "JUKI-DLN-9010A-44"
    assert detail["iot_details"]["rpm_speed"] == "4500 RPM"

    # 3. Filter by priority=Urgent
    filter_res = client.get("/api/tickets/?priority=Urgent")
    assert filter_res.status_code == 200
    tickets_list = filter_res.json()
    assert any(t["id"] == ticket_id for t in tickets_list)

    # 4. Search by machine_id
    search_res = client.get("/api/tickets/?search=JUKI-DLN-9010A-44")
    assert search_res.status_code == 200
    search_list = search_res.json()
    assert any(t["id"] == ticket_id for t in search_list)

    # 5. Search by line_number
    search_line_res = client.get("/api/tickets/?search=Sewing Line 04")
    assert search_line_res.status_code == 200
    assert any(t["id"] == ticket_id for t in search_line_res.json())

    # 6. Company Admin updates IoT details & priority
    patch_res = client.patch(
        f"/api/tickets/{ticket_id}/",
        data={
            "priority": "Critical",
            "production_impact": "Full Production Line Stoppage",
            "iot_details": {
                "sensor_id": "SN-OP-9988",
                "telemetry_protocol": "MQTT over TLS",
                "error_code_display": "FATAL-LINE-HALT"
            },
            "updated_by_role": "company_admin",
            "updated_by_name": "Arafath"
        },
        format="json"
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["priority"] == "Critical"
    assert updated["production_impact"] == "Full Production Line Stoppage"
    assert updated["iot_details"]["error_code_display"] == "FATAL-LINE-HALT"


@pytest.mark.django_db
def test_ticket_support_workspace(client):
    """
    Test Support Workspace diagnostic triage fields update, persistence, and audit logging.
    """
    # 1. Create a ticket
    create_res = client.post(
        "/api/tickets/",
        data={
            "title": "Needle drive erratic motion on Line 12",
            "description": "Erratic pulse signal detected from servo drive unit.",
            "affected_system": "Smart Sewing Machine Telemetry",
            "category": "Sewing Machine IoT Sensor Malfunction",
            "priority": "High",
            "created_by_name": "Rahim",
            "created_by_role": "company_admin",
            "company_name": "Vintage Denim Studio",
            "troubleshooting_checklist": ["Checked cable seating", "Power-cycled IoT controller"]
        },
        format="json"
    )
    assert create_res.status_code == 201
    ticket_id = create_res.json()["id"]

    # 2. Update workspace triage details via /api/tickets/<id>/workspace/
    ws_res = client.patch(
        f"/api/tickets/{ticket_id}/workspace/",
        data={
            "support_severity": "Critical Outage",
            "assigned_engineer": "Nazmul Hossain",
            "occurrence": "Recurring daily during morning shift",
            "future_possibility": "High",
            "root_cause": "Optocoupler PCB solder fracture under high machine vibration",
            "support_note": "Dispatched replacement sensor unit to Floor 02.",
            "status": "In Progress",
            "updated_by_name": "Nazmul",
            "updated_by_role": "super_admin"
        },
        format="json"
    )
    assert ws_res.status_code == 200
    ws_data = ws_res.json()
    assert ws_data["support_severity"] == "Critical Outage"
    assert ws_data["assigned_engineer"] == "Nazmul Hossain"
    assert ws_data["occurrence"] == "Recurring daily during morning shift"
    assert ws_data["future_possibility"] == "High"
    assert "Optocoupler PCB" in ws_data["root_cause"]
    assert "Dispatched replacement" in ws_data["support_note"]
    assert ws_data["status"] == "In Progress"

    # 3. Retrieve ticket detail to verify persistence and checklist
    detail_res = client.get(f"/api/tickets/{ticket_id}/")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["support_severity"] == "Critical Outage"
    assert detail["assigned_engineer"] == "Nazmul Hossain"
    assert len(detail["troubleshooting_checklist"]) == 2
    assert "Checked cable seating" in detail["troubleshooting_checklist"]


