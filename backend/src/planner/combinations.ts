import type { Accommodation } from '../tools/accommodation.tool';
import type { Flight } from '../tools/flights.tool';

export type Level = 'cheapest' | 'balanced' | 'best';

export interface Combination {
  level: Level;
  flight: Flight;
  /** One stay per stop of the trip, in order (a single entry for a one-city trip). */
  accommodations: Accommodation[];
  /** Flight + every stay, in USD. */
  total: number;
}

interface Pair {
  flight: Flight;
  accommodations: Accommodation[];
  total: number;
  quality: number;
}

/** Quality of one stay: guest rating plus star class. */
function stayQuality(hotel: Accommodation): number {
  const stars = Number(hotel.category?.match(/\d/)?.[0] ?? 0);
  return (hotel.rating ?? 3.5) + stars * 0.3;
}

/** Quality of a pair: the average stay quality, penalized by flight stops. */
export function quality(flight: Flight, hotels: Accommodation[]): number {
  const avg = hotels.reduce((sum, h) => sum + stayQuality(h), 0) / hotels.length;
  return avg - flight.stops * 0.5;
}

/** How many stays per city take part in the combinations, so they stay few for long trips. */
function stayPoolSize(stops: number): number {
  return stops <= 1 ? Number.POSITIVE_INFINITY : stops === 2 ? 6 : 4;
}

/** Every combination of one flight and one stay per city; cheapest first. */
export function allCombinations(
  flights: Flight[],
  staysByStop: Accommodation[][],
): Pair[] {
  if (staysByStop.length === 0 || staysByStop.some((s) => s.length === 0)) return [];
  const size = stayPoolSize(staysByStop.length);
  const pools = staysByStop.map((stays) =>
    [...stays].sort((a, b) => a.totalPrice - b.totalPrice).slice(0, size),
  );
  const stayCombos = pools.reduce<Accommodation[][]>(
    (acc, pool) => acc.flatMap((combo) => pool.map((stay) => [...combo, stay])),
    [[]],
  );

  const pairs: Pair[] = [];
  for (const flight of flights) {
    for (const accommodations of stayCombos) {
      pairs.push({
        flight,
        accommodations,
        total:
          flight.totalPrice +
          accommodations.reduce((sum, h) => sum + h.totalPrice, 0),
        quality: quality(flight, accommodations),
      });
    }
  }
  return pairs.sort((a, b) => a.total - b.total);
}

/**
 * Picks up to 3 distinct combinations that fit within `maxBudget` (no cap if null):
 * the cheapest, the best quality/price ratio and the highest quality.
 */
export function pickOptions(
  candidates: Pair[],
  maxBudget: number | null,
): Combination[] {
  const feasible = candidates.filter(
    (c) => maxBudget === null || c.total <= maxBudget,
  );

  const used = new Set<Pair>();
  const pick = (level: Level, order: (a: Pair, b: Pair) => number) => {
    const chosen = feasible.filter((c) => !used.has(c)).sort(order)[0];
    if (!chosen) return null;
    used.add(chosen);
    return {
      level,
      flight: chosen.flight,
      accommodations: chosen.accommodations,
      total: chosen.total,
    };
  };

  return [
    pick('cheapest', (a, b) => a.total - b.total),
    pick('balanced', (a, b) => b.quality / b.total - a.quality / a.total),
    pick('best', (a, b) => b.quality - a.quality || a.total - b.total),
  ].filter((c): c is Combination => c !== null);
}

export type Choice<T> = T & { recommended: boolean };

export interface Choices {
  /** Flights to pick from, cheapest first; exactly one is marked `recommended`. */
  flights: Choice<Flight>[];
  /** Per stop of the trip, the stays to pick from, cheapest first; exactly one per stop is `recommended`. */
  stays: Choice<Accommodation>[][];
  /** Why the recommended flight and stays were chosen. */
  recommendationReason: string;
}

/** How many flights and stays (per city) are offered for the user to choose from. */
export const CHOICES_SHOWN = 8;

/**
 * The flights and stays to offer, plus a recommendation computed in code: the best
 * quality-for-price combination that fits the budget, or the cheapest when none fits.
 * Returns null if there is nothing to combine.
 */
export function buildChoices(
  flights: Flight[],
  staysByStop: Accommodation[][],
  maxBudget: number | null,
): Choices | null {
  const pairs = allCombinations(flights, staysByStop);
  if (pairs.length === 0) return null;

  const fits = pickOptions(pairs, maxBudget);
  const balanced = fits.find((o) => o.level === 'balanced') ?? fits[0];
  const recommended = balanced ?? pairs[0];
  const reason = balanced
    ? 'Best quality for the price within your budget'
    : 'The cheapest combination we found, still over your budget';

  const shown = <T extends { totalPrice: number }>(items: T[], pick: T): Choice<T>[] => {
    const byPrice = [...new Set(items)].sort((a, b) => a.totalPrice - b.totalPrice);
    const top = byPrice.slice(0, CHOICES_SHOWN);
    if (!top.includes(pick)) top[top.length - 1] = pick;
    top.sort((a, b) => a.totalPrice - b.totalPrice);
    return top.map((item) => ({ ...item, recommended: item === pick }));
  };

  return {
    flights: shown(flights, recommended.flight),
    stays: staysByStop.map((stays, i) => shown(stays, recommended.accommodations[i])),
    recommendationReason: reason,
  };
}
