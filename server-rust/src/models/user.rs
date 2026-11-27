use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct UserDocument {
    pub id: String,
    pub username: String,
    pub password: String,
}

#[derive(Debug, Default)]
pub struct UserUpdate {
    pub username: Option<String>,
    pub password: Option<String>,
}

impl UserDocument {
    pub fn apply(&mut self, update: UserUpdate) {
        if let Some(username) = update.username {
            self.username = username;
        }

        if let Some(password) = update.password {
            self.password = password;
        }
    }

    pub fn into_response(self) -> UserResponse {
        UserResponse {
            id: self.id,
            username: self.username,
            password: self.password,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub id: String,
    pub username: String,
    pub password: String,
}
