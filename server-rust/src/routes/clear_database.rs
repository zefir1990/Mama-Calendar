use axum::Json;
use axum::extract::{Query, State};
use axum::http::HeaderMap;
use serde_json::{Value, json};

use crate::auth::{self, TokenQuery};
use crate::error::ApiResult;
use crate::state::AppState;

pub async fn clear(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(query): Query<TokenQuery>,
) -> ApiResult<Json<Value>> {
    auth::require_master_token(&headers, &query, &state.clear_database_master_token)?;
    let result = state.storage.clear()?;

    Ok(Json(json!({ "deleted": result })))
}
