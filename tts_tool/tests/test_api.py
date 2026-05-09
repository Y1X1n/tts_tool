"""Basic smoke tests for TTS Studio API."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_config():
    r = client.get("/api/config")
    assert r.status_code == 200
    assert "api_url" in r.json()


def test_history():
    r = client.get("/api/history")
    assert r.status_code == 200
    assert "items" in r.json()


def test_voice_all():
    r = client.get("/api/voice/all")
    assert r.status_code == 200
    assert "items" in r.json()


def test_voice_clone_list():
    r = client.get("/api/voice/clone-list")
    assert r.status_code == 200


def test_voice_design_list():
    r = client.get("/api/voice/design-list")
    assert r.status_code == 200


def test_tts_validation():
    r = client.post("/api/tts", json={"text": "", "voice": ""})
    assert r.status_code == 400


def test_favicon():
    r = client.get("/favicon.ico")
    assert r.status_code == 204
