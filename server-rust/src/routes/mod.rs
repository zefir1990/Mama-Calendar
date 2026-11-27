pub mod auth;
pub mod auth_tokens;
pub mod clear_database;
pub mod events;
pub mod health;
pub mod users;

use axum::Json;
use axum::Router;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::{delete, get, post};
use serde_json::json;
use tower_http::cors::CorsLayer;

use crate::state::AppState;

pub fn build(state: AppState) -> Router {
    Router::new()
        .route("/api/health", get(health::health))
        .route("/api/events", get(events::list).post(events::create))
        .route(
            "/api/events/{id}",
            get(events::get).put(events::update).delete(events::delete),
        )
        .route("/api/users", get(users::list).post(users::create))
        .route(
            "/api/users/{id}",
            get(users::get).put(users::update).delete(users::delete),
        )
        .route("/api/auth/register", post(auth::register))
        .route("/api/auth/authorize", post(auth::authorize))
        .route(
            "/api/auth-tokens",
            get(auth_tokens::list).post(auth_tokens::create),
        )
        .route(
            "/api/auth-tokens/{id}",
            get(auth_tokens::get)
                .put(auth_tokens::update)
                .delete(auth_tokens::delete),
        )
        .route("/api/clear-database", delete(clear_database::clear))
        .fallback(not_found)
        .layer(CorsLayer::permissive())
        .with_state(state)
}

async fn not_found() -> impl IntoResponse {
    (StatusCode::NOT_FOUND, Json(json!({ "error": "Not found" })))
}
