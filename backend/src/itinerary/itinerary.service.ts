import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { clusterIntoDays, nearestNeighborOrder } from './geo';
import {
  GoogleMapsClient,
  Place,
  Route,
  TravelMode,
} from './google-maps.client';

export interface ItineraryRequest {
  destination: string;
  /** Hotel name (searched together with the destination to get its coordinates). */
  hotel: string;
  days: number;
  /** Free-text names of the places to visit. */
  places: string[];
}

export interface Leg {
  /** Where this leg starts: the hotel for the first stop, the previous stop otherwise. */
  from: string;
  mode: TravelMode;
  /** False when Google has no public transport for this leg and a fallback was used. */
  transitAvailable: boolean;
  minutes: number;
  meters: number;
  steps: Route['steps'];
}

export interface Transfer {
  from: string;
  to: string;
  /** Null if no route could be found at all. */
  leg: Leg | null;
}

export interface Stop {
  place: Place;
  /** Null if no route could be found at all. */
  leg: Leg | null;
}

export interface ItineraryDay {
  day: number;
  stops: Stop[];
  totalTravelMinutes: number;
  warnings: string[];
}

export interface Itinerary {
  hotel: Place;
  days: ItineraryDay[];
  /** Places Google could not find. */
  unresolved: string[];
}

/** A leg longer than this triggers a warning (the place is accepted anyway). */
export const MAX_LEG_MINUTES = 30;
const MAX_DAYS = 14;
const MAX_PLACES = 30;

@Injectable()
export class ItineraryService {
  private readonly logger = new Logger(ItineraryService.name);

  constructor(private readonly maps: GoogleMapsClient) {}

  validate(body: Partial<ItineraryRequest>): ItineraryRequest {
    const { destination, hotel, days, places } = body;
    if (!destination?.trim() || !hotel?.trim()) {
      throw new BadRequestException('destination and hotel are required.');
    }
    if (!Number.isInteger(days) || days! < 1 || days! > MAX_DAYS) {
      throw new BadRequestException(`days must be an integer between 1 and ${MAX_DAYS}.`);
    }
    const cleaned = (Array.isArray(places) ? places : [])
      .filter((p): p is string => typeof p === 'string')
      .map((p) => p.trim())
      .filter(Boolean);
    if (cleaned.length === 0 || cleaned.length > MAX_PLACES) {
      throw new BadRequestException(`places must have between 1 and ${MAX_PLACES} entries.`);
    }
    return {
      destination: destination.trim(),
      hotel: hotel.trim(),
      days: days!,
      places: cleaned,
    };
  }

  async build(req: ItineraryRequest): Promise<Itinerary> {
    const hotel = await this.maps.findPlace(`${req.hotel}, ${req.destination}`);
    if (!hotel) {
      throw new BadRequestException(`Could not locate the hotel "${req.hotel}".`);
    }

    const found = await Promise.all(
      req.places.map((name) =>
        this.maps.findPlace(`${name}, ${req.destination}`),
      ),
    );
    const unresolved = req.places.filter((_, i) => !found[i]);
    const unique = new Map<string, Place>();
    for (const place of found) {
      if (place) unique.set(place.id, place);
    }
    if (unique.size === 0) {
      throw new BadRequestException('None of the places could be found.');
    }

    // Grouping and ordering are done in code (not by the LLM); Routes only prices the legs.
    const groups = clusterIntoDays([...unique.values()], req.days)
      .map((group) => nearestNeighborOrder(hotel, group));

    const days = await Promise.all(
      groups.map((group, index) => this.buildDay(index + 1, hotel, group)),
    );
    return { hotel, days, unresolved };
  }

  private async buildDay(
    day: number,
    hotel: Place,
    ordered: Place[],
  ): Promise<ItineraryDay> {
    const legs = await Promise.all(
      ordered.map((place, i) => {
        const from = i === 0 ? hotel : ordered[i - 1];
        return this.leg(from, place);
      }),
    );
    const stops = ordered.map((place, i): Stop => ({ place, leg: legs[i] }));

    const warnings = stops.flatMap((stop) =>
      stop.leg && stop.leg.minutes > MAX_LEG_MINUTES
        ? [
            `${stop.place.name} is ${stop.leg.minutes} min from ${stop.leg.from}, more than the ${MAX_LEG_MINUTES} min suggested between stops.`,
          ]
        : [],
    );
    return {
      day,
      stops,
      totalTravelMinutes: stops.reduce((sum, s) => sum + (s.leg?.minutes ?? 0), 0),
      warnings,
    };
  }

  /**
   * How to get from one city to the next: public transport (train or bus) first, then driving.
   * Walking is never offered between cities. The duration comes from Google Routes, never invented.
   */
  async transfer(fromCity: string, toCity: string): Promise<Transfer> {
    const [from, to] = await Promise.all([
      this.maps.findPlace(fromCity),
      this.maps.findPlace(toCity),
    ]);
    if (!from || !to) {
      throw new BadRequestException(
        `Could not find ${!from ? fromCity : toCity} on the map.`,
      );
    }
    const when = daytimeTomorrow();
    const leg =
      (await this.tryLeg(from, to, 'TRANSIT', when)) ??
      (await this.tryLeg(from, to, 'DRIVE', when));
    return { from: fromCity, to: toCity, leg };
  }

  /**
   * Public transport first; if Google has none, walking, or driving when the walk is longer
   * than MAX_LEG_MINUTES (and driving is actually faster). Never invented.
   */
  private async leg(from: Place, to: Place): Promise<Leg | null> {
    const transit = await this.tryLeg(from, to, 'TRANSIT');
    if (transit) return transit;
    const walk = await this.tryLeg(from, to, 'WALK');
    if (walk && walk.minutes <= MAX_LEG_MINUTES) return walk;
    const drive = await this.tryLeg(from, to, 'DRIVE');
    if (drive && (!walk || drive.minutes < walk.minutes)) return drive;
    return walk;
  }

  private async tryLeg(
    from: Place,
    to: Place,
    mode: TravelMode,
    departureTime?: string,
  ): Promise<Leg | null> {
    try {
      const route = await this.maps.route(from, to, mode, departureTime);
      if (!route) return null;
      return {
        from: from.name,
        mode,
        transitAvailable: mode === 'TRANSIT',
        minutes: Math.max(1, Math.round(route.seconds / 60)),
        meters: route.meters,
        steps: route.steps,
      };
    } catch (error) {
      this.logger.warn(
        `Route ${from.name} → ${to.name} (${mode}) failed: ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
  }
}

/** Tomorrow at 09:00 UTC (morning in the Americas, midday in Europe): a time when long-distance transit runs. */
function daytimeTomorrow(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(9, 0, 0, 0);
  return d.toISOString();
}
