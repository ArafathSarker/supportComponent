import pytest


@pytest.mark.django_db
def test_health_check(client):
    res = client.get("/api/health/")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"
    assert "Django" in data["service"]
    assert data["architecture"] == "Domain-Driven Modular"
