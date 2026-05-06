import os
import json

CONFIG_FILE = os.path.join(os.path.dirname(__file__), "data", "config.json")

DEFAULTS = {
    "api_url": "",
    "api_key": "",
}


def load() -> dict:
    if not os.path.exists(CONFIG_FILE):
        return dict(DEFAULTS)
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    return {**DEFAULTS, **data}


def save(data: dict) -> None:
    current = load()
    current.update(data)
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(current, f, ensure_ascii=False, indent=2)
