import re
import io
import os
import uuid
import aiohttp
import asyncio

AUDIO_DIR = os.path.join(os.path.dirname(__file__), "data", "audio")


def split_text(text: str, max_chars: int = 500) -> list[str]:
    """Split text by sentence boundaries, keeping segments within max_chars."""
    sentences = re.split(r"(?<=[。！？.!?\n])\s*", text)
    segments = []
    current = ""
    for s in sentences:
        s = s.strip()
        if not s:
            continue
        if len(current) + len(s) <= max_chars:
            current += s
        else:
            if current:
                segments.append(current)
            current = s
    if current:
        segments.append(current)
    return segments or [text]


async def generate_tts(
    session: aiohttp.ClientSession,
    api_url: str,
    api_key: str,
    text: str,
    voice: str = "alloy",
    speed: float = 1.0,
    pitch: float = 0.0,
) -> str:
    """
    Generate TTS audio from text. Supports long text by splitting into segments,
    generating each, and merging. Returns the output filename (relative to AUDIO_DIR).
    """
    segments = split_text(text)
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    if len(segments) == 1:
        audio_bytes = await _request_tts(session, api_url, headers, segments[0], voice, speed, pitch)
        filename = f"{uuid.uuid4().hex}.mp3"
        filepath = os.path.join(AUDIO_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(audio_bytes)
        return filename

    # Batch: generate segments in parallel, then merge
    tasks = [_request_tts(session, api_url, headers, seg, voice, speed, pitch) for seg in segments]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    audio_chunks = []
    for i, r in enumerate(results):
        if isinstance(r, Exception):
            raise RuntimeError(f"Segment {i + 1} failed: {r}")
        audio_chunks.append(r)

    merged = b"".join(audio_chunks)
    filename = f"{uuid.uuid4().hex}.mp3"
    filepath = os.path.join(AUDIO_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(merged)
    return filename


async def _request_tts(
    session: aiohttp.ClientSession,
    api_url: str,
    headers: dict,
    text: str,
    voice: str,
    speed: float,
    pitch: float,
) -> bytes:
    payload = {
        "model": "tts-1",
        "input": text,
        "voice": voice,
        "speed": speed,
    }
    # OpenAI TTS doesn't have a native pitch param, but custom APIs may support it
    if pitch != 0.0:
        payload["pitch"] = pitch

    async with session.post(f"{api_url.rstrip('/')}/audio/speech", json=payload, headers=headers) as resp:
        if resp.status != 200:
            body = await resp.text()
            raise RuntimeError(f"TTS API error {resp.status}: {body[:500]}")
        return await resp.read()


BUILTIN_VOICES = [
    {"id": "alloy", "name": "Alloy"},
    {"id": "echo", "name": "Echo"},
    {"id": "fable", "name": "Fable"},
    {"id": "nova", "name": "Nova"},
    {"id": "onyx", "name": "Onyx"},
    {"id": "shimmer", "name": "Shimmer"},
]


async def fetch_voices(
    session: aiohttp.ClientSession,
    api_url: str,
    api_key: str,
) -> list[dict]:
    """Fetch available voices from API. Falls back to builtin list if unsupported."""
    headers = {"Authorization": f"Bearer {api_key}"}
    try:
        async with session.get(f"{api_url.rstrip('/')}/audio/voices", headers=headers) as resp:
            if resp.status != 200:
                return BUILTIN_VOICES
            data = await resp.json()
            voices = data.get("voices", data) if isinstance(data, dict) else data
            result = [{"id": v.get("id", v.get("name", "")), "name": v.get("name", v.get("id", ""))} for v in voices]
            return result or BUILTIN_VOICES
    except Exception:
        return BUILTIN_VOICES
