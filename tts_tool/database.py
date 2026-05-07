import sqlite3
import os

DB_FILE = os.path.join(os.path.dirname(__file__), "data", "tts.db")


def get_conn() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init():
    conn = get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS history (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            text       TEXT,
            voice      TEXT,
            speed      REAL,
            pitch      REAL,
            filename   TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS clone_voices (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            voice_id        TEXT NOT NULL,
            voice_name      TEXT,
            model           TEXT,
            ref_audio_path  TEXT,
            ref_text        TEXT,
            favorited       INTEGER DEFAULT 0,
            created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS design_voices (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            voice_id        TEXT NOT NULL,
            voice_name      TEXT,
            model           TEXT,
            prompt          TEXT,
            created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()
