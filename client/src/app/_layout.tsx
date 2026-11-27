import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { SafeAreaLayout } from '@/components/safe-area-layout';
import { AuthProvider } from '@/context/auth-context';
import { EventsProvider } from '@/context/event-context';
import { LocalizationProvider } from '@/localization';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <LocalizationProvider>
        <AuthProvider>
          <EventsProvider>
            <SafeAreaLayout>
              <Stack screenOptions={{ headerShown: false }} />
            </SafeAreaLayout>
          </EventsProvider>
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}
