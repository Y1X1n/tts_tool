from fastapi import APIRouter
from pydantic import BaseModel
import config

router = APIRouter(prefix="/api/config", tags=["config"])


class ConfigUpdate(BaseModel):
    api_url: str
    api_key: str


@router.get("")
def get_config():
    cfg = config.load()
    key = cfg.get("api_key", "")
    cfg["api_key"] = key[:4] + "****" + key[-4:] if len(key) > 8 else "****"
    return cfg


@router.post("")
def update_config(body: ConfigUpdate):
    config.save({"api_url": body.api_url, "api_key": body.api_key})
    return {"ok": True}
