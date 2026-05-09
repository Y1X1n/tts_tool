from fastapi import APIRouter, HTTPException, UploadFile
from pydantic import BaseModel
import aiohttp
import config
import tts_client
import database
import os

router = APIRouter(prefix="/api", tags=["tts"])


class TTSRequest(BaseModel):
    text: str
    voice: str = "default"
    voice_name: str = ""
    speed: float = 1.0
    pitch: float = 0.0


class TTSResponse(BaseModel):
    id: int
    filename: str
    text: str
    voice: str
    speed: float
    pitch: float


PRESET_VOICES = {"mimo_default", "Mia", "Chloe", "Milo", "Dean"}


@router.post("/tts")
async def generate(body: TTSRequest):
    cfg = config.load()
    if not cfg["api_url"] or not cfg["api_key"]:
        raise HTTPException(400, "请先配置 API URL 和 Key")
    if not body.text.strip():
        raise HTTPException(400, "请输入文本")
    if not body.voice.strip():
        raise HTTPException(400, "请输入模型名称")

    voice_name = body.voice_name.strip()
    model = body.voice.strip()
    ref_audio_path = None

    if voice_name and voice_name not in PRESET_VOICES:
        with database.connect() as conn:
            row = conn.execute(
                "SELECT ref_audio_path, model FROM clone_voices WHERE voice_id = ? OR voice_name = ? ORDER BY created_at DESC LIMIT 1",
                [voice_name, voice_name],
            ).fetchone()
        if row and row["ref_audio_path"] and os.path.exists(row["ref_audio_path"]):
            ref_audio_path = row["ref_audio_path"]
            model = row["model"] or "mimo-v2.5-tts-voiceclone"

    try:
        async with aiohttp.ClientSession() as session:
            filename = await tts_client.generate_tts(
                session, cfg["api_url"], cfg["api_key"],
                body.text, model, body.speed, body.pitch,
                voice_name=voice_name if voice_name in PRESET_VOICES else "",
                ref_audio_path=ref_audio_path or "",
            )
    except Exception as e:
        raise HTTPException(502, f"TTS API 调用失败: {e}")

    with database.connect() as conn:
        cur = conn.execute(
            "INSERT INTO history (text, voice, speed, pitch, filename) VALUES (?, ?, ?, ?, ?)",
            [body.text, body.voice, body.speed, body.pitch, filename],
        )
        row_id = cur.lastrowid

    return TTSResponse(id=row_id, filename=filename, text=body.text, voice=body.voice, speed=body.speed, pitch=body.pitch)


@router.get("/tts/audio/{filename}")
async def get_audio(filename: str):
    from fastapi.responses import FileResponse
    filepath = os.path.join(tts_client.AUDIO_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(404, "音频文件不存在")
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "wav"
    mime = "audio/wav" if ext == "wav" else "audio/mpeg"
    return FileResponse(filepath, media_type=mime)


@router.post("/upload")
async def upload_text(file: UploadFile):
    if file.filename and not file.filename.lower().endswith((".txt", ".md")):
        raise HTTPException(400, "仅支持 .txt 和 .md 文件")
    content = (await file.read()).decode("utf-8")
    return {"filename": file.filename, "text": content}
