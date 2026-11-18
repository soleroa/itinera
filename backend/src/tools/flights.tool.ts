import { Injectable } from '@nestjs/common';
import {
  Airport,
  FlightSearchFilters,
  FlightResult,
  SearchFlights,
  SeatType,
  SortBy,
  buildFlightSegments,
  googleFlightsUrl,
  searchAirports,
} from 'fli-js';
import { JsonSchemaObject, Tool } from '../common/tool.interface';

interface FlightsInput {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers?: number;
  maxTotalPrice?: number;
  /** Internal (not in the LLM schema): result cap, default 5. */
  maxResults?: number;
}

export interface Flight {
  airline: string;
  totalPrice: number;
  currency: string;
  stops: number;
  outboundDeparture: string;
  outboundArrival: string;
  /** Google Flights link with the route and dates preloaded, for booking. */
  link: string;
}

export interface FlightsOutput {
  flights: Flight[];
}

const MAX_RESULTS = 5;

/**
 * searchAirports does not disambiguate countries ("Santa Fe" returns the New Mexico one),
 * so the most searched Argentine cities are resolved here first.
 */
const ARGENTINE_AIRPORTS: Record<string, string[]> = {
  'santa fe': ['SFN'],
  rosario: ['ROS'],
  cordoba: ['COR'],
  mendoza: ['MDZ'],
  tucuman: ['TUC'],
  salta: ['SLA'],
  jujuy: ['JUJ'],
  neuquen: ['NQN'],
  bariloche: ['BRC'],
  'san carlos de bariloche': ['BRC'],
  ushuaia: ['USH'],
  'el calafate': ['FTE'],
  iguazu: ['IGR'],
  'puerto iguazu': ['IGR'],
  'mar del plata': ['MDQ'],
  parana: ['PRA'],
  corrientes: ['CNQ'],
  posadas: ['PSS'],
  resistencia: ['RES'],
  'comodoro rivadavia': ['CRD'],
  trelew: ['REL'],
  'puerto madryn': ['PMY'],
  'san juan': ['UAQ'],
  'san luis': ['LUQ'],
  'santiago del estero': ['SDE'],
};

@Injectable()
export class FlightsTool implements Tool<FlightsInput, FlightsOutput> {
  name = 'search_flights';
  description =
    'Searches one-way (or round-trip) flights between two cities for a date, ' +
    'optionally filtering by maximum total price. Returns the cheapest ones. Prices are in USD.';
  inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      origin: {
        type: 'string',
        description: 'Origin city or airport, e.g. Buenos Aires',
      },
      destination: {
        type: 'string',
        description: 'Destination city or airport, e.g. Bariloche',
      },
      departureDate: {
        type: 'string',
        description: 'Departure date in YYYY-MM-DD format',
      },
      returnDate: {
        type: 'string',
        description: 'Return date in YYYY-MM-DD format (optional)',
      },
      passengers: {
        type: 'number',
        description: 'Number of adult passengers (optional, default 1)',
      },
      maxTotalPrice: {
        type: 'number',
        description: 'Maximum total price in USD (optional)',
      },
    },
    required: ['origin', 'destination', 'departureDate'],
  };

  async execute(input: FlightsInput): Promise<FlightsOutput> {
    const origins = this.resolveAirports(input.origin);
    const destinations = this.resolveAirports(input.destination);
    const passengers = input.passengers ?? 1;

    const link = googleFlightsUrl(
      input.origin,
      input.destination,
      input.departureDate,
      input.returnDate,
      { currency: 'USD', language: 'en', country: 'US' },
    );

    const results = await this.search(
      origins,
      destinations,
      input.departureDate,
      input.returnDate,
      passengers,
    );

    const flights =
      results !== null
        ? results.map((result) => {
            // On round trips each result is [outbound, return] and the total price is on the last one.
            const [outbound] = Array.isArray(result) ? result : [result];
            const total = Array.isArray(result)
              ? result[result.length - 1]
              : result;
            return this.toFlight(outbound, total.price, total.currency, link);
          })
        : await this.searchLegsSeparately(
            input,
            origins,
            destinations,
            passengers,
            link,
          );

    return {
      flights: flights
        .filter((flight) => !Number.isNaN(flight.totalPrice))
        .filter(
          (flight) =>
            input.maxTotalPrice === undefined ||
            flight.totalPrice <= input.maxTotalPrice,
        )
        .slice(0, input.maxResults ?? MAX_RESULTS),
    };
  }

  /**
   * Google sometimes returns no round trip for a low-supply route (e.g. Santa Fe -
   * Bariloche) even though each leg has flights on its own. In that case both legs are
   * searched and the total price is the outbound plus the cheapest return.
   */
  private async searchLegsSeparately(
    input: FlightsInput,
    origins: Airport[],
    destinations: Airport[],
    passengers: number,
    link: string,
  ): Promise<Flight[]> {
    const outbound = input.returnDate
      ? await this.search(
          origins,
          destinations,
          input.departureDate,
          null,
          passengers,
        )
      : null;
    const inbound = input.returnDate
      ? await this.search(
          destinations,
          origins,
          input.returnDate,
          null,
          passengers,
        )
      : null;

    if (!outbound?.length || !inbound?.length) {
      throw new Error(
        'Google Flights returned no results (it may be blocking requests or its format may have changed).',
      );
    }

    const cheapestReturn = Math.min(
      ...(inbound as FlightResult[]).map(
        (f) => f.price ?? Number.POSITIVE_INFINITY,
      ),
    );
    return (outbound as FlightResult[]).map((f) =>
      this.toFlight(
        f,
        (f.price ?? Number.NaN) + cheapestReturn,
        f.currency,
        link,
      ),
    );
  }

  private async search(
    origins: Airport[],
    destinations: Airport[],
    departureDate: string,
    returnDate: string | null | undefined,
    passengers: number,
  ) {
    const { segments, tripType } = buildFlightSegments(
      origins,
      destinations,
      departureDate,
      returnDate,
    );

    const filters = new FlightSearchFilters({
      trip_type: tripType,
      passenger_info: {
        adults: passengers,
        children: 0,
        infants_in_seat: 0,
        infants_on_lap: 0,
      },
      flight_segments: segments,
      seat_type: SeatType.ECONOMY,
      sort_by: SortBy.CHEAPEST,
    });

    return new SearchFlights().search(filters, { currency: 'USD' });
  }

  private toFlight(
    outbound: FlightResult,
    totalPrice: number | null,
    currency: string | null,
    link: string,
  ): Flight {
    const first = outbound.legs[0];
    const last = outbound.legs[outbound.legs.length - 1];
    const local = this.localTimes(outbound);
    return {
      airline: outbound.primary_airline_name ?? first.airline,
      totalPrice: totalPrice ?? Number.NaN,
      currency: currency ?? 'USD',
      stops: outbound.stops,
      outboundDeparture:
        local?.departure ?? first.departure_datetime.toISOString(),
      outboundArrival: local?.arrival ?? last.arrival_datetime.toISOString(),
      link,
    };
  }

  /**
   * fli-js returns times in UTC and does not know airport time zones, but the
   * booking_token (base64 protobuf) carries each leg with its local time and offset
   * (e.g. 2026-12-15T21:00:00-03:00): departure, arrival, departure, arrival...
   */
  private localTimes(
    outbound: FlightResult,
  ): { departure: string; arrival: string } | null {
    if (!outbound.booking_token) return null;
    const decoded = Buffer.from(outbound.booking_token, 'base64').toString(
      'latin1',
    );
    const times =
      decoded.match(/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d/g) ?? [];
    const departure = times[0];
    const arrival = times[outbound.legs.length * 2 - 1];
    return departure && arrival ? { departure, arrival } : null;
  }

  /** A city with several airports (e.g. Buenos Aires) is searched across all of them. */
  private resolveAirports(place: string): Airport[] {
    const argentine = ARGENTINE_AIRPORTS[this.normalize(place)];
    if (argentine) return argentine as Airport[];

    const matches = searchAirports(place, 5);
    if (matches.length === 0) {
      throw new Error(`"${place}" was not found as a city or airport.`);
    }
    return matches[0].match_type === 'city'
      ? matches.filter((m) => m.match_type === 'city').map((m) => m.code)
      : [matches[0].code];
  }

  private normalize(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }
}
