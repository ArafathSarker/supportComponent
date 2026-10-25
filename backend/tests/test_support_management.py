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
        data={"label": "Verify internal terminal torque", "category": "Electrical"},
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
            "visit_checklist": [
                {"id": "chk-1", "task": "Inspect sensor alignment", "status": "pending"}
            ],
            "super_admin_checklist": [
                {"id": "sa-1", "task": option["label"], "option_id": option["id"], "status": "pending"}
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
    assert report["super_admin_checklist"][0]["task"] == option["label"]

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
    assert "super_admin_checklist" not in company_item
    assert "is_flagged" not in company_item
    assert "flag_reason" not in company_item
    assert "flag_checklist_items" not in company_item
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


@pytest.mark.django_db
def test_audit_flags_are_super_admin_only(client):
    lead = _create_employee(client, name='Engr. Flag Lead', phone='+880 1733-333333')

    visit = client.post(
        "/api/visiting/",
        data={
            "company_name": "CSI Smart Tech Ltd",
            "target_system": "Chiller Telemetry",
            "scheduled_date": "2026-11-03",
            "lead_employee_id": lead["id"],
            "visit_checklist": [
                {"id": "chk-1", "task": "Inspect sensor alignment", "status": "pending"},
                {"id": "chk-2", "task": "Calibrate telemetry", "status": "pending"},
            ],
        },
        headers={"x-user-role": "super_admin"},
        format="json",
    ).json()
    visit_id = visit["id"]

    ack = client.post(
        f"/api/visiting/{visit_id}/acknowledge/",
        data={
            "acknowledged_by": "Arafath",
            "visit_checklist": [
                {"id": "chk-1", "task": "HACKED TEXT", "company_checked": True},
                {"id": "chk-2", "task": "Calibrate telemetry", "company_checked": False},
            ],
        },
        headers={"x-user-role": "company_admin"},
        format="json",
    )
    assert ack.status_code == 200
    acked_checklist = ack.json()["visit_checklist"]
    assert acked_checklist[0]["company_checked"] is True
    # Company confirmation cannot rewrite the provider-owned task text
    assert acked_checklist[0]["task"] == "Inspect sensor alignment"
    assert acked_checklist[1]["company_checked"] is False

    flagged_item = {
        "id": "chk-1",
        "task": "Inspect sensor alignment",
        "status": "unsolved",
        "flagged": True,
        "flag_note": "Not actually inspected",
    }
    complete = client.post(
        f"/api/visiting/{visit_id}/complete/",
        data={
            "service_summary": "One objective required follow-up.",
            "visit_checklist": [flagged_item, {"id": "chk-2", "task": "Calibrate telemetry", "status": "solved"}],
            "is_flagged": True,
            "flag_reason": "Company claimed the alignment was checked but the team found it untouched.",
            "flag_checklist_items": [flagged_item],
        },
        headers={"x-user-role": "super_admin"},
        format="json",
    )
    assert complete.status_code == 200
    completed = complete.json()
    assert completed["is_flagged"] is True
    assert "untouched" in completed["flag_reason"]
    assert completed["flag_checklist_items"][0]["task"] == "Inspect sensor alignment"
    assert completed["flagged_by"] == "Field Engineer"

    # Super admin sees the audit trail
    super_item = next(
        item for item in client.get("/api/visiting/?role=super_admin").json()
        if item["id"] == visit_id
    )
    assert super_item["is_flagged"] is True

    # Company admin never receives flag data or per-item flag markers
    company_item = next(
        item for item in client.get(
            "/api/visiting/?role=company_admin&company_name=CSI Smart Tech Ltd"
        ).json()
        if item["id"] == visit_id
    )
    assert "is_flagged" not in company_item
    assert "flag_reason" not in company_item
    assert "flag_checklist_items" not in company_item
    assert all("flagged" not in item and "flag_note" not in item for item in company_item["visit_checklist"])
