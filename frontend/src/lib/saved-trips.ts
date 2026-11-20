import { useCallback, useEffect, useState } from 'react';
import type { Itinerary, TripOption, TripRequest } from '../types';

/** A trip the traveler picked, plus the work done on it (places, built itinerary). */
export interface SavedTrip {
  id: string;
  createdAt: string;
  updatedAt: string;
  trip: TripRequest;
  option: TripOption;
  /** Places to visit; null until the suggestions were loaded the first time. */
  places: string[] | null;
  itinerary: Itinerary | null;
}

export type SavedTripPatch = Partial<Pick<SavedTrip, 'places' | 'itinerary'>>;

const KEY = 'itinera.savedTrips.v1';

function read(): SavedTrip[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? (parsed as SavedTrip[]) : [];
  } catch {
    return [];
  }
}

function write(trips: SavedTrip[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(trips));
  } catch {
    // Storage full or blocked: the panel keeps working in memory for this session.
  }
}

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Saved trips, newest activity first, persisted in this browser's localStorage. */
export function useSavedTrips() {
  const [trips, setTrips] = useState<SavedTrip[]>(read);

  // Keep several tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => e.key === KEY && setTrips(read());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const commit = useCallback((update: (prev: SavedTrip[]) => SavedTrip[]) => {
    setTrips((prev) => {
      const next = update(prev).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      write(next);
      return next;
    });
  }, []);

  const create = useCallback(
    (trip: TripRequest, option: TripOption): string => {
      const now = new Date().toISOString();
      const id = newId();
      commit((prev) => [...prev, { id, createdAt: now, updatedAt: now, trip, option, places: null, itinerary: null }]);
      return id;
    },
    [commit],
  );

  const update = useCallback(
    (id: string, patch: SavedTripPatch) =>
      commit((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t)),
      ),
    [commit],
  );

  const remove = useCallback((id: string) => commit((prev) => prev.filter((t) => t.id !== id)), [commit]);

  return { trips, create, update, remove };
}
