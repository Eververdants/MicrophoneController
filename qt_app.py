import sys
from datetime import datetime

from PyQt5.QtCore import Qt, QTimer, pyqtSignal
from PyQt5.QtGui import QIcon
from PyQt5.QtWidgets import (
    QAction,
    QApplication,
    QCheckBox,
    QComboBox,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QSlider,
    QSystemTrayIcon,
    QStyle,
    QTextEdit,
    QVBoxLayout,
    QWidget,
)

from config_store import AppConfig, load_config, save_config
from mic_service import MicrophoneService


class MainWindow(QMainWindow):
    status_changed = pyqtSignal(bool, str)

    def __init__(self):
        super().__init__()

        self._quitting = False

        self.setWindowTitle("麦克风控制器")
        self.setMinimumSize(520, 420)

        self._config = load_config()

        self._strings = {
            "zh-CN": {
                "app_title": "麦克风控制器",
                "error": "错误",
                "no_mic": "未找到麦克风设备",
                "status_prefix": "状态：",
                "muted": "已静音",
                "unmuted": "已开启",
                "toggle": "切换",
                "mute": "静音",
                "unmute": "开启",
                "hotkey": "快捷键：",
                "apply": "应用",
                "history": "历史记录：",
                "tip": "提示：窗口隐藏时也可以使用快捷键。",
                "invalid": "无效输入",
                "hotkey_empty": "快捷键不能为空",
                "hotkey_changed": "快捷键已更改为：{hotkey}",
                "start_min_tray": "启动时最小化到托盘",
                "close_to_tray": "点击关闭时最小化到托盘",
                "tray_show": "显示窗口",
                "tray_toggle": "切换静音",
                "tray_quit": "退出",
                "lang": "语言：",
                "evt_hotkey": "{state}（快捷键：{hotkey}）",
                "evt_system": "{state}（系统更改）",
                "evt_app": "{state}",
                "device": "设备：",
                "device_default": "默认麦克风",
                "device_not_found": "设备不存在或不可用",
                "device_refresh": "刷新",
                "volume": "音量：",
                "volume_zero_mutes": "音量归零=静音",
                "tray_tooltip": "麦克风：{state}｜设备：{device}",
            },
            "en": {
                "app_title": "MicrophoneController",
                "error": "Error",
                "no_mic": "No microphone endpoint found",
                "status_prefix": "Status: ",
                "muted": "Muted",
                "unmuted": "Unmuted",
                "toggle": "Toggle",
                "mute": "Mute",
                "unmute": "Unmute",
                "hotkey": "Hotkey:",
                "apply": "Apply",
                "history": "History:",
                "tip": "Tip: You can use the hotkey even when the window is hidden.",
                "invalid": "Invalid",
                "hotkey_empty": "Hotkey cannot be empty",
                "hotkey_changed": "Hotkey changed to: {hotkey}",
                "start_min_tray": "Start minimized to tray",
                "close_to_tray": "Minimize to tray when closing",
                "tray_show": "Show",
                "tray_toggle": "Toggle Mute",
                "tray_quit": "Quit",
                "lang": "Language:",
                "evt_hotkey": "{state} (hotkey: {hotkey})",
                "evt_system": "{state} (system)",
                "evt_app": "{state}",
                "device": "Device:",
                "device_default": "Default microphone",
                "device_not_found": "Device not found or unavailable",
                "device_refresh": "Refresh",
                "volume": "Volume:",
                "volume_zero_mutes": "Volume 0 = mute",
                "tray_tooltip": "Microphone: {state} | Device: {device}",
            },
        }

        try:
            self._service = MicrophoneService(
                hotkey=self._config.hotkey,
                poll_interval_s=self._config.poll_interval_s,
            )
        except Exception as e:
            QMessageBox.critical(self, self._t("error"), str(e))
            raise

        self.status_changed.connect(self._on_status)
        self._service.add_status_listener(lambda muted, source: self.status_changed.emit(muted, source))

        if self._config.selected_device_id:
            try:
                self._service.select_device_by_id(self._config.selected_device_id)
            except Exception:
                self._config.selected_device_id = None
                save_config(self._config)

        self._history = []

        self._tray = QSystemTrayIcon(self)
        self._tray.setToolTip(self._t("app_title"))
        self._tray.activated.connect(self._on_tray_activated)

        self._tray_menu_actions()

        self._build_ui()

        try:
            self._service.set_volume_percent(int(self._config.last_volume_percent))
        except Exception:
            pass

        self._ui_timer = QTimer(self)
        self._ui_timer.setInterval(300)
        self._ui_timer.timeout.connect(self._refresh_ui)
        self._ui_timer.start()

        self._refresh_ui()
        self._tray.show()

        if self._config.start_minimized_to_tray:
            self.hide()

    def _t(self, key: str) -> str:
        lang = (self._config.language or "zh-CN").strip()
        table = self._strings.get(lang) or self._strings["zh-CN"]
        return table.get(key, key)

    def _current_state_text(self, muted: bool) -> str:
        return self._t("muted") if muted else self._t("unmuted")

    def _tray_menu_actions(self):
        menu = self._tray.contextMenu()
        if menu is None:
            from PyQt5.QtWidgets import QMenu

            menu = QMenu()
            self._tray.setContextMenu(menu)

        menu.clear()

        self._action_show = QAction(self._t("tray_show"), self)
        self._action_toggle = QAction(self._t("tray_toggle"), self)
        self._action_quit = QAction(self._t("tray_quit"), self)

        self._action_show.triggered.connect(self._show_and_raise)
        self._action_toggle.triggered.connect(self._toggle_clicked)
        self._action_quit.triggered.connect(self._quit_app)

        menu.addAction(self._action_show)
        menu.addAction(self._action_toggle)
        menu.addSeparator()
        menu.addAction(self._action_quit)

    def _build_ui(self):
        root = QWidget(self)
        self.setCentralWidget(root)

        layout = QVBoxLayout(root)

        self._status_label = QLabel(self._t("status_prefix") + "...")
        self._status_label.setAlignment(Qt.AlignLeft)
        layout.addWidget(self._status_label)

        device_row = QHBoxLayout()
        device_row.addWidget(QLabel(self._t("device")))
        self._device_combo = QComboBox()
        self._device_combo.setMinimumWidth(320)
        self._device_combo.currentIndexChanged.connect(self._on_device_changed)
        device_row.addWidget(self._device_combo)

        self._refresh_devices_btn = QPushButton(self._t("device_refresh"))
        self._refresh_devices_btn.clicked.connect(self._refresh_device_list)
        device_row.addWidget(self._refresh_devices_btn)

        device_row.addStretch(1)
        layout.addLayout(device_row)

        self._refresh_device_list()

        row = QHBoxLayout()
        self._toggle_btn = QPushButton(self._t("toggle"))
        self._toggle_btn.clicked.connect(self._toggle_clicked)
        row.addWidget(self._toggle_btn)

        self._mute_btn = QPushButton(self._t("mute"))
        self._mute_btn.clicked.connect(lambda: self._service.set_mute(True, source="app"))
        row.addWidget(self._mute_btn)

        self._unmute_btn = QPushButton(self._t("unmute"))
        self._unmute_btn.clicked.connect(lambda: self._service.set_mute(False, source="app"))
        row.addWidget(self._unmute_btn)

        row.addStretch(1)
        layout.addLayout(row)

        vol_row = QHBoxLayout()
        self._vol_label = QLabel(self._t("volume") + "100%")
        vol_row.addWidget(self._vol_label)
        self._volume_slider = QSlider(Qt.Horizontal)
        self._volume_slider.setRange(0, 100)
        self._volume_slider.setValue(int(getattr(self._config, "last_volume_percent", 100)))
        self._volume_slider.valueChanged.connect(self._on_volume_changed)
        vol_row.addWidget(self._volume_slider, 1)
        layout.addLayout(vol_row)

        self._volume_zero_mutes_checkbox = QCheckBox(self._t("volume_zero_mutes"))
        self._volume_zero_mutes_checkbox.setChecked(bool(getattr(self._config, "volume_zero_mutes", False)))
        self._volume_zero_mutes_checkbox.stateChanged.connect(self._save_config)
        layout.addWidget(self._volume_zero_mutes_checkbox)

        hotkey_row = QHBoxLayout()
        hotkey_row.addWidget(QLabel(self._t("hotkey")))

        self._hotkey_edit = QLineEdit(self._config.hotkey)
        self._hotkey_edit.setMaximumWidth(160)
        hotkey_row.addWidget(self._hotkey_edit)

        self._apply_hotkey_btn = QPushButton(self._t("apply"))
        self._apply_hotkey_btn.clicked.connect(self._apply_hotkey)
        hotkey_row.addWidget(self._apply_hotkey_btn)

        hotkey_row.addStretch(1)
        layout.addLayout(hotkey_row)

        lang_row = QHBoxLayout()
        lang_row.addWidget(QLabel(self._t("lang")))
        self._lang_combo = QComboBox()
        self._lang_combo.addItem("中文", "zh-CN")
        self._lang_combo.addItem("English", "en")
        current_lang = (self._config.language or "zh-CN").strip()
        idx = self._lang_combo.findData(current_lang)
        if idx >= 0:
            self._lang_combo.setCurrentIndex(idx)
        self._lang_combo.currentIndexChanged.connect(self._on_language_changed)
        self._lang_combo.setMaximumWidth(160)
        lang_row.addWidget(self._lang_combo)
        lang_row.addStretch(1)
        layout.addLayout(lang_row)

        self._start_tray_checkbox = QCheckBox(self._t("start_min_tray"))
        self._start_tray_checkbox.setChecked(self._config.start_minimized_to_tray)
        self._start_tray_checkbox.stateChanged.connect(self._save_config)
        layout.addWidget(self._start_tray_checkbox)

        self._close_to_tray_checkbox = QCheckBox(self._t("close_to_tray"))
        self._close_to_tray_checkbox.setChecked(self._config.minimize_to_tray_on_close)
        self._close_to_tray_checkbox.stateChanged.connect(self._save_config)
        layout.addWidget(self._close_to_tray_checkbox)

        layout.addWidget(QLabel(self._t("history")))
        self._history_box = QTextEdit()
        self._history_box.setReadOnly(True)
        layout.addWidget(self._history_box, 1)

        hint = QLabel(self._t("tip"))
        hint.setStyleSheet("color: #666;")
        layout.addWidget(hint)

    def _append_history(self, text: str):
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self._history.insert(0, f"{ts} - {text}")
        self._history = self._history[:50]
        self._history_box.setPlainText("\n".join(self._history))

    def _on_status(self, muted: bool, source: str):
        state = self._current_state_text(muted)
        if source == "system":
            self._append_history(self._t("evt_system").format(state=state))
        elif source == "hotkey":
            self._append_history(self._t("evt_hotkey").format(state=state, hotkey=self._service.hotkey))
        else:
            self._append_history(self._t("evt_app").format(state=state))

    def _refresh_ui(self):
        muted = self._service.is_muted()
        state = self._current_state_text(muted)
        self._status_label.setText(self._t("status_prefix") + state)
        self._toggle_btn.setText(self._t("unmute") if muted else self._t("mute"))
        self._mute_btn.setText(self._t("mute"))
        self._unmute_btn.setText(self._t("unmute"))

        if not self._volume_slider.isSliderDown():
            vol = self._service.get_volume_percent()
            self._volume_slider.blockSignals(True)
            self._volume_slider.setValue(vol)
            self._volume_slider.blockSignals(False)
            self._vol_label.setText(self._t("volume") + f"{vol}%")

        icon = self.style().standardIcon(QStyle.SP_MediaVolumeMuted if muted else QStyle.SP_MediaVolume)
        self._tray.setIcon(icon)
        device_label = self._service.current_device_label(self._t("device_default"))
        self._tray.setToolTip(self._t("tray_tooltip").format(state=state, device=device_label))

    def _toggle_clicked(self):
        self._service.toggle_mute()

    def _apply_hotkey(self):
        new_hotkey = self._hotkey_edit.text().strip()
        if not new_hotkey:
            QMessageBox.warning(self, self._t("invalid"), self._t("hotkey_empty"))
            return

        try:
            self._service.set_hotkey(new_hotkey)
        except Exception as e:
            QMessageBox.critical(self, self._t("error"), str(e))
            return

        self._config.hotkey = new_hotkey
        self._save_config()
        self._append_history(self._t("hotkey_changed").format(hotkey=new_hotkey))

    def _refresh_device_list(self):
        devices = self._service.list_capture_devices()
        current = self._config.selected_device_id

        self._device_combo.blockSignals(True)
        self._device_combo.clear()
        self._device_combo.addItem(self._t("device_default"), None)
        for dev_id, name in devices:
            self._device_combo.addItem(name, dev_id)

        if current:
            idx = self._device_combo.findData(current)
            if idx >= 0:
                self._device_combo.setCurrentIndex(idx)
            else:
                self._device_combo.setCurrentIndex(0)
                self._config.selected_device_id = None
                save_config(self._config)
        else:
            self._device_combo.setCurrentIndex(0)
        self._device_combo.blockSignals(False)

    def _on_device_changed(self):
        device_id = self._device_combo.currentData()
        try:
            self._service.select_device_by_id(device_id)
        except Exception:
            QMessageBox.warning(self, self._t("invalid"), self._t("device_not_found"))
            self._refresh_device_list()
            return

        self._config.selected_device_id = device_id if isinstance(device_id, str) else None
        self._save_config()

    def _on_volume_changed(self, value: int):
        self._vol_label.setText(self._t("volume") + f"{int(value)}%")
        self._service.set_volume_percent(int(value))
        self._config.last_volume_percent = int(value)
        save_config(self._config)

        if bool(getattr(self._config, "volume_zero_mutes", False)):
            if int(value) <= 0:
                self._service.set_mute(True, source="app")
            else:
                if self._service.is_muted():
                    self._service.set_mute(False, source="app")

    def _on_language_changed(self):
        data = self._lang_combo.currentData()
        if isinstance(data, str) and data.strip():
            self._config.language = data.strip()
            self._save_config()
            self._apply_translations()

    def _apply_translations(self):
        self.setWindowTitle(self._t("app_title"))
        self._tray.setToolTip(self._t("app_title"))
        self._tray_menu_actions()
        self._toggle_btn.setText(self._t("toggle"))
        self._mute_btn.setText(self._t("mute"))
        self._unmute_btn.setText(self._t("unmute"))
        self._apply_hotkey_btn.setText(self._t("apply"))
        self._start_tray_checkbox.setText(self._t("start_min_tray"))
        self._close_to_tray_checkbox.setText(self._t("close_to_tray"))
        self._vol_label.setText(self._t("volume") + f"{self._volume_slider.value()}%")
        self._refresh_devices_btn.setText(self._t("device_refresh"))
        self._volume_zero_mutes_checkbox.setText(self._t("volume_zero_mutes"))
        self._refresh_device_list()
        self._refresh_ui()

    def _save_config(self):
        self._config.start_minimized_to_tray = self._start_tray_checkbox.isChecked()
        self._config.minimize_to_tray_on_close = self._close_to_tray_checkbox.isChecked()
        self._config.language = str(getattr(self._config, "language", "zh-CN"))
        try:
            self._config.selected_device_id = self._device_combo.currentData()
            if not isinstance(self._config.selected_device_id, str):
                self._config.selected_device_id = None
        except Exception:
            pass

        try:
            self._config.last_volume_percent = int(self._volume_slider.value())
        except Exception:
            pass

        try:
            self._config.volume_zero_mutes = self._volume_zero_mutes_checkbox.isChecked()
        except Exception:
            pass
        save_config(self._config)

    def _show_and_raise(self):
        self.show()
        self.setWindowState(self.windowState() & ~Qt.WindowMinimized | Qt.WindowActive)
        self.raise_()
        self.activateWindow()

    def _on_tray_activated(self, reason):
        if reason == QSystemTrayIcon.Trigger:
            if self.isVisible():
                self.hide()
            else:
                self._show_and_raise()

    def _quit_app(self):
        self._quitting = True
        try:
            self._service.close()
        except Exception:
            pass
        try:
            self._tray.hide()
        except Exception:
            pass
        QApplication.instance().quit()

    def closeEvent(self, event):
        if (not self._quitting) and self._config.minimize_to_tray_on_close:
            event.ignore()
            self.hide()
            return

        self._service.close()
        self._tray.hide()
        super().closeEvent(event)


def main():
    app = QApplication(sys.argv)
    win = MainWindow()
    win.show()
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
