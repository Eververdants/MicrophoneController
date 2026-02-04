import json
import os
from dataclasses import dataclass, asdict
from typing import Optional


@dataclass
class AppConfig:
    hotkey: str = "F8"
    poll_interval_s: float = 1.0
    start_minimized_to_tray: bool = False
    minimize_to_tray_on_close: bool = True
    language: str = "zh-CN"
    selected_device_id: Optional[str] = None
    last_volume_percent: int = 100
    volume_zero_mutes: bool = False


def _config_dir() -> str:
    appdata = os.environ.get("APPDATA")
    if appdata:
        return os.path.join(appdata, "MicrophoneController")
    return os.path.join(os.path.expanduser("~"), ".microphone_controller")


def config_path() -> str:
    return os.path.join(_config_dir(), "config.json")


def load_config() -> AppConfig:
    path = config_path()
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        return AppConfig()
    except Exception:
        return AppConfig()

    cfg = AppConfig()
    if isinstance(data, dict):
        if isinstance(data.get("hotkey"), str) and data["hotkey"].strip():
            cfg.hotkey = data["hotkey"].strip()
        if isinstance(data.get("poll_interval_s"), (int, float)):
            cfg.poll_interval_s = float(data["poll_interval_s"])
        if isinstance(data.get("start_minimized_to_tray"), bool):
            cfg.start_minimized_to_tray = data["start_minimized_to_tray"]
        if isinstance(data.get("minimize_to_tray_on_close"), bool):
            cfg.minimize_to_tray_on_close = data["minimize_to_tray_on_close"]
        if isinstance(data.get("language"), str) and data["language"].strip():
            cfg.language = data["language"].strip()
        if isinstance(data.get("selected_device_id"), str) and data["selected_device_id"].strip():
            cfg.selected_device_id = data["selected_device_id"].strip()
        if isinstance(data.get("last_volume_percent"), int):
            cfg.last_volume_percent = max(0, min(100, int(data["last_volume_percent"])))
        if isinstance(data.get("volume_zero_mutes"), bool):
            cfg.volume_zero_mutes = data["volume_zero_mutes"]
    return cfg


def save_config(cfg: AppConfig) -> None:
    d = _config_dir()
    os.makedirs(d, exist_ok=True)
    path = config_path()
    with open(path, "w", encoding="utf-8") as f:
        json.dump(asdict(cfg), f, ensure_ascii=False, indent=2)
