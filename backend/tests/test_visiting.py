import pytest


@pytest.mark.django_db
def test_visiting_report_workflow(client):
    # 1. Company Admin cannot schedule visiting reports
    forbidden_res = client.post(
        "/api/visiting/",
        data={
            "company_name": "CSI Smart Tech Ltd",
            "target_system": "Boiler SCADA",
            "visiting_engineers": "Engr. Rezaul",
            "purpose": "Probe calibration",
            "scheduled_date": "2026-10-26 11:00 AM",
        },
        headers={"x-user-role": "company_admin"},
        format="json"
    )
    assert forbidden_res.status_code == 403

    # 2. Super Admin schedules visiting report
    create_res = client.post(
        "/api/visiting/",
        data={
            "company_name": "CSI Smart Tech Ltd",
            "target_system": "Boiler SCADA Terminal B",
            "priority": "Urgent",
            "line_number": "Boiler Line 01",
            "floor_location": "Basement - Boiler & Utility Plant",
            "visiting_engineers": "Engr. Rezaul Karim, Engr. Shahin",
            "purpose": "Sensor probe calibration and thermal imaging audit",
            "visit_reasons": [
                {"id": "r-1", "label": "Recurring telemetry / sensor fault investigation", "option_id": "opt-1"}
            ],
            "internal_visit_reasons": [
                {"id": "ir-1", "label": "Assess whether the reported fault was actually a simple user-side issue"}
            ],
            "scheduled_date": "2026-10-26 11:00 AM",
            "estimated_duration": "4 Hours",
            "entry_requirements": "Boiler room safety pass",
            "super_admin_notes": "Engineers carry calibrated IR camera."
        },
        headers={"x-user-role": "super_admin"},
        format="json"
    )
    assert create_res.status_code == 201
    report = create_res.json()
    visit_id = report["id"]
    assert report["status"] == "Pending Acknowledgement"
    assert report["priority"] == "Urgent"
    assert report["line_number"] == "Boiler Line 01"
    assert report["floor_location"] == "Basement - Boiler & Utility Plant"
    assert report["visit_reasons"][0]["label"] == "Recurring telemetry / sensor fault investigation"
    assert report["internal_visit_reasons"][0]["option_id"] == ""

    # 3. Company Admin acknowledges the visit
    ack_res = client.post(
        f"/api/visiting/{visit_id}/acknowledge/",
        data={
            "acknowledged_by": "Arafath",
            "company_acknowledgement_notes": "Gate pass #GP-1044 is registered.",
            "host_name": "Mr. Rafiq (Factory Maintenance Lead)",
            "host_phone": "+880 1700-000000",
        },
        headers={"x-user-role": "company_admin"},
        format="json"
    )
    assert ack_res.status_code == 200
    assert ack_res.json()["status"] == "Acknowledged"
    assert ack_res.json()["host_name"] == "Mr. Rafiq (Factory Maintenance Lead)"
    assert ack_res.json()["host_phone"] == "+880 1700-000000"

    # 4. Super Admin completes the visit with individual reason verdicts and welcoming person
    comp_res = client.post(
        f"/api/visiting/{visit_id}/complete/",
        data={
            "service_summary": "Thermal imaging audit finished without anomalies. Probes calibrated.",
            "completed_by": "Engr. Rezaul Karim",
            "host_name": "Engr. Jamir (Welcoming Lead)",
            "host_phone": "+880 1811-111111",
            "visit_reasons": [
                {"id": "r-1", "label": "Recurring telemetry / sensor fault investigation", "is_resolved": True}
            ],
            "internal_visit_reasons": [
                {"id": "ir-1", "label": "Assess whether the reported fault was actually a simple user-side issue", "is_resolved": False}
            ],
            "prechecklist_audit": [
                {"id": "pre-1", "task": "Cleaned optical sensor lens", "status": "unverified"}
            ],
            "resolution_notes": "Probe drift corrected and verified against the reference gauge.",
        },
        headers={"x-user-role": "super_admin"},
        format="json"
    )
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "Completed"
    assert comp_res.json()["visit_reasons"][0]["is_resolved"] is True
    assert comp_res.json()["internal_visit_reasons"][0]["is_resolved"] is False
    assert comp_res.json()["host_name"] == "Engr. Jamir (Welcoming Lead)"
    assert "Probe drift" in comp_res.json()["resolution_notes"]
    assert "audit finished" in comp_res.json()["service_summary"]

    # 5. Company Admin confirms resolution from factory side with individual reason verdicts
    client_confirm_res = client.post(
        f"/api/visiting/{visit_id}/confirm-resolution/",
        data={
            "client_resolution_notes": "Factory test run passed with zero sensor drift.",
            "client_resolved_by": "Arafath",
            "visit_reasons": [
                {"id": "r-1", "client_is_resolved": True}
            ],
        },
        headers={"x-user-role": "company_admin"},
        format="json"
    )
    assert client_confirm_res.status_code == 200
    assert client_confirm_res.json()["client_is_resolved"] is True
    assert client_confirm_res.json()["visit_reasons"][0]["client_is_resolved"] is True
    assert "Factory test run" in client_confirm_res.json()["client_resolution_notes"]

    # 6. Test filtering by status, priority, and search query
    list_res = client.get("/api/visiting/?status=Completed&priority=Urgent")
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1
    assert list_res.json()[0]["id"] == visit_id

    # Search by engineer name or location
    search_res = client.get("/api/visiting/?search=Rezaul")
    assert search_res.status_code == 200
    assert any(r["id"] == visit_id for r in search_res.json())

    # Search with no match
    nomatch_res = client.get("/api/visiting/?search=NonExistentKeywordXYZ")
    assert nomatch_res.status_code == 200
    assert len(nomatch_res.json()) == 0

