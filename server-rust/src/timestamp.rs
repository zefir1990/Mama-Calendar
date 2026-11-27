use chrono::{SecondsFormat, Utc};

pub fn now() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true)
}

#[cfg(test)]
mod tests {
    use super::now;

    #[test]
    fn formats_timestamp_like_javascript_iso_string() {
        let timestamp = now();

        assert!(timestamp.ends_with('Z'));
        assert_eq!(timestamp.len(), 24);
    }
}
