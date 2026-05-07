import os
import uuid
import base64
import json
import aiohttp

AUDIO_DIR = os.path.join(os.path.dirname(__file__), "data", "audio")


async def clone_voice(
    session: aiohttp.ClientSession,
    api_url: str,
    api_key: str,
    audio_base64: str,
    audio_format: str,
    ref_text: str = "",
    model: str = "",
) -> str:
    """Generate speech in cloned voice. Returns output filename."""
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": ""},
            {"role": "assistant", "content": ref_text or "Yes, I had a sandwich."},
        ],
        "audio": {
            "format": "wav",
            "voice": f"data:audio/{audio_format};base64,{audio_base64}",
        },
        "stream": False,
    }

    async with session.post(
        f"{api_url.rstrip('/')}/chat/completions", json=payload, headers=headers
    ) as resp:
        if resp.status != 200:
            body = await resp.text()
            raise RuntimeError(f"Voice clone API error {resp.status}: {body[:500]}")
        raw_body = await resp.text()

    data = _parse_response(raw_body)
    audio_bytes = _extract_audio(data)

    filename = f"{uuid.uuid4().hex}.wav"
    filepath = os.path.join(AUDIO_DIR, filename)
    os.makedirs(AUDIO_DIR, exist_ok=True)
    with open(filepath, "wb") as f:
        f.write(audio_bytes)
    return filename


async def design_voice(
    session: aiohttp.ClientSession,
    api_url: str,
    api_key: str,
    prompt: str,
    model: str = "",
) -> str:
    """Generate speech in designed voice. Returns output filename."""
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": prompt},
            {"role": "assistant", "content": "Yes, I had a sandwich."},
        ],
        "audio": {"format": "wav"},
        "stream": False,
    }

    async with session.post(
        f"{api_url.rstrip('/')}/chat/completions", json=payload, headers=headers
    ) as resp:
        if resp.status != 200:
            body = await resp.text()
            raise RuntimeError(f"Voice design API error {resp.status}: {body[:500]}")
        raw_body = await resp.text()

    data = _parse_response(raw_body)
    audio_bytes = _extract_audio(data)

    filename = f"{uuid.uuid4().hex}.wav"
    filepath = os.path.join(AUDIO_DIR, filename)
    os.makedirs(AUDIO_DIR, exist_ok=True)
    with open(filepath, "wb") as f:
        f.write(audio_bytes)
    return filename


def _parse_response(raw_body: str) -> dict:
    data = None
    for line in raw_body.strip().splitlines():
        line = line.strip()
        if not line:
            continue
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

    return data


def _extract_audio(data: dict) -> bytes:
    try:
        b64 = data["choices"][0]["message"]["audio"]["data"]
        return base64.b64decode(b64)
    except (KeyError, IndexError, TypeError) as e:
        raise RuntimeError(f"Unexpected API response format: {e}")
