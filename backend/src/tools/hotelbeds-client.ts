import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

interface HotelbedsDestination {
  code: string;
  name: { content: string };
}

interface HotelbedsDestinationsResponse {
  total: number;
  destinations: HotelbedsDestination[];
}

export interface HotelbedsRate {
  net: string;
  boardCode: string;
}

export interface HotelbedsRoom {
  rates: HotelbedsRate[];
}

export interface HotelbedsHotel {
  name: string;
  rooms: HotelbedsRoom[];
}

interface HotelbedsAvailabilityResponse {
  hotels?: { hotels: HotelbedsHotel[] };
}

const DESTINATIONS_PAGE_SIZE = 1000;

@Injectable()
export class HotelbedsClient {
  private readonly baseUrl =
    process.env.HOTELBEDS_BASE_URL ?? 'https://api.test.hotelbeds.com';
  private readonly apiKey = process.env.HOTELBEDS_API_KEY;
  private readonly secret = process.env.HOTELBEDS_API_SECRET;
  private destinationsCache: HotelbedsDestination[] | null = null;

  private signature(): string {
    if (!this.apiKey || !this.secret) {
      throw new Error(
        'Faltan HOTELBEDS_API_KEY / HOTELBEDS_API_SECRET en las variables de entorno.',
      );
    }
    const timestamp = Math.floor(Date.now() / 1000);
    return createHash('sha256')
      .update(`${this.apiKey}${this.secret}${timestamp}`)
      .digest('hex');
  }

  private headers(): Record<string, string> {
    return {
      'Api-key': this.apiKey ?? '',
      'X-Signature': this.signature(),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  private async fetchAllDestinations(): Promise<HotelbedsDestination[]> {
    if (this.destinationsCache) {
      return this.destinationsCache;
    }

    const destinations: HotelbedsDestination[] = [];
    let from = 1;
    let total = Infinity;

    while (from <= total) {
      const to = from + DESTINATIONS_PAGE_SIZE - 1;
      const response = await fetch(
        `${this.baseUrl}/hotel-content-api/1.0/locations/destinations?fields=code,name&language=ENG&from=${from}&to=${to}`,
        { headers: this.headers() },
      );

      if (!response.ok) {
        throw new Error(
          `Hotelbeds respondió ${response.status}: ${await response.text()}`,
        );
      }

      const data = (await response.json()) as HotelbedsDestinationsResponse;
      destinations.push(...data.destinations);
      total = data.total;
      from = to + 1;
    }

    this.destinationsCache = destinations;
    return destinations;
  }

  async resolveDestinationCode(ciudad: string): Promise<string> {
    const destinations = await this.fetchAllDestinations();
    const needle = ciudad.trim().toLowerCase();
    const match = destinations.find((d) =>
      d.name.content.toLowerCase().includes(needle),
    );

    if (!match) {
      throw new Error(`No se encontró la ciudad "${ciudad}" en Hotelbeds.`);
    }

    return match.code;
  }

  async searchAvailability(
    destinationCode: string,
    checkIn: string,
    checkOut: string,
  ): Promise<HotelbedsHotel[]> {
    const response = await fetch(`${this.baseUrl}/hotel-api/1.0/hotels`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        stay: { checkIn, checkOut },
        occupancies: [{ rooms: 1, adults: 2, children: 0 }],
        destination: { code: destinationCode },
        currency: 'USD',
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Hotelbeds respondió ${response.status}: ${await response.text()}`,
      );
    }

    const data = (await response.json()) as HotelbedsAvailabilityResponse;
    return data.hotels?.hotels ?? [];
  }
}
