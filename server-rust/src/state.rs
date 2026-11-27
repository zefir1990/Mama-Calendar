use crate::storage::Storage;

#[derive(Clone)]
pub struct AppState {
    pub storage: Storage,
    pub users_master_token: String,
    pub clear_database_master_token: String,
}

impl AppState {
    pub fn new(
        storage: Storage,
        users_master_token: String,
        clear_database_master_token: String,
    ) -> Self {
        Self {
            storage,
            users_master_token,
            clear_database_master_token,
        }
    }
}
