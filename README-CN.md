# MicrophoneController

[English](./README.md) | **简体中文**

[![GitHub Release](https://img.shields.io/github/v/release/Eververdants/MicrophoneController)](https://github.com/Eververdants/MicrophoneController/releases)
[![CI](https://github.com/Eververdants/MicrophoneController/actions/workflows/build.yml/badge.svg)](https://github.com/Eververdants/MicrophoneController/actions/workflows/build.yml)
[![License](https://img.shields.io/github/license/Eververdants/MicrophoneController)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)](https://github.com/Eververdants/MicrophoneController/releases)

MicrophoneController 是一款免费开源的桌面麦克风控制工具：一键静音、音量与声道平衡调节、录音设备切换、全局快捷键，全部集成在录音室机架风格的精致界面中。它基于 Tauri v2（Rust 后端 + React 19 前端）与 Windows Core Audio 构建，以单个自包含二进制发布，不依赖任何第三方 `.exe` 外部程序。

> **平台说明。** 音频控制基于 Windows Core Audio（COM）实现，在 Windows 10 和 Windows 11 上获得完整支持。应用外壳同样可在 macOS 和 Linux 上构建运行，但音频控件会被禁用并明确提示"不支持"，而不是静默失效。

---

## 一览

| | |
|---|---|
| 核心功能 | 麦克风一键静音、音量控制、录音设备切换、全局快捷键 |
| 当前版本 | v1.0.0（Tauri v2 重写版） |
| 完整支持 | Windows 10 / 11（Windows Core Audio） |
| 部分支持 | macOS / Linux（应用外壳可运行，音频控件禁用） |
| 界面语言 | 简体中文与 English，运行时可切换 |
| 主题 | 浅色、深色，或跟随系统 |
| 配置文件 | `%APPDATA%\MicrophoneController\config.json` |
| 开源协议 | MIT（个人与商业用途均免费） |

## 功能特点

### 静音控制

- **一键静音切换** — 可从主窗口、全局快捷键或托盘菜单即时静音或开启麦克风
- **归零静音** — 可选：音量滑块拖到零时自动静音
- **占用检测** — 显示当前正在录音的应用程序列表

### 音量、平衡与增益

- **音量控制** — 滑块精细调节，实时显示百分比和 dB 值；支持鼠标滚轮、方向键和托盘菜单步进（步长可配置）
- **立体声平衡** — 左右声道独立调节，单声道设备自动隐藏
- **硬件增益范围** — 读取设备真实的 dB 调节窗口，避免把 "100%" 误当成"最大可能音量"
- **音量归一化** — 锁定参考音量，输出始终一致

### 设备管理

- **设备切换** — 选择任意采集设备进行控制，并查看各设备自身的静音状态与电平
- **默认设备切换** — 一键移动 Windows 默认录音设备（通过未公开的 `IPolicyConfig` COM 接口），也可在不改变系统默认的情况下控制非默认设备
- **设备热插拔** — `IMMNotificationClient` 回调实时刷新设备列表，响应硬件接入、移除或接管默认

### 反馈与监控

- **托盘状态图标** — 图标与提示实时反映静音状态和电平
- **屏幕提示浮层** — 快捷键或托盘操作后，屏幕底部短暂显示始终置顶、不抢焦点的状态提示
- **实时输入电平** — 真实峰值计量（`IAudioMeterInformation`）环绕核心显示
- **后台状态同步** — 监控线程捕获来自任何位置的静音/音量变化（耳机按键、Windows 声音面板、其他应用），同步到界面、托盘和浮层；轮询间隔可配置

### 系统集成

- **全局快捷键** — 按键组合直接录制；注册失败时在界面中明确报告，而不是静默丢弃
- **启动与退出** — 开机自启、启动即最小化到托盘、关闭最小化到托盘
- **主题** — 浅色、深色，或跟随系统（"跟随系统"下实时切换）
- **双语界面** — 中英文运行时切换，无需重启
- **配置导入 / 导出 / 重置** — `%APPDATA%` 中的 JSON 配置完全可移植

### 资源占用

- **按需计量** — 仅当窗口在屏幕上且功能启用时才采样电平；隐藏到托盘后完全不运行采样线程
- **绝不多余轮询** — 设备栈在启动时由工作线程探测一次，与 WebView 启动并行，首帧永远不会阻塞在 COM 上
- **录音室机架 UI** — 同心圆核心 + 实时电平环、模拟风格控件与 LED 状态指示

## 技术栈

| 层次 | 技术 |
|---|---|
| 桌面外壳 | [Tauri v2](https://v2.tauri.app/)（Rust + 系统 WebView）|
| 音频 API | Windows Core Audio，经 Rust COM（`windows` crate）|
| 全局快捷键 | `tauri-plugin-global-shortcut` |
| 系统托盘 | Tauri v2 内置 `TrayIcon` |
| 其他插件 | autostart、single-instance、dialog、log |
| 前端 UI | React 19 + TypeScript + Tailwind CSS v4 + Motion |
| 动画 | [Motion](https://motion.dev/)（Framer Motion v12+）|
| 打包工具 | Tauri bundler（MSI / DMG / AppImage）|
| 产品官网 | React 19 + TypeScript + Vite + Tailwind v4 + Motion |
| CI/CD | GitHub Actions |

## 项目结构

```
MicrophoneController/
├── src/                        # React 前端（Vite）
│   ├── components/
│   │   ├── ConcentricCore.tsx  # 静音按钮 + 实时电平环
│   │   ├── VolumeSlider.tsx
│   │   ├── DeviceSelect.tsx    # 目标设备 + "设为默认"
│   │   ├── HotkeyRecorder.tsx  # 按键录制式快捷键输入
│   │   ├── Settings.tsx        # 设置视图
│   │   ├── TitleBar.tsx        # 自绘标题栏
│   │   ├── ThemeToggle.tsx
│   │   ├── LanguageToggle.tsx
│   │   ├── icons.tsx           # 共享 SVG 图标集
│   │   └── ui/                 # Select / Slider / Toggle 基础控件
│   ├── hooks/                  # useTauri、useTheme
│   ├── i18n/                   # LanguageContext + zh-CN / en 翻译
│   ├── styles/                 # Tailwind 入口 + CSS 变量
│   ├── osd.tsx                 # 浮层窗口入口
│   ├── types.ts
│   ├── App.tsx
│   └── main.tsx
├── osd.html                    # 浮层窗口文档（Vite 第二入口）
├── src-tauri/                  # Rust 后端
│   ├── src/
│   │   ├── main.rs
│   │   ├── audio/              # Core Audio 封装（Windows）
│   │   │   ├── win.rs          #   端点、音量、计量、平衡
│   │   │   ├── policy.rs       #   IPolicyConfig — 默认设备切换
│   │   │   ├── sessions.rs     #   哪些应用占用着麦克风
│   │   │   ├── notify.rs       #   IMMNotificationClient 热插拔回调
│   │   │   └── stub.rs         #   非 Windows 平台替身
│   │   ├── commands/           # audio / config / osd / window 命令处理器
│   │   ├── actions.rs          # 共享的用户操作（窗口/快捷键/托盘）
│   │   ├── monitor.rs          # 后台状态同步 + 电平采样
│   │   ├── status_icon.rs      # 托盘图标，运行时栅格化
│   │   ├── osd.rs              # 浮层窗口控制
│   │   ├── hotkey.rs           # 全局快捷键注册生命周期
│   │   ├── tray.rs
│   │   └── config.rs
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── capabilities/
├── .github/workflows/build.yml # CI/CD: 构建 + Pages + Release
├── AGENTS.md                   # 项目约定
└── icon.png                    # 应用图标
```

产品官网源码位于本仓库的 [`website` 分支](https://github.com/Eververdants/MicrophoneController/tree/website)，构建后的页面部署到 GitHub Pages（见[产品官网](#产品官网)）。

## 快速开始

### 环境要求

- Rust（stable）以及 [Tauri v2 系统依赖](https://v2.tauri.app/start/prerequisites/)
- Node 22+ 与 pnpm

### 开发模式

```bash
git clone https://github.com/Eververdants/MicrophoneController.git
cd MicrophoneController

pnpm install
pnpm tauri dev
```

应用将打开一个 520x720（可缩放）的录音室风格窗口。最小化到托盘可在后台继续运行。

## 源码构建

推送版本标签时，GitHub Actions 会自动构建桌面端二进制文件。如需本地构建：

```bash
pnpm tauri build
```

构建产物在 `src-tauri/target/release/bundle/` 目录中。

## 下载安装

预编译的二进制文件可在 [Releases](https://github.com/Eververdants/MicrophoneController/releases) 页面下载：

| 平台 | 文件 |
|---|---|
| Windows | `MicrophoneController-Windows-<version>.zip` |
| macOS | `MicrophoneController-macOS-<version>.zip` |
| Linux | `MicrophoneController-Linux-<version>.zip` |

下载解压后直接运行可执行文件即可。

## 产品官网

产品官网部署于
**[https://eververdants.github.io/MicrophoneController/](https://eververdants.github.io/MicrophoneController/)**

## 常见问题

**MicrophoneController 支持 Windows 10 和 Windows 11 吗？**
支持。音频控制直接构建在 Windows Core Audio 之上，在 Windows 10 和 Windows 11 上无需额外驱动或辅助程序即可工作。

**如何用键盘快捷键静音麦克风？**
在设置中录制全局快捷键（默认 F8）。该快捷键全系统生效——游戏、通话、会议中均可使用。如果组合键已被其他应用占用，MicrophoneController 会在界面中明确告知，而不是静默失败。

**它能更改系统默认麦克风吗？**
可以。一键即可将 Windows 默认录音设备切换到其他采集端点；也可以让应用指向非默认设备进行控制，而不改变系统认定的默认设备。

**它能显示哪些应用正在使用麦克风吗？**
可以。MicrophoneController 会列出当前正在所选设备上录音的应用程序（基于 `IAudioSessionManager2`）。

**它能感知应用外部的静音变化吗？**
可以。后台监控线程捕获来自任何位置的静音/音量变化——耳机按键、Windows 声音面板或其他应用——并同步到界面、托盘图标和屏幕浮层。

**macOS 或 Linux 上能用吗？**
应用外壳可以构建运行，但麦克风控制依赖 Windows Core Audio，因此在 macOS 和 Linux 上音频控件被禁用并提示不支持。

**设置保存在哪里，可以备份吗？**
设置保存在 `%APPDATA%\MicrophoneController\config.json`，可在设置视图中导出、导入或恢复默认。

**它免费吗？**
免费。MicrophoneController 基于 MIT 协议开源，个人与商业用途均可免费使用。

## 持续集成

本项目使用 GitHub Actions 实现自动化构建和部署：

| 事件 | 操作 |
|---|---|
| 推送到 `main` 分支 | 构建官网并部署到 GitHub Pages |
| 推送 `v*` 标签 | 构建桌面端（Windows / macOS / Linux）并创建 GitHub Release |

## 版本历史

> **版本说明。** 自 v1.0.0（Tauri v2 版）起项目启用全新的版本编号方案，此前的版本在下文中按 0.x 记录。

### v1.0.0 — Tauri v2 重写 *(当前版本)*

- 从 Python + pywebview 完全重写为 **Tauri v2**（Rust 后端 + React 前端）
- 经 Rust COM（`windows` crate）访问 Windows Core Audio — **不依赖任何第三方 .exe**
- 同心圆微交互 UI，Motion 弹簧动画
- 浅色 + 深色主题即时无闪烁切换，另支持"跟随系统"模式
- Tailwind CSS v4 样式、系统托盘、全局快捷键、JSON 配置持久化
- 经 GitHub Actions + `tauri-action` 跨平台构建（Windows / macOS / Linux）
- 单个自包含二进制 — 零外部运行时依赖
- 产品官网升级为 Tailwind + Motion + 浅色/深色主题

**v1.0.0 后续迭代 — 控制从"单向遥控"进化为"真正的监视器"：**

- **默认设备切换**，经由未公开的 `IPolicyConfig` 接口；还可在不移动系统默认的情况下控制非默认端点
- **后台状态同步**：监控线程盯守端点，外部静音/音量变化（耳机按键、声音面板、其他应用）实时到达界面、托盘和浮层
- **实时峰值计量**（`IAudioMeterInformation`）驱动真实电平环 — 此前的 "VU 电平条" 只是装饰
- **设备热插拔通知**（`IMMNotificationClient`）与列表内各设备状态
- **托盘状态图标**运行时栅格化，含静音/音量菜单项
- **静音/音量浮层** — 始终置顶、不激活的提示窗口，主窗口被游戏遮挡时也能看到操作反馈
- **麦克风占用检测**（`IAudioSessionManager2`）列出正在录音的应用
- **快捷键录制器**，注册失败直接反映在界面中而不是日志里
- **配置导入 / 导出 / 重置**、开机自启、立体声平衡、硬件增益范围
- **按需计量**：窗口隐藏后电平采样自动停止

### v0.3.0 — 原生 WebView 重写

- 从 PyQt5 完全重写为 pywebview，获得原生 WebView 性能
- 全新录音室机架 UI，含 VU 电平条、LED 指示灯和模拟风格控件
- 音量归一化模式 — 锁定参考音量，输出始终一致
- 后台实时监控，自动检测系统外部静音变更
- 产品官网，基于 React 19 + Vite + TypeScript 构建
- 自动化 CI/CD，支持三平台构建（Windows / macOS / Linux）
- 项目结构重构（app/, website/）
- 配置文件持久化到 %APPDATA% 目录

### v0.2.1 — CI 自动化 *(2026-02-04)*

- 标签推送时自动创建 GitHub Release
- 跨平台构建产物自动上传（Windows / macOS / Linux）

### v0.2.0 — PyQt5 重写 *(2026-02-04)*

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

### v0.1.0 — 初始 tkinter 版本 *(2025-07-14)*

- 基于纯 tkinter 的首个版本
- 麦克风基本静音/开启切换
- 全局快捷键支持（默认 F8）
- 系统托盘最小化
- 音量滑块控制

## 开源协议

MIT &copy; Eververdants
