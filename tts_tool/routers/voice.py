import os
import uuid
import base64
import aiohttp
from fastapi import APIRouter, HTTPException, UploadFile, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel
import config
import database
import voice_client

router = APIRouter(prefix="/api/voice", tags=["voice"])

CLONE_AUDIO_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "clone_audio")
AUDIO_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "audio")


def _check_config():
    cfg = config.load()
    if not cfg["api_url"] or not cfg["api_key"]:
        raise HTTPException(400, "请先配置 API URL 和 Key")
    return cfg


class DesignRequest(BaseModel):
    prompt: str
    model: str = ""
    voice_name: str = ""


class FavoriteUpdate(BaseModel):
    favorited: bool


@router.post("/clone")
async def clone(
    audio: UploadFile,
    model: str = Form(default=""),
    voice_name: str = Form(default=""),
    ref_text: str = Form(default=""),
):
    cfg = _check_config()
    if not model.strip():
        raise HTTPException(400, "请输入模型名称")
    if not audio.filename:
        raise HTTPException(400, "请上传音频文件")

    audio_bytes = await audio.read()
    audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")

    ext = (audio.filename or "audio.wav").rsplit(".", 1)[-1].lower()
    audio_format = ext if ext in ("wav", "mp3", "m4a", "ogg", "flac", "aac") else "wav"

    # Save reference audio locally
    os.makedirs(CLONE_AUDIO_DIR, exist_ok=True)
    ref_filename = f"{uuid.uuid4().hex}.{audio_format}"
    ref_path = os.path.join(CLONE_AUDIO_DIR, ref_filename)
    with open(ref_path, "wb") as f:
        f.write(audio_bytes)

    try:
        async with aiohttp.ClientSession() as session:
            filename = await voice_client.clone_voice(
                session, cfg["api_url"], cfg["api_key"],
                audio_base64, audio_format, ref_text, model,
            )
    except Exception as e:
        raise HTTPException(502, f"音色克隆 API 调用失败: {e}")

    conn = database.get_conn()
    cur = conn.execute(
        "INSERT INTO clone_voices (voice_id, voice_name, model, ref_audio_path, ref_text, filename) VALUES (?, ?, ?, ?, ?, ?)",
        [filename, voice_name or "", model, ref_path, ref_text, filename],
    )
    row_id = cur.lastrowid
    conn.commit()
    conn.close()

    return {
        "id": row_id,
        "filename": filename,
        "voice_name": voice_name or "",
        "model": model,
        "ref_text": ref_text,
        "ref_audio_path": ref_path,
    }


@router.post("/design")
async def design(body: DesignRequest):
    cfg = _check_config()
    if not body.model.strip():
        raise HTTPException(400, "请输入模型名称")
    if not body.prompt.strip():
        raise HTTPException(400, "请输入提示词")

    try:
        async with aiohttp.ClientSession() as session:
            filename = await voice_client.design_voice(
                session, cfg["api_url"], cfg["api_key"],
                body.prompt, body.model,
            )
    except Exception as e:
        raise HTTPException(502, f"音色设计 API 调用失败: {e}")

    conn = database.get_conn()
    cur = conn.execute(
        "INSERT INTO design_voices (voice_id, voice_name, model, prompt, filename) VALUES (?, ?, ?, ?, ?)",
        [filename, body.voice_name or "", body.model, body.prompt, filename],
    )
    row_id = cur.lastrowid
    conn.commit()
    conn.close()

    return {
        "id": row_id,
        "filename": filename,
        "voice_name": body.voice_name or "",
        "model": body.model,
        "prompt": body.prompt,
    }


@router.get("/audio/{filename}")
def get_audio(filename: str):
    filepath = os.path.join(AUDIO_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(404, "音频文件不存在")
    return FileResponse(filepath, media_type="audio/wav")


@router.get("/clone-list")
def clone_list(page: int = 1, size: int = 20, favorite: int = 0):
    conn = database.get_conn()
    where = "WHERE favorited = 1" if favorite else ""
    total = conn.execute(f"SELECT COUNT(*) FROM clone_voices {where}").fetchone()[0]
    offset = (page - 1) * size
    rows = conn.execute(
        f"SELECT * FROM clone_voices {where} ORDER BY created_at DESC LIMIT ? OFFSET ?",
        [size, offset],
    ).fetchall()
    conn.close()
    return {
        "total": total,
        "page": page,
        "size": size,
        "items": [dict(r) for r in rows],
    }


@router.get("/design-list")
def design_list(page: int = 1, size: int = 20):
    conn = database.get_conn()
    total = conn.execute("SELECT COUNT(*) FROM design_voices").fetchone()[0]
    offset = (page - 1) * size
    rows = conn.execute(
        "SELECT * FROM design_voices ORDER BY created_at DESC LIMIT ? OFFSET ?",
        [size, offset],
    ).fetchall()
    conn.close()
    return {
        "total": total,
        "page": page,
        "size": size,
        "items": [dict(r) for r in rows],
    }


@router.get("/all")
def all_voices():
    """Return saved voice names for TTS voice dropdown."""
    conn = database.get_conn()
    clones = conn.execute(
        "SELECT voice_id, voice_name FROM clone_voices WHERE voice_name != '' ORDER BY created_at DESC"
    ).fetchall()
    designs = conn.execute(
        "SELECT voice_id, voice_name FROM design_voices WHERE voice_name != '' ORDER BY created_at DESC"
    ).fetchall()
    conn.close()
    items = []
    seen = set()
    for r in clones:
        if r["voice_id"] and r["voice_id"] not in seen:
            seen.add(r["voice_id"])
            items.append({"voice_id": r["voice_id"], "voice_name": r["voice_name"], "source": "clone"})
    for r in designs:
        if r["voice_id"] and r["voice_id"] not in seen:
            seen.add(r["voice_id"])
            items.append({"voice_id": r["voice_id"], "voice_name": r["voice_name"], "source": "design"})
    return {"items": items}


@router.patch("/clone/{item_id}/favorite")
def toggle_favorite(item_id: int, body: FavoriteUpdate):
    conn = database.get_conn()
    conn.execute(
        "UPDATE clone_voices SET favorited = ? WHERE id = ?",
        [1 if body.favorited else 0, item_id],
    )
    if conn.total_changes == 0:
        conn.close()
        raise HTTPException(404, "记录不存在")
    conn.commit()
    conn.close()
    return {"ok": True, "favorited": body.favorited}


@router.delete("/clone/{item_id}")
def delete_clone(item_id: int):
    conn = database.get_conn()
    row = conn.execute("SELECT * FROM clone_voices WHERE id = ?", [item_id]).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "记录不存在")
    # Delete reference audio and generated audio
    for path_col in ("ref_audio_path", "filename"):
        p = row[path_col]
        if p and os.path.exists(p):
            os.remove(p)
    conn.execute("DELETE FROM clone_voices WHERE id = ?", [item_id])
    conn.commit()
    conn.close()
    return {"ok": True}


@router.delete("/design/{item_id}")
def delete_design(item_id: int):
    conn = database.get_conn()
    row = conn.execute("SELECT * FROM design_voices WHERE id = ?", [item_id]).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "记录不存在")
    # Delete generated audio
    if row["filename"] and os.path.exists(os.path.join(AUDIO_DIR, row["filename"])):
        os.remove(os.path.join(AUDIO_DIR, row["filename"]))
    conn.execute("DELETE FROM design_voices WHERE id = ?", [item_id])
    conn.commit()
    conn.close()
    return {"ok": True}
