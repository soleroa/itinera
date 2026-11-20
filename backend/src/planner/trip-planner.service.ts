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

export interface TripRequest {
  origin: string;
  destination: string;
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
  /** More stays to choose from, with one recommended. */
  stays: Choice<Accommodation>[];
  /** Why the recommended flight + stay were picked. */
  recommendationReason: string;
  /** What the budget does NOT cover. */
  notice: string;
}

/** Cap on extra searches (each costs one flights call and one hotels call). */
const MAX_ALTERNATIVE_ATTEMPTS = 3;
const CANDIDATES = 15;
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
    const { origin, destination, departure, returnDate, travelers, maxBudget } =
      body;
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
    return {
      origin: origin.trim(),
      destination: destination.trim(),
      departure,
      returnDate,
      travelers: travelers!,
      maxBudget: maxBudget ?? null,
    };
  }

  /** Every flight, stay and combination (in USD) for a request; combinations cheapest first. */
  private async candidates(req: TripRequest) {
    const [flights, stays] = await Promise.all([
      this.flights.execute({
        origin: req.origin,
        destination: req.destination,
        departureDate: req.departure,
        returnDate: req.returnDate,
        passengers: req.travelers,
        maxResults: CANDIDATES,
      }),
      this.accommodation.execute({
        city: req.destination,
        checkIn: req.departure,
        checkOut: req.returnDate,
        guests: req.travelers,
        maxResults: CANDIDATES,
      }),
    ]);

    // All math is done in USD, which is what the APIs return; it is verified here, not by an LLM.
    const usd = (m: { currency: string }) => m.currency === 'USD';
    const usdFlights = flights.flights.filter(usd);
    const usdStays = stays.accommodations.filter(usd);
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
    const variants: Array<{
      change: string;
      departure: string;
      returnDate: string;
    }> = [];
    if (nights >= 2) {
      variants.push({
        change: 'One night fewer',
        departure: req.departure,
        returnDate: addDays(req.returnDate, -1),
      });
    }
    if (nights >= 3) {
      variants.push({
        change: 'Two nights fewer',
        departure: req.departure,
        returnDate: addDays(req.returnDate, -2),
      });
    }
    variants.push({
      change: 'Travel one week later',
      departure: addDays(req.departure, 7),
      returnDate: addDays(req.returnDate, 7),
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

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
