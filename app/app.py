import json
import math
import os
import sys
import threading
from pathlib import Path

import webview
from PIL import Image
from pystray import Icon, Menu, MenuItem

from config_store import load_config, save_config
from mic_service import MicrophoneService


def _resource_path(relative_path: str) -> str:
    try:
        base = sys._MEIPASS
    except AttributeError:
        base = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base, relative_path)


def _project_resource_path(relative_path: str) -> str:
    try:
        base = sys._MEIPASS
    except AttributeError:
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base, relative_path)


FRONTEND_DIR = _resource_path("frontend")
INDEX_HTML = str(Path(FRONTEND_DIR, "index.html").as_uri())


def _get_tray_image() -> Image.Image:
    img = Image.open(_project_resource_path("icon.png")).convert("RGBA")
    img.thumbnail((64, 64), Image.LANCZOS)
    return img


class Api:
    def __init__(self, service: MicrophoneService, config):
        self._service = service
        self._config = config
        self._window = None
        self._history: list[str] = ["App started"]

    def set_window(self, window: webview.Window):
        self._window = window

    def get_initial_state(self) -> dict:
        devices = [
            {"id": dev_id, "name": name}
            for dev_id, name in self._service.list_capture_devices()
        ]
        return {
            "muted": self._service.is_muted(),
            "volume": self._config.last_volume_percent,
            "selectedDeviceId": self._config.selected_device_id,
            "devices": devices,
            "hotkey": self._config.hotkey,
            "language": self._config.language or "zh-CN",
            "startMinimizedToTray": self._config.start_minimized_to_tray,
            "minimizeToTrayOnClose": self._config.minimize_to_tray_on_close,
            "volumeZeroMutes": self._config.volume_zero_mutes,
            "normalizeVolume": self._config.normalize_volume,
            "referenceVolume": self._config.reference_volume_percent,
            "history": list(self._history),
        }

    def toggle_mute(self):
        self._service.toggle_mute()

    def set_mute(self, muted: bool):
        self._service.set_mute(muted, source="app")

    def set_volume(self, percent: int):
        val = max(0, min(100, int(percent)))
        dB = MicrophoneService.percent_to_dB(val)
        self._service.set_volume_dB(dB)
        self._config.last_volume_percent = val
        if self._config.normalize_volume:
            self._config.reference_volume_percent = val
        save_config(self._config)
        if self._config.volume_zero_mutes and val <= 0:
            self._service.set_mute(True, source="app")
        elif self._config.volume_zero_mutes and self._service.is_muted():
            self._service.set_mute(False, source="app")

    def select_device(self, device_id):
        try:
            self._service.select_device_by_id(device_id)
            self._config.selected_device_id = device_id
            save_config(self._config)
        except Exception as exc:
            raise Exception(str(exc))

    def list_devices(self) -> list:
        return [
            {"id": dev_id, "name": name}
            for dev_id, name in self._service.list_capture_devices()
        ]

    def set_hotkey(self, hotkey: str):
        if not hotkey:
            raise ValueError("hotkey cannot be empty")
        self._service.set_hotkey(hotkey)
        self._config.hotkey = hotkey
        save_config(self._config)

    def set_language(self, lang: str):
        self._config.language = lang
        save_config(self._config)

    def set_start_minimized(self, value: bool):
        self._config.start_minimized_to_tray = value
        save_config(self._config)

    def set_close_to_tray(self, value: bool):
        self._config.minimize_to_tray_on_close = value
        save_config(self._config)

    def set_volume_zero_mutes(self, value: bool):
        self._config.volume_zero_mutes = value
        save_config(self._config)

    def set_normalize(self, value: bool):
        self._config.normalize_volume = value
        if value:
            ref = self._config.reference_volume_percent
            dB = MicrophoneService.percent_to_dB(ref)
            self._service.set_volume_dB(dB)
            self._config.last_volume_percent = ref
        save_config(self._config)

    def set_reference_volume(self, percent: int):
        val = max(0, min(100, int(percent)))
        self._config.reference_volume_percent = val
        save_config(self._config)

    def push_status(self, muted: bool, source: str):
        if self._window is None:
            return
        js = f"onStatusUpdate({json.dumps(muted)}, {json.dumps(source)})"
        try:
            self._window.evaluate_js(js)
        except Exception:
            pass

    def set_tray_tooltip(self, tooltip: str):
        if self._window is None:
            return
        try:
            self._window.evaluate_js(f"document.title = {json.dumps(tooltip)}")
        except Exception:
            pass


def _on_window_closing(window, config):
    if config.minimize_to_tray_on_close:
        window.hide()


def _run_tray(window, api, service, config):
    image = _get_tray_image()

    def on_show():
        window.show()
        window.restore()

    def on_hide():
        window.hide()

    def on_exit():
        service.close()
        window.destroy()
        icon.stop()

    menu = Menu(
        MenuItem("Show", on_show, default=True),
        MenuItem("Hide", on_hide),
        MenuItem("Exit", on_exit),
    )

    icon = Icon("MicController", image, "MicController", menu)
    api._tray_icon = icon
    icon.run()


def main():
    config = load_config()

    try:
        service = MicrophoneService(
            hotkey=config.hotkey,
            poll_interval_s=config.poll_interval_s,
        )
    except Exception as e:
        print(f"Error: {e}")
        return

    if config.selected_device_id:
        try:
            service.select_device_by_id(config.selected_device_id)
        except Exception:
            config.selected_device_id = None
            save_config(config)

    api = Api(service, config)
    is_hidden = config.start_minimized_to_tray

    print(f"[MicController] Starting...")
    print(f"[MicController] HTML path: {INDEX_HTML}")
    print(f"[MicController] Frontend dir: {FRONTEND_DIR}")
    print(f"[MicController] Hidden: {is_hidden}")

    window = webview.create_window(
        "MicController",
        url=INDEX_HTML,
        js_api=api,
        width=520,
        height=720,
        resizable=False,
        hidden=is_hidden,
        background_color="#131210",
    )
    api.set_window(window)

    tray_thread = threading.Thread(
        target=_run_tray,
        args=(window, api, service, config),
        daemon=True,
    )
    tray_thread.start()

    def _on_status(muted: bool, source: str):
        api.push_status(muted, source)

    service.add_status_listener(_on_status)

    window.events.closing += lambda: _on_window_closing(window, config)

    webview.start()


if __name__ == "__main__":
    main()
