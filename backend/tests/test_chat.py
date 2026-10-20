import pytest
from channels.testing import WebsocketCommunicator
from config.asgi import application
from apps.tickets.models import Ticket


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


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_websocket_realtime_chat_and_typing():
    """
    Test real-time interactive WebSocket:
    1. Connect to /ws/tickets/<ticket_id>
    2. Send typing event -> receive typing event
    3. Send chat_message event -> persists in DB and broadcasts to drawer
    """
    from apps.tickets.services import TicketService
    from asgiref.sync import sync_to_async

    # Create ticket
    ticket = await sync_to_async(TicketService.create_ticket)(
        data={
            "title": "WS Realtime Test Ticket",
            "category": "Software Bug",
            "urgency": "Medium",
            "description": "Testing real-time bidirectional chat"
        },
        user_name="Arafath",
        user_role="company_admin",
        user_company="CSI Smart Tech Ltd"
    )

    # Connect to Ticket WebSocket
    communicator = WebsocketCommunicator(application, f"/ws/tickets/{ticket.id}")
    connected, _ = await communicator.connect()
    assert connected is True

    # Receive initial connection message
    connect_msg = await communicator.receive_json_from()
    assert connect_msg["type"] == "connected"

    # 1. Send typing indicator
    await communicator.send_json_to({
        "type": "typing",
        "sender_name": "David",
        "is_typing": True
    })
    typing_response = await communicator.receive_json_from()
    assert typing_response["type"] == "typing"
    assert typing_response["sender_name"] == "David"
    assert typing_response["is_typing"] is True

    # 2. Send chat_message over WebSocket
    await communicator.send_json_to({
        "type": "chat_message",
        "sender_name": "Arafath",
        "sender_role": "company_admin",
        "message": "Real-time message delivered through WebSocket!"
    })

    # Receive the broadcasted message
    broadcast_msg = await communicator.receive_json_from()
    assert broadcast_msg["type"] == "chat_message"
    assert broadcast_msg["data"]["message"] == "Real-time message delivered through WebSocket!"
    assert broadcast_msg["data"]["sender_name"] == "Arafath"

    # Verify message is permanently stored in DB
    msg_count = await sync_to_async(ticket.messages.count)()
    # 1 initial system event + 1 WS chat message = 2
    assert msg_count == 2

    await communicator.disconnect()
