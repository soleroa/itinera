import type { Accommodation } from '../tools/accommodation.tool';
import type { Flight } from '../tools/flights.tool';

export type Level = 'cheapest' | 'balanced' | 'best';

export interface Combination {
  level: Level;
  flight: Flight;
  accommodation: Accommodation;
  /** Flight + accommodation, in USD. */
  total: number;
}

interface Pair {
  flight: Flight;
  accommodation: Accommodation;
  total: number;
  quality: number;
}

/** Quality of a pair: hotel rating and star class, penalized by flight stops. */
export function quality(flight: Flight, hotel: Accommodation): number {
  const stars = Number(hotel.category?.match(/\d/)?.[0] ?? 0);
  return (hotel.rating ?? 3.5) + stars * 0.3 - flight.stops * 0.5;
}

/** Every flight + accommodation pair (in USD), cheapest first. */
export function allCombinations(
  flights: Flight[],
  hotels: Accommodation[],
): Pair[] {
  const pairs: Pair[] = [];
  for (const flight of flights) {
    for (const accommodation of hotels) {
      pairs.push({
        flight,
        accommodation,
        total: flight.totalPrice + accommodation.totalPrice,
        quality: quality(flight, accommodation),
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
      accommodation: chosen.accommodation,
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
  /** Stays to pick from, cheapest first; exactly one is marked `recommended`. */
  stays: Choice<Accommodation>[];
  /** Why the recommended pair was chosen. */
  recommendationReason: string;
}

/** How many flights and stays are offered for the user to choose from. */
export const CHOICES_SHOWN = 8;

/**
 * The flights and stays to offer, plus a recommended pair computed in code: the best
 * quality-for-price pair that fits the budget, or the cheapest pair when none fits.
 * Returns null if there is nothing to combine.
 */
export function buildChoices(
  flights: Flight[],
  hotels: Accommodation[],
  maxBudget: number | null,
): Choices | null {
  const pairs = allCombinations(flights, hotels);
  if (pairs.length === 0) return null;

  const fits = pickOptions(pairs, maxBudget);
  const balanced = fits.find((o) => o.level === 'balanced') ?? fits[0];
  const recommended = balanced ?? pairs[0];
  const reason = balanced
    ? 'Best quality for the price within your budget'
    : 'The cheapest pair we found, still over your budget';

  const shown = <T extends { totalPrice: number }>(items: T[], pick: T): Choice<T>[] => {
    const byPrice = [...new Set(items)].sort((a, b) => a.totalPrice - b.totalPrice);
    const top = byPrice.slice(0, CHOICES_SHOWN);
    if (!top.includes(pick)) top[top.length - 1] = pick;
    top.sort((a, b) => a.totalPrice - b.totalPrice);
    return top.map((item) => ({ ...item, recommended: item === pick }));
  };

  return {
    flights: shown(flights, recommended.flight),
    stays: shown(hotels, recommended.accommodation),
    recommendationReason: reason,
  };
}
