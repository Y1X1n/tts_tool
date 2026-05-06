from fastapi import APIRouter, HTTPException
import database
import os
import tts_client

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("")
def list_history(page: int = 1, size: int = 20):
    conn = database.get_conn()
    total = conn.execute("SELECT COUNT(*) FROM history").fetchone()[0]
    rows = conn.execute(
        "SELECT * FROM history ORDER BY created_at DESC LIMIT ? OFFSET ?",
        [size, (page - 1) * size],
    ).fetchall()
    conn.close()
    return {
        "total": total,
        "page": page,
        "size": size,
        "items": [dict(r) for r in rows],
    }


@router.get("/{item_id}")
def get_history(item_id: int):
    conn = database.get_conn()
    row = conn.execute("SELECT * FROM history WHERE id = ?", [item_id]).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "记录不存在")
    return dict(row)


@router.delete("/{item_id}")
def delete_history(item_id: int):
    conn = database.get_conn()
    row = conn.execute("SELECT * FROM history WHERE id = ?", [item_id]).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "记录不存在")
    conn.execute("DELETE FROM history WHERE id = ?", [item_id])
    conn.commit()
    conn.close()
    filepath = os.path.join(tts_client.AUDIO_DIR, row["filename"])
    if os.path.exists(filepath):
        os.remove(filepath)
    return {"ok": True}
