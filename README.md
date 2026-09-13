# MicrophoneController

**English** | [简体中文](./README-CN.md)

[![GitHub Release](https://img.shields.io/github/v/release/Eververdants/MicrophoneController)](https://github.com/Eververdants/MicrophoneController/releases)
[![CI](https://github.com/Eververdants/MicrophoneController/actions/workflows/build.yml/badge.svg)](https://github.com/Eververdants/MicrophoneController/actions/workflows/build.yml)
[![License](https://img.shields.io/github/license/Eververdants/MicrophoneController)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)](https://github.com/Eververdants/MicrophoneController/releases)

MicrophoneController is a free, open-source desktop app for controlling your microphone: one-click mute, volume and stereo balance, recording-device switching, and global hotkeys — all from a studio-rack-style interface. It is built with Tauri v2 (Rust backend + React 19 frontend) on Windows Core Audio and ships as a single self-contained binary with no third-party `.exe` dependencies.

> **Platform note.** Audio control is implemented against Windows Core Audio (COM) and is fully supported on Windows 10 and Windows 11. The app shell also builds and runs on macOS and Linux, where the audio controls are disabled and reported as unsupported rather than silently doing nothing.

---

## At a Glance

| | |
|---|---|
| What it does | Microphone mute toggle, volume control, device switching, global hotkey |
| Current version | v1.0.0 (Tauri v2 rewrite) |
| Full support | Windows 10 / 11 (Windows Core Audio) |
| Partial support | macOS / Linux (app shell runs, audio controls disabled) |
| UI languages | English and 简体中文, switchable at runtime |
| Themes | Light, dark, or follow the system |
| Config location | `%APPDATA%\MicrophoneController\config.json` |
| License | MIT (free for personal and commercial use) |

## Features

### Mute control

- **One-click mute toggle** — from the window, a global hotkey, or the tray menu
- **Zero-volume mutes** — optionally auto-mute the microphone when the volume slider reaches zero
- **Microphone-in-use detection** — names the applications currently recording from the device

### Volume, balance and gain

- **Volume control** — slider with percentage and dB readout; mouse wheel, arrow keys, and tray menu steps (step size configurable)
- **Stereo balance** — per-channel level control, hidden on mono endpoints
- **Hardware gain range** — the endpoint's real dB window is read and shown, so "100%" is not mistaken for "maximum possible"
- **Volume normalization** — lock a reference level for consistent output

### Device management

- **Device switching** — choose any capture endpoint to control, and see each device's own mute and level
- **Default device switching** — move the Windows default recording device in one click (via the undocumented `IPolicyConfig` COM interface), or control a non-default endpoint without moving the default
- **Device hotplug** — `IMMNotificationClient` callbacks refresh the device list when hardware appears, disappears, or takes over as default

### Feedback and monitoring

- **Tray status icon** — the icon and tooltip reflect the live mute state and level
- **On-screen overlay** — a brief, always-on-top, focus-stealing-free hint at the bottom of the screen when mute or volume changes by hotkey or tray
- **Live input level** — real peak metering (`IAudioMeterInformation`) drawn around the core
- **Background state sync** — a monitor thread picks up mute and volume changes made anywhere (headset button, Windows sound panel, another application) and pushes them to the UI, the tray and the overlay; the interval is configurable

### System integration

- **Global hotkey** — recorded by pressing a combination; a hotkey that cannot be registered is reported in the UI instead of being silently dropped
- **Startup and shutdown** — launch at sign-in, start minimized to tray, close to tray
- **Theme** — light, dark, or follow the system (stays live while on "system")
- **Bilingual UI** — Chinese and English, switchable at runtime
- **Config import / export / reset** — the JSON config in `%APPDATA%` is portable

### Efficiency

- **Metering is demand-driven** — level sampling runs only while the window is on screen and the feature is enabled; hidden to tray means no sampling thread at all
- **No polling faster than it needs** — the device stack is probed once at startup on a worker thread, overlapped with the webview booting, so the first frame is never blocked on COM
- **Studio-rack UI** — concentric core with a live level ring, analogue-style controls, and LED-style status

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop Shell | [Tauri v2](https://v2.tauri.app/) (Rust + system WebView) |
| Audio API | Windows Core Audio via Rust COM (`windows` crate) |
| Global Hotkey | `tauri-plugin-global-shortcut` |
| System Tray | Tauri v2 built-in `TrayIcon` |
| Other plugins | autostart, single-instance, dialog, log |
| Frontend UI | React 19 + TypeScript + Tailwind CSS v4 + Motion |
| Animation | [Motion](https://motion.dev/) (Framer Motion v12+) |
| Installer | Tauri bundler (MSI / DMG / AppImage) |
| Product Website | React 19 + TypeScript + Vite + Tailwind v4 + Motion |
| CI/CD | GitHub Actions |

## Project Structure

```
MicrophoneController/
├── src/                        # React frontend (Vite)
│   ├── components/
│   │   ├── ConcentricCore.tsx  # Mute button + live level ring
│   │   ├── VolumeSlider.tsx
│   │   ├── DeviceSelect.tsx    # Target device + "set as default"
│   │   ├── HotkeyRecorder.tsx  # Press-to-record hotkey input
│   │   ├── Settings.tsx        # Settings view
│   │   ├── TitleBar.tsx        # Self-drawn caption bar
│   │   ├── ThemeToggle.tsx
│   │   ├── LanguageToggle.tsx
│   │   ├── icons.tsx           # Shared SVG icon set
│   │   └── ui/                 # Select / Slider / Toggle primitives
│   ├── hooks/                  # useTauri, useTheme
│   ├── i18n/                   # LanguageContext + zh-CN / en translations
│   ├── styles/                 # Tailwind entry + CSS variables
│   ├── osd.tsx                 # Overlay window entry
│   ├── types.ts
│   ├── App.tsx
│   └── main.tsx
├── osd.html                    # Overlay window document (second Vite entry)
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── main.rs
│   │   ├── audio/              # Core Audio wrapper (Windows)
│   │   │   ├── win.rs          #   endpoints, volume, meter, balance
│   │   │   ├── policy.rs       #   IPolicyConfig — default device switching
│   │   │   ├── sessions.rs     #   which apps hold the microphone
│   │   │   ├── notify.rs       #   IMMNotificationClient hotplug callbacks
│   │   │   └── stub.rs         #   non-Windows stand-ins
│   │   ├── commands/           # audio / config / osd / window handlers
│   │   ├── actions.rs          # Shared user-initiated actions (window/hotkey/tray)
│   │   ├── monitor.rs          # Background state sync + level meter
│   │   ├── status_icon.rs      # Tray icon, rasterised at runtime
│   │   ├── osd.rs              # Overlay window control
│   │   ├── hotkey.rs           # Global-shortcut registration lifecycle
│   │   ├── tray.rs
│   │   └── config.rs
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── capabilities/
├── .github/workflows/build.yml # CI/CD: build + Pages + Release
├── AGENTS.md                   # Project conventions
└── icon.png                    # Application icon
```

The product landing page is not part of this repository; its sources are kept in a companion mirror (`MicrophoneController-website`) and the built page is deployed to GitHub Pages (see [Website](#website)).

## Getting Started

### Prerequisites

- Rust (stable) and the [Tauri v2 system dependencies](https://v2.tauri.app/start/prerequisites/)
- Node 22+ and pnpm

### Development

```bash
git clone https://github.com/Eververdants/MicrophoneController.git
cd MicrophoneController

pnpm install
pnpm tauri dev
```

The app opens a resizable 520x720 window with the studio-rack UI. Minimize to tray to keep it running in the background.

## Building from Source

Desktop binaries are built by GitHub Actions when a version tag is pushed. To build locally:

```bash
pnpm tauri build
```

The installers will be in `src-tauri/target/release/bundle/`.

## Download

Pre-built binaries are available on the [Releases](https://github.com/Eververdants/MicrophoneController/releases) page:

| Platform | File |
|---|---|
| Windows | `MicrophoneController-Windows-<version>.zip` |
| macOS | `MicrophoneController-macOS-<version>.zip` |
| Linux | `MicrophoneController-Linux-<version>.zip` |

## Website

The product landing page is hosted at
**[https://eververdants.github.io/MicrophoneController/](https://eververdants.github.io/MicrophoneController/)**

## FAQ

**Does MicrophoneController work on Windows 10 and Windows 11?**
Yes. Audio control is built directly on Windows Core Audio and works on Windows 10 and Windows 11 without extra drivers or helper programs.

**How do I mute my microphone with a keyboard shortcut?**
Open Settings and record a global hotkey (the default is F8). The hotkey works system-wide — in games, calls, and meetings. If the combination is already taken by another app, MicrophoneController tells you in the UI instead of failing silently.

**Can it change the system default microphone?**
Yes. One click moves the Windows default recording device to another capture endpoint. You can also point the app at a non-default device and control it without changing what Windows considers the default.

**Does it show which apps are using my microphone?**
Yes. MicrophoneController lists the applications that are currently recording from the selected device (via `IAudioSessionManager2`).

**Does it reflect changes made outside the app?**
Yes. A background monitor picks up mute and volume changes made anywhere — a headset button, the Windows sound panel, or another application — and syncs them to the UI, the tray icon, and the on-screen overlay.

**Does it work on macOS or Linux?**
The app shell builds and runs, but microphone control requires Windows Core Audio, so the audio controls are disabled and reported as unsupported on macOS and Linux.

**Where are my settings stored, and can I back them up?**
Settings live in `%APPDATA%\MicrophoneController\config.json` and can be exported, imported, or reset to defaults from the settings view.

**Is it free?**
Yes. MicrophoneController is MIT-licensed open-source software, free for personal and commercial use.

## CI/CD

This project uses GitHub Actions for automated builds and deployment:

| Event | Action |
|---|---|
| Push to `main` | Build website + deploy to GitHub Pages |
| Push tag `v*` | Build desktop (Windows / macOS / Linux) + create GitHub Release |

## Version History

> **Versioning note.** With v1.0.0 (the Tauri v2 release) the project adopted a fresh versioning scheme; all earlier releases are numbered 0.x below.

### v1.0.0 — Tauri v2 Rewrite *(current)*

- Complete rewrite from Python + pywebview to **Tauri v2** (Rust backend + React frontend)
- Windows Core Audio via Rust COM (`windows` crate) — **no third-party .exe dependencies**
- Concentric-circle micro-interaction UI with Motion spring animations
- Light + dark themes with instant, no-flash toggle — plus a "follow the system" mode
- Tailwind CSS v4 styling, system tray, global hotkey, JSON config persistence
- Cross-platform builds (Windows / macOS / Linux) via GitHub Actions + `tauri-action`
- Single self-contained binary — zero external runtime deps
- Product landing page upgraded to Tailwind + Motion + light/dark

**Later 1.0.0 work — the controls became a real monitor rather than a one-way remote:**

- **Default device switching** via the undocumented `IPolicyConfig` interface, plus the ability to control a non-default endpoint without moving the system default
- **Background state sync**: a monitor thread watches the endpoint so external mute and volume changes (headset button, sound panel, other apps) reach the UI, tray and overlay
- **Live peak metering** (`IAudioMeterInformation`) driving a real level ring — the previous "VU meter" was decorative
- **Device hotplug notifications** (`IMMNotificationClient`) and per-device state in the list
- **Tray status icon** rasterised at runtime, with mute/volume menu items
- **Mute/volume overlay** — an always-on-top, non-activating hint window for hotkey and tray actions, for when the main window is behind a game
- **Microphone-in-use detection** (`IAudioSessionManager2`) naming the apps recording
- **Hotkey recorder** with registration failures surfaced in the UI instead of logged
- **Config import / export / reset**, autostart, stereo balance, hardware gain range
- **Demand-driven metering**: level sampling stops when the window is hidden

### v0.3.0 — Native WebView Rewrite

- Complete rewrite from PyQt5 to pywebview for native WebView performance
- All-new studio-rack UI with VU meter, LED indicators, and analog-style controls
- Volume normalization mode — lock a reference level for consistent output
- Real-time background monitoring for external mute changes
- Product landing page built with React 19 + Vite + TypeScript
- Automated CI/CD with cross-platform builds (Windows / macOS / Linux)
- Restructured project layout (app/, website/)
- Config persistence with JSON file in %APPDATA%

### v0.2.1 — CI Automation *(2026-02-04)*

- Automated GitHub Releases on tag push
- Cross-platform artifact upload (Windows / macOS / Linux)

### v0.2.0 — PyQt5 Rewrite *(2026-02-04)*

- Complete rewrite from tkinter to PyQt5
- One-click mute/unmute toggle via pycaw
- Global hotkey support (default: F8)
- Volume slider with zero-mute option
- Microphone device selection
- System tray minimize support
- Bilingual interface (Chinese / English)
- Config persistence via JSON file
- GitHub Actions CI workflow
- MIT License

### v0.1.0 — Initial tkinter Version *(2025-07-14)*

- Initial release with pure tkinter UI
- Basic microphone mute/unmute toggle
- Global hotkey support (default: F8)
- System tray minimize
- Volume slider control

## License

MIT &copy; Eververdants
