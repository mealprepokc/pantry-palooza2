import { supabase } from '@/lib/supabase';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import { v4 as uuidv4 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AnalyticsEventName =
  | 'session_start'
  | 'session_end'
  | 'generate_request'
  | 'generate_result'
  | 'generate_failure'
  | 'save_dish'
  | 'unsave_dish'
  | 'planner_add'
  | 'planner_remove'
  | 'cooked_marked';

const DEVICE_ID_KEY = 'analytics_device_id_v1';
const SESSION_STORAGE_KEY = 'analytics_active_session_v1';

export interface TrackOptions {
  metadata?: Record<string, any>;
  source?: string;
}

export interface SessionInfo {
  sessionId: string;
  startedAt: string;
  userId: string | null;
}

export const getDeviceId = async (): Promise<string> => {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const fallback = uuidv4();
  try {
    const nativeId =
      Platform.OS === 'android'
        ? Application.getAndroidId() ?? fallback
        : Platform.OS === 'ios'
        ? (await Application.getIosIdForVendorAsync()) ?? fallback
        : fallback;
    await AsyncStorage.setItem(DEVICE_ID_KEY, nativeId);
    return nativeId;
  } catch (error) {
    await AsyncStorage.setItem(DEVICE_ID_KEY, fallback);
    return fallback;
  }
};

export const startSession = async (userId: string | null) => {
  const deviceId = await getDeviceId();
  const platform = Platform.OS;
  const appVersion = Application.nativeApplicationVersion ?? 'dev';
  const { data, error } = await supabase
    .from('user_sessions')
    .insert({ user_id: userId, device_id: deviceId, platform, app_version: appVersion })
    .select('id, started_at')
    .single();

  if (error || !data) {
    console.warn('Failed to start analytics session', error);
    return null;
  }

  const session: SessionInfo = { sessionId: data.id, startedAt: data.started_at, userId: userId ?? null };
  await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  await trackEvent('session_start', { sessionId: session.sessionId }, userId);
  return session;
};

export const endSession = async () => {
  const stored = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
  if (!stored) return;
  const parsed: SessionInfo = JSON.parse(stored);
  await supabase
    .from('user_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', parsed.sessionId);
  await trackEvent('session_end', { sessionId: parsed.sessionId }, parsed.userId ?? null);
  await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
};

export const getActiveSession = async (): Promise<SessionInfo | null> => {
  const stored = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch (_) {
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
};

export const ensureSession = async (userId: string | null) => {
  const existing = await getActiveSession();
  if (existing) {
    if (existing.userId === (userId ?? null)) {
      return existing;
    }
    await endSession();
  }
  return startSession(userId ?? null);
};

export const trackEvent = async (
  eventName: AnalyticsEventName | string,
  metadata: Record<string, any> = {},
  userId?: string | null,
  options?: TrackOptions
) => {
  try {
    const session = await getActiveSession();
    const payload = {
      user_id: userId ?? null,
      session_id: session?.sessionId ?? null,
      event_name: eventName,
      event_source: options?.source ?? 'app',
      metadata,
    };

    const { error } = await supabase.from('analytics_events').insert(payload);
    if (error) {
      console.warn('trackEvent failed', error);
    }
  } catch (error) {
    console.warn('trackEvent encountered an error', error);
  }
};
