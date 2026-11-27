use axum::Json;
use axum::extract::{Path, Query, State};
use axum::http::{HeaderMap, StatusCode};
use serde::Deserialize;
use serde_json::Value;

use crate::auth::{self, TokenQuery};
use crate::error::{ApiError, ApiResult};
use crate::identifier;
use crate::javascript;
use crate::models::auth_token::{AuthTokenDocument, AuthTokenResponse, AuthTokenUpdate};
use crate::state::AppState;
use crate::timestamp;

#[derive(Debug, Deserialize)]
pub struct AuthTokenPayload {
    pub token: Option<Value>,
    #[serde(rename = "userId")]
    pub user_id: Option<Value>,
}

pub async fn list(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<TokenQuery>,
) -> ApiResult<Json<Vec<AuthTokenResponse>>> {
    auth::require_master_token(&headers, &query, &state.users_master_token)?;
    let auth_tokens = state.storage.list_auth_tokens()?;

    Ok(Json(
        auth_tokens
            .into_iter()
            .map(AuthTokenDocument::into_response)
            .collect(),
    ))
}

pub async fn get(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<TokenQuery>,
    Path(id): Path<String>,
) -> ApiResult<Json<AuthTokenResponse>> {
    auth::require_master_token(&headers, &query, &state.users_master_token)?;
    let auth_token = state
        .storage
        .get_auth_token(&id)?
        .ok_or(ApiError::NotFound("Auth token not found"))?;

    Ok(Json(auth_token.into_response()))
}

pub async fn create(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<TokenQuery>,
    Json(payload): Json<AuthTokenPayload>,
) -> ApiResult<(StatusCode, Json<AuthTokenResponse>)> {
    auth::require_master_token(&headers, &query, &state.users_master_token)?;
    let token = required_field(payload.token.as_ref())?;
    let user_id = required_field(payload.user_id.as_ref())?;
    let auth_token = AuthTokenDocument {
        id: identifier::generate(),
        token,
        user_id,
        created_at: timestamp::now(),
    };

    state.storage.create_auth_token(&auth_token)?;

    Ok((StatusCode::CREATED, Json(auth_token.into_response())))
}

pub async fn update(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<TokenQuery>,
    Path(id): Path<String>,
    Json(payload): Json<AuthTokenPayload>,
) -> ApiResult<Json<AuthTokenResponse>> {
    auth::require_master_token(&headers, &query, &state.users_master_token)?;
    let update = build_update(&payload)?;
    let auth_token = state
        .storage
        .update_auth_token(&id, update)?
        .ok_or(ApiError::NotFound("Auth token not found"))?;

    Ok(Json(auth_token.into_response()))
}

pub async fn delete(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<TokenQuery>,
    Path(id): Path<String>,
) -> ApiResult<Json<AuthTokenResponse>> {
    auth::require_master_token(&headers, &query, &state.users_master_token)?;
    let auth_token = state
        .storage
        .delete_auth_token(&id)?
        .ok_or(ApiError::NotFound("Auth token not found"))?;

    Ok(Json(auth_token.into_response()))
}

fn required_field(value: Option<&Value>) -> ApiResult<String> {
    value
        .filter(|value| javascript::is_truthy(value))
        .map(javascript::to_string)
        .ok_or(ApiError::BadRequest("token and userId are required"))
}

fn build_update(payload: &AuthTokenPayload) -> ApiResult<AuthTokenUpdate> {
    let mut update = AuthTokenUpdate::default();
    let mut has_fields = false;

    if let Some(token) = &payload.token {
        update.token = Some(javascript::to_string(token));
        has_fields = true;
    }

    if let Some(user_id) = &payload.user_id {
        update.user_id = Some(javascript::to_string(user_id));
        has_fields = true;
    }

    if !has_fields {
        return Err(ApiError::BadRequest("No fields to update"));
    }

    Ok(update)
}
