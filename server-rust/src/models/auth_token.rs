use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthTokenDocument {
    pub id: String,
    pub token: String,
    #[serde(rename = "userId")]
    pub user_id: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Default)]
pub struct AuthTokenUpdate {
    pub token: Option<String>,
    pub user_id: Option<String>,
}

impl AuthTokenDocument {
    pub fn apply(&mut self, update: AuthTokenUpdate) {
        if let Some(token) = update.token {
            self.token = token;
        }

        if let Some(user_id) = update.user_id {
            self.user_id = user_id;
        }
    }

    pub fn into_response(self) -> AuthTokenResponse {
        AuthTokenResponse {
            id: self.id,
            token: self.token,
            user_id: self.user_id,
            created_at: self.created_at,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthTokenResponse {
    pub id: String,
    pub token: String,
    pub user_id: String,
    pub created_at: String,
}
