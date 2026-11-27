use axum::Json;
use axum::extract::{Path, Query, State};
use axum::http::{HeaderMap, StatusCode};
use serde::Deserialize;
use serde_json::Value;

use crate::auth::{self, TokenQuery};
use crate::error::{ApiError, ApiResult};
use crate::identifier;
use crate::javascript;
use crate::models::user::{UserDocument, UserResponse, UserUpdate};
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct UserPayload {
    pub username: Option<Value>,
    pub password: Option<Value>,
}

pub async fn list(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<TokenQuery>,
) -> ApiResult<Json<Vec<UserResponse>>> {
    auth::require_master_token(&headers, &query, &state.users_master_token)?;
    let users = state.storage.list_users()?;

    Ok(Json(
        users.into_iter().map(UserDocument::into_response).collect(),
    ))
}

pub async fn get(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<TokenQuery>,
    Path(id): Path<String>,
) -> ApiResult<Json<UserResponse>> {
    auth::require_master_token(&headers, &query, &state.users_master_token)?;
    let user = state
        .storage
        .get_user(&id)?
        .ok_or(ApiError::NotFound("User not found"))?;

    Ok(Json(user.into_response()))
}

pub async fn create(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<TokenQuery>,
    Json(payload): Json<UserPayload>,
) -> ApiResult<(StatusCode, Json<UserResponse>)> {
    auth::require_master_token(&headers, &query, &state.users_master_token)?;
    let username = required_credential(payload.username.as_ref())?;
    let password = required_credential(payload.password.as_ref())?;
    let user = UserDocument {
        id: identifier::generate(),
        username,
        password,
    };

    state.storage.create_user(&user)?;

    Ok((StatusCode::CREATED, Json(user.into_response())))
}

pub async fn update(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<TokenQuery>,
    Path(id): Path<String>,
    Json(payload): Json<UserPayload>,
) -> ApiResult<Json<UserResponse>> {
    auth::require_master_token(&headers, &query, &state.users_master_token)?;
    let update = build_update(&payload)?;
    let user = state
        .storage
        .update_user(&id, update)?
        .ok_or(ApiError::NotFound("User not found"))?;

    Ok(Json(user.into_response()))
}

pub async fn delete(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<TokenQuery>,
    Path(id): Path<String>,
) -> ApiResult<Json<UserResponse>> {
    auth::require_master_token(&headers, &query, &state.users_master_token)?;
    let user = state
        .storage
        .delete_user(&id)?
        .ok_or(ApiError::NotFound("User not found"))?;

    Ok(Json(user.into_response()))
}

fn required_credential(value: Option<&Value>) -> ApiResult<String> {
    value
        .filter(|value| javascript::is_truthy(value))
        .map(javascript::to_string)
        .ok_or(ApiError::BadRequest("username and password are required"))
}

fn build_update(payload: &UserPayload) -> ApiResult<UserUpdate> {
    let mut update = UserUpdate::default();
    let mut has_fields = false;

    if let Some(username) = &payload.username {
        update.username = Some(javascript::to_string(username));
        has_fields = true;
    }

    if let Some(password) = &payload.password {
        update.password = Some(javascript::to_string(password));
        has_fields = true;
    }

    if !has_fields {
        return Err(ApiError::BadRequest("No fields to update"));
    }

    Ok(update)
}
