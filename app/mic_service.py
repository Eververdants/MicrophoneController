import math
import threading
import time
from ctypes import POINTER, cast
from typing import List, Optional, Tuple
import platform

import keyboard


class MicrophoneService:
    def __init__(self, hotkey: str = "F8", poll_interval_s: float = 1.0):
        if platform.system() != "Windows":
            raise RuntimeError("Microphone control is currently only supported on Windows")

        from comtypes import CLSCTX_ALL
        from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume

        self._CLSCTX_ALL = CLSCTX_ALL
        self._AudioUtilities = AudioUtilities
        self._IAudioEndpointVolume = IAudioEndpointVolume

        self._lock = threading.Lock()
        self._hotkey = hotkey
        self._poll_interval_s = poll_interval_s

        self._selected_device_id: Optional[str] = None
        self._selected_device_name: Optional[str] = None
        self._endpoint = self._get_default_microphone_endpoint()
        self._muted = bool(self._endpoint.GetMute())

        self._running = True
        self._monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self._monitor_thread.start()

        self._status_listeners = []
        self._hotkey_callback = None
        self._register_hotkey()

    def _get_default_microphone_endpoint(self):
        device = self._AudioUtilities.GetMicrophone()
        if not device:
            raise RuntimeError("No microphone endpoint found")
        interface = device.Activate(self._IAudioEndpointVolume._iid_, self._CLSCTX_ALL, None)
        return cast(interface, POINTER(self._IAudioEndpointVolume))

    @staticmethod
    def list_capture_devices() -> List[Tuple[str, str]]:
        if platform.system() != "Windows":
            return []

        from pycaw.pycaw import AudioUtilities

        devices = []
        try:
            all_devices = AudioUtilities.GetAllDevices()
        except Exception:
            all_devices = []

        for dev in all_devices or []:
            try:
                if str(getattr(dev, "data_flow", "")).lower() != "capture":
                    continue
                dev_id = getattr(dev, "id", None)
                name = getattr(dev, "FriendlyName", None)
                if dev_id and name:
                    devices.append((str(dev_id), str(name)))
            except Exception:
                continue

        seen = set()
        uniq = []
        for dev_id, name in devices:
            if dev_id in seen:
                continue
            seen.add(dev_id)
            uniq.append((dev_id, name))
        return uniq

    def get_selected_device_id(self) -> Optional[str]:
        with self._lock:
            return self._selected_device_id

    def get_selected_device_name(self) -> Optional[str]:
        with self._lock:
            return self._selected_device_name

    def select_device_by_id(self, device_id: Optional[str]) -> None:
        if not device_id:
            endpoint = self._get_default_microphone_endpoint()
            with self._lock:
                self._endpoint = endpoint
                self._selected_device_id = None
                self._selected_device_name = None
                self._muted = bool(self._endpoint.GetMute())
            self._emit_status(self._muted, source="system")
            return

        target = None
        for dev in (self._AudioUtilities.GetAllDevices() or []):
            try:
                if str(getattr(dev, "id", "")) == str(device_id):
                    target = dev
                    break
            except Exception:
                continue

        if target is None:
            raise RuntimeError("Device not found")

        interface = target.Activate(self._IAudioEndpointVolume._iid_, self._CLSCTX_ALL, None)
        endpoint = cast(interface, POINTER(self._IAudioEndpointVolume))
        with self._lock:
            self._endpoint = endpoint
            self._selected_device_id = str(device_id)
            self._selected_device_name = str(getattr(target, "FriendlyName", "")) or None
            self._muted = bool(self._endpoint.GetMute())
        self._emit_status(self._muted, source="system")

    def current_device_label(self, default_label: str = "Default") -> str:
        with self._lock:
            name = self._selected_device_name
        return name if name else default_label

    def get_volume_percent(self) -> int:
        with self._lock:
            endpoint = self._endpoint
        try:
            scalar = float(endpoint.GetMasterVolumeLevelScalar())
        except Exception:
            return 0
        return max(0, min(100, int(round(scalar * 100))))

    def set_volume_percent(self, percent: int) -> None:
        percent = max(0, min(100, int(percent)))
        with self._lock:
            endpoint = self._endpoint
        try:
            endpoint.SetMasterVolumeLevelScalar(percent / 100.0, None)
        except Exception:
            return

    def get_volume_dB(self) -> float:
        with self._lock:
            endpoint = self._endpoint
        try:
            return float(endpoint.GetMasterVolumeLevel())
        except Exception:
            return -96.0

    def set_volume_dB(self, dB: float) -> None:
        with self._lock:
            endpoint = self._endpoint
        try:
            endpoint.SetMasterVolumeLevel(max(-96.0, min(0.0, dB)), None)
        except Exception:
            return

    @staticmethod
    def percent_to_dB(percent: int) -> float:
        if percent <= 0:
            return -96.0
        scalar = max(0.001, percent / 100.0)
        return round(20.0 * math.log10(scalar), 1)

    @staticmethod
    def dB_to_percent(dB: float) -> int:
        if dB <= -96.0:
            return 0
        scalar = 10 ** (dB / 20.0)
        return max(0, min(100, int(round(scalar * 100))))

    def add_status_listener(self, listener):
        with self._lock:
            self._status_listeners.append(listener)

    def remove_status_listener(self, listener):
        with self._lock:
            self._status_listeners = [l for l in self._status_listeners if l is not listener]

    def _emit_status(self, muted: bool, source: str):
        with self._lock:
            listeners = list(self._status_listeners)
        for listener in listeners:
            try:
                listener(muted, source)
            except Exception:
                pass

    def _register_hotkey(self):
        try:
            keyboard.remove_hotkey(self._hotkey)
        except Exception:
            pass

        self._hotkey_callback = keyboard.add_hotkey(self._hotkey, self.toggle_mute)

    @property
    def hotkey(self) -> str:
        return self._hotkey

    def set_hotkey(self, hotkey: str) -> None:
        if not hotkey:
            raise ValueError("hotkey cannot be empty")
        with self._lock:
            old = self._hotkey
            self._hotkey = hotkey

        try:
            keyboard.remove_hotkey(old)
        except Exception:
            pass

        self._register_hotkey()

    def is_muted(self) -> bool:
        with self._lock:
            return self._muted

    def set_mute(self, muted: bool, source: str = "app") -> None:
        with self._lock:
            endpoint = self._endpoint
        endpoint.SetMute(1 if muted else 0, None)
        with self._lock:
            changed = (self._muted != muted)
            self._muted = muted

        if changed:
            self._emit_status(muted, source)

    def toggle_mute(self) -> bool:
        muted = not self.is_muted()
        self.set_mute(muted, source="hotkey")
        return muted

    def _monitor_loop(self):
        last = self.is_muted()
        while self._running:
            try:
                with self._lock:
                    endpoint = self._endpoint
                current = bool(endpoint.GetMute())
            except Exception:
                time.sleep(self._poll_interval_s)
                continue

            if current != last:
                with self._lock:
                    self._muted = current
                last = current
                self._emit_status(current, source="system")

            time.sleep(self._poll_interval_s)

    def close(self):
        self._running = False
        try:
            keyboard.remove_hotkey(self._hotkey)
        except Exception:
            pass
