import pytest


def _create_employee(client, name='Engr. Test Lead', phone='+880 1700-000111', lead=True):
    response = client.post(
        "/api/support/employees/",
        data={
            "name": name,
            "phone": phone,
            "designation": "Field Service Engineer",
            "department": "Field Service",
            "is_lead_engineer": lead,
        },
        headers={"x-user-role": "super_admin"},
        format="json",
    )
    assert response.status_code == 201
    return response.json()


@pytest.mark.django_db
def test_support_employee_directory_crud_and_permissions(client):
    employee = _create_employee(client, name='Engr. Directory Test', phone='+880 1999-000222')
    assert employee["name"] == 'Engr. Directory Test'
    assert employee["phone"] == '+880 1999-000222'

    # Company admins cannot manage the directory
    forbidden = client.post(
        "/api/support/employees/",
        data={"name": "Hidden", "phone": "+880 1000-000000"},
        headers={"x-user-role": "company_admin"},
        format="json",
    )
    assert forbidden.status_code == 403

    # Search by name and phone
    by_name = client.get(
        "/api/support/employees/?search=Directory",
        headers={"x-user-role": "super_admin"},
    )
    assert by_name.status_code == 200
    assert any(item["id"] == employee["id"] for item in by_name.json())

    by_phone = client.get(
        "/api/support/employees/?search=1999-000222",
        headers={"x-user-role": "super_admin"},
    )
    assert any(item["id"] == employee["id"] for item in by_phone.json())

    # Update
    updated = client.patch(
        f"/api/support/employees/{employee['id']}/",
        data={"designation": "Senior Field Engineer", "is_lead_engineer": False},
        headers={"x-user-role": "super_admin"},
        format="json",
    )
    assert updated.status_code == 200
    assert updated.json()["designation"] == "Senior Field Engineer"
    assert updated.json()["is_lead_engineer"] is False

    # Delete
    deleted = client.delete(
        f"/api/support/employees/{employee['id']}/",
        headers={"x-user-role": "super_admin"},
    )
    assert deleted.status_code == 204


@pytest.mark.django_db
def test_checklist_options_crud_and_permissions(client):
    created = client.post(
        "/api/support/checklist-options/",
        data={"label": "Test internal drop-down option", "category": "Testing", "sort_order": 95},
        headers={"x-user-role": "super_admin"},
        format="json",
    )
    assert created.status_code == 201
    option = created.json()

    duplicate = client.post(
        "/api/support/checklist-options/",
        data={"label": "Test internal drop-down option"},
        headers={"x-user-role": "super_admin"},
        format="json",
    )
    assert duplicate.status_code == 400

    forbidden = client.post(
        "/api/support/checklist-options/",
        data={"label": "Company cannot add this"},
        headers={"x-user-role": "company_admin"},
        format="json",
    )
    assert forbidden.status_code == 403

    listing = client.get(
        "/api/support/checklist-options/?active_only=1",
        headers={"x-user-role": "super_admin"},
    )
    assert listing.status_code == 200
    assert any(item["id"] == option["id"] for item in listing.json())

    # Visit and confidential reasons stay provider-only
    company_listing = client.get(
        "/api/support/checklist-options/?kind=visit_reason",
        headers={"x-user-role": "company_admin"},
    )
    assert company_listing.status_code == 403

    updated = client.patch(
        f"/api/support/checklist-options/{option['id']}/",
        data={"is_active": False},
        headers={"x-user-role": "super_admin"},
        format="json",
    )
    assert updated.status_code == 200
    assert updated.json()["is_active"] is False

    deleted = client.delete(
        f"/api/support/checklist-options/{option['id']}/",
        headers={"x-user-role": "super_admin"},
    )
    assert deleted.status_code == 204


@pytest.mark.django_db
def test_visit_uses_employee_directory_and_hides_internal_data_from_company(client):
    lead = _create_employee(client, name='Engr. Main Lead', phone='+880 1711-111111')
    helper = _create_employee(
        client, name='Md. Helper', phone='+880 1722-222222', lead=False
    )

    option = client.post(
        "/api/support/checklist-options/",
        data={
            "label": "Verify internal terminal torque",
            "category": "Electrical",
            "kind": "internal_reason",
        },
        headers={"x-user-role": "super_admin"},
        format="json",
    ).json()
    public_reason = client.post(
        "/api/support/checklist-options/",
        data={
            "label": "Calibrate factory floor telemetry sensors",
            "category": "Calibration",
            "kind": "visit_reason",
        },
        headers={"x-user-role": "super_admin"},
        format="json",
    ).json()

    create_res = client.post(
        "/api/visiting/",
        data={
            "company_name": "CSI Smart Tech Ltd",
            "target_system": "Boiler SCADA",
            "scheduled_date": "2026-11-02",
            "lead_employee_id": lead["id"],
            "visiting_team_members": [
                {
                    "employee_id": helper["id"],
                    "name": helper["name"],
                    "phone": helper["phone"],
                    "designation": helper["designation"],
                }
            ],
            "visit_reasons": [
                {"id": "r-1", "label": public_reason["label"], "option_id": public_reason["id"]}
            ],
            "internal_visit_reasons": [
                {"id": "ir-1", "label": option["label"], "option_id": option["id"]}
            ],
            "show_visitor_count": False,
        },
        headers={"x-user-role": "super_admin"},
        format="json",
    )
    assert create_res.status_code == 201
    report = create_res.json()
    visit_id = report["id"]

    # Details auto-filled from the employee directory
    assert report["lead_engineer"] == "Engr. Main Lead"
    assert report["lead_engineer_phone"] == "+880 1711-111111"
    assert report["total_visitors"] == 2
    assert report["show_visitor_count"] is False
    assert report["visit_reasons"][0]["label"] == public_reason["label"]
    assert report["internal_visit_reasons"][0]["label"] == option["label"]

    # Super admin sees the headcount even when it is hidden from the company
    super_list = client.get("/api/visiting/?role=super_admin")
    super_item = next(item for item in super_list.json() if item["id"] == visit_id)
    assert super_item["total_visitors"] == 2

    # Company admin must not see headcount, internal checklist, or audit flags
    company_list = client.get(
        "/api/visiting/?role=company_admin&company_name=CSI Smart Tech Ltd"
    )
    assert company_list.status_code == 200
    company_item = next(item for item in company_list.json() if item["id"] == visit_id)
    assert "total_visitors" not in company_item
    assert "internal_visit_reasons" not in company_item
    assert "prechecklist_audit" not in company_item
    assert "is_flagged" not in company_item
    assert "flag_reason" not in company_item
    assert company_item["visit_reasons"][0]["label"] == public_reason["label"]
    assert all("phone" not in member for member in company_item["visiting_team_members"])

    # Only the super admin can flip headcount visibility back on
    forbidden_patch = client.patch(
        f"/api/visiting/{visit_id}/",
        data={"show_visitor_count": True},
        headers={"x-user-role": "company_admin"},
        format="json",
    )
    assert forbidden_patch.status_code == 403

    visible = client.patch(
        f"/api/visiting/{visit_id}/",
        data={"show_visitor_count": True},
        headers={"x-user-role": "super_admin"},
        format="json",
    )
    assert visible.status_code == 200
    assert visible.json()["show_visitor_count"] is True

    company_after = client.get(
        "/api/visiting/?role=company_admin&company_name=CSI Smart Tech Ltd"
    )
    company_after_item = next(item for item in company_after.json() if item["id"] == visit_id)
    assert company_after_item["total_visitors"] == 2


PRECHECK_CATEGORY = "Hardware / Sensor / Device Problem"


def _category_prechecks(client, category=PRECHECK_CATEGORY):
    """Company-readable pre-ticket checks managed for a problem category."""
    response = client.get(
        "/api/support/problem-categories/?active_only=1",
        headers={"x-user-role": "company_admin"},
    )
    assert response.status_code == 200
    managed = next(item for item in response.json() if item["name"] == category)
    return managed["checklist"]


@pytest.mark.django_db
def test_prechecklist_must_be_verified_before_raising_a_ticket(client):
    prechecks = _category_prechecks(client)
    assert len(prechecks) > 0

    base_payload = {
        "title": "Needle sensor reads zero stitches",
        "affected_system": "Sewing Floor IoT Network",
        "category": PRECHECK_CATEGORY,
        "description": "Telemetry flatlines while the machine runs.",
        "company_name": "CSI Smart Tech Ltd",
        "created_by_name": "Arafath",
        "created_by_role": "company_admin",
    }

    # A partially verified pre-ticket checklist is rejected
    incomplete = client.post(
        "/api/tickets/",
        data={
            **base_payload,
            "prechecklist": [
                {"label": prechecks[0], "checked": True},
                {"label": prechecks[1], "checked": False},
            ],
        },
        headers={"x-user-role": "company_admin"},
        format="json",
    )
    assert incomplete.status_code == 400
    assert "prechecklist" in incomplete.json()

    # Fully verified checklist is accepted and tracked on the ticket
    complete = client.post(
        "/api/tickets/",
        data={
            **base_payload,
            "prechecklist": [
                {"label": item, "checked": True} for item in prechecks
            ],
        },
        headers={"x-user-role": "company_admin"},
        format="json",
    )
    assert complete.status_code == 201
    ticket = complete.json()
    assert len(ticket["prechecklist"]) == len(prechecks)
    assert all(item["checked"] for item in ticket["prechecklist"])


@pytest.mark.django_db
def test_problem_categories_are_dynamic_and_guard_ticket_creation(client):
    """Categories and their pre-ticket checks are managed data, not code."""
    created = client.post(
        "/api/support/problem-categories/",
        data={
            "name": "Custom Sensor Drift",
            "description": "Slowly drifting analog readings",
            "checklist": [
                "Recalibrated the sensor zero offset",
                "   ",
                "Recalibrated the sensor zero offset",
                "Replaced the signal cable",
            ],
            "sort_order": 5,
        },
        headers={"x-user-role": "super_admin"},
        format="json",
    )
    assert created.status_code == 201
    category = created.json()
    assert category["checklist"] == [
        "Recalibrated the sensor zero offset",
        "Replaced the signal cable",
    ]
    category_id = category["id"]

    # The company reads categories to raise tickets, but cannot maintain them
    listing = client.get(
        "/api/support/problem-categories/?active_only=1",
        headers={"x-user-role": "company_admin"},
    )
    assert listing.status_code == 200
    assert any(item["id"] == category_id for item in listing.json())

    forbidden = client.post(
        "/api/support/problem-categories/",
        data={"name": "Company cannot add this", "checklist": ["Anything"]},
        headers={"x-user-role": "company_admin"},
        format="json",
    )
    assert forbidden.status_code == 403

    duplicate = client.post(
        "/api/support/problem-categories/",
        data={"name": "Custom Sensor Drift", "checklist": ["Anything"]},
        headers={"x-user-role": "super_admin"},
        format="json",
    )
    assert duplicate.status_code == 400

    base_payload = {
        "title": "Analog reading drifts every shift",
        "affected_system": "Boiler SCADA",
        "category": "Custom Sensor Drift",
        "description": "The pressure reading drifts by 0.4 bar per shift.",
        "company_name": "CSI Smart Tech Ltd",
        "created_by_name": "Arafath",
        "created_by_role": "company_admin",
    }

    incomplete = client.post(
        "/api/tickets/",
        data={
            **base_payload,
            "prechecklist": [
                {"label": "Recalibrated the sensor zero offset", "checked": True}
            ],
        },
        headers={"x-user-role": "company_admin"},
        format="json",
    )
    assert incomplete.status_code == 400
    assert "prechecklist" in incomplete.json()

    complete = client.post(
        "/api/tickets/",
        data={
            **base_payload,
            "prechecklist": [
                {"label": label, "checked": True} for label in category["checklist"]
            ],
        },
        headers={"x-user-role": "company_admin"},
        format="json",
    )
    assert complete.status_code == 201
    assert len(complete.json()["prechecklist"]) == 2

    # Editing the managed checklist immediately changes what a new ticket needs
    updated = client.patch(
        f"/api/support/problem-categories/{category_id}/",
        data={"checklist": category["checklist"] + ["Captured a raw telemetry snapshot"]},
        headers={"x-user-role": "super_admin"},
        format="json",
    )
    assert updated.status_code == 200
    assert updated.json()["checklist"][-1] == "Captured a raw telemetry snapshot"

    stale = client.post(
        "/api/tickets/",
        data={
            **base_payload,
            "prechecklist": [
                {"label": label, "checked": True} for label in category["checklist"]
            ],
        },
        headers={"x-user-role": "company_admin"},
        format="json",
    )
    assert stale.status_code == 400
    assert "Captured a raw telemetry snapshot" in str(stale.json()["prechecklist"])

    deleted = client.delete(
        f"/api/support/problem-categories/{category_id}/",
        headers={"x-user-role": "super_admin"},
    )
    assert deleted.status_code == 204


@pytest.mark.django_db
def test_visit_prechecklist_audit_is_super_admin_only(client):
    lead = _create_employee(client, name='Engr. Flag Lead', phone='+880 1733-333333')

    prechecks = _category_prechecks(client)
    ticket = client.post(
        "/api/tickets/",
        data={
            "title": "Needle sensor reads zero stitches",
            "affected_system": "Sewing Floor IoT Network",
            "category": PRECHECK_CATEGORY,
            "description": "Telemetry flatlines while the machine runs.",
            "company_name": "CSI Smart Tech Ltd",
            "created_by_name": "Arafath",
            "created_by_role": "company_admin",
            "prechecklist": [
                {"label": item, "checked": True} for item in prechecks
            ],
        },
        headers={"x-user-role": "company_admin"},
        format="json",
    ).json()

    visit = client.post(
        "/api/visiting/",
        data={
            "company_name": "CSI Smart Tech Ltd",
            "target_system": "Chiller Telemetry",
            "scheduled_date": "2026-11-03",
            "lead_employee_id": lead["id"],
            "ticket_id": ticket["id"],
            "visit_reasons": [
                {"id": "r-1", "label": "Recurring telemetry / sensor fault investigation"}
            ],
            "internal_visit_reasons": [
                {"id": "ir-1", "label": "Assess whether the reported fault was a simple user-side issue"}
            ],
        },
        headers={"x-user-role": "super_admin"},
        format="json",
    ).json()
    visit_id = visit["id"]
    assert len(visit["ticket_prechecklist"]) == len(prechecks)

    ack = client.post(
        f"/api/visiting/{visit_id}/acknowledge/",
        data={"acknowledged_by": "Arafath", "company_acknowledgement_notes": "Gate pass ready."},
        headers={"x-user-role": "company_admin"},
        format="json",
    )
    assert ack.status_code == 200
    assert ack.json()["status"] == "Acknowledged"

    audit = [
        {
            "id": f"pre-{index}",
            "task": item,
            "status": "flagged" if index == 0 else "acknowledged",
        }
        for index, item in enumerate(prechecks)
    ]
    complete = client.post(
        f"/api/visiting/{visit_id}/complete/",
        data={
            "service_summary": "Sensor was never cleaned; lint blockage found on-site.",
            "prechecklist_audit": audit,
            "flag_reason": "Company marked the lint cleaning as done but the sensor was fouled.",
        },
        headers={"x-user-role": "super_admin"},
        format="json",
    )
    assert complete.status_code == 200
    completed = complete.json()
    assert completed["is_flagged"] is True
    assert "fouled" in completed["flag_reason"]
    assert completed["prechecklist_audit"][0]["status"] == "flagged"
    assert completed["prechecklist_audit"][1]["status"] == "acknowledged"
    assert completed["flagged_by"] == "Field Engineer"

    # Super admin sees the audit trail
    super_item = next(
        item for item in client.get("/api/visiting/?role=super_admin").json()
        if item["id"] == visit_id
    )
    assert super_item["is_flagged"] is True

    # Company admin never receives the confidential reason or the audit
    company_item = next(
        item for item in client.get(
            "/api/visiting/?role=company_admin&company_name=CSI Smart Tech Ltd"
        ).json()
        if item["id"] == visit_id
    )
    assert "is_flagged" not in company_item
    assert "flag_reason" not in company_item
    assert "prechecklist_audit" not in company_item
    assert "internal_visit_reasons" not in company_item
    assert company_item["visit_reasons"][0]["label"] == "Recurring telemetry / sensor fault investigation"
