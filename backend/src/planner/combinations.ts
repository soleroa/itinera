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
