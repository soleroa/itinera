import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

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
// Destinos con el código ya verificado contra la API. Se resuelven sin gastar la cuota
// de la Content API (y cuando está agotada). Ojo: el código no siempre coincide con el
// IATA del aeropuerto (Bariloche es BCH, no BRC).
const KNOWN_DESTINATIONS: Record<string, string> = {
  bariloche: 'BCH',
  'buenos aires': 'BUE',
  madrid: 'MAD',
};
// La Content API tiene una cuota chica y aparte: la lista de destinos casi no cambia,
// así que se baja una sola vez y se guarda en disco para que sobreviva a los reinicios.
const DESTINATIONS_CACHE_FILE = join(
  process.env.HOTELBEDS_CACHE_DIR ?? join(process.cwd(), '.cache'),
  'hotelbeds-destinations.json',
);

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

    const cached = await this.readDestinationsFromDisk();
    if (cached) {
      this.destinationsCache = cached;
      return cached;
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
    await this.writeDestinationsToDisk(destinations);
    return destinations;
  }

  private async readDestinationsFromDisk(): Promise<
    HotelbedsDestination[] | null
  > {
    try {
      const data = JSON.parse(
        await readFile(DESTINATIONS_CACHE_FILE, 'utf8'),
      ) as HotelbedsDestination[];
      return Array.isArray(data) && data.length > 0 ? data : null;
    } catch {
      return null;
    }
  }

  private async writeDestinationsToDisk(
    destinations: HotelbedsDestination[],
  ): Promise<void> {
    try {
      await mkdir(dirname(DESTINATIONS_CACHE_FILE), { recursive: true });
      await writeFile(DESTINATIONS_CACHE_FILE, JSON.stringify(destinations));
    } catch {
      // Sin caché en disco todo sigue andando, solo que se vuelve a bajar al reiniciar.
    }
  }

  async resolveDestinationCode(ciudad: string): Promise<string> {
    const needle = ciudad.trim().toLowerCase();
    const known = KNOWN_DESTINATIONS[needle];
    if (known) {
      return known;
    }

    const destinations = await this.fetchAllDestinations();
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
