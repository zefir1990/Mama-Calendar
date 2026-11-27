use axum::Json;
use axum::extract::{Path, Query, State};
use axum::http::{HeaderMap, StatusCode};
use serde::Deserialize;
use serde_json::Value;

use crate::auth::{self, TokenQuery};
use crate::error::{ApiError, ApiResult};
use crate::identifier;
use crate::javascript;
use crate::models::event::{EventDocument, EventResponse, EventUpdate};
use crate::state::AppState;
use crate::timestamp;

#[derive(Debug, Deserialize)]
pub struct EventPayload {
    pub description: Option<Value>,
    pub date: Option<Value>,
    pub emoji: Option<Value>,
}

pub async fn list(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<TokenQuery>,
) -> ApiResult<Json<Vec<EventResponse>>> {
    let user_id = auth::require_auth_token(&state, &headers, &query).await?;
    let events = state.storage.list_events(&user_id)?;

    Ok(Json(
        events
            .into_iter()
            .map(EventDocument::into_response)
            .collect(),
    ))
}

pub async fn get(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<TokenQuery>,
    Path(id): Path<String>,
) -> ApiResult<Json<EventResponse>> {
    let user_id = auth::require_auth_token(&state, &headers, &query).await?;
    let event = state
        .storage
        .get_event(&id, &user_id)?
        .ok_or(ApiError::NotFound("Event not found"))?;

    Ok(Json(event.into_response()))
}

pub async fn create(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<TokenQuery>,
    Json(payload): Json<EventPayload>,
) -> ApiResult<(StatusCode, Json<EventResponse>)> {
    let user_id = auth::require_auth_token(&state, &headers, &query).await?;
    let description = required_description(payload.description.as_ref())?;
    let date = required_date(payload.date.as_ref())?;
    let emoji = optional_emoji(payload.emoji.as_ref());
    let event = EventDocument {
        id: identifier::generate(),
        user_id,
        description,
        date,
        emoji,
        created_at: timestamp::now(),
    };

    state.storage.create_event(&event)?;

    Ok((StatusCode::CREATED, Json(event.into_response())))
}

pub async fn update(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<TokenQuery>,
    Path(id): Path<String>,
    Json(payload): Json<EventPayload>,
) -> ApiResult<Json<EventResponse>> {
    let user_id = auth::require_auth_token(&state, &headers, &query).await?;
    let update = build_update(&payload)?;
    let event = state
        .storage
        .update_event(&id, &user_id, update)?
        .ok_or(ApiError::NotFound("Event not found"))?;

    Ok(Json(event.into_response()))
}

pub async fn delete(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<TokenQuery>,
    Path(id): Path<String>,
) -> ApiResult<Json<EventResponse>> {
    let user_id = auth::require_auth_token(&state, &headers, &query).await?;
    let event = state
        .storage
        .delete_event(&id, &user_id)?
        .ok_or(ApiError::NotFound("Event not found"))?;

    Ok(Json(event.into_response()))
}

fn required_description(value: Option<&Value>) -> ApiResult<String> {
    value
        .filter(|value| javascript::is_truthy(value))
        .map(javascript::to_string)
        .ok_or(ApiError::BadRequest("description and date are required"))
}

fn required_date(value: Option<&Value>) -> ApiResult<f64> {
    value
        .filter(|value| !value.is_null())
        .and_then(javascript::to_number)
        .ok_or(ApiError::BadRequest("description and date are required"))
}

fn optional_emoji(value: Option<&Value>) -> Option<String> {
    value
        .filter(|value| javascript::is_truthy(value))
        .map(javascript::to_string)
}

fn build_update(payload: &EventPayload) -> ApiResult<EventUpdate> {
    let mut update = EventUpdate::default();
    let mut has_fields = false;

    if let Some(description) = &payload.description {
        update.description = Some(javascript::to_string(description));
        has_fields = true;
    }

    if let Some(date) = &payload.date {
        update.date =
            Some(javascript::to_number(date).ok_or(ApiError::BadRequest("date must be a number"))?);
        has_fields = true;
    }

    if let Some(emoji) = &payload.emoji {
        update.emoji = Some(optional_emoji(Some(emoji)));
        has_fields = true;
    }

    if !has_fields {
        return Err(ApiError::BadRequest("No fields to update"));
    }

    Ok(update)
}
