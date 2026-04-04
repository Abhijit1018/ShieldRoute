import type { AuthSession } from '../types';

const RIDER_AUTH_KEY = 'shieldroute_rider_auth';

function hasWindow() {
  return typeof window !== 'undefined';
}

export function getStoredRiderAuth(): AuthSession | null {
  if (!hasWindow()) return null;

  const raw = window.localStorage.getItem(RIDER_AUTH_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (!parsed.token || !parsed.phone || !parsed.riderId) return null;

    return {
      token: parsed.token,
      phone: parsed.phone,
      riderId: parsed.riderId,
    };
  } catch {
    return null;
  }
}

export function setStoredRiderAuth(session: AuthSession): void {
  if (!hasWindow()) return;
  window.localStorage.setItem(RIDER_AUTH_KEY, JSON.stringify(session));
}

export function clearStoredRiderAuth(): void {
  if (!hasWindow()) return;
  window.localStorage.removeItem(RIDER_AUTH_KEY);
}
