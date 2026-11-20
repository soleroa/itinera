import { analyticsHeaders } from './analytics';
import type { TripOptionsResponse, TripRequest } from '../types';

const API_URL = import.meta.env.VITE_TRIPS_URL ?? '/trips/options';

export class TripsError extends Error {}

export async function fetchTripOptions(
  trip: TripRequest,
  signal?: AbortSignal,
): Promise<TripOptionsResponse> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...analyticsHeaders() },
    body: JSON.stringify({
      origin: trip.origin,
      destination: trip.destination,
      stops: trip.stops,
      departure: trip.departure,
      returnDate: trip.returnDate,
      travelers: trip.travelers,
      maxBudget: trip.maxBudget,
    }),
    signal,
  });

  if (!res.ok) {
    let detail = '';
    try {
      detail = ((await res.json()) as { message?: string }).message ?? '';
    } catch {
      // no JSON body
    }
    throw new TripsError(detail || `The backend responded ${res.status}`);
  }
  return (await res.json()) as TripOptionsResponse;
}
