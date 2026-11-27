use std::env;
use std::io::{Error, ErrorKind};

const DEFAULT_PORT: u16 = 3001;
const DEFAULT_DATABASE_PATH: &str = "data/mama-calendar.redb";

pub struct Config {
    pub port: u16,
    pub database_path: String,
    pub users_master_token: String,
    pub clear_database_master_token: String,
}

impl Config {
    pub fn from_environment() -> Result<Self, Error> {
        Ok(Self {
            port: load_port()?,
            database_path: load_optional_variable("DATABASE_PATH", DEFAULT_DATABASE_PATH),
            users_master_token: load_required_variable("USERS_MASTER_TOKEN")?,
            clear_database_master_token: load_required_variable("CLEAR_DATABASE_MASTER_TOKEN")?,
        })
    }
}

fn load_port() -> Result<u16, Error> {
    match env::var("PORT") {
        Ok(value) => value.parse::<u16>().map_err(|_| {
            Error::new(
                ErrorKind::InvalidInput,
                format!("PORT must be a valid port number, received {value}"),
            )
        }),
        Err(_) => Ok(DEFAULT_PORT),
    }
}

fn load_required_variable(name: &str) -> Result<String, Error> {
    match env::var(name) {
        Ok(value) if !value.is_empty() => Ok(value),
        _ => Err(Error::new(
            ErrorKind::InvalidInput,
            format!("{name} must be set in the environment or .env file"),
        )),
    }
}

fn load_optional_variable(name: &str, default_value: &str) -> String {
    env::var(name)
        .ok()
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| default_value.to_string())
}
