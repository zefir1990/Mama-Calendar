use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct EventDocument {
    pub id: String,
    #[serde(rename = "userId")]
    pub user_id: String,
    pub description: String,
    pub date: f64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub emoji: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Default)]
pub struct EventUpdate {
    pub description: Option<String>,
    pub date: Option<f64>,
    pub emoji: Option<Option<String>>,
}

impl EventDocument {
    pub fn apply(&mut self, update: EventUpdate) {
        if let Some(description) = update.description {
            self.description = description;
        }

        if let Some(date) = update.date {
            self.date = date;
        }

        if let Some(emoji) = update.emoji {
            self.emoji = emoji;
        }
    }

    pub fn into_response(self) -> EventResponse {
        EventResponse {
            id: self.id,
            user_id: self.user_id,
            description: self.description,
            date: self.date,
            emoji: self.emoji,
            created_at: self.created_at,
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EventResponse {
    pub id: String,
    pub user_id: String,
    pub description: String,
    pub date: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub emoji: Option<String>,
    pub created_at: String,
}
