use std::cmp::Ordering;
use std::fs;
use std::path::Path;
use std::sync::Arc;

use redb::{Database, ReadableDatabase, ReadableTable, ReadableTableMetadata, TableDefinition};
use serde::Serialize;
use serde::de::DeserializeOwned;

use crate::error::{ApiError, ApiResult};
use crate::models::auth_token::{AuthTokenDocument, AuthTokenUpdate};
use crate::models::event::{EventDocument, EventUpdate};
use crate::models::user::{UserDocument, UserUpdate};

type JsonTable = TableDefinition<'static, &'static str, &'static [u8]>;

const EVENTS_TABLE: JsonTable = TableDefinition::new("events");
const USERS_TABLE: JsonTable = TableDefinition::new("users");
const AUTH_TOKENS_TABLE: JsonTable = TableDefinition::new("authTokens");

#[derive(Clone)]
pub struct Storage {
    database: Arc<Database>,
}

#[derive(Debug, Serialize)]
pub struct ClearDatabaseResult {
    pub events: u64,
    pub users: u64,
    #[serde(rename = "authTokens")]
    pub auth_tokens: u64,
}

impl Storage {
    pub fn open(path: impl AsRef<Path>) -> ApiResult<Self> {
        let path = path.as_ref();

        if let Some(parent) = path
            .parent()
            .filter(|parent| !parent.as_os_str().is_empty())
        {
            fs::create_dir_all(parent)?;
        }

        let database = Database::create(path)?;
        let storage = Self {
            database: Arc::new(database),
        };

        storage.initialize_tables()?;

        Ok(storage)
    }

    pub fn list_events(&self, user_id: &str) -> ApiResult<Vec<EventDocument>> {
        let mut events: Vec<EventDocument> = self.read_all(EVENTS_TABLE)?;

        events.retain(|event| event.user_id == user_id);
        events.sort_by(|left, right| {
            left.date
                .partial_cmp(&right.date)
                .unwrap_or(Ordering::Equal)
        });

        Ok(events)
    }

    pub fn get_event(&self, id: &str, user_id: &str) -> ApiResult<Option<EventDocument>> {
        Ok(self
            .read_by_id(EVENTS_TABLE, id)?
            .filter(|event: &EventDocument| event.user_id == user_id))
    }

    pub fn create_event(&self, event: &EventDocument) -> ApiResult<()> {
        self.write(EVENTS_TABLE, &event.id, event)
    }

    pub fn update_event(
        &self,
        id: &str,
        user_id: &str,
        update: EventUpdate,
    ) -> ApiResult<Option<EventDocument>> {
        self.update(EVENTS_TABLE, id, |event: &mut EventDocument| {
            if event.user_id != user_id {
                return false;
            }

            event.apply(update);
            true
        })
    }

    pub fn delete_event(&self, id: &str, user_id: &str) -> ApiResult<Option<EventDocument>> {
        self.delete_matching(EVENTS_TABLE, id, |event: &EventDocument| {
            event.user_id == user_id
        })
    }

    pub fn list_users(&self) -> ApiResult<Vec<UserDocument>> {
        let mut users: Vec<UserDocument> = self.read_all(USERS_TABLE)?;

        users.sort_by(|left, right| left.username.cmp(&right.username));

        Ok(users)
    }

    pub fn get_user(&self, id: &str) -> ApiResult<Option<UserDocument>> {
        self.read_by_id(USERS_TABLE, id)
    }

    pub fn find_user_by_username(&self, username: &str) -> ApiResult<Option<UserDocument>> {
        let users: Vec<UserDocument> = self.read_all(USERS_TABLE)?;

        Ok(users.into_iter().find(|user| user.username == username))
    }

    pub fn create_user(&self, user: &UserDocument) -> ApiResult<()> {
        self.write(USERS_TABLE, &user.id, user)
    }

    pub fn update_user(&self, id: &str, update: UserUpdate) -> ApiResult<Option<UserDocument>> {
        self.update(USERS_TABLE, id, |user: &mut UserDocument| {
            user.apply(update);
            true
        })
    }

    pub fn delete_user(&self, id: &str) -> ApiResult<Option<UserDocument>> {
        self.delete_matching(USERS_TABLE, id, |_| true)
    }

    pub fn list_auth_tokens(&self) -> ApiResult<Vec<AuthTokenDocument>> {
        let mut auth_tokens: Vec<AuthTokenDocument> = self.read_all(AUTH_TOKENS_TABLE)?;

        auth_tokens.sort_by(|left, right| left.created_at.cmp(&right.created_at));

        Ok(auth_tokens)
    }

    pub fn find_auth_token(&self, token: &str) -> ApiResult<Option<AuthTokenDocument>> {
        let auth_tokens: Vec<AuthTokenDocument> = self.read_all(AUTH_TOKENS_TABLE)?;

        Ok(auth_tokens
            .into_iter()
            .find(|auth_token| auth_token.token == token))
    }

    pub fn get_auth_token(&self, id: &str) -> ApiResult<Option<AuthTokenDocument>> {
        self.read_by_id(AUTH_TOKENS_TABLE, id)
    }

    pub fn create_auth_token(&self, auth_token: &AuthTokenDocument) -> ApiResult<()> {
        self.write(AUTH_TOKENS_TABLE, &auth_token.id, auth_token)
    }

    pub fn update_auth_token(
        &self,
        id: &str,
        update: AuthTokenUpdate,
    ) -> ApiResult<Option<AuthTokenDocument>> {
        self.update(
            AUTH_TOKENS_TABLE,
            id,
            |auth_token: &mut AuthTokenDocument| {
                auth_token.apply(update);
                true
            },
        )
    }

    pub fn delete_auth_token(&self, id: &str) -> ApiResult<Option<AuthTokenDocument>> {
        self.delete_matching(AUTH_TOKENS_TABLE, id, |_| true)
    }

    pub fn clear(&self) -> ApiResult<ClearDatabaseResult> {
        let write_transaction = self.database.begin_write()?;
        let result;

        {
            let mut events = write_transaction.open_table(EVENTS_TABLE)?;
            let mut users = write_transaction.open_table(USERS_TABLE)?;
            let mut auth_tokens = write_transaction.open_table(AUTH_TOKENS_TABLE)?;

            result = ClearDatabaseResult {
                events: events.len()?,
                users: users.len()?,
                auth_tokens: auth_tokens.len()?,
            };

            events.retain(|_, _| false)?;
            users.retain(|_, _| false)?;
            auth_tokens.retain(|_, _| false)?;
        }

        write_transaction.commit()?;

        Ok(result)
    }

    fn initialize_tables(&self) -> ApiResult<()> {
        let write_transaction = self.database.begin_write()?;

        {
            write_transaction.open_table(EVENTS_TABLE)?;
            write_transaction.open_table(USERS_TABLE)?;
            write_transaction.open_table(AUTH_TOKENS_TABLE)?;
        }

        write_transaction.commit()?;

        Ok(())
    }

    fn read_all<T: DeserializeOwned>(&self, definition: JsonTable) -> ApiResult<Vec<T>> {
        let read_transaction = self.database.begin_read()?;
        let table = read_transaction.open_table(definition)?;
        let mut items = Vec::new();

        for entry in table.iter()? {
            let (_, value) = entry?;
            items.push(serde_json::from_slice(value.value())?);
        }

        Ok(items)
    }

    fn read_by_id<T: DeserializeOwned>(
        &self,
        definition: JsonTable,
        id: &str,
    ) -> ApiResult<Option<T>> {
        let read_transaction = self.database.begin_read()?;
        let table = read_transaction.open_table(definition)?;

        table
            .get(id)?
            .map(|value| serde_json::from_slice(value.value()))
            .transpose()
            .map_err(ApiError::from)
    }

    fn write<T: Serialize>(&self, definition: JsonTable, id: &str, value: &T) -> ApiResult<()> {
        let serialized = serde_json::to_vec(value)?;
        let write_transaction = self.database.begin_write()?;

        {
            let mut table = write_transaction.open_table(definition)?;
            table.insert(id, serialized.as_slice())?;
        }

        write_transaction.commit()?;

        Ok(())
    }

    fn update<T, F>(&self, definition: JsonTable, id: &str, transform: F) -> ApiResult<Option<T>>
    where
        T: Serialize + DeserializeOwned,
        F: FnOnce(&mut T) -> bool,
    {
        let write_transaction = self.database.begin_write()?;
        let result;

        {
            let mut table = write_transaction.open_table(definition)?;
            let existing = table
                .get(id)?
                .map(|value| serde_json::from_slice::<T>(value.value()))
                .transpose()?;

            result = match existing {
                Some(mut item) => {
                    if transform(&mut item) {
                        let serialized = serde_json::to_vec(&item)?;
                        table.insert(id, serialized.as_slice())?;
                        Some(item)
                    } else {
                        None
                    }
                }
                None => None,
            };
        }

        write_transaction.commit()?;

        Ok(result)
    }

    fn delete_matching<T, F>(
        &self,
        definition: JsonTable,
        id: &str,
        predicate: F,
    ) -> ApiResult<Option<T>>
    where
        T: DeserializeOwned,
        F: FnOnce(&T) -> bool,
    {
        let write_transaction = self.database.begin_write()?;
        let result;

        {
            let mut table = write_transaction.open_table(definition)?;
            let existing = table
                .get(id)?
                .map(|value| serde_json::from_slice::<T>(value.value()))
                .transpose()?;

            result = match existing {
                Some(item) if predicate(&item) => {
                    table.remove(id)?;
                    Some(item)
                }
                _ => None,
            };
        }

        write_transaction.commit()?;

        Ok(result)
    }
}

#[cfg(test)]
mod tests {
    use std::fs;

    use super::Storage;
    use crate::identifier;
    use crate::models::auth_token::{AuthTokenDocument, AuthTokenUpdate};
    use crate::models::event::{EventDocument, EventUpdate};
    use crate::models::user::{UserDocument, UserUpdate};

    #[test]
    fn supports_full_crud_lifecycle() {
        let database_path = std::env::temp_dir().join(format!(
            "mama-calendar-storage-{}.redb",
            identifier::generate()
        ));
        let storage = Storage::open(&database_path).expect("storage should open");

        let mut user = UserDocument {
            id: identifier::generate(),
            username: "testuser".to_string(),
            password: "hashed-password".to_string(),
        };
        storage.create_user(&user).expect("user should be created");
        assert_eq!(
            storage
                .find_user_by_username("testuser")
                .expect("user lookup should succeed")
                .expect("user should exist")
                .id,
            user.id
        );

        user = storage
            .update_user(
                &user.id,
                UserUpdate {
                    username: Some("renamed-user".to_string()),
                    password: None,
                },
            )
            .expect("user update should succeed")
            .expect("user should exist");
        assert_eq!(user.username, "renamed-user");

        let event = EventDocument {
            id: identifier::generate(),
            user_id: user.id.clone(),
            description: "Doctor appointment".to_string(),
            date: 20240715.0,
            emoji: Some("🩺".to_string()),
            created_at: crate::timestamp::now(),
        };
        storage
            .create_event(&event)
            .expect("event should be created");
        assert_eq!(
            storage
                .list_events(&user.id)
                .expect("event list should succeed")
                .len(),
            1
        );
        assert!(
            storage
                .get_event(&event.id, "another-user")
                .expect("event lookup should succeed")
                .is_none()
        );

        let updated_event = storage
            .update_event(
                &event.id,
                &user.id,
                EventUpdate {
                    description: Some("Dentist appointment".to_string()),
                    date: Some(20240720.0),
                    emoji: Some(None),
                },
            )
            .expect("event update should succeed")
            .expect("event should exist");
        assert_eq!(updated_event.description, "Dentist appointment");
        assert_eq!(updated_event.date, 20240720.0);
        assert_eq!(updated_event.emoji, None);

        let auth_token = AuthTokenDocument {
            id: identifier::generate(),
            token: "auth-token".to_string(),
            user_id: user.id.clone(),
            created_at: crate::timestamp::now(),
        };
        storage
            .create_auth_token(&auth_token)
            .expect("auth token should be created");
        assert_eq!(
            storage
                .find_auth_token("auth-token")
                .expect("auth token lookup should succeed")
                .expect("auth token should exist")
                .id,
            auth_token.id
        );

        let updated_auth_token = storage
            .update_auth_token(
                &auth_token.id,
                AuthTokenUpdate {
                    token: Some("updated-auth-token".to_string()),
                    user_id: None,
                },
            )
            .expect("auth token update should succeed")
            .expect("auth token should exist");
        assert_eq!(updated_auth_token.token, "updated-auth-token");

        let deleted_event = storage
            .delete_event(&event.id, &user.id)
            .expect("event delete should succeed")
            .expect("event should exist");
        assert_eq!(deleted_event.id, event.id);
        assert!(
            storage
                .get_event(&event.id, &user.id)
                .expect("event lookup should succeed")
                .is_none()
        );

        let result = storage.clear().expect("database should clear");
        assert_eq!(result.events, 0);
        assert_eq!(result.users, 1);
        assert_eq!(result.auth_tokens, 1);
        assert!(
            storage
                .list_users()
                .expect("user list should succeed")
                .is_empty()
        );

        drop(storage);
        let _ = fs::remove_file(database_path);
    }
}
