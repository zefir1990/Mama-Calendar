# Mama Calendar

Shared calendar web application with a React Native (Expo) frontend and a Rust API server. Events are stored in an embedded [redb](https://www.redb.org) database, so no external database service is required.

## Features

- Username and password authentication with `scrypt` password hashing
- Events with description, date, and optional emoji
- `Important Events` view showing events for the next three days
- Light and dark themes
- English and Russian localization
- Static web export deployable to GitHub Pages

## Project structure

```
client/        Expo Router application (web)
server-rust/   Axum API server with redb storage
deploy/        Generated static web build for GitHub Pages
```

## Requirements

- Node.js 20 or newer
- Rust 1.99 or newer
- Chromium installed through Playwright for end-to-end tests
- Docker (optional, for building the Linux server binary)

## Local development

### API server

```powershell
cd server-rust
Copy-Item .env_example .env
cargo run --release
```

Fill in `USERS_MASTER_TOKEN` and `CLEAR_DATABASE_MASTER_TOKEN` in `.env` before starting. The server listens on `http://localhost:3001` and stores data in `data/mama-calendar.redb`.

### Web client

```powershell
cd client
npm install
npm run web
```

The client calls `http://localhost:3001/api` by default. Override it with the `EXPO_PUBLIC_API_URL` environment variable:

```powershell
$env:EXPO_PUBLIC_API_URL = "https://zefir1990.space/mama-calendar/api"
npm run web
```

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `HOST` | `0.0.0.0` | HTTP bind address |
| `PORT` | `3001` | HTTP port |
| `DATABASE_PATH` | `data/mama-calendar.redb` | Path to the redb database file |
| `USERS_MASTER_TOKEN` | Required | Master token for users and auth-token management |
| `CLEAR_DATABASE_MASTER_TOKEN` | Required | Master token for the clear-database route |
| `RUST_LOG` | `info` | Log filter |
| `EXPO_PUBLIC_API_URL` | `http://localhost:3001/api` | API base URL used by the client |

## API

All routes are prefixed with `/api`.

| Method | Path | Authorization |
| --- | --- | --- |
| `GET` | `/health` | Public |
| `GET`, `POST` | `/events` | Bearer auth token |
| `GET`, `PUT`, `DELETE` | `/events/{id}` | Bearer auth token |
| `POST` | `/auth/register` | Public |
| `POST` | `/auth/authorize` | Public |
| `GET`, `POST` | `/users` | `USERS_MASTER_TOKEN` |
| `GET`, `PUT`, `DELETE` | `/users/{id}` | `USERS_MASTER_TOKEN` |
| `GET`, `POST` | `/auth-tokens` | `USERS_MASTER_TOKEN` |
| `GET`, `PUT`, `DELETE` | `/auth-tokens/{id}` | `USERS_MASTER_TOKEN` |
| `DELETE` | `/clear-database` | `CLEAR_DATABASE_MASTER_TOKEN` |

Tokens can be sent as `Authorization: Bearer <token>` or as a `?token=<token>` query parameter.

## Testing

Server unit tests:

```powershell
cd server-rust
cargo test
```

Server API integration tests, with the server running:

```powershell
cd server-rust
$env:TEST_URL = "http://localhost:3001/api"
node --env-file=.env --test tests/api.test.js
```

Client end-to-end tests:

```powershell
cd client
npx playwright install chromium
npm run test:e2e
```

The Playwright suite expects the web build on `http://localhost:8090` and the API on `http://localhost:3001/api`. Override the targets with `TEST_URL` and `API_URL`. The suite reads `CLEAR_DATABASE_MASTER_TOKEN` from `server-rust/.env`.

```powershell
cd client
npx expo export --platform web
npx expo serve --port 8090
```

## Web deployment

The client is configured with `experiments.baseUrl: "/Mama-Calendar"` for GitHub Pages at `https://zefir1990.github.io/Mama-Calendar`.

Build the static site into `deploy/`:

```powershell
cd client
npm run export:deploy
```

The export script sets `EXPO_PUBLIC_API_URL=https://zefir1990.space/mama-calendar/api` and adds `deploy/.nojekyll`, which is required for the `_expo` asset directory on GitHub Pages. Publish the contents of `deploy/` to the GitHub Pages source branch.

## Server deployment

Build a static Linux binary locally with Docker:

```powershell
cd server-rust
docker run --rm -v "${PWD}:/src" -v mama-calendar-target:/src/target -w /src rust:alpine cargo build --release
```

Copy the binary to `/opt/mama-calendar/mama-calendar-server`, create `/opt/mama-calendar/.env` with `HOST=127.0.0.1`, and run the server as a systemd service:

```ini
[Unit]
Description=Mama Calendar API server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=mama-calendar
Group=mama-calendar
WorkingDirectory=/opt/mama-calendar
EnvironmentFile=/opt/mama-calendar/.env
ExecStart=/opt/mama-calendar/mama-calendar-server
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/mama-calendar/data

[Install]
WantedBy=multi-user.target
```

Expose the API over HTTPS through a reverse proxy such as Caddy:

```caddyfile
zefir1990.space {
    handle /mama-calendar/api/* {
        uri strip_prefix /mama-calendar
        reverse_proxy 127.0.0.1:3001
    }

    handle {
        reverse_proxy 127.0.0.1:8090
    }
}
```

The server enables permissive CORS, so the GitHub Pages origin can call the API directly. Keep `HOST=127.0.0.1` and let the reverse proxy terminate TLS on port 443.

## License

MIT. See [LICENSE](LICENSE).
