import pytest


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
            "created_by_role": "company_admin"
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
