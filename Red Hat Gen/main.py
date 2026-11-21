import json
import asyncio
from pathlib import Path

from core.core import Bot


def load_config() -> dict:
    config_path = Path(__file__).parent / "config.json"
    if not config_path.exists():
        raise FileNotFoundError("config.json not found. Create it with token and prefix.")
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)


def main():
    config = load_config()
    token = config.get("token")
    if not token:
        raise ValueError("ALTGEN ERROR | Missing 'token' in config.json")

    bot = Bot(config)
    bot.run(token)


if __name__ == "__main__":
    main()
