import { API_BASE } from './config';

export async function authorize(username: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE}/auth/authorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Authorization failed');
  }

  const result = await response.json();
  return result.token;
}

export async function register(username: string, password: string): Promise<void> {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Registration failed');
  }
}






