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
| Desktop Shell | [pywebview](https://github.com/r0x0r/pywebview) (system WebView) |
| Audio API | [pycaw](https://github.com/AndreMiras/pycaw) (Windows Core Audio) |
| Global Hotkey | [keyboard](https://github.com/boppreh/keyboard) |
| System Tray | [pystray](https://github.com/moses-palmer/pystray) |
| Image Processing | [Pillow](https://python-pillow.org/) |
| Frontend UI | HTML + CSS + vanilla JavaScript |
| Installer | [PyInstaller](https://pyinstaller.org/) |
| Product Website | React 19 + TypeScript 6 + Vite 8 + Framer Motion 12 |
| CI/CD | GitHub Actions |

## Project Structure

```
MicrophoneController/
├── app/                        # Desktop application
│   ├── app.py                  # Entry point (pywebview window + tray)
│   ├── config_store.py         # Persistent config (dataclass + JSON)
│   ├── mic_service.py          # Microphone control via pycaw
│   ├── requirements.txt        # Python dependencies
│   └── frontend/               # Built-in web UI
│       ├── index.html          # Studio-rack-style interface
│       ├── app.js              # Frontend logic + i18n
│       └── style.css           # Dark theme (844 lines)
├── website/                    # Product landing page
│   ├── src/                    # React components
│   └── package.json            # Node dependencies
├── .github/workflows/build.yml # CI/CD: build + Pages + Release
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

### v3.0.0 — Native WebView Rewrite *(current)*
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
