import os
import json
import aiohttp

AUDIO_DIR = os.path.join(os.path.dirname(__file__), "data", "audio")


async def clone_voice(
    session: aiohttp.ClientSession,
    api_url: str,
    api_key: str,
    audio_base64: str,
    audio_format: str,
    voice_name: str = "",
    ref_text: str = "",
    model: str = "",
) -> dict:
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": "请克隆以下音色" + (f"：{ref_text}" if ref_text else "")},
            {"role": "assistant", "content": ref_text or "参考音频"},
        ],
        "audio": {"voice": audio_base64},
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
    voice_id = _extract_voice_id(data)
    return {"voice_id": voice_id, "voice_name": voice_name or voice_id}


async def design_voice(
    session: aiohttp.ClientSession,
    api_url: str,
    api_key: str,
    prompt: str,
    model: str = "",
    voice_name: str = "",
) -> dict:
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    payload = {
        "model": model,
        "messages": [
            {"role": "user", "content": "请根据以下描述生成一个音色"},
            {"role": "assistant", "content": prompt},
        ],
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
    voice_id = _extract_voice_id(data)
    return {"voice_id": voice_id, "voice_name": voice_name or voice_id}


def _parse_response(raw_body: str) -> dict:
    """Parse streaming or non-streaming chat completions response.
    Takes the last JSON object that contains meaningful data.
    """
    data = None
    for line in raw_body.strip().splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith("data: "):
            line = line[6:]
        try:
            obj = json.loads(line)
            if "choices" in obj or "voice_id" in obj:
                data = obj
        except Exception:
            continue

    if data is None:
        try:
            data = json.loads(raw_body)
        except Exception:
            raise RuntimeError("Failed to parse API response")

    return data


def _extract_voice_id(data: dict) -> str:
    """Extract voice_id from API response. Tries multiple possible locations."""
    # Try top-level voice_id
    if "voice_id" in data:
        return data["voice_id"]

    # Try choices[0].message.content (plain text voice_id)
    try:
        content = data["choices"][0]["message"]["content"]
        if isinstance(content, str) and content.strip():
            return content.strip()
    except (KeyError, IndexError, TypeError):
        pass

    # Try choices[0].message.voice_id
    try:
        return data["choices"][0]["message"]["voice_id"]
    except (KeyError, IndexError, TypeError):
        pass

    # Try top-level id
    if "id" in data:
        return data["id"]

    raise RuntimeError("Could not extract voice_id from API response")
