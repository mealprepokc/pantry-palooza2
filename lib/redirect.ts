import { Platform } from 'react-native';

export const APP_SCHEME = 'pantrypalooza';

export function getRedirectTo(): string {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return `${window.location.origin}/auth`;
    }
    // Fallback for SSR/static
    return '/auth';
  }
  return `${APP_SCHEME}://auth`;
}
