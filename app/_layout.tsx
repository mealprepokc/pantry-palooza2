import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { Analytics } from '@vercel/analytics/react';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="cooked" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="logo-preview" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
      {Platform.OS === 'web' && process.env.NODE_ENV === 'production' ? <Analytics /> : null}
    </AuthProvider>
  );
}
