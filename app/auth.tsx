import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { Logo } from '@/components/Logo';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

export default function AuthScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signUp, signIn } = useAuth();
  const [verifying, setVerifying] = useState(false);

  // Handle Supabase magic-link callback (web and native deep link)
  useEffect(() => {
    let sub: { remove: () => void } | undefined;
    const handleUrl = async (url: string | null) => {
      try {
        if (!url) return;
        // Normalize URL and read 'code' param
        const parsed = new URL(url);
        const code = parsed.searchParams.get('code');
        if (!code) return;
        setVerifying(true);
        // Support both supabase-js signatures: exchangeCodeForSession({ code }) and exchangeCodeForSession(code)
        const authAny = supabase.auth as any;
        let exErr: any = null;
        if (typeof authAny.exchangeCodeForSession === 'function') {
          try {
            const res = await authAny.exchangeCodeForSession({ code });
            exErr = res?.error ?? null;
          } catch (_) {
            const res2 = await authAny.exchangeCodeForSession(code);
            exErr = res2?.error ?? null;
          }
        }
        if (exErr) {
          setError(exErr.message);
          Alert.alert('Sign-in error', exErr.message);
        } else {
          router.replace('/(tabs)/account');
        }
      } catch (e: any) {
        const msg = e?.message || 'Failed to complete sign-in.';
        setError(msg);
        Alert.alert('Sign-in error', msg);
      } finally {
        setVerifying(false);
      }
    };

    (async () => {
      if (Platform.OS === 'web') {
        await handleUrl(window.location.href);
      } else {
        const initial = await Linking.getInitialURL();
        await handleUrl(initial);
        sub = Linking.addEventListener('url', (ev) => handleUrl(ev.url));
      }
    })();

    return () => {
      if (sub) sub.remove();
    };
  }, []);

  const handleAuth = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    const { error: authError } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);

    setLoading(false);

    if (authError) {
      setError(authError.message);
      Alert.alert('Authentication error', authError.message);
    } else {
      router.replace('/(tabs)/account');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {verifying && (
          <View style={styles.verifyingOverlay}>
            <ActivityIndicator size="large" color="#4ECDC4" />
            <Text style={styles.verifyingText}>Signing you in…</Text>
          </View>
        )}
        <View style={styles.header}>
          <Logo size={100} />
          <Text style={styles.title}>Pantry Palooza</Text>
          <Text style={styles.subtitle}>
            Turn your ingredients into amazing meals
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={styles.button}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>
                {isSignUp ? 'Sign Up' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
          >
            <Text style={styles.switchText}>
              {isSignUp
                ? 'Already have an account? Sign In'
                : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FB',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#2C3E50',
    marginTop: 20,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    color: '#5A6C7D',
    marginTop: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 18,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#E1E8ED',
    color: '#2C3E50',
  },
  button: {
    backgroundColor: '#4ECDC4',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#4ECDC4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  switchText: {
    color: '#4ECDC4',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '600',
  },
  error: {
    color: '#E74C3C',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  verifyingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.85)',
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  verifyingText: {
    color: '#2C3E50',
    fontSize: 16,
    fontWeight: '700',
  },
});
