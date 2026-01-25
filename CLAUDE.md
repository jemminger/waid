# CLAUDE.md

## For Claude:
- This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.
- this project uses bun

## Project Overview

WAID is a desktop application built with Tauri 2 (Rust backend) and SvelteKit (frontend). It runs as a single-page application — SSR is disabled and the frontend is compiled to static files bundled into the Tauri binary.

## Development Commands

```bash
# Run the app in development mode (starts both Vite dev server and Tauri window)
bun tauri dev

# Build the production app bundle
bun tauri build

# Run Svelte type checking
bun run check

# Frontend-only dev server (no Tauri window, useful for UI work)
bun run dev
```

Note: `tauri.conf.json` uses `bun` for before-dev/before-build commands.

## Architecture

- **Frontend** (`src/`): SvelteKit with `adapter-static`, SSR disabled in `+layout.js`. Vite dev server runs on port 1420 with HMR on 1421.
- **Backend** (`src-tauri/`): Rust application using Tauri 2. Commands are defined in `src-tauri/src/lib.rs` and registered via `invoke_handler`. The crate is named `waid_lib`.
- **IPC**: Frontend calls Rust commands via `@tauri-apps/api` `invoke()`. Rust commands use the `#[tauri::command]` attribute.
- **Plugins**: `tauri-plugin-opener` (OS file/URL opening), `@tauri-apps/plugin-sql` (database access from frontend).
