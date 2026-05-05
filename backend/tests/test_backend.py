"""Backend tests for Medical Device Monitoring platform."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://device-registry-19.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ==== Root & Meta ====
class TestMeta:
    def test_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"

    def test_meta(self, session):
        r = session.get(f"{API}/meta")
        assert r.status_code == 200
        data = r.json()
        assert len(data["event_types"]) == 6
        assert len(data["roles"]) == 3
        assert len(data["deadlines"]) == 3
        # check structure
        assert all("value" in e and "label" in e for e in data["event_types"])
        assert {d["days"] for d in data["deadlines"]} == {2, 10, 30}


# ==== Incidents ====
class TestIncidents:
    def test_create_critical_incident(self, session):
        payload = {
            "email": "TEST_critical@example.com",
            "event_type": "ugroza_zhizni",
            "description": "Критический инцидент - подробное описание события.",
            "incident_date": "2026-01-10",
            "role": "polzovatel",
            "device_name": "TEST device",
        }
        r = session.post(f"{API}/incidents", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data["severity"] == "critical"
        assert data["event_type_label"] == "Угроза жизни/здоровью"
        assert data["status"] == "received"
        assert "id" in data
        assert "_id" not in data
        # store
        pytest.test_critical_id = data["id"]

    def test_create_serious_incident(self, session):
        payload = {
            "email": "TEST_serious@example.com",
            "event_type": "ser'eznyy_incident",
            "description": "Серьёзный инцидент - подробное описание.",
            "incident_date": "2026-01-09",
            "role": "med_organizaciya",
        }
        r = session.post(f"{API}/incidents", json=payload)
        assert r.status_code == 200
        assert r.json()["severity"] == "serious"

    def test_create_standard_incident(self, session):
        payload = {
            "email": "TEST_std@example.com",
            "event_type": "deffekt_kachestva",
            "description": "Стандартный инцидент - дефект качества изделия.",
            "incident_date": "2026-01-08",
            "role": "proizvoditel",
        }
        r = session.post(f"{API}/incidents", json=payload)
        assert r.status_code == 200
        assert r.json()["severity"] == "standard"

    def test_invalid_email(self, session):
        payload = {
            "email": "not-an-email",
            "event_type": "drugoe",
            "description": "Description with enough chars",
            "incident_date": "2026-01-08",
        }
        r = session.post(f"{API}/incidents", json=payload)
        assert r.status_code == 422

    def test_invalid_event_type(self, session):
        payload = {
            "email": "TEST_bad@example.com",
            "event_type": "unknown_type",
            "description": "Description with enough chars",
            "incident_date": "2026-01-08",
        }
        r = session.post(f"{API}/incidents", json=payload)
        assert r.status_code == 400

    def test_short_description(self, session):
        payload = {
            "email": "TEST_short@example.com",
            "event_type": "drugoe",
            "description": "short",
            "incident_date": "2026-01-08",
        }
        r = session.post(f"{API}/incidents", json=payload)
        assert r.status_code == 422

    def test_list_incidents_no_objectid(self, session):
        r = session.get(f"{API}/incidents")
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 3
        # No _id leaked
        for it in items:
            assert "_id" not in it
            assert "id" in it
        # Newest-first ordering
        for i in range(len(items) - 1):
            assert items[i]["created_at"] >= items[i + 1]["created_at"]

    def test_stats(self, session):
        r = session.get(f"{API}/incidents/stats")
        assert r.status_code == 200
        data = r.json()
        for key in ("total", "by_severity", "by_type", "by_role", "by_status", "timeline"):
            assert key in data
        assert data["total"] >= 3
        assert isinstance(data["by_type"], list)
        assert isinstance(data["timeline"], list)
        assert {"critical", "serious", "standard"} <= set(data["by_severity"].keys())


# ==== PDF ====
class TestPDF:
    def test_pdf_download(self, session):
        r = session.get(f"{API}/document/pdf")
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert len(r.content) > 1000
        assert r.content[:4] == b"%PDF"
