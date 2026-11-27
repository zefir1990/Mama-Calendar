import { getToken } from './token';
import { Event } from '@/types/event';

const API_BASE = 'http://localhost:3001/api';

export class AuthError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'AuthError';
  }
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  if (!token) {
    throw new AuthError();
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function handleResponse(response: Response): Promise<any> {
  if (response.status === 401) {
    throw new AuthError();
  }
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

export async function fetchEvents(): Promise<Event[]> {
  const response = await fetch(`${API_BASE}/events`, {
    headers: authHeaders(),
  });
  return handleResponse(response);
}

export async function createEvent(description: string, date: number, emoji?: string): Promise<Event> {
  const response = await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ description, date, emoji }),
  });
  return handleResponse(response);
}

export async function updateEvent(id: string, description: string, date: number, emoji?: string): Promise<Event> {
  const response = await fetch(`${API_BASE}/events/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ description, date, emoji }),
  });
  return handleResponse(response);
}

export async function deleteEvent(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/events/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse(response);
}






