# Agent Guide

## Project layout

- `client/` — Expo SDK 57 application (React Native Web, Expo Router, TypeScript)
- `server-rust/` — Axum API server with embedded redb storage
- `deploy/` — generated static web build for GitHub Pages; do not edit by hand
- `README.md` — user-facing setup, API, testing, and deployment documentation

## Commands

### Server

```powershell
cd server-rust
cargo build --release
cargo run --release
cargo test
```

Integration tests require a running server:

```powershell
$env:TEST_URL = "http://localhost:3001/api"
node --env-file=.env --test tests/api.test.js
```

### Client

```powershell
cd client
npm install
npm run web
npx tsc --noEmit
npm run test:e2e
npm run export:deploy
```

End-to-end tests expect the API on `http://localhost:3001/api` and the web build on `http://localhost:8090`. The Playwright config loads tokens from `server-rust/.env`.

### Deploy export

```powershell
cd client
npm run export:deploy
```

This writes `deploy/` with base path `/Mama-Calendar`, API base `https://zefir1990.space/mama-calendar/api`, and `.nojekyll`. Regenerate it after any client change that affects production.

## Architecture

### Client

- Routes live in `client/src/app`; Expo Router owns navigation.
- Contexts: `auth-context.tsx` for session state, `event-context.tsx` for event CRUD.
- API calls live in `client/src/api`; always build URLs from `API_BASE` in `client/src/api/config.ts`.
- The API base is configured through `EXPO_PUBLIC_API_URL`; never hardcode it in individual modules.
- Localization strings live in `client/src/localization/locales`; add both `en` and `ru` entries.
- The Events screen has two tabs: `Important Events` (events in the next three days) and `Enter Info / View`. The add button only exists on `Enter Info / View`.

### Server

- `src/routes` contains handlers; register new routes in `src/routes/mod.rs`.
- `src/models` contains serializable domain types.
- `src/storage.rs` owns all redb access.
- `src/config.rs` reads environment variables; keep `.env_example` and `README.md` in sync.
- `src/auth.rs` handles bearer tokens and master-token checks.
- CORS is permissive by design so the static web client can call the API directly.

## Conventions

- Follow the global style rules: strict typing, no code comments, clean decomposition, SOLID, DRY.
- Use native language and framework libraries before adding dependencies.
- Keep `client/src/api` free of duplicated base URLs and request boilerplate.
- Do not commit secrets. `.env` files are ignored; use `.env_example` as the template.
- Do not edit generated artifacts in `deploy/` or `client/dist`; rebuild them.

## Environment notes

- Web port `8080` is occupied by Docker on this machine; use `8090` for the static build.
- GitHub Pages serves `/events` from `events.html`. When previewing locally, use a server with extensionless `.html` fallback; plain `python -m http.server` returns 404 for `/events`.
- If a Windows GNU Rust build fails with `dlltool.exe: program not found`, prepend `C:\mingw64\bin` to `PATH`.
- The server binds `HOST` (default `0.0.0.0`). In production set `HOST=127.0.0.1` and expose it through Caddy.
- `client/AGENTS.md` requires consulting the Expo SDK 57 documentation before changing Expo code.

## Verification

- Client changes: run `npx tsc --noEmit` and `npm run test:e2e` when behavior changes.
- Server changes: run `cargo test` and the API integration suite.
- Deployment changes: rebuild `deploy/` and verify the health endpoint and CORS preflight over HTTPS.
