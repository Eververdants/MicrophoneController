# MicrophoneController

[![GitHub Release](https://img.shields.io/github/v/release/Eververdants/MicrophoneController)](https://github.com/Eververdants/MicrophoneController/releases)
[![License](https://img.shields.io/github/license/Eververdants/MicrophoneController)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)](https://github.com/Eververdants/MicrophoneController/releases)

A lightweight cross-platform desktop tool that lets you control your microphone — mute toggle, volume adjustment, device switching, and global hotkeys — all from a sleek studio-rack-style UI.

> **Platform note.** Audio control is implemented against Windows Core Audio (COM).
> The app shell builds and runs on macOS and Linux, where the audio controls are
> disabled and reported as unsupported rather than silently doing nothing.

---

## Features

### Control

- **One-click mute toggle** — from the window, a global hotkey, or the tray menu
- **Volume control** — slider with percentage and dB readout; mouse wheel, arrow keys, and tray menu steps (step size configurable)
- **Device control** — choose any capture endpoint to control, see each device's own mute and level, and move the Windows default device in one click
- **Stereo balance** — per-channel level control, hidden on mono endpoints
- **Hardware gain range** — the endpoint's real dB window is read and shown, so "100%" is not mistaken for "maximum possible"

### Feedback

- **Tray status icon** — the icon and tooltip reflect the live mute state and level
- **On-screen overlay** — a brief, always-on-top, *focus-stealing-free* hint at the bottom of the screen when mute or volume changes by hotkey or tray
- **Live input level** — real peak metering (`IAudioMeterInformation`) drawn around the core
- **Microphone-in-use detection** — names the applications currently recording from the device

### Behaviour

- **Background state sync** — a monitor thread picks up mute and volume changes made anywhere (headset button, Windows sound panel, another application) and pushes them to the UI, the tray and the overlay. The interval is configurable.
- **Global hotkey** — recorded by pressing a combination; a hotkey that cannot be registered is reported in the UI instead of being silently dropped
- **Device hotplug** — `IMMNotificationClient` callbacks refresh the device list when hardware appears, disappears, or takes over as default
- **Startup and shutdown** — launch at sign-in, start minimized to tray, close to tray
- **Theme** — light, dark, or follow the system (stays live while on "system")
- **Config import / export / reset** — the JSON config in `%APPDATA%` is portable
- **Bilingual UI** — Chinese and English, switchable at runtime
- **Zero-volume mutes** — optionally auto-mute when volume reaches zero
- **Volume normalization** — lock a reference level for consistent output

### Footprint

- **Metering is demand-driven** — level sampling runs only while the window is on screen and the feature is enabled; hidden to a tray means no sampling thread at all
- **No polling faster than it needs** — the device stack is probed once at startup on a worker thread, overlapped with the webview booting, so the first frame is never blocked on COM
- **Studio-rack UI** — concentric core with a live level ring, analogue-style controls, and LED-style status

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop Shell | [Tauri v2](https://v2.tauri.app/) (Rust + system WebView) |
| Audio API | Windows Core Audio via Rust COM (`windows` crate) |
| Global Hotkey | Tauri `global-shortcut` (plugin-ready) |
| System Tray | Tauri built-in `SystemTray` |
| Frontend UI | React 19 + TypeScript + Tailwind CSS v4 + Motion |
| Animation | [Motion](https://motion.dev/) (Framer Motion v12+) |
| Installer | Tauri bundler (MSI / DMG / AppImage) |
| Product Website | React 19 + TypeScript + Vite + Tailwind v4 + Motion |
| CI/CD | GitHub Actions |

## Project Structure

```
MicrophoneController/
├── src/                        # React frontend (Vite)
│   ├── components/             # UI components
│   │   ├── ConcentricCore.tsx  # Mute button + live level ring
│   │   ├── VolumeSlider.tsx
│   │   ├── DeviceSelect.tsx    # Target device + "set as default"
│   │   ├── HotkeyRecorder.tsx  # Press-to-record hotkey input
│   │   ├── Settings.tsx        # Modal settings panel
│   │   ├── TitleBar.tsx        # Self-drawn caption bar
│   │   ├── ThemeToggle.tsx
│   │   └── LanguageToggle.tsx
│   ├── hooks/                  # useTheme, useTauri
│   ├── i18n/                   # translations + context
│   ├── styles/                 # Tailwind entry + CSS variables
│   ├── osd.tsx                 # Overlay window entry
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
│   │   ├── commands/           # Tauri command handlers, one module per domain
│   │   ├── actions.rs          # Shared user-initiated actions (window/hotkey/tray)
│   │   ├── monitor.rs          # Background state sync + level meter
│   │   ├── status_icon.rs      # Tray icon, rasterised at runtime
│   │   ├── osd.rs              # Overlay window control
│   │   ├── hotkey.rs
│   │   ├── tray.rs
│   │   └── config.rs
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── capabilities/
├── website/                    # Product landing page (mirrored to `website` branch)
├── .github/workflows/build.yml # CI/CD: build + Pages + Release
├── AGENTS.md                   # Project conventions
└── icon.png                    # Application icon
```

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

The app opens a 520x720 window with the studio-rack UI. Minimize to tray to keep it running in the background.

### Website (development)

```bash
cd website
pnpm install
pnpm dev
```

Visit [localhost:5173](http://localhost:5173) to preview the landing page.

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

## CI/CD

This project uses GitHub Actions for automated builds and deployment:

| Event | Action |
|---|---|
| Push to `main` | Build website + deploy to GitHub Pages |
| Push tag `v*` | Build desktop (Windows / macOS / Linux) + create GitHub Release |

The product website is hosted at:
**[https://eververdants.github.io/MicrophoneController/](https://eververdants.github.io/MicrophoneController/)**

## Version History

### v4.0.0 — Tauri v2 Rewrite *(current)*
- Complete rewrite from Python + pywebview to **Tauri v2** (Rust backend + React frontend)
- Windows Core Audio via Rust COM (`windows` crate) — **no third-party .exe dependencies**
- Concentric-circle micro-interaction UI with Motion spring animations
- Light + dark themes with instant, no-flash toggle — plus a "follow the system" mode
- Tailwind CSS v4 styling, system tray, global hotkey, JSON config persistence
- Cross-platform builds (Windows / macOS / Linux) via GitHub Actions + `tauri-action`
- Single self-contained binary — zero external runtime deps
- Product landing page upgraded to Tailwind + Motion + light/dark

**Later 4.0.0 work — the controls became a real monitor rather than a one-way remote:**

- **Default device switching** via the undocumented `IPolicyConfig` interface, plus the
  ability to control a non-default endpoint without moving the system default
- **Background state sync**: a monitor thread watches the endpoint so external mute and
  volume changes (headset button, sound panel, other apps) reach the UI, tray and overlay
- **Live peak metering** (`IAudioMeterInformation`) driving a real level ring — the
  previous "VU meter" was decorative
- **Device hotplug notifications** (`IMMNotificationClient`) and per-device state in the list
- **Tray status icon** rasterised at runtime, with mute/volume menu items
- **Mute/volume overlay** — an always-on-top, non-activating hint window for hotkey and
  tray actions, for when the main window is behind a game
- **Microphone-in-use detection** (`IAudioSessionManager2`) naming the apps recording
- **Hotkey recorder** with registration failures surfaced in the UI instead of logged
- **Config import / export / reset**, autostart, stereo balance, hardware gain range
- **Demand-driven metering**: level sampling stops when the window is hidden

### v3.0.0 — Native WebView Rewrite
- Complete rewrite from PyQt5 to pywebview for native WebView performance
- All-new studio-rack UI with VU meter, LED indicators, and analog-style controls
- Volume normalization mode — lock a reference level for consistent output
- Real-time background monitoring for external mute changes
- Product landing page built with React 19 + Vite 8 + TypeScript 6
- Automated CI/CD with cross-platform builds (Windows / macOS / Linux)
- Restructured project layout (app/, website/)
- Config persistence with JSON file in %APPDATA%

### v2.0.1 — CI Automation *(2026-02-04)*
- Automated GitHub Releases on tag push
- Cross-platform artifact upload (Windows / macOS / Linux)

### v2.0.0 — PyQt5 Rewrite *(2026-02-04)*
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

### v1.0.0 — Initial tkinter Version *(2025-07-14)*
- Initial release with pure tkinter UI
- Basic microphone mute/unmute toggle
- Global hotkey support (default: F8)
- System tray minimize
- Volume slider control

## License

MIT &copy; Eververdants
