import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

import { fetchEvents, createEvent, updateEvent as updateEventApi, deleteEvent, AuthError } from '@/api/events';
import { useAuth } from '@/context/auth-context';
import { Event } from '@/types/event';
import { useLocalization } from '@/localization';

interface EventsContextValue {
  events: Event[];
  loading: boolean;
  error: string | null;
  addEvent: (description: string, date: number, emoji?: string) => Promise<void>;
  updateEvent: (id: string, description: string, date: number, emoji?: string) => Promise<void>;
  removeEvent: (id: string) => Promise<void>;
  refreshEvents: () => Promise<void>;
}

const EventsContext = createContext<EventsContextValue | null>(null);

interface EventsProviderProps {
  children: ReactNode;
}

export function EventsProvider({ children }: EventsProviderProps) {
  const { t } = useLocalization();
  const { logout, token } = useAuth();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchEvents();
      setEvents(data);
    } catch (err) {
      if (err instanceof AuthError) {
        logout();
        return;
      }
      const message = err instanceof Error ? err.message : t.errors.failedToLoad;
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [logout, t.errors.failedToLoad]);

  useEffect(() => {
    if (token) {
      loadEvents();
    }
  }, [loadEvents, token]);

  async function addEvent(description: string, date: number, emoji?: string) {
    try {
      setError(null);
      const newEvent = await createEvent(description, date, emoji);
      setEvents((prev) => [...prev, newEvent]);
    } catch (err) {
      if (err instanceof AuthError) {
        logout();
        return;
      }
      const message = err instanceof Error ? err.message : t.errors.failedToAdd;
      setError(message);
    }
  }

  async function updateEvent(id: string, description: string, date: number, emoji?: string) {
    try {
      setError(null);
      const updatedEvent = await updateEventApi(id, description, date, emoji);
      setEvents((prev) => prev.map((event) => (event.id === id ? updatedEvent : event)));
    } catch (err) {
      if (err instanceof AuthError) {
        logout();
        return;
      }
      const message = err instanceof Error ? err.message : t.errors.failedToUpdate;
      setError(message);
    }
  }

  async function removeEvent(id: string) {
    try {
      setError(null);
      await deleteEvent(id);
      setEvents((prev) => prev.filter((event) => event.id !== id));
    } catch (err) {
      if (err instanceof AuthError) {
        logout();
        return;
      }
      const message = err instanceof Error ? err.message : t.errors.failedToRemove;
      setError(message);
    }
  }

  async function refreshEvents() {
    setLoading(true);
    await loadEvents();
  }

  return (
    <EventsContext.Provider value={{ events, loading, error, addEvent, updateEvent, removeEvent, refreshEvents }}>
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents(): EventsContextValue {
  const context = useContext(EventsContext);
  if (!context) {
    throw new Error('useEvents must be used within an EventsProvider');
  }
  return context;
}
