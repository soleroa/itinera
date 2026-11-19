import { Injectable } from '@nestjs/common';
import type { LatLng } from './geo';

export interface Place extends LatLng {
  id: string;
  name: string;
  address: string;
}

export type TravelMode = 'TRANSIT' | 'WALK' | 'DRIVE';

export interface RouteStep {
  mode: string;
  instruction?: string;
  /** Transit only: e.g. "Subway Line B" and the vehicle type. */
  line?: string;
  vehicle?: string;
  from?: string;
  to?: string;
  seconds: number;
}

export interface Route {
  mode: TravelMode;
  seconds: number;
  meters: number;
  steps: RouteStep[];
}

interface PlacesResponse {
  places?: Array<{
    id: string;
    displayName?: { text: string };
    formattedAddress?: string;
    location?: { latitude: number; longitude: number };
  }>;
}

interface RoutesResponse {
  routes?: Array<{
    duration?: string;
    distanceMeters?: number;
    legs?: Array<{
      steps?: Array<{
        travelMode?: string;
        staticDuration?: string;
        navigationInstruction?: { instructions?: string };
        transitDetails?: {
          stopDetails?: {
            departureStop?: { name?: string };
            arrivalStop?: { name?: string };
          };
          transitLine?: {
            name?: string;
            nameShort?: string;
            vehicle?: { name?: { text?: string } };
          };
        };
      }>;
    }>;
  }>;
}

const PLACES_URL = 'https://places.googleapis.com/v1/places:searchText';
const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

/** Google Places (New) and Routes APIs: https://developers.google.com/maps */
@Injectable()
export class GoogleMapsClient {
  private apiKey(): string {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) {
      throw new Error('Missing GOOGLE_MAPS_API_KEY environment variable.');
    }
    return key;
  }

  /**
   * Resolves a free-text place ("Cerro Campanario, Bariloche") to exact coordinates, or null.
   * Google's top hit is not always the place that was asked for, so several results are
   * requested and the one whose name best matches the query is picked.
   */
  async findPlace(query: string): Promise<Place | null> {
    const response = await fetch(PLACES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey(),
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.location',
      },
      body: JSON.stringify({ textQuery: query, pageSize: 5, languageCode: 'en' }),
    });
    if (!response.ok) {
      throw new Error(`Google Places responded ${response.status}`);
    }
    const candidates = (
      ((await response.json()) as PlacesResponse).places ?? []
    ).filter((p) => p.location);
    const place = pickBestMatch(
      query.split(',')[0],
      candidates,
      (p) => p.displayName?.text ?? '',
    );
    if (!place?.location) return null;
    return {
      id: place.id,
      name: place.displayName?.text ?? query,
      address: place.formattedAddress ?? '',
      lat: place.location.latitude,
      lng: place.location.longitude,
    };
  }

  /** A route between two points, or null when Google has none for that travel mode. */
  async route(
    from: LatLng,
    to: LatLng,
    mode: TravelMode,
  ): Promise<Route | null> {
    const waypoint = (p: LatLng) => ({
      location: { latLng: { latitude: p.lat, longitude: p.lng } },
    });
    const response = await fetch(ROUTES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey(),
        'X-Goog-FieldMask':
          'routes.duration,routes.distanceMeters,routes.legs.steps.travelMode,' +
          'routes.legs.steps.staticDuration,routes.legs.steps.navigationInstruction,' +
          'routes.legs.steps.transitDetails',
      },
      body: JSON.stringify({
        origin: waypoint(from),
        destination: waypoint(to),
        travelMode: mode,
        languageCode: 'en',
      }),
    });
    if (!response.ok) {
      throw new Error(`Google Routes responded ${response.status}`);
    }
    const [route] = ((await response.json()) as RoutesResponse).routes ?? [];
    if (!route?.duration) return null;

    const steps = (route.legs ?? [])
      .flatMap((leg) => leg.steps ?? [])
      .map((step): RouteStep => {
        const transit = step.transitDetails;
        return {
          mode: step.travelMode ?? mode,
          instruction: step.navigationInstruction?.instructions,
          line: transit?.transitLine?.nameShort ?? transit?.transitLine?.name,
          vehicle: transit?.transitLine?.vehicle?.name?.text,
          from: transit?.stopDetails?.departureStop?.name,
          to: transit?.stopDetails?.arrivalStop?.name,
          seconds: parseSeconds(step.staticDuration),
        };
      });
    return {
      mode,
      seconds: parseSeconds(route.duration),
      meters: route.distanceMeters ?? 0,
      steps,
    };
  }
}

/** Google durations look like "1234s". */
function parseSeconds(duration: string | undefined): number {
  return duration ? Number.parseInt(duration, 10) || 0 : 0;
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Picks the candidate whose name matches `wanted`: an exact name first, then one that
 * contains it (or is contained by it), otherwise Google's own top result.
 */
export function pickBestMatch<T>(
  wanted: string,
  candidates: T[],
  nameOf: (candidate: T) => string,
): T | undefined {
  const target = normalize(wanted);
  const named = candidates.map((c) => ({ c, name: normalize(nameOf(c)) }));
  return (
    named.find((n) => n.name === target)?.c ??
    named.find((n) => n.name.includes(target) || target.includes(n.name))?.c ??
    candidates[0]
  );
}
