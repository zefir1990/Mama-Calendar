pub fn generate() -> String {
    let identifier_bytes: [u8; 12] = rand::random();
    hex::encode(identifier_bytes)
}
