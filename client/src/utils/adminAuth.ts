const ADMIN_SESSION_KEY = 'shieldroute_admin_session';

function hasWindow() {
  return typeof window !== 'undefined';
}

export function isAdminAuthenticated(): boolean {
  if (!hasWindow()) return false;
  return window.localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
}

export function setAdminAuthenticated(authenticated: boolean): void {
  if (!hasWindow()) return;

  if (authenticated) {
    window.localStorage.setItem(ADMIN_SESSION_KEY, 'true');
    return;
  }

  window.localStorage.removeItem(ADMIN_SESSION_KEY);
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  const expectedUsername = (import.meta.env.VITE_ADMIN_USERNAME || 'admin').trim();
  const expectedPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';

  return username.trim() === expectedUsername && password === expectedPassword;
}
