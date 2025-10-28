import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { AlertProvider } from '@/contexts/AlertContext';
import { AnalyticsProvider } from '@/contexts/AnalyticsContext';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <AlertProvider>
        <AnalyticsProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="cooked" />
            <Stack.Screen name="auth" />
            <Stack.Screen name="logo-preview" />
            <Stack.Screen name="policy" />
            <Stack.Screen name="support" />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
          {Platform.OS === 'web' && process.env.NODE_ENV === 'production' ? (
            <>
              <Analytics />
              <SpeedInsights />
            </>
          ) : null}
        </AnalyticsProvider>
      </AlertProvider>
    </AuthProvider>
  );
}
