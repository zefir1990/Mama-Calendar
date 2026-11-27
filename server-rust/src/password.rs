use scrypt::{Params, scrypt};
use subtle::ConstantTimeEq;

use crate::error::ApiError;

const SALT_LENGTH: usize = 16;
const KEY_LENGTH: usize = 64;
const LOG_N: u8 = 14;
const BLOCK_SIZE: u32 = 8;
const PARALLELIZATION: u32 = 1;

pub fn hash_password(password: &str) -> Result<String, ApiError> {
    let salt_bytes: [u8; SALT_LENGTH] = rand::random();
    let salt = hex::encode(salt_bytes);
    let key = derive_key(password, &salt)?;

    Ok(format!("{salt}:{}", hex::encode(key)))
}

pub fn verify_password(password: &str, stored_password: &str) -> bool {
    let Some((salt, expected_key)) = stored_password.split_once(':') else {
        return false;
    };
    let Ok(expected_key) = hex::decode(expected_key) else {
        return false;
    };
    let Ok(key) = derive_key(password, salt) else {
        return false;
    };

    expected_key.len() == KEY_LENGTH && bool::from(key.as_slice().ct_eq(expected_key.as_slice()))
}

pub fn generate_auth_token() -> String {
    let token_bytes: [u8; 32] = rand::random();
    hex::encode(token_bytes)
}

fn derive_key(password: &str, salt: &str) -> Result<[u8; KEY_LENGTH], ApiError> {
    let params = Params::new(LOG_N, BLOCK_SIZE, PARALLELIZATION).map_err(ApiError::internal)?;
    let mut key = [0_u8; KEY_LENGTH];

    scrypt(password.as_bytes(), salt.as_bytes(), &params, &mut key).map_err(ApiError::internal)?;

    Ok(key)
}

#[cfg(test)]
mod tests {
    use super::{hash_password, verify_password};

    #[test]
    fn verifies_generated_password() {
        let hashed_password = hash_password("securePassword123").expect("password should hash");

        assert!(verify_password("securePassword123", &hashed_password));
        assert!(!verify_password("wrongPassword", &hashed_password));
    }

    #[test]
    fn rejects_malformed_stored_password() {
        assert!(!verify_password("password", "malformed"));
        assert!(!verify_password("password", "salt:not-hex"));
    }
}
