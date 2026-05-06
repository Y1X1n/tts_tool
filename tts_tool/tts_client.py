import re
import os
import uuid
import base64
import json
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
    voice: str = "default",
    speed: float = 1.0,
    pitch: float = 0.0,
) -> str:
    """
    Generate TTS audio from text. Returns the output filename (relative to AUDIO_DIR).
    """
    segments = split_text(text)
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    if len(segments) == 1:
        audio_bytes = await _request_tts(session, api_url, headers, segments[0], voice, speed, pitch)
        filename = f"{uuid.uuid4().hex}.wav"
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
    filename = f"{uuid.uuid4().hex}.wav"
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
    """Call TTS API via chat/completions format, decode base64 WAV audio."""
    payload = {
        "model": voice,
        "messages": [
            {"role": "user", "content": text},
            {"role": "assistant", "content": ""},
        ],
        "stream": False,
    }
    if speed != 1.0:
        payload["speed"] = speed
    if pitch != 0.0:
        payload["pitch"] = pitch

    async with session.post(
        f"{api_url.rstrip('/')}/chat/completions", json=payload, headers=headers
    ) as resp:
        if resp.status != 200:
            body = await resp.text()
            raise RuntimeError(f"TTS API error {resp.status}: {body[:500]}")
        raw_body = await resp.text()

    # Some APIs may stream multiple JSON objects (thinking + audio).
    # Take the last object that contains audio data.
    data = None
    for line in raw_body.strip().splitlines():
        line = line.strip()
        if not line:
            continue
        # Skip SSE "data: " prefix if present
        if line.startswith("data: "):
            line = line[6:]
        try:
            obj = json.loads(line)
            if "choices" in obj:
                data = obj
        except Exception:
            continue

    if data is None:
        try:
            data = json.loads(raw_body)
        except Exception:
            raise RuntimeError("Failed to parse API response")

    try:
        b64 = data["choices"][0]["message"]["audio"]["data"]
        return base64.b64decode(b64)
    except (KeyError, IndexError, TypeError) as e:
        raise RuntimeError(f"Unexpected API response format: {e}")


