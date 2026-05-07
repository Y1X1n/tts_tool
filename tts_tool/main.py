from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response
import uvicorn
import os
import database

app = FastAPI(title="TTS Tool")

# Init database on startup
@app.on_event("startup")
def startup():
    database.init()
    os.makedirs("data/audio", exist_ok=True)

# Silence favicon 404 noise
@app.get("/favicon.ico")
def favicon():
    return Response(status_code=204)

# Mount routers
from routers import config, tts, history, voice
app.include_router(config.router)
app.include_router(tts.router)
app.include_router(history.router)
app.include_router(voice.router)

# Serve static frontend
static_dir = os.path.join(os.path.dirname(__file__), "static")
app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
