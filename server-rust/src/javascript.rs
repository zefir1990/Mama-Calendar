use serde_json::Value;

pub fn is_truthy(value: &Value) -> bool {
    match value {
        Value::Null => false,
        Value::Bool(value) => *value,
        Value::Number(value) => value
            .as_f64()
            .is_some_and(|number| number != 0.0 && !number.is_nan()),
        Value::String(value) => !value.is_empty(),
        Value::Array(value) => !value.is_empty(),
        Value::Object(_) => true,
    }
}

pub fn to_string(value: &Value) -> String {
    match value {
        Value::Null => "null".to_string(),
        Value::Bool(value) => value.to_string(),
        Value::Number(value) => to_number_string(value),
        Value::String(value) => value.clone(),
        Value::Array(values) => values
            .iter()
            .map(|value| match value {
                Value::Null => String::new(),
                other => to_string(other),
            })
            .collect::<Vec<_>>()
            .join(","),
        Value::Object(_) => "[object Object]".to_string(),
    }
}

pub fn to_number(value: &Value) -> Option<f64> {
    match value {
        Value::Null => Some(0.0),
        Value::Bool(value) => Some(if *value { 1.0 } else { 0.0 }),
        Value::Number(value) => value.as_f64(),
        Value::String(value) => {
            if value.trim().is_empty() {
                return Some(0.0);
            }

            value
                .trim()
                .parse::<f64>()
                .ok()
                .filter(|number| number.is_finite())
        }
        Value::Array(_) | Value::Object(_) => None,
    }
}

fn to_number_string(value: &serde_json::Number) -> String {
    if let Some(integer) = value.as_i64() {
        return integer.to_string();
    }

    if let Some(integer) = value.as_u64() {
        return integer.to_string();
    }

    value
        .as_f64()
        .map(|number| number.to_string())
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::{is_truthy, to_number, to_string};

    #[test]
    fn follows_javascript_truthiness() {
        assert!(!is_truthy(&json!(null)));
        assert!(!is_truthy(&json!(false)));
        assert!(!is_truthy(&json!(0)));
        assert!(!is_truthy(&json!("")));
        assert!(!is_truthy(&json!([])));
        assert!(is_truthy(&json!("event")));
        assert!(is_truthy(&json!({})));
    }

    #[test]
    fn follows_javascript_string_conversion() {
        assert_eq!(to_string(&json!("text")), "text");
        assert_eq!(to_string(&json!(42)), "42");
        assert_eq!(to_string(&json!(null)), "null");
        assert_eq!(to_string(&json!([1, 2])), "1,2");
    }

    #[test]
    fn converts_numeric_values() {
        assert_eq!(to_number(&json!(20240715)), Some(20240715.0));
        assert_eq!(to_number(&json!("20240715")), Some(20240715.0));
        assert_eq!(to_number(&json!(null)), Some(0.0));
        assert_eq!(to_number(&json!("not a number")), None);
    }
}
