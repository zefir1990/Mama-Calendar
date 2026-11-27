import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { useLocalization } from '@/localization';

export function LoginForm() {
  const { login, register, loginError } = useAuth();
  const theme = useTheme();
  const { t } = useLocalization();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!username.trim() || !password.trim()) {
      return;
    }
    if (isRegisterMode && password !== confirmPassword) {
      return;
    }
    setIsSubmitting(true);
    try {
      if (isRegisterMode) {
        await register(username.trim(), password);
      } else {
        await login(username.trim(), password);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const passwordMatchError = isRegisterMode && confirmPassword.length > 0 && password !== confirmPassword;
  const canSubmit = username.trim().length > 0 && password.trim().length > 0 && !isSubmitting && !passwordMatchError;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.form}>
        <ThemedText type="title" style={styles.title}>
          {isRegisterMode ? t.auth.registerTitle : t.auth.title}
        </ThemedText>

        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.background, color: theme.text, borderColor: theme.textSecondary },
          ]}
          value={username}
          onChangeText={setUsername}
          placeholder={t.auth.usernamePlaceholder}
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isSubmitting}
        />

        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.background, color: theme.text, borderColor: theme.textSecondary },
          ]}
          value={password}
          onChangeText={setPassword}
          placeholder={t.auth.passwordPlaceholder}
          placeholderTextColor={theme.textSecondary}
          secureTextEntry
          editable={!isSubmitting}
        />

        {isRegisterMode ? (
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.background,
                color: theme.text,
                borderColor: passwordMatchError ? '#e74c3c' : theme.textSecondary,
              },
            ]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t.auth.confirmPasswordPlaceholder}
            placeholderTextColor={theme.textSecondary}
            secureTextEntry
            editable={!isSubmitting}
          />
        ) : null}

        {loginError ? (
          <ThemedText themeColor="textSecondary" style={styles.errorText}>
            {loginError}
          </ThemedText>
        ) : null}

        <Pressable
          onPress={handleSubmit}
          style={[
            styles.loginButton,
            {
              backgroundColor: canSubmit ? theme.text : theme.textSecondary,
              opacity: canSubmit ? 1 : 0.5,
            },
          ]}
          disabled={!canSubmit}
        >
          <ThemedText themeColor="background" style={styles.loginButtonText}>
            {isSubmitting
              ? (isRegisterMode ? t.auth.registering : t.auth.loggingIn)
              : (isRegisterMode ? t.auth.createAccount : t.auth.login)}
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={() => {
            setIsRegisterMode(!isRegisterMode);
            setConfirmPassword('');
          }}
        >
          <ThemedText themeColor="textSecondary" style={styles.switchText}>
            {isRegisterMode ? t.auth.switchToLogin : t.auth.switchToRegister}
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  form: {
    gap: Spacing.three,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.three,
  },
  input: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    fontSize: 16,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 14,
  },
  loginButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  loginButtonText: {
    fontWeight: '700',
    fontSize: 16,
  },
  switchText: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: Spacing.two,
  },
});
