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
            "visiting_engineers": "Engr. Rezaul Karim, Engr. Shahin",
            "purpose": "Sensor probe calibration and thermal imaging audit",
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

    # 3. Company Admin acknowledges the visit
    ack_res = client.post(
        f"/api/visiting/{visit_id}/acknowledge/",
        data={
            "acknowledged_by": "Arafath",
            "company_acknowledgement_notes": "Gate pass #GP-1044 is registered."
        },
        headers={"x-user-role": "company_admin"},
        format="json"
    )
    assert ack_res.status_code == 200
    assert ack_res.json()["status"] == "Acknowledged"

    # 4. Super Admin completes the visit
    comp_res = client.post(
        f"/api/visiting/{visit_id}/complete/",
        data={
            "service_summary": "Thermal imaging audit finished without anomalies. Probes calibrated."
        },
        headers={"x-user-role": "super_admin"},
        format="json"
    )
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "Completed"
    assert "audit finished" in comp_res.json()["service_summary"]
