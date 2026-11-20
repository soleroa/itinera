import { useCallback, useEffect, useState } from 'react';
import type { Itinerary, TripOption, TripRequest } from '../types';

/** A trip the traveler picked, plus the work done on it (places, built itinerary). */
export interface SavedTrip {
  id: string;
  createdAt: string;
  updatedAt: string;
  trip: TripRequest;
  option: TripOption;
  /** One plan per stop of the trip, in order. */
  plan: StopPlan[];
}

/** The work done on one city: its places and, once built, its itinerary. */
export interface StopPlan {
  /** Places to visit; null until the suggestions were loaded the first time. */
  places: string[] | null;
  itinerary: Itinerary | null;
}

const emptyPlan = (): StopPlan => ({ places: null, itinerary: null });

const KEY = 'itinera.savedTrips.v1';

/**
 * Trips saved before multi-city support had one stay and one plan; bring them to the current shape
 * so they keep opening.
 */
function migrate(raw: Record<string, any>): SavedTrip {
  const trip = { ...raw.trip };
  if (!Array.isArray(trip.stops) || trip.stops.length === 0) {
    const nights = Math.max(
      1,
      Math.round((Date.parse(trip.returnDate) - Date.parse(trip.departure)) / 86_400_000),
    );
    trip.stops = [{ city: trip.destination, nights }];
  }
  const option = { ...raw.option };
  if (!Array.isArray(option.accommodations)) {
    option.accommodations = option.accommodation ? [option.accommodation] : [];
    delete option.accommodation;
  }
  const plan: StopPlan[] = Array.isArray(raw.plan)
    ? raw.plan
    : [{ places: raw.places ?? null, itinerary: raw.itinerary ?? null }];
  while (plan.length < trip.stops.length) plan.push(emptyPlan());
  const { places: _places, itinerary: _itinerary, ...rest } = raw;
  return { ...rest, trip, option, plan } as SavedTrip;
}

function read(): SavedTrip[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t) => t?.trip && t?.option)
      .map(migrate)
      .filter((t) => t.option.accommodations.length > 0);
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
      commit((prev) => [
          ...prev,
          { id, createdAt: now, updatedAt: now, trip, option, plan: trip.stops.map(emptyPlan) },
        ]);
      return id;
    },
    [commit],
  );

  /** Stores the work done on one city of a saved trip. */
  const updateStop = useCallback(
    (id: string, index: number, state: StopPlan) =>
      commit((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                plan: t.plan.map((p, i) => (i === index ? state : p)),
                updatedAt: new Date().toISOString(),
              }
            : t,
        ),
      ),
    [commit],
  );

  const remove = useCallback((id: string) => commit((prev) => prev.filter((t) => t.id !== id)), [commit]);

  return { trips, create, updateStop, remove };
}
