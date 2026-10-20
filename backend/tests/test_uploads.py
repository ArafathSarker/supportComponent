import pytest
from django.core.files.uploadedfile import SimpleUploadedFile


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
@pytest.mark.django_db
def test_file_upload_linked_to_ticket(client):
    from apps.tickets.models import Ticket, TicketAttachment

    ticket = Ticket.objects.create(
        ticket_code="TCK-ATTACH-01",
        title="Needle Sensor Fault",
        affected_system="Line 04 Sewing",
        category="Hardware / Sensor / Device Problem",
        description="Sensor broken on line 04",
        company_name="Apex Apparels Ltd",
        created_by_name="Habib",
        created_by_role="company_admin"
    )

    image_file = SimpleUploadedFile("sensor_defect.png", b"\x89PNG\r\n\x1a\nfakeimagebytes", content_type="image/png")
    upload_res = client.post(
        "/api/upload/",
        data={
            "file": image_file,
            "ticket_id": ticket.id,
            "uploaded_by": "Habib"
        },
        format="multipart"
    )
    assert upload_res.status_code == 200
    data = upload_res.json()
    assert data["attachment_id"] is not None
    assert data["file_name"] == "sensor_defect.png"

    # Verify TicketAttachment record
    att = TicketAttachment.objects.get(id=data["attachment_id"])
    assert att.ticket_id == ticket.id
    assert att.file_name == "sensor_defect.png"
    assert att.uploaded_by == "Habib"

    # Verify detail endpoint returns attachments
    detail_res = client.get(f"/api/tickets/{ticket.id}/")
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert len(detail_data["attachments"]) == 1
    assert detail_data["attachments"][0]["file_name"] == "sensor_defect.png"

