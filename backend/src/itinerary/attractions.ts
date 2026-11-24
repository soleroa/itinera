import { haversineKm } from './geo';
import type { Place } from './google-maps.client';

/** Google types that show up under "tourist attractions" but are not somewhere to visit. */
const NOT_A_SIGHT = new Set([
  'tour_agency',
  'travel_agency',
  'lodging',
  'bus_station',
  'transit_station',
  'train_station',
  'car_rental',
  'real_estate_agency',
  'store',
]);

const MIN_RATING = 4.0;
const MIN_REVIEWS = 50;
/** Two places this close are the same spot (e.g. a sign and its viewpoint). */
const SAME_SPOT_KM = 0.06;
/** Close and sharing a word in the name: the same sight listed twice. */
const NEAR_SAME_NAME_KM = 0.25;

function words(name: string): string[] {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !['the', 'del', 'las', 'los', 'and'].includes(w));
}

function isDuplicate(a: Place, b: Place): boolean {
  const km = haversineKm(a, b);
  if (km <= SAME_SPOT_KM) return true;
  if (km > NEAR_SAME_NAME_KM) return false;
  const wb = new Set(words(b.name));
  return words(a.name).some((w) => wb.has(w));
}

/**
 * Picks the `count` places worth suggesting out of Google's ranked list: drops what is not a sight
 * (agencies, stations), poorly rated or barely reviewed places, and repeats of the same spot.
 * Google's order is kept. If too few survive, the rest are filled with the next best non-duplicates.
 */
export function selectAttractions(places: Place[], count: number): Place[] {
  const sights = places.filter((p) => !p.types.some((t) => NOT_A_SIGHT.has(t)));
  const good = sights.filter(
    (p) => (p.rating ?? 0) >= MIN_RATING && (p.ratingCount ?? 0) >= MIN_REVIEWS,
  );

  const chosen: Place[] = [];
  const take = (list: Place[]) => {
    for (const place of list) {
      if (chosen.length >= count) return;
      if (chosen.includes(place) || chosen.some((c) => isDuplicate(place, c))) continue;
      chosen.push(place);
    }
  };
  take(good);
  take(sights); // not enough good ones: relax the rating filter rather than return a short list
  return chosen;
}
