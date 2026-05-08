import os
import uuid
import base64
import aiohttp
from fastapi import APIRouter, HTTPException, UploadFile, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel, field_validator
import config
import database
import voice_client
from paths import data_dir

router = APIRouter(prefix="/api/voice", tags=["voice"])

CLONE_AUDIO_DIR = os.path.join(data_dir(), "clone_audio")
AUDIO_DIR = os.path.join(data_dir(), "audio")
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB


def _check_config():
    cfg = config.load()
    if not cfg["api_url"] or not cfg["api_key"]:
        raise HTTPException(400, "请先配置 API URL 和 Key")
    return cfg


class DesignRequest(BaseModel):
    prompt: str
    model: str = ""
    voice_name: str = ""

    @field_validator("prompt")
    @classmethod
    def prompt_not_empty(cls, v):
        if not v.strip():
            raise ValueError("请输入提示词")
        if len(v) > 2000:
            raise ValueError("提示词过长，最多2000字符")
        return v


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
    if len(audio_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(400, f"音频文件过大，最大 {MAX_UPLOAD_BYTES // 1024 // 1024} MB")
    if len(audio_bytes) < 1024:
        raise HTTPException(400, "音频文件过小或无效")

    audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")

    ext = (audio.filename or "audio.wav").rsplit(".", 1)[-1].lower()
    audio_format = ext if ext in ("wav", "mp3", "m4a", "ogg", "flac", "aac") else "wav"

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

    with database.connect() as conn:
        cur = conn.execute(
            "INSERT INTO clone_voices (voice_id, voice_name, model, ref_audio_path, ref_text, filename) VALUES (?, ?, ?, ?, ?, ?)",
            [filename, voice_name or "", model, ref_path, ref_text, filename],
        )
        row_id = cur.lastrowid

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

    try:
        async with aiohttp.ClientSession() as session:
            filename = await voice_client.design_voice(
                session, cfg["api_url"], cfg["api_key"],
                body.prompt, body.model,
            )
    except Exception as e:
        raise HTTPException(502, f"音色设计 API 调用失败: {e}")

    with database.connect() as conn:
        cur = conn.execute(
            "INSERT INTO design_voices (voice_id, voice_name, model, prompt, filename) VALUES (?, ?, ?, ?, ?)",
            [filename, body.voice_name or "", body.model, body.prompt, filename],
        )
        row_id = cur.lastrowid

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
    with database.connect() as conn:
        where = "WHERE favorited = 1" if favorite else ""
        total = conn.execute(f"SELECT COUNT(*) FROM clone_voices {where}").fetchone()[0]
        offset = (page - 1) * size
        rows = conn.execute(
            f"SELECT * FROM clone_voices {where} ORDER BY created_at DESC LIMIT ? OFFSET ?",
            [size, offset],
        ).fetchall()
    return {
        "total": total,
        "page": page,
        "size": size,
        "items": [dict(r) for r in rows],
    }


@router.get("/design-list")
def design_list(page: int = 1, size: int = 20):
    with database.connect() as conn:
        total = conn.execute("SELECT COUNT(*) FROM design_voices").fetchone()[0]
        offset = (page - 1) * size
        rows = conn.execute(
            "SELECT * FROM design_voices ORDER BY created_at DESC LIMIT ? OFFSET ?",
            [size, offset],
        ).fetchall()
    return {
        "total": total,
        "page": page,
        "size": size,
        "items": [dict(r) for r in rows],
    }


@router.get("/all")
def all_voices():
    with database.connect() as conn:
        clones = conn.execute(
            "SELECT voice_id, voice_name FROM clone_voices ORDER BY created_at DESC"
        ).fetchall()
        designs = conn.execute(
            "SELECT voice_id, voice_name FROM design_voices ORDER BY created_at DESC"
        ).fetchall()
    items = []
    seen = set()
    for r in clones:
        vid = r["voice_id"]
        if vid and vid not in seen:
            seen.add(vid)
            label = r["voice_name"] or vid.rsplit(".", 1)[0][:12]
            items.append({"voice_id": vid, "voice_name": label, "source": "clone"})
    for r in designs:
        vid = r["voice_id"]
        if vid and vid not in seen:
            seen.add(vid)
            label = r["voice_name"] or vid.rsplit(".", 1)[0][:12]
            items.append({"voice_id": vid, "voice_name": label, "source": "design"})
    return {"items": items}


@router.patch("/clone/{item_id}/favorite")
def toggle_favorite(item_id: int, body: FavoriteUpdate):
    with database.connect() as conn:
        conn.execute(
            "UPDATE clone_voices SET favorited = ? WHERE id = ?",
            [1 if body.favorited else 0, item_id],
        )
        if conn.total_changes == 0:
            raise HTTPException(404, "记录不存在")
    return {"ok": True, "favorited": body.favorited}


@router.delete("/clone/{item_id}")
def delete_clone(item_id: int):
    with database.connect() as conn:
        row = conn.execute("SELECT * FROM clone_voices WHERE id = ?", [item_id]).fetchone()
        if not row:
            raise HTTPException(404, "记录不存在")
        for path_col in ("ref_audio_path", "filename"):
            p = row[path_col]
            if p and os.path.exists(p):
                os.remove(p)
        conn.execute("DELETE FROM clone_voices WHERE id = ?", [item_id])
    return {"ok": True}


@router.delete("/design/{item_id}")
def delete_design(item_id: int):
    with database.connect() as conn:
        row = conn.execute("SELECT * FROM design_voices WHERE id = ?", [item_id]).fetchone()
        if not row:
            raise HTTPException(404, "记录不存在")
    if row["filename"]:
        fp = os.path.join(AUDIO_DIR, row["filename"])
        if os.path.exists(fp):
            os.remove(fp)
    with database.connect() as conn:
        conn.execute("DELETE FROM design_voices WHERE id = ?", [item_id])
    return {"ok": True}
