export interface CitySuggestion {
  id: string;
  name: string;
  detail: string;
}

const BASE_URL = import.meta.env.VITE_TRIPS_BASE_URL ?? '/trips';

/** City suggestions for a partially typed place. Throws if the backend is unavailable. */
export async function searchCities(query: string, signal?: AbortSignal): Promise<CitySuggestion[]> {
  const res = await fetch(`${BASE_URL}/places/autocomplete?q=${encodeURIComponent(query)}`, { signal });
  if (!res.ok) throw new Error(`The backend responded ${res.status}`);
  return ((await res.json()) as { suggestions: CitySuggestion[] }).suggestions;
}
