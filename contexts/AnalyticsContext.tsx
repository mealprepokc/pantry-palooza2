import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { ensureSession, endSession, trackEvent, AnalyticsEventName } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';

interface AnalyticsContextValue {
  track: (event: AnalyticsEventName | string, metadata?: Record<string, any>) => Promise<void>;
}

const AnalyticsContext = createContext<AnalyticsContextValue | undefined>(undefined);

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await ensureSession(userId);
      } catch (error) {
        if (__DEV__) console.warn('ensureSession failed', error);
      }
      if (cancelled) {
        await endSession();
      }
    })();
    return () => {
      cancelled = true;
      void endSession();
    };
  }, [userId]);

  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        await ensureSession(userId);
      }
      if (nextState === 'background' || nextState === 'inactive') {
        await endSession();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [userId]);

  const value = useMemo<AnalyticsContextValue>(() => {
    return {
      track: async (event, metadata = {}) => {
        try {
          await trackEvent(event, metadata, userId);
        } catch (error) {
          if (__DEV__) console.warn('track failed', error);
        }
      },
    };
  }, [userId]);

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
};
