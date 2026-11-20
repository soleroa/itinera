import { Injectable } from '@nestjs/common';
import type { LatLng } from './geo';

export interface Place extends LatLng {
  id: string;
  name: string;
  address: string;
  /** Google place types, e.g. "tourist_attraction" or "locality". */
  types: string[];
}

export interface CitySuggestion {
  id: string;
  /** E.g. "San Carlos de Bariloche". */
  name: string;
  /** E.g. "Río Negro, Argentina". Empty for a whole country. */
  detail: string;
  /** A country or region is too broad to search flights or plan days; a city is not. */
  kind: 'city' | 'region' | 'country';
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
    types?: string[];
    location?: { latitude: number; longitude: number };
  }>;
}

interface AutocompleteResponse {
  suggestions?: Array<{
    placePrediction?: {
      placeId: string;
      text?: { text: string };
      types?: string[];
      structuredFormat?: {
        mainText?: { text: string };
        secondaryText?: { text: string };
      };
    };
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
const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

/** Google Places (New) and Routes APIs: https://developers.google.com/maps */
@Injectable()
export class GoogleMapsClient {
  private placesHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': this.apiKey(),
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.types,places.location',
    };
  }

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
   * requested and the one whose name best matches the query is picked. With `strict`, a
   * result whose name does not match is rejected instead of falling back to Google's top hit.
   */
  async findPlace(
    query: string,
    options: { strict?: boolean } = {},
  ): Promise<Place | null> {
    const response = await fetch(PLACES_URL, {
      method: 'POST',
      headers: this.placesHeaders(),
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
      !options.strict,
    );
    return place ? toPlace(place, query) : null;
  }

  /** Place suggestions (cities, regions and countries) for a partially typed destination or origin. */
  async autocompleteCities(input: string): Promise<CitySuggestion[]> {
    const response = await fetch(AUTOCOMPLETE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey(),
      },
      body: JSON.stringify({
        input,
        includedPrimaryTypes: [
          'locality',
          'country',
          'administrative_area_level_1',
          'administrative_area_level_2',
        ],
        languageCode: 'en',
        // A bias, not a restriction: Argentine matches rank first, the rest of the world still appears.
        locationBias: {
          rectangle: {
            low: { latitude: -55.1, longitude: -73.6 },
            high: { latitude: -21.7, longitude: -53.6 },
          },
        },
      }),
    });
    if (!response.ok) {
      throw new Error(`Google Places responded ${response.status}`);
    }
    return (((await response.json()) as AutocompleteResponse).suggestions ?? [])
      .flatMap((s) => (s.placePrediction ? [s.placePrediction] : []))
      .map((p) => ({
        id: p.placeId,
        name: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
        detail: p.structuredFormat?.secondaryText?.text ?? '',
        kind: kindOf(p.types ?? []),
      }))
      .filter((c) => c.name !== '');
  }

  /** The destination's best-rated tourist attractions, as ranked by Google Places. */
  async topAttractions(destination: string, count: number): Promise<Place[]> {
    const response = await fetch(PLACES_URL, {
      method: 'POST',
      headers: this.placesHeaders(),
      body: JSON.stringify({
        textQuery: `top tourist attractions in ${destination}`,
        includedType: 'tourist_attraction',
        pageSize: count,
        languageCode: 'en',
      }),
    });
    if (!response.ok) {
      throw new Error(`Google Places responded ${response.status}`);
    }
    return (((await response.json()) as PlacesResponse).places ?? [])
      .filter((p) => p.location)
      .map((p) => toPlace(p, destination));
  }

  /** A route between two points, or null when Google has none for that travel mode. */
  async route(
    from: LatLng,
    to: LatLng,
    mode: TravelMode,
    /** ISO time to plan the trip for. By default Google plans for right now, so at night transit is scarce. */
    departureTime?: string,
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
        // Only transit and driving-with-traffic accept a departure time; walking does not.
        ...(departureTime && mode !== 'WALK' ? { departureTime } : {}),
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

function kindOf(types: string[]): CitySuggestion['kind'] {
  if (types.includes('country')) return 'country';
  if (types.includes('locality')) return 'city';
  return 'region';
}

type ApiPlace = NonNullable<PlacesResponse['places']>[number];

function toPlace(place: ApiPlace, fallbackName: string): Place {
  return {
    id: place.id,
    name: place.displayName?.text ?? fallbackName,
    address: place.formattedAddress ?? '',
    types: place.types ?? [],
    lat: place.location!.latitude,
    lng: place.location!.longitude,
  };
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
 * shares all its words (in any order), otherwise Google's own top result (unless
 * `fallback` is false, in which case nothing is returned).
 */
export function pickBestMatch<T>(
  wanted: string,
  candidates: T[],
  nameOf: (candidate: T) => string,
  fallback = true,
): T | undefined {
  const target = normalize(wanted);
  const targetWords = target.split(' ');
  const named = candidates.map((c) => {
    const name = normalize(nameOf(c));
    return { c, name, words: name.split(' ') };
  });
  // A candidate's words may all appear in the query only if it has 2+ words, so a
  // one-letter or one-word name cannot match almost anything.
  const sharesWords = (n: { words: string[] }) =>
    targetWords.every((w) => n.words.includes(w)) ||
    (n.words.length >= 2 && n.words.every((w) => targetWords.includes(w)));
  return (
    named.find((n) => n.name === target)?.c ??
    named.find(sharesWords)?.c ??
    (fallback ? candidates[0] : undefined)
  );
}
