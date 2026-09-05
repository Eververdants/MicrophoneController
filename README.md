# MicrophoneController

[![GitHub Release](https://img.shields.io/github/v/release/Eververdants/MicrophoneController)](https://github.com/Eververdants/MicrophoneController/releases)
[![License](https://img.shields.io/github/license/Eververdants/MicrophoneController)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)](https://github.com/Eververdants/MicrophoneController/releases)

A lightweight cross-platform desktop tool that lets you control your microphone — mute toggle, volume adjustment, device switching, and global hotkeys — all from a sleek studio-rack-style UI.

---

## Features

- **One-click mute toggle** — instantly mute or unmute your mic
- **Volume control** — fine-tune volume with a slider (percentage and dB readout)
- **Device switching** — switch between multiple capture devices on the fly
- **Global hotkey** — configurable keyboard shortcut (default F8)
- **System tray** — minimize to tray with show/hide/exit menu
- **Background monitoring** — detects external mute changes and pushes updates in real-time
- **Bilingual UI** — Chinese and English, switchable at runtime
- **Zero-volume mutes** — optionally auto-mute when volume reaches zero
- **Volume normalization** — lock a reference level for consistent output
- **Studio-rack UI** — dark theme with VU meter, LED indicator, and analog-style controls

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
│   │   ├── ConcentricCore.tsx  # Concentric-circle motif
│   │   ├── VolumeSlider.tsx
│   │   ├── DeviceSelect.tsx
│   │   ├── Settings.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── LanguageToggle.tsx
│   ├── hooks/                  # useTheme, useTauri
│   ├── i18n/                   # translations + context
│   ├── styles/                 # Tailwind entry + CSS variables
│   ├── App.tsx
│   └── main.tsx
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── main.rs
│   │   ├── audio/              # Core Audio wrapper (Windows)
│   │   ├── hotkey.rs
│   │   ├── tray.rs
│   │   ├── config.rs
│   │   └── commands.rs         # Tauri command handlers
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

- Python 3.11+
- Windows (for audio control via pycaw; macOS/Linux have limited functionality)

### Development

```bash
# Clone the repository
git clone https://github.com/Eververdants/MicrophoneController.git
cd MicrophoneController

# Install Python dependencies
pip install -r app/requirements.txt

# Run the application
python app/app.py
```

The app opens a 520x720 window with the studio-rack UI. Minimize to tray to keep it running in the background.

### Website (development)

```bash
cd website
npm install
npm run dev
```

Visit [localhost:5173](http://localhost:5173) to preview the landing page.

## Building from Source

Desktop binaries are automatically built via GitHub Actions when a version tag is pushed. To build locally:

```bash
pip install -r app/requirements.txt
pyinstaller --noconsole --onefile --name MicrophoneController app/app.py
```

The output will be in the `dist/` directory.

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
- Light + dark themes with instant, no-flash toggle
- Tailwind CSS v4 styling, system tray, global hotkey, JSON config persistence
- Cross-platform builds (Windows / macOS / Linux) via GitHub Actions + `tauri-action`
- Single self-contained binary — zero external runtime deps
- Product landing page upgraded to Tailwind + Motion + light/dark

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
