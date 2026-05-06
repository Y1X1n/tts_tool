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
    voice: str = "alloy"
    speed: float = 1.0
    pitch: float = 0.0


class TTSResponse(BaseModel):
    id: int
    filename: str
    text: str
    voice: str
    speed: float
    pitch: float


@router.get("/voices")
async def list_voices():
    cfg = config.load()
    if not cfg["api_url"] or not cfg["api_key"]:
        raise HTTPException(400, "请先配置 API URL 和 Key")
    async with aiohttp.ClientSession() as session:
        return await tts_client.fetch_voices(session, cfg["api_url"], cfg["api_key"])


@router.post("/tts")
async def generate(body: TTSRequest):
    cfg = config.load()
    if not cfg["api_url"] or not cfg["api_key"]:
        raise HTTPException(400, "请先配置 API URL 和 Key")
    if not body.text.strip():
        raise HTTPException(400, "请输入文本")

    async with aiohttp.ClientSession() as session:
        filename = await tts_client.generate_tts(
            session, cfg["api_url"], cfg["api_key"],
            body.text, body.voice, body.speed, body.pitch,
        )

    conn = database.get_conn()
    cur = conn.execute(
        "INSERT INTO history (text, voice, speed, pitch, filename) VALUES (?, ?, ?, ?, ?)",
        [body.text, body.voice, body.speed, body.pitch, filename],
    )
    row_id = cur.lastrowid
    conn.commit()
    conn.close()

    return TTSResponse(id=row_id, filename=filename, text=body.text, voice=body.voice, speed=body.speed, pitch=body.pitch)


@router.get("/tts/audio/{filename}")
async def get_audio(filename: str):
    from fastapi.responses import FileResponse
    filepath = os.path.join(tts_client.AUDIO_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(404, "音频文件不存在")
    return FileResponse(filepath, media_type="audio/mpeg")


@router.post("/upload")
async def upload_text(file: UploadFile):
    if file.filename and not file.filename.lower().endswith((".txt", ".md")):
        raise HTTPException(400, "仅支持 .txt 和 .md 文件")
    content = (await file.read()).decode("utf-8")
    return {"filename": file.filename, "text": content}
