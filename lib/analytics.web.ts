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

export interface SessionInfo {
  sessionId: string;
  startedAt: string;
  userId: string | null;
}

export interface TrackOptions {
  metadata?: Record<string, any>;
  source?: string;
}

export const ensureSession = async (_userId: string | null): Promise<SessionInfo | null> => null;

export const endSession = async (): Promise<void> => {
  // no-op on web
};

export const trackEvent = async (
  _eventName: AnalyticsEventName | string,
  _metadata: Record<string, any> = {},
  _userId?: string | null,
  _options?: TrackOptions
): Promise<void> => {
  // no-op on web
};
