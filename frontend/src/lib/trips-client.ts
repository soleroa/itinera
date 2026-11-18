import type { TripOptionsResponse, TripRequest } from '../types';

const API_URL = import.meta.env.VITE_TRIPS_URL ?? '/trips/options';

export class TripsError extends Error {}

export async function fetchTripOptions(
  trip: TripRequest,
  signal?: AbortSignal,
): Promise<TripOptionsResponse> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origen: trip.origen,
      destino: trip.destino,
      salida: trip.salida,
      vuelta: trip.vuelta,
      personas: trip.personas,
      // El backend solo usa el tope: el mínimo no se verifica.
      presupuestoMax: trip.presupuestoMax,
    }),
    signal,
  });

  if (!res.ok) {
    let detail = '';
    try {
      detail = ((await res.json()) as { message?: string }).message ?? '';
    } catch {
      // sin cuerpo JSON
    }
    throw new TripsError(detail || `El backend respondió ${res.status}`);
  }
  return (await res.json()) as TripOptionsResponse;
}
