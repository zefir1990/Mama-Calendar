# Mama Calendar Server (Rust)

Rust implementation of the Mama Calendar API using [Axum](https://github.com/tokio-rs/axum) and the embedded [redb](https://www.redb.org) database.

It preserves the original Mama Calendar API contract:

- The same endpoints and response shapes
- The same `salt:scrypt-hash` password format
- No external database service; data is stored in a single redb file

## Requirements

- Rust 1.99 or newer

## Setup

Create the local environment file and fill in the tokens:

```powershell
Copy-Item .env_example .env
```

The server loads `.env` automatically.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `HOST` | `0.0.0.0` | HTTP bind address |
| `PORT` | `3001` | HTTP port |
| `DATABASE_PATH` | `data/mama-calendar.redb` | Path to the redb database file |
| `USERS_MASTER_TOKEN` | Required | Master token for the users and auth-token management routes |
| `CLEAR_DATABASE_MASTER_TOKEN` | Required | Master token for the clear-database route |
| `RUST_LOG` | `info` | Log filter |

## Running

```powershell
cargo run --release
```

The database is stored at the path configured by `DATABASE_PATH`.

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

Tokens can be supplied as `Authorization: Bearer <token>` or as a `?token=<token>` query parameter.

## Testing

Unit tests:

```powershell
cargo test
```

The complete API contract can be verified with the integration suite while the Rust server is running. Node.js is only required for the test runner:

```powershell
$env:TEST_URL = "http://localhost:3001/api"
node --env-file=.env --test tests/api.test.js
```
