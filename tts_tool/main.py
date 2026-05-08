from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response
import uvicorn
import os
import database
from paths import static_dir, data_dir

app = FastAPI(title="TTS Tool")

# Init database on startup
@app.on_event("startup")
def startup():
    database.init()
    os.makedirs(os.path.join(data_dir(), "audio"), exist_ok=True)

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
app.mount("/", StaticFiles(directory=static_dir(), html=True), name="static")

if __name__ == "__main__":
    import sys
    import webbrowser
    import threading

    url = "http://127.0.0.1:8000"
    threading.Timer(1.0, lambda: webbrowser.open(url)).start()

    print(f"TTS Studio 启动中... 浏览器自动打开 {url}")
    if getattr(sys, 'frozen', False):
        uvicorn.run(app, host="127.0.0.1", port=8000, reload=False)
    else:
        uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
