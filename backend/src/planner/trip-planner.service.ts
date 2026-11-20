import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { AccommodationTool } from '../tools/accommodation.tool';
import { FlightsTool } from '../tools/flights.tool';
import {
  allCombinations,
  buildChoices,
  Choice,
  Combination,
  pickOptions,
} from './combinations';
import type { Accommodation } from '../tools/accommodation.tool';
import type { Flight } from '../tools/flights.tool';

/** One city of the trip and how many nights are spent there. */
export interface TripStop {
  city: string;
  nights: number;
}

export interface TripRequest {
  origin: string;
  /** First city of the trip (kept for single-city trips and as the headline). */
  destination: string;
  /** Cities in visiting order; the nights add up to the whole trip. Always at least one. */
  stops: TripStop[];
  /** Departure date, YYYY-MM-DD. */
  departure: string;
  /** Return date, YYYY-MM-DD. */
  returnDate: string;
  travelers: number;
  /** Total budget in USD; null if there is no cap. */
  maxBudget: number | null;
}

export interface Alternative {
  change: string;
  departure: string;
  returnDate: string;
  /** The nights per city of this variant. */
  stops: TripStop[];
  option: Combination;
}

export interface TripOptions {
  status: 'ok' | 'over_budget';
  /** Within budget when `ok`; the closest picks (all above the budget) when `over_budget`. */
  options: Combination[];
  /** Only when over budget: the cheapest combination and how much the budget falls short (USD). */
  cheapest?: Combination;
  shortfall?: number;
  /** Only when over budget: variants of dates/nights that do fit, with their cheapest option. */
  alternatives?: Alternative[];
  /** More flights to choose from, with one recommended. Mix and match with `stays`. */
  flights: Choice<Flight>[];
  /** Per stop of the trip, more stays to choose from, with one recommended each. */
  stays: Choice<Accommodation>[][];
  /** Why the recommended flight + stay were picked. */
  recommendationReason: string;
  /** What the budget does NOT cover. */
  notice: string;
}

/** Cap on extra searches (each costs one flights call and one hotels call). */
const MAX_ALTERNATIVE_ATTEMPTS = 3;
const CANDIDATES = 15;
const MAX_STOPS = 4;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const NOTICE =
  'The budget was checked against flight + accommodation only. Food, tickets and local transport are not included.';

@Injectable()
export class TripPlannerService {
  private readonly logger = new Logger(TripPlannerService.name);

  constructor(
    private readonly flights: FlightsTool,
    private readonly accommodation: AccommodationTool,
  ) {}

  validate(body: Partial<TripRequest>): TripRequest {
    const { origin, departure, returnDate, travelers, maxBudget } = body;
    const rawStops = Array.isArray(body.stops) ? body.stops : [];
    const destination = rawStops.length > 0 ? rawStops[0]?.city : body.destination;
    if (!origin?.trim() || !destination?.trim()) {
      throw new BadRequestException('origin and destination are required.');
    }
    if (
      !departure ||
      !returnDate ||
      !DATE.test(departure) ||
      !DATE.test(returnDate)
    ) {
      throw new BadRequestException('Dates must be in YYYY-MM-DD format.');
    }
    if (returnDate <= departure) {
      throw new BadRequestException('returnDate must be after departure.');
    }
    if (!Number.isInteger(travelers) || travelers! < 1) {
      throw new BadRequestException('travelers must be an integer >= 1.');
    }
    if (
      maxBudget != null &&
      (typeof maxBudget !== 'number' || maxBudget <= 0)
    ) {
      throw new BadRequestException('maxBudget must be a positive number.');
    }
    const stops = this.validateStops(rawStops, destination, departure, returnDate);
    return {
      origin: origin.trim(),
      destination: stops[0].city,
      stops,
      departure,
      returnDate,
      travelers: travelers!,
      maxBudget: maxBudget ?? null,
    };
  }

  /** A single city takes every night; several cities must split the trip's nights exactly. */
  private validateStops(
    raw: Array<Partial<TripStop>>,
    destination: string,
    departure: string,
    returnDate: string,
  ): TripStop[] {
    const total = daysBetween(departure, returnDate);
    if (raw.length === 0) return [{ city: destination.trim(), nights: total }];
    if (raw.length > MAX_STOPS) {
      throw new BadRequestException(`A trip can have at most ${MAX_STOPS} cities.`);
    }
    const stops = raw.map((stop) => {
      if (
        typeof stop?.city !== 'string' ||
        !stop.city.trim() ||
        !Number.isInteger(stop.nights) ||
        stop.nights! < 1
      ) {
        throw new BadRequestException(
          'Each stop needs a city and a whole number of nights, at least 1.',
        );
      }
      return { city: stop.city.trim(), nights: stop.nights! };
    });
    const nights = stops.reduce((sum, s) => sum + s.nights, 0);
    if (nights !== total) {
      throw new BadRequestException(
        `The nights per city (${nights}) must add up to the trip length (${total}).`,
      );
    }
    return stops;
  }

  /** Every flight, stays per city and combination (in USD) for a request; combinations cheapest first. */
  private async candidates(req: TripRequest) {
    const last = req.stops[req.stops.length - 1];
    const dates = stopDates(req);
    const [flights, ...stays] = await Promise.all([
      this.flights.execute({
        origin: req.origin,
        destination: req.stops[0].city,
        departureDate: req.departure,
        returnDate: req.returnDate,
        // Several cities: fly into the first, out of the last (open-jaw).
        returnFrom: req.stops.length > 1 ? last.city : undefined,
        passengers: req.travelers,
        maxResults: CANDIDATES,
      }),
      ...dates.map((d) =>
        this.accommodation.execute({
          city: d.city,
          checkIn: d.checkIn,
          checkOut: d.checkOut,
          guests: req.travelers,
          maxResults: CANDIDATES,
        }),
      ),
    ]);

    // All math is done in USD, which is what the APIs return; it is verified here, not by an LLM.
    const usd = (m: { currency: string }) => m.currency === 'USD';
    const usdFlights = flights.flights.filter(usd);
    const usdStays = stays.map((s) => s.accommodations.filter(usd));
    return {
      flights: usdFlights,
      stays: usdStays,
      pairs: allCombinations(usdFlights, usdStays),
    };
  }

  async options(req: TripRequest): Promise<TripOptions> {
    const { flights, stays, pairs: candidates } = await this.candidates(req);
    const choices = buildChoices(flights, stays, req.maxBudget);
    if (!choices) {
      throw new Error('No flights and accommodations with prices to combine.');
    }

    const options = pickOptions(candidates, req.maxBudget);
    if (options.length > 0) {
      return { status: 'ok', options, ...choices, notice: NOTICE };
    }

    const cheapest: Combination = { level: 'cheapest', ...candidates[0] };
    return {
      ...choices,
      status: 'over_budget',
      // Still shown so the user can choose anyway; each one exceeds the budget.
      options: pickOptions(candidates, null),
      cheapest,
      shortfall: cheapest.total - req.maxBudget!,
      alternatives: await this.alternatives(req, req.maxBudget!),
      notice: NOTICE,
    };
  }

  /**
   * Tries, within a search cap, fewer nights and one week later; returns only the
   * variants whose cheapest combination fits the budget.
   */
  private async alternatives(
    req: TripRequest,
    maxBudget: number,
  ): Promise<Alternative[]> {
    const nights = daysBetween(req.departure, req.returnDate);
    const today = new Date().toISOString().slice(0, 10);
    const last = req.stops[req.stops.length - 1];
    const fewer = (n: number) => ({
      change: n === 1 ? 'One night fewer' : 'Two nights fewer',
      departure: req.departure,
      returnDate: addDays(req.returnDate, -n),
      // The nights are taken off the last city.
      stops: [...req.stops.slice(0, -1), { ...last, nights: last.nights - n }],
    });
    const variants: Array<Omit<Alternative, 'option'>> = [];
    // Several cities cost more searches (one stay search per city), so only the date shift is tried.
    if (req.stops.length === 1) {
      if (nights >= 2) variants.push(fewer(1));
      if (nights >= 3) variants.push(fewer(2));
    }
    variants.push({
      change: 'Travel one week later',
      departure: addDays(req.departure, 7),
      returnDate: addDays(req.returnDate, 7),
      stops: req.stops,
    });

    const attempts = variants
      .filter((v) => v.departure > today)
      .slice(0, MAX_ALTERNATIVE_ATTEMPTS);
    const results = await Promise.all(
      attempts.map(async (v): Promise<Alternative | null> => {
        try {
          const { pairs } = await this.candidates({ ...req, ...v });
          const [best] = pickOptions(pairs, maxBudget);
          return best ? { ...v, option: best } : null;
        } catch (error) {
          this.logger.warn(
            `Alternative "${v.change}" failed: ${error instanceof Error ? error.message : error}`,
          );
          return null;
        }
      }),
    );
    return results.filter((a): a is Alternative => a !== null);
  }
}

/** Check-in and check-out of every stop, in order, from the departure date and the nights per city. */
export function stopDates(
  req: Pick<TripRequest, 'departure' | 'stops'>,
): Array<{ city: string; checkIn: string; checkOut: string }> {
  let checkIn = req.departure;
  return req.stops.map((stop) => {
    const checkOut = addDays(checkIn, stop.nights);
    const dates = { city: stop.city, checkIn, checkOut };
    checkIn = checkOut;
    return dates;
  });
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
