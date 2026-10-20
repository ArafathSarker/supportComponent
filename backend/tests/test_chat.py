import pytest


@pytest.mark.django_db
def test_ticket_chat_messages(client):
    # Create ticket first
    create_res = client.post(
        "/api/tickets/",
        data={
            "title": "SCADA Connectivity Issue",
            "category": "Network / Internet / Connectivity",
            "urgency": "High",
            "description": "Lost telemetry packet stream.",
            "company_name": "CSI Smart Tech Ltd",
            "created_by_name": "Arafath",
            "created_by_role": "company_admin"
        },
        format="json"
    )
    ticket_id = create_res.json()["id"]

    # Post message from client
    msg1 = client.post(
        f"/api/tickets/{ticket_id}/messages/",
        data={
            "sender_name": "Arafath",
            "sender_role": "company_admin",
            "message": "We have rebooted the gateway router."
        },
        format="json"
    )
    assert msg1.status_code == 201
    assert msg1.json()["sender_name"] == "Arafath"

    # Post message from support provider
    msg2 = client.post(
        f"/api/tickets/{ticket_id}/messages/",
        data={
            "sender_name": "David",
            "sender_role": "super_admin",
            "message": "Packets are arriving again. Monitoring for 10 minutes."
        },
        format="json"
    )
    assert msg2.status_code == 201
    assert msg2.json()["sender_name"] == "David"

    # Retrieve all messages
    get_res = client.get(f"/api/tickets/{ticket_id}/messages/")
    assert get_res.status_code == 200
    messages = get_res.json()
    # 1 system event on ticket creation + 2 chat messages = 3 messages
    assert len(messages) == 3
