var strings = {
  "zh-CN": {
    device_default: "默认麦克风",
    device_not_found: "设备不存在或不可用",
    hotkey_empty: "快捷键不能为空",
    hotkey_changed: "快捷键已更改为: {hotkey}",
    evt_hotkey: "{state} (快捷键: {hotkey})",
    evt_system: "{state} (系统更改)",
    evt_app: "{state}",
    status_mute_label: "静音",
    status_on: "开",
    status_off: "关",
    btn_mute: "静音",
    btn_on: "开启",
    btn_set: "设置",
    tie_zero_mute: "归零=静音",
    tie_norm: "归一",
    tie_start_hidden: "启动隐藏",
    tie_hide_on_close: "关闭隐藏",
    lang_label: "语言",
    tip: "快捷键后台可用",
    module_input: "输入",
    module_input_ch: "通道 1",
    module_level: "电平",
    module_level_ch: "VU",
    module_patch: "跳线",
    module_patch_ch: "源",
    module_key: "按键",
    module_key_ch: "绑定",
    module_config: "配置",
    module_config_ch: "系统",
    module_log: "日志",
    module_log_ch: "监控",
    ref_prefix: "参考",
  },
  "en": {
    device_default: "Default microphone",
    device_not_found: "Device not found or unavailable",
    hotkey_empty: "Hotkey cannot be empty",
    hotkey_changed: "Hotkey changed to: {hotkey}",
    evt_hotkey: "{state} (hotkey: {hotkey})",
    evt_system: "{state} (system)",
    evt_app: "{state}",
    status_mute_label: "mute",
    status_on: "on",
    status_off: "off",
    btn_mute: "mute",
    btn_on: "on",
    btn_set: "set",
    tie_zero_mute: "zero=mute",
    tie_norm: "norm",
    tie_start_hidden: "start hidden",
    tie_hide_on_close: "hide on close",
    lang_label: "lang",
    tip: "hotkey active in background",
    module_input: "input",
    module_input_ch: "ch 1",
    module_level: "level",
    module_level_ch: "vu",
    module_patch: "patch",
    module_patch_ch: "src",
    module_key: "key",
    module_key_ch: "bind",
    module_config: "config",
    module_config_ch: "sys",
    module_log: "log",
    module_log_ch: "monitor",
    ref_prefix: "ref",
  },
};

var currentLang = "zh-CN";
var isPywebviewReady = false;
var currentVolume = 100;

function t(key, kwargs) {
  var table = strings[currentLang] || strings["zh-CN"];
  var text = table[key] || key;
  if (kwargs) {
    for (var k in kwargs) {
      if (kwargs.hasOwnProperty(k)) {
        text = text.replace("{" + k + "}", kwargs[k]);
      }
    }
  }
  return text;
}

function applyUILanguage() {
  var els = document.querySelectorAll("[data-i18n]");
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    var key = el.getAttribute("data-i18n");
    el.textContent = t(key);
  }
}

function updateStatusUI(muted) {
  var indicator = document.getElementById("status-indicator");
  var statusText = document.getElementById("status-text");
  var toggleBtn = document.getElementById("btn-toggle");
  var toggleLabel = document.getElementById("btn-toggle-label");

  indicator.className = "pilot-led " + (muted ? "pilot-off" : "pilot-on");
  statusText.textContent = muted ? t("status_off") : t("status_on");
  toggleLabel.textContent = muted ? t("status_on") : t("status_off");

  if (muted) {
    toggleBtn.classList.remove("active");
  } else {
    toggleBtn.classList.add("active");
  }

  updateVUMeter(currentVolume, muted);
}

function addHistoryEntry(text) {
  var list = document.getElementById("history-list");
  var entry = document.createElement("div");
  entry.className = "history-entry";
  entry.textContent = text;
  list.insertBefore(entry, list.firstChild);
  while (list.children.length > 50) {
    list.removeChild(list.lastChild);
  }
}

function initUI(state) {
  currentLang = state.language || "zh-CN";
  currentVolume = state.volume;
  applyUILanguage();

  updateStatusUI(state.muted);
  document.getElementById("volume-label").textContent = percentToDB(state.volume);
  document.getElementById("volume-slider").value = state.volume;
  document.getElementById("volume-zero-mutes").checked = state.volumeZeroMutes || false;
  document.getElementById("hotkey-input").value = state.hotkey || "F8";
  document.getElementById("start-min-tray").checked = state.startMinimizedToTray || false;
  document.getElementById("close-to-tray").checked = state.minimizeToTrayOnClose || false;
  document.getElementById("lang-dropdown").value = currentLang;

  var normToggle = document.getElementById("norm-toggle");
  if (normToggle) {
    normToggle.checked = state.normalizeVolume || false;
    updateRefLabel(state.normalizeVolume ? state.referenceVolume : null);
  }

  updateVUMeter(state.volume, state.muted);
  populateDevices(state.devices, state.selectedDeviceId);

  var historyList = document.getElementById("history-list");
  historyList.innerHTML = "";
  if (state.history && state.history.length) {
    state.history.forEach(function(entry) {
      var el = document.createElement("div");
      el.className = "history-entry";
      el.textContent = entry;
      historyList.appendChild(el);
    });
  }

  updateTipVisibility();
}

function showSnackbar(message) {
  var existing = document.getElementById("snackbar");
  if (existing) {
    existing.remove();
  }
  var sb = document.createElement("div");
  sb.id = "snackbar";
  sb.textContent = message;
  document.body.appendChild(sb);
  setTimeout(function() { sb.style.opacity = "0"; }, 2500);
  setTimeout(function() { if (sb.parentNode) sb.remove(); }, 3000);
}

function percentToDB(percent) {
  if (percent <= 0) return "-∞ dB";
  var dB = 20 * Math.log10(percent / 100);
  if (dB >= -0.5) return "0 dB";
  if (dB > -10) return dB.toFixed(1) + " dB";
  return Math.round(dB) + " dB";
}

function updateVUMeter(volume, muted) {
  var segments = document.querySelectorAll(".vu-segment");
  var activeCount = Math.round(volume * 8 / 100);
  for (var i = 0; i < segments.length; i++) {
    var seg = segments[i];
    var isActive = i < activeCount;
    seg.classList.toggle("active", isActive);
    seg.classList.toggle("clip", isActive && i >= 6);
    seg.classList.toggle("muted", isActive && muted);
  }
}

function updateRefLabel(refVolume) {
  var label = document.getElementById("ref-label");
  if (refVolume !== undefined && refVolume !== null) {
    label.textContent = t("ref_prefix") + " " + percentToDB(refVolume);
    label.classList.add("visible");
  } else {
    label.classList.remove("visible");
  }
}

function populateDevices(devices, selectedId) {
  var dropdown = document.getElementById("device-dropdown");
  dropdown.innerHTML = "";
  var defaultOpt = document.createElement("option");
  defaultOpt.value = "__default__";
  defaultOpt.textContent = t("device_default");
  dropdown.appendChild(defaultOpt);

  if (devices) {
    devices.forEach(function(d) {
      var opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = d.name;
      dropdown.appendChild(opt);
    });
  }

  if (selectedId) {
    dropdown.value = selectedId;
  } else {
    dropdown.value = "__default__";
  }
}

function updateTipVisibility() {
  var tip = document.getElementById("tip-text");
  if (isPywebviewReady) {
    tip.style.display = "block";
  } else {
    tip.style.display = "none";
  }
}

function init() {
  if (window.pywebview && window.pywebview.api) {
    isPywebviewReady = true;
    updateTipVisibility();
    window.pywebview.api.get_initial_state().then(function(state) {
      initUI(state);
    }).catch(function(err) {
      console.error("Failed to get initial state:", err);
    });
  } else {
    setTimeout(init, 200);
  }
}

function onStatusUpdate(muted, source) {
  updateStatusUI(muted);
  var state = muted ? t("status_off") : t("status_on");
  var msg;
  if (source === "system") {
    msg = t("evt_system", {state: state});
  } else if (source === "hotkey") {
    msg = t("evt_hotkey", {state: state, hotkey: document.getElementById("hotkey-input").value});
  } else {
    msg = t("evt_app", {state: state});
  }
  var now = new Date();
  var timeStr = String(now.getHours()).padStart(2,"0") + ":" +
                String(now.getMinutes()).padStart(2,"0") + ":" +
                String(now.getSeconds()).padStart(2,"0");
  addHistoryEntry(timeStr + " - " + msg);
}

function onVolumeChanged(value) {
  currentVolume = value;
  document.getElementById("volume-label").textContent = percentToDB(value);
  var isMuted = document.getElementById("status-indicator").classList.contains("pilot-off");
  updateVUMeter(value, isMuted);
}

document.addEventListener("DOMContentLoaded", function() {
  init();

  document.getElementById("btn-toggle").addEventListener("click", function() {
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.toggle_mute();
    }
  });

  document.getElementById("btn-mute").addEventListener("click", function() {
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.set_mute(true);
    }
  });

  document.getElementById("btn-unmute").addEventListener("click", function() {
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.set_mute(false);
    }
  });

  document.getElementById("volume-slider").addEventListener("input", function(e) {
    var val = parseInt(e.target.value, 10);
    onVolumeChanged(val);
  });

  document.getElementById("volume-slider").addEventListener("change", function(e) {
    var val = parseInt(e.target.value, 10);
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.set_volume(val);
    }
  });

  document.getElementById("volume-zero-mutes").addEventListener("change", function(e) {
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.set_volume_zero_mutes(e.target.checked);
    }
  });

  var normToggle = document.getElementById("norm-toggle");
  if (normToggle) {
    normToggle.addEventListener("change", function(e) {
      var isOn = e.target.checked;
      if (window.pywebview && window.pywebview.api) {
        window.pywebview.api.set_normalize(isOn).then(function() {
          updateRefLabel(isOn ? currentVolume : null);
        }).catch(function(err) {
          showSnackbar(err.message || String(err));
        });
      }
    });
  }

  document.getElementById("device-dropdown").addEventListener("change", function(e) {
    var val = e.target.value;
    var deviceId = val === "__default__" ? null : val;
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.select_device(deviceId).catch(function() {
        showSnackbar(t("device_not_found"));
        window.pywebview.api.list_devices().then(function(devices) {
          var state = {devices: devices, selectedDeviceId: null};
          populateDevices(state.devices, state.selectedDeviceId);
        });
      });
    }
  });

  document.getElementById("btn-refresh-devices").addEventListener("click", function() {
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.list_devices().then(function(devices) {
        populateDevices(devices, document.getElementById("device-dropdown").value);
      });
    }
  });

  document.getElementById("btn-apply-hotkey").addEventListener("click", function() {
    var hotkey = document.getElementById("hotkey-input").value.trim();
    if (!hotkey) {
      showSnackbar(t("hotkey_empty"));
      return;
    }
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.set_hotkey(hotkey).then(function() {
        showSnackbar(t("hotkey_changed", {hotkey: hotkey}));
      }).catch(function(err) {
        showSnackbar(err.message || String(err));
      });
    }
  });

  document.getElementById("start-min-tray").addEventListener("change", function(e) {
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.set_start_minimized(e.target.checked);
    }
  });

  document.getElementById("close-to-tray").addEventListener("change", function(e) {
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.set_close_to_tray(e.target.checked);
    }
  });

  document.getElementById("lang-dropdown").addEventListener("change", function(e) {
    currentLang = e.target.value;
    applyUILanguage();
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.set_language(currentLang);
    }
  });
});
