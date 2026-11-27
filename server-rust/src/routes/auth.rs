use axum::Json;
use axum::extract::State;
use axum::http::StatusCode;
use serde::Deserialize;
use serde_json::{Value, json};

use crate::error::{ApiError, ApiResult};
use crate::identifier;
use crate::javascript;
use crate::models::auth_token::AuthTokenDocument;
use crate::models::user::UserDocument;
use crate::password;
use crate::state::AppState;
use crate::timestamp;

#[derive(Debug, Deserialize)]
pub struct CredentialsPayload {
    pub username: Option<Value>,
    pub password: Option<Value>,
}

pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<CredentialsPayload>,
) -> ApiResult<(StatusCode, Json<Value>)> {
    let username = required_credential(payload.username.as_ref())?;
    let plain_password = required_credential(payload.password.as_ref())?;
    let hashed_password =
        tokio::task::spawn_blocking(move || password::hash_password(&plain_password))
            .await
            .map_err(ApiError::internal)??;
    let user = UserDocument {
        id: identifier::generate(),
        username,
        password: hashed_password,
    };

    state.storage.create_user(&user)?;

    Ok((
        StatusCode::CREATED,
        Json(json!({ "id": user.id, "username": user.username })),
    ))
}

pub async fn authorize(
    State(state): State<AppState>,
    Json(payload): Json<CredentialsPayload>,
) -> ApiResult<Json<Value>> {
    let username = required_credential(payload.username.as_ref())?;
    let plain_password = required_credential(payload.password.as_ref())?;
    let user = state.storage.find_user_by_username(&username)?;

    let Some(user) = user else {
        return Err(invalid_credentials());
    };

    let stored_password = user.password.clone();
    let password_is_valid = tokio::task::spawn_blocking(move || {
        password::verify_password(&plain_password, &stored_password)
    })
    .await
    .map_err(ApiError::internal)?;

    if !password_is_valid {
        return Err(invalid_credentials());
    }

    let token = password::generate_auth_token();
    let auth_token = AuthTokenDocument {
        id: identifier::generate(),
        token: token.clone(),
        user_id: user.id,
        created_at: timestamp::now(),
    };

    state.storage.create_auth_token(&auth_token)?;

    Ok(Json(json!({ "token": token })))
}

fn required_credential(value: Option<&Value>) -> ApiResult<String> {
    value
        .filter(|value| javascript::is_truthy(value))
        .map(javascript::to_string)
        .ok_or(ApiError::BadRequest("username and password are required"))
}

fn invalid_credentials() -> ApiError {
    ApiError::UnauthorizedWithMessage("Invalid username or password")
}
