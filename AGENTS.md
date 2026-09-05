# AGENTS.md — MicrophoneController

Project conventions for contributors and AI agents. Keep this file short; link out for depth.

---

## 1. What This Is

MicrophoneController — a lightweight cross-platform desktop tool for microphone control (mute, volume, device switching, global hotkeys). Built with **Tauri v2** (Rust backend + React frontend).

Audio backend is **Windows-only** (Core Audio via COM). macOS/Linux build the shell but degrade audio controls gracefully.

---

## 2. Stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri v2 |
| Backend | Rust 2021, `windows` crate (Core Audio COM) |
| Frontend | React 19, TypeScript 5, Vite 8 |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Animation | `motion` (Framer Motion v12+) |
| State | React hooks + Tauri commands (no Redux/Zustand) |
| Config | JSON file in `%APPDATA%\MicrophoneController\config.json` |
| i18n | Custom React context (zh-CN, en) |
| Package manager | pnpm (preferred) or npm |

---

## 3. Repo Layout

```
src/            React frontend (Vite entry)
src-tauri/      Rust backend (Tauri commands, audio, hotkey, tray, config)
website/        Product landing page (separate Vite app)
.github/        CI/CD workflows
icon.png        Source icon (used for app + tauri icons)
```

---

## 4. Code Style

### TypeScript / React

- Functional components only. No class components.
- Hooks for state. Keep component state local; lift only when shared across siblings.
- File names: `PascalCase.tsx` for components, `camelCase.ts` for hooks/utils.
- Co-locate tests next to source: `Component.test.tsx`.
- No `any` without a comment justifying why. Prefer `unknown` + type guard.
- Tailwind utility classes for styling; no CSS modules or styled-components.
- Motion components (`<motion.div>`) for animation — no raw CSS transitions for interactive motion.
- Theme via `[data-theme="dark"]` on `<html>` — use CSS variables, never hardcode colors.

### Rust

- Edition 2021. `cargo fmt` on save. `cargo clippy` clean (warnings denied in CI).
- Error handling: `thiserror` for library errors, `?` propagation in commands, `Result<T, String>` crossing the Tauri boundary.
- Audio module: COM apartment-threaded. Document unsafe blocks.
- Commands: one file per domain (`commands/audio.rs`, `commands/config.rs`, etc.) registered in `main.rs`.

### General

- One concern per file. If a file exceeds ~300 lines, consider splitting.
- Comments explain *why*, not *what*. No commented-out code in commits.
- No debug `console.log` / `println!` in committed code (use `log` crate + `tauri-plugin-log`).

---

## 5. Commit Conventions

Conventional Commits. Small, logical commits — **never** dump the whole project in one.

```
feat:      new feature
fix:       bug fix
refactor:  behavior-preserving change
docs:      docs / comments
build:     build system / deps
ci:        CI/CD config
chore:     misc (deps bump, formatting)
```

Scope optional but encouraged: `feat(audio): add device enumeration`.

Each commit compiles. `cargo check` + `tsc --noEmit` must pass before push.

---

## 6. Branching

- `main` — stable, deployable. Protected.
- `website` — product landing page sources (lives in sync with `website/` folder, mirrored to `Projects/MicrophoneController-website`).
- Feature branches: `feat/<short-slash-name>`.
- Bug fixes: `fix/<short-slash-name>`.

Tags: `v<semver>` trigger desktop build + release.

---

## 7. CI/CD

| Trigger | Action |
|---|---|
| Push to `main` | Build website → deploy to GitHub Pages |
| Push tag `v*` | Build desktop (win/mac/linux) → GitHub Release |

CI must pass before merge. See `.github/workflows/`.

---

## 8. Development Setup

```bash
# Prereqs: Rust (stable), Node 22+, pnpm, system deps for tauri (see tauri book)

# Frontend + Tauri dev
pnpm install
pnpm tauri dev

# Website only
cd website
pnpm install
pnpm dev
```

---

## 9. Testing

- Frontend: Vitest + React Testing Library. `pnpm test`.
- Rust: `cargo test`.
- E2E: Playwright (when added).
- Coverage gate: not yet enforced; aim for >70% on new code.

---

## 10. Out of Bounds

Do **not** add:

- Third-party `.exe` dependencies (AutoHotkey, nircmd, EarTrumpet, etc.).
- New audio frameworks beyond Windows Core Audio (keep it native).
- Heavy state libraries (Redux, MobX, Zustand) — hooks + commands suffice.
- Feature creep beyond v3.0.0 parity unless explicitly requested.

---

## 11. External References

- [Tauri v2 Book](https://v2.tauri.app/start/)
- [windows crate docs](https://docs.rs/windows/latest/windows/)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [Motion](https://motion.dev/docs)
- [React 19](https://react.dev)
