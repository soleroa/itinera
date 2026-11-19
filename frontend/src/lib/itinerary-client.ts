import type { Itinerary, Place } from '../types';

const BASE_URL = import.meta.env.VITE_TRIPS_BASE_URL ?? '/trips';

export class ItineraryError extends Error {}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = '';
    try {
      detail = ((await res.json()) as { message?: string }).message ?? '';
    } catch {
      // no JSON body
    }
    throw new ItineraryError(detail || `The backend responded ${res.status}`);
  }
  return (await res.json()) as T;
}

/** Places worth visiting, proposed by the LLM and verified with Google Places. */
export async function suggestPlaces(destination: string): Promise<Place[]> {
  const data = await post<{ places: Place[] }>('/places/suggest', { destination, count: 8 });
  return data.places;
}

export function buildItinerary(request: {
  destination: string;
  hotel: string;
  days: number;
  places: string[];
}): Promise<Itinerary> {
  return post<Itinerary>('/itinerary', request);
}
