mod auth;
mod config;
mod error;
mod identifier;
mod javascript;
mod models;
mod password;
mod routes;
mod state;
mod storage;
mod timestamp;

use std::error::Error;

use tokio::net::TcpListener;
use tokio::signal;
use tracing_subscriber::EnvFilter;

use crate::config::Config;
use crate::state::AppState;
use crate::storage::Storage;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .init();

    if let Err(error) = run().await {
        tracing::error!(%error, "Failed to start server");
        std::process::exit(1);
    }
}

async fn run() -> Result<(), Box<dyn Error>> {
    let config = Config::from_environment()?;
    let storage = Storage::open(&config.database_path)?;
    let state = AppState::new(
        storage,
        config.users_master_token,
        config.clear_database_master_token,
    );
    let router = routes::build(state);
    let listener = TcpListener::bind(("0.0.0.0", config.port)).await?;

    tracing::info!("Server running on http://localhost:{}", config.port);

    axum::serve(listener, router)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

async fn shutdown_signal() {
    let _ = signal::ctrl_c().await;
}
