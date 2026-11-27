const STORAGE_KEY = 'auth-token';

let storedToken: string | null = (() => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
})();

type Listener = () => void;
const listeners = new Set<Listener>();

export function getToken(): string | null {
  return storedToken;
}

export function setToken(token: string | null): void {
  storedToken = token;
  if (token === null) {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* localStorage unavailable */ }
  } else {
    try { localStorage.setItem(STORAGE_KEY, token); } catch { /* localStorage unavailable */ }
  }
  listeners.forEach((listener) => listener());
}

export function clearToken(): void {
  setToken(null);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
