"""Backend tests for Medical Device Monitoring platform - Iteration 2.

Covers:
- Auth (login, /me, wrong password)
- Meta endpoint
- Incidents create via multipart/form-data (with optional files)
- Auth-protected listing/stats/patch
- Status updates incl. rejected w/ rejection_reason default
- File upload + auth'd download via Bearer header and ?auth= query param
- PDF download
"""
import io
import json
import os
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@medsafety.gov"
ADMIN_PASSWORD = "MedSafety2026!"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    return s


@pytest.fixture(scope="module")
def admin_token(session):
    r = session.post(
        f"{API}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        headers={"Content-Type": "application/json"},
    )
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ===== Auth =====
class TestAuth:
    def test_login_success(self, session):
        r = session.post(
            f"{API}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            headers={"Content-Type": "application/json"},
        )
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data and isinstance(data["access_token"], str)
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin"
        assert "password_hash" not in data["user"]
        assert "_id" not in data["user"]

    def test_login_wrong_password(self, session):
        r = session.post(
            f"{API}/auth/login",
            json={"email": ADMIN_EMAIL, "password": "WRONG"},
            headers={"Content-Type": "application/json"},
        )
        assert r.status_code == 401

    def test_me_with_token(self, session, auth_headers):
        r = session.get(f"{API}/auth/me", headers=auth_headers)
        assert r.status_code == 200
        u = r.json()
        assert u["email"] == ADMIN_EMAIL
        assert u["role"] == "admin"
        assert "password_hash" not in u

    def test_me_without_token(self, session):
        r = session.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_invalid_token(self, session):
        r = session.get(f"{API}/auth/me",
                        headers={"Authorization": "Bearer not.a.real.jwt"})
        assert r.status_code == 401


# ===== Meta =====
class TestMeta:
    def test_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_meta(self, session):
        r = session.get(f"{API}/meta")
        assert r.status_code == 200
        d = r.json()
        assert len(d["event_types"]) == 6
        assert len(d["roles"]) == 3
        assert {x["days"] for x in d["deadlines"]} == {2, 10, 30}
        assert d["max_files"] == 5
        assert d["max_file_size"] == 10 * 1024 * 1024
        assert set(d["allowed_ext"]) == {"pdf", "jpg", "jpeg", "png", "docx"}
        assert set(d["statuses"]) == {"received", "in_review", "resolved", "rejected"}


# ===== Incidents (multipart) =====
def _multipart_payload(payload: dict, files=None):
    """Build multipart fields for requests."""
    data = {"payload": (None, json.dumps(payload))}
    if files:
        # requests supports list of tuples for repeated 'files' field
        return [("payload", (None, json.dumps(payload)))] + [
            ("files", f) for f in files
        ]
    return data


class TestIncidents:
    created_id = None
    file_attachment_id = None

    def test_create_critical_no_files(self, session):
        payload = {
            "email": "TEST_critical@example.com",
            "event_type": "ugroza_zhizni",
            "description": "Критический инцидент - подробное описание события.",
            "incident_date": "2026-01-10",
            "role": "polzovatel",
            "device_name": "TEST device",
        }
        r = session.post(f"{API}/incidents",
                         files={"payload": (None, json.dumps(payload))})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["severity"] == "critical"
        assert d["event_type_label"] == "Угроза жизни/здоровью"
        assert d["status"] == "received"
        assert d["attachments"] == []
        assert "_id" not in d
        TestIncidents.created_id = d["id"]

    def test_create_serious(self, session):
        payload = {
            "email": "TEST_serious@example.com",
            "event_type": "ser'eznyy_incident",
            "description": "Серьёзный инцидент - подробное описание.",
            "incident_date": "2026-01-09",
            "role": "med_organizaciya",
        }
        r = session.post(f"{API}/incidents",
                         files={"payload": (None, json.dumps(payload))})
        assert r.status_code == 200
        assert r.json()["severity"] == "serious"

    def test_create_standard(self, session):
        payload = {
            "email": "TEST_std@example.com",
            "event_type": "deffekt_kachestva",
            "description": "Стандартный инцидент - дефект качества изделия.",
            "incident_date": "2026-01-08",
            "role": "proizvoditel",
        }
        r = session.post(f"{API}/incidents",
                         files={"payload": (None, json.dumps(payload))})
        assert r.status_code == 200
        assert r.json()["severity"] == "standard"

    def test_invalid_email(self, session):
        payload = {
            "email": "not-an-email",
            "event_type": "drugoe",
            "description": "Description with enough chars длиной",
            "incident_date": "2026-01-08",
        }
        r = session.post(f"{API}/incidents",
                         files={"payload": (None, json.dumps(payload))})
        assert r.status_code == 400

    def test_invalid_event_type(self, session):
        payload = {
            "email": "TEST_bad@example.com",
            "event_type": "unknown_type",
            "description": "Description with enough chars длиной",
            "incident_date": "2026-01-08",
        }
        r = session.post(f"{API}/incidents",
                         files={"payload": (None, json.dumps(payload))})
        assert r.status_code == 400

    def test_short_description(self, session):
        payload = {
            "email": "TEST_short@example.com",
            "event_type": "drugoe",
            "description": "short",
            "incident_date": "2026-01-08",
        }
        r = session.post(f"{API}/incidents",
                         files={"payload": (None, json.dumps(payload))})
        assert r.status_code == 400

    # ----- file upload + storage round trip -----
    def test_create_with_file_upload(self, session):
        payload = {
            "email": "TEST_files@example.com",
            "event_type": "drugoe",
            "description": "Инцидент с прикреплённым файлом для проверки.",
            "incident_date": "2026-01-07",
            "role": "polzovatel",
        }
        png_bytes = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
            b"\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f"
            b"\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\xf8\xff\xff?\x00\x05"
            b"\xfe\x02\xfeA\xa3\xf6\xa6\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        files = [
            ("payload", (None, json.dumps(payload))),
            ("files", ("test.png", io.BytesIO(png_bytes), "image/png")),
        ]
        r = session.post(f"{API}/incidents", files=files)
        assert r.status_code == 200, r.text
        d = r.json()
        assert len(d["attachments"]) == 1
        att = d["attachments"][0]
        assert att["filename"] == "test.png"
        assert att["content_type"] == "image/png"
        assert att["size"] == len(png_bytes)
        TestIncidents.file_attachment_id = att["id"]

    def test_reject_disallowed_extension(self, session):
        payload = {
            "email": "TEST_evil@example.com",
            "event_type": "drugoe",
            "description": "Инцидент с недопустимым файлом.",
            "incident_date": "2026-01-07",
        }
        files = [
            ("payload", (None, json.dumps(payload))),
            ("files", ("evil.exe", io.BytesIO(b"MZ\x90\x00"), "application/octet-stream")),
        ]
        r = session.post(f"{API}/incidents", files=files)
        assert r.status_code == 400

    # ----- auth-protected list/stats -----
    def test_list_requires_auth(self, session):
        r = session.get(f"{API}/incidents")
        assert r.status_code == 401

    def test_stats_requires_auth(self, session):
        r = session.get(f"{API}/incidents/stats")
        assert r.status_code == 401

    def test_list_with_auth(self, session, auth_headers):
        r = session.get(f"{API}/incidents", headers=auth_headers)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) >= 4
        for it in items:
            assert "_id" not in it
            assert "id" in it
        for i in range(len(items) - 1):
            assert items[i]["created_at"] >= items[i + 1]["created_at"]

    def test_stats_with_auth(self, session, auth_headers):
        r = session.get(f"{API}/incidents/stats", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        for k in ("total", "by_severity", "by_type", "by_role", "by_status", "timeline"):
            assert k in d
        assert d["total"] >= 4
        assert {"received", "in_review", "resolved", "rejected"} <= set(d["by_status"].keys())


# ===== Status updates =====
class TestStatus:
    def test_patch_requires_auth(self, session):
        r = session.patch(f"{API}/incidents/{TestIncidents.created_id}",
                          json={"status": "in_review"})
        assert r.status_code == 401

    def test_patch_in_review(self, session, auth_headers):
        r = session.patch(
            f"{API}/incidents/{TestIncidents.created_id}",
            json={"status": "in_review"},
            headers={**auth_headers, "Content-Type": "application/json"},
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "in_review"
        assert d["rejection_reason"] is None
        assert d["updated_at"] is not None

    def test_patch_rejected_with_reason(self, session, auth_headers):
        r = session.patch(
            f"{API}/incidents/{TestIncidents.created_id}",
            json={"status": "rejected", "rejection_reason": "Дубликат"},
            headers={**auth_headers, "Content-Type": "application/json"},
        )
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "rejected"
        assert d["rejection_reason"] == "Дубликат"

    def test_patch_rejected_default_reason(self, session, auth_headers):
        r = session.patch(
            f"{API}/incidents/{TestIncidents.created_id}",
            json={"status": "rejected", "rejection_reason": ""},
            headers={**auth_headers, "Content-Type": "application/json"},
        )
        assert r.status_code == 200
        assert r.json()["rejection_reason"] == "Без указания причины"

    def test_patch_invalid_status(self, session, auth_headers):
        r = session.patch(
            f"{API}/incidents/{TestIncidents.created_id}",
            json={"status": "bogus"},
            headers={**auth_headers, "Content-Type": "application/json"},
        )
        assert r.status_code == 400

    def test_patch_unknown_id(self, session, auth_headers):
        r = session.patch(
            f"{API}/incidents/00000000-0000-0000-0000-000000000000",
            json={"status": "resolved"},
            headers={**auth_headers, "Content-Type": "application/json"},
        )
        assert r.status_code == 404


# ===== File download =====
class TestFiles:
    def test_download_requires_auth(self, session):
        fid = TestIncidents.file_attachment_id
        if not fid:
            pytest.skip("no file attachment id from upload test")
        r = session.get(f"{API}/files/{fid}")
        assert r.status_code == 401

    def test_download_with_bearer(self, session, auth_headers):
        fid = TestIncidents.file_attachment_id
        if not fid:
            pytest.skip("no file attachment id from upload test")
        r = session.get(f"{API}/files/{fid}", headers=auth_headers)
        assert r.status_code == 200, r.text
        assert r.headers.get("content-type", "").startswith("image/png")
        assert r.content[:8] == b"\x89PNG\r\n\x1a\n"

    def test_download_with_query_auth(self, session, admin_token):
        fid = TestIncidents.file_attachment_id
        if not fid:
            pytest.skip("no file attachment id from upload test")
        r = session.get(f"{API}/files/{fid}?auth={admin_token}")
        assert r.status_code == 200
        assert r.content[:8] == b"\x89PNG\r\n\x1a\n"


# ===== PDF =====
class TestPDF:
    def test_pdf_download(self, session):
        r = session.get(f"{API}/document/pdf")
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content[:4] == b"%PDF"
        assert len(r.content) > 1000
