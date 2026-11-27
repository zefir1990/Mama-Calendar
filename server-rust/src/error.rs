use std::fmt::Display;

use axum::Json;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde_json::json;

#[derive(Debug)]
pub enum ApiError {
    Unauthorized,
    UnauthorizedWithMessage(&'static str),
    BadRequest(&'static str),
    NotFound(&'static str),
    Internal(String),
}

impl ApiError {
    pub fn internal(error: impl Display) -> Self {
        Self::Internal(error.to_string())
    }
}

impl From<redb::DatabaseError> for ApiError {
    fn from(error: redb::DatabaseError) -> Self {
        Self::internal(error)
    }
}

impl From<redb::TransactionError> for ApiError {
    fn from(error: redb::TransactionError) -> Self {
        Self::internal(error)
    }
}

impl From<redb::TableError> for ApiError {
    fn from(error: redb::TableError) -> Self {
        Self::internal(error)
    }
}

impl From<redb::StorageError> for ApiError {
    fn from(error: redb::StorageError) -> Self {
        Self::internal(error)
    }
}

impl From<redb::CommitError> for ApiError {
    fn from(error: redb::CommitError) -> Self {
        Self::internal(error)
    }
}

impl From<serde_json::Error> for ApiError {
    fn from(error: serde_json::Error) -> Self {
        Self::internal(error)
    }
}

impl From<std::io::Error> for ApiError {
    fn from(error: std::io::Error) -> Self {
        Self::internal(error)
    }
}

impl std::fmt::Display for ApiError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Unauthorized => formatter.write_str("Unauthorized"),
            Self::UnauthorizedWithMessage(message) => formatter.write_str(message),
            Self::BadRequest(message) | Self::NotFound(message) => formatter.write_str(message),
            Self::Internal(details) => formatter.write_str(details),
        }
    }
}

impl std::error::Error for ApiError {}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            Self::Unauthorized => (StatusCode::UNAUTHORIZED, "Unauthorized".to_string()),
            Self::UnauthorizedWithMessage(message) => {
                (StatusCode::UNAUTHORIZED, message.to_string())
            }
            Self::BadRequest(message) => (StatusCode::BAD_REQUEST, message.to_string()),
            Self::NotFound(message) => (StatusCode::NOT_FOUND, message.to_string()),
            Self::Internal(details) => {
                tracing::error!(%details, "Internal server error");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Internal server error".to_string(),
                )
            }
        };

        (status, Json(json!({ "error": message }))).into_response()
    }
}

pub type ApiResult<T> = Result<T, ApiError>;
