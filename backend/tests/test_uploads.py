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
    assert "url" in data
    assert data["filename"] == "diagnostic_log.txt"
    assert data["file_name"] == "diagnostic_log.txt"
