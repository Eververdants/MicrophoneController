# MicrophoneController

[![GitHub Release](https://img.shields.io/github/v/release/Eververdants/MicrophoneController)](https://github.com/Eververdants/MicrophoneController/releases)
[![License](https://img.shields.io/github/license/Eververdants/MicrophoneController)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)](https://github.com/Eververdants/MicrophoneController/releases)

一款轻量级跨平台桌面工具，帮助你快速控制麦克风——静音切换、音量调节、设备切换、全局快捷键，一切尽在录音室机架风格的精致界面中。

---

## 功能特点

- **一键静音切换** — 即时静音或开启麦克风
- **音量控制** — 滑块精细调节，实时显示百分比和 dB 值
- **设备切换** — 在多个采集设备间自由切换
- **全局快捷键** — 可自定义键盘快捷键（默认 F8）
- **系统托盘** — 最小化到托盘，支持显示/隐藏/退出菜单
- **后台监控** — 实时检测系统级静音变更并推送更新
- **双语界面** — 中英文实时切换，无需重启
- **音量归零静音** — 音量滑到零时自动静音
- **音量归一化** — 锁定参考音量，输出始终一致
- **录音室机架 UI** — 深色主题，VU 电平条、LED 指示灯、模拟风格控件

## 技术栈

| 层次 | 技术 |
|---|---|
| 桌面外壳 | [pywebview](https://github.com/r0x0r/pywebview)（系统原生 WebView）|
| 音频 API | [pycaw](https://github.com/AndreMiras/pycaw)（Windows Core Audio）|
| 全局快捷键 | [keyboard](https://github.com/boppreh/keyboard) |
| 系统托盘 | [pystray](https://github.com/moses-palmer/pystray) |
| 图片处理 | [Pillow](https://python-pillow.org/) |
| 前端 UI | HTML + CSS + 原生 JavaScript |
| 打包工具 | [PyInstaller](https://pyinstaller.org/) |
| 产品官网 | React 19 + TypeScript 6 + Vite 8 + Framer Motion 12 |
| CI/CD | GitHub Actions |

## 项目结构

```
MicrophoneController/
├── app/                        # 桌面应用
│   ├── app.py                  # 主入口 (pywebview 窗口 + 托盘)
│   ├── config_store.py         # 配置持久化 (dataclass + JSON)
│   ├── mic_service.py          # 麦克风控制 (pycaw)
│   ├── requirements.txt        # Python 依赖
│   └── frontend/               # 内置 Web UI
│       ├── index.html          # 录音室机架界面
│       ├── app.js              # 前端逻辑 + 国际化
│       └── style.css           # 深色主题样式
├── website/                    # 产品官网
│   ├── src/                    # React 组件
│   └── package.json            # Node 依赖
├── .github/workflows/build.yml # CI/CD: 构建 + Pages + Release
└── icon.png                    # 应用图标
```

## 快速开始

### 环境要求

- Python 3.11+
- Windows（音频控制依赖 pycaw/Windows Core Audio；macOS/Linux 功能受限）

### 开发模式

```bash
# 克隆仓库
git clone https://github.com/Eververdants/MicrophoneController.git
cd MicrophoneController

# 安装 Python 依赖
pip install -r app/requirements.txt

# 运行应用
python app/app.py
```

应用将打开一个 520x720 的录音室风格窗口。最小化到托盘可在后台继续运行。

### 官网（开发模式）

```bash
cd website
npm install
npm run dev
```

访问 [localhost:5173](http://localhost:5173) 预览产品官网界面。

## 源码构建

推送版本标签时，GitHub Actions 会自动构建桌面端二进制文件。如需本地构建：

```bash
pip install -r app/requirements.txt
pyinstaller --noconsole --onefile --name MicrophoneController app/app.py
```

构建产物在 `dist/` 目录中。

## 下载安装

预编译的二进制文件可在 [Releases](https://github.com/Eververdants/MicrophoneController/releases) 页面下载：

| 平台 | 文件 |
|---|---|
| Windows | `MicrophoneController-Windows-<version>.zip` |
| macOS | `MicrophoneController-macOS-<version>.zip` |
| Linux | `MicrophoneController-Linux-<version>.zip` |

下载解压后直接运行可执行文件即可。

## 持续集成

本项目使用 GitHub Actions 实现自动化构建和部署：

| 事件 | 操作 |
|---|---|
| 推送到 `main` 分支 | 构建官网并部署到 GitHub Pages |
| 推送 `v*` 标签 | 构建桌面端（Windows / macOS / Linux）并创建 GitHub Release |

产品官网地址：
**[https://eververdants.github.io/MicrophoneController/](https://eververdants.github.io/MicrophoneController/)**

## 版本历史

### v3.0.0 — 原生 WebView 重写 *(当前版本)*
- 从 PyQt5 完全重写为 pywebview，获得原生 WebView 性能
- 全新录音室机架 UI，含 VU 电平条、LED 指示灯和模拟风格控件
- 音量归一化模式 — 锁定参考音量，输出始终一致
- 后台实时监控，自动检测系统外部静音变更
- 产品官网，基于 React 19 + Vite 8 + TypeScript 6 构建
- 自动化 CI/CD，支持三平台构建（Windows / macOS / Linux）
- 项目结构重构（app/, website/）
- 配置文件持久化到 %APPDATA% 目录

### v2.0.1 — CI 自动化 *(2026-02-04)*
- 标签推送时自动创建 GitHub Release
- 跨平台构建产物自动上传（Windows / macOS / Linux）

### v2.0.0 — PyQt5 重写 *(2026-02-04)*
- 从 tkinter 完全重写为 PyQt5
- 一键静音/开启切换（pycaw）
- 全局快捷键支持（默认 F8）
- 音量滑块与归零静音
- 麦克风设备选择
- 系统托盘最小化支持
- 中英文双语界面
- JSON 配置文件持久化
- GitHub Actions CI 工作流
- MIT 开源协议

### v1.0.0 — 初始 tkinter 版本 *(2025-07-14)*
- 基于纯 tkinter 的首个版本
- 麦克风基本静音/开启切换
- 全局快捷键支持（默认 F8）
- 系统托盘最小化
- 音量滑块控制

## 开源协议

MIT &copy; Eververdants
