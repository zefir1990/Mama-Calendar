use axum::http::HeaderMap;
use axum::http::header::AUTHORIZATION;
use serde::Deserialize;

use crate::error::{ApiError, ApiResult};
use crate::state::AppState;

#[derive(Debug, Default, Deserialize)]
pub struct TokenQuery {
    pub token: Option<String>,
}

pub fn require_master_token(
    headers: &HeaderMap,
    query: &TokenQuery,
    expected_token: &str,
) -> ApiResult<()> {
    match extract_token(headers, query) {
        Some(token) if token == expected_token => Ok(()),
        _ => Err(ApiError::Unauthorized),
    }
}

pub async fn require_auth_token(
    state: &AppState,
    headers: &HeaderMap,
    query: &TokenQuery,
) -> ApiResult<String> {
    let token = extract_token(headers, query).ok_or(ApiError::Unauthorized)?;
    let auth_token = state
        .storage
        .find_auth_token(&token)?
        .ok_or(ApiError::Unauthorized)?;

    Ok(auth_token.user_id)
}

fn extract_token(headers: &HeaderMap, query: &TokenQuery) -> Option<String> {
    let header_token = headers
        .get(AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .map(|value| value.replacen("Bearer ", "", 1))
        .filter(|value| !value.is_empty());

    header_token.or_else(|| query.token.clone().filter(|value| !value.is_empty()))
}
