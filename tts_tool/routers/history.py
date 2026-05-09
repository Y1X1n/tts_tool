from fastapi import APIRouter, HTTPException
import database
import os
import tts_client

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("")
def list_history(page: int = 1, size: int = 20):
    with database.connect() as conn:
        total = conn.execute("""
            SELECT COUNT(*) FROM (
                SELECT id FROM history
                UNION ALL
                SELECT id FROM clone_voices
                UNION ALL
                SELECT id FROM design_voices
            )
        """).fetchone()[0]
        rows = conn.execute("""
            SELECT 'tts_' || id AS id, 'tts' AS type, text, voice, filename, created_at FROM history
            UNION ALL
            SELECT 'clone_' || id AS id, 'clone' AS type, voice_name AS text, model AS voice, filename, created_at FROM clone_voices
            UNION ALL
            SELECT 'design_' || id AS id, 'design' AS type, voice_name AS text, model AS voice, filename, created_at FROM design_voices
            ORDER BY created_at DESC LIMIT ? OFFSET ?
        """, [size, (page - 1) * size]).fetchall()
    return {
        "total": total,
        "page": page,
        "size": size,
        "items": [dict(r) for r in rows],
    }


@router.get("/{item_id}")
def get_history(item_id: int):
    with database.connect() as conn:
        row = conn.execute("SELECT * FROM history WHERE id = ?", [item_id]).fetchone()
    if not row:
        raise HTTPException(404, "记录不存在")
    return dict(row)


@router.delete("/{item_id}")
def delete_history(item_id: str):
    parts = item_id.split("_", 1)
    if len(parts) != 2:
        raise HTTPException(400, "无效的 ID 格式")
    rec_type, num_id = parts[0], int(parts[1])

    table_map = {"tts": "history", "clone": "clone_voices", "design": "design_voices"}
    table = table_map.get(rec_type)
    if not table:
        raise HTTPException(400, "未知的记录类型")

    with database.connect() as conn:
        row = conn.execute(f"SELECT * FROM {table} WHERE id = ?", [num_id]).fetchone()
        if not row:
            raise HTTPException(404, "记录不存在")
        conn.execute(f"DELETE FROM {table} WHERE id = ?", [num_id])

    if rec_type == "tts":
        filepath = os.path.join(tts_client.AUDIO_DIR, row["filename"])
    else:
        filepath = os.path.join(tts_client.AUDIO_DIR, row["filename"])
    if os.path.exists(filepath):
        os.remove(filepath)
    return {"ok": True}
