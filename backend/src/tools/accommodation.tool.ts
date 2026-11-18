import { Injectable } from '@nestjs/common';
import { JsonSchemaObject, Tool } from '../common/tool.interface';
import { SerpApiHotelsClient } from './serpapi-hotels-client';

interface AccommodationInput {
  city: string;
  checkIn: string;
  checkOut: string;
  guests?: number;
  maxPricePerNight?: number;
  /** Internal (not in the LLM schema): result cap, default 5. */
  maxResults?: number;
}

const MAX_RESULTS = 5;

export interface Accommodation {
  name: string;
  type: 'hotel' | 'rental';
  /** E.g. "3-star hotel"; absent if Google does not report it. */
  category?: string;
  /** Guest rating out of 5; absent if none. */
  rating?: number;
  totalPrice: number;
  pricePerNight: number;
  currency: string;
  /** The property's own site or, if it has none, its Google Hotels listing. */
  link: string;
}

export interface AccommodationOutput {
  accommodations: Accommodation[];
}

@Injectable()
export class AccommodationTool
  implements Tool<AccommodationInput, AccommodationOutput>
{
  name = 'search_accommodation';
  description =
    'Searches available accommodation in a city for a date range, ' +
    'optionally filtering by maximum price per night. Prices are in USD.';
  inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      city: {
        type: 'string',
        description: 'City name, e.g. Bariloche',
      },
      checkIn: {
        type: 'string',
        description: 'Check-in date in YYYY-MM-DD format',
      },
      checkOut: {
        type: 'string',
        description: 'Check-out date in YYYY-MM-DD format',
      },
      guests: {
        type: 'number',
        description: 'Number of adult guests (optional, default 2)',
      },
      maxPricePerNight: {
        type: 'number',
        description: 'Maximum price per night in USD (optional)',
      },
    },
    required: ['city', 'checkIn', 'checkOut'],
  };

  constructor(private readonly hotels: SerpApiHotelsClient) {}

  async execute(input: AccommodationInput): Promise<AccommodationOutput> {
    const properties = await this.hotels.search(
      input.city,
      input.checkIn,
      input.checkOut,
      input.guests ?? 2,
    );

    const accommodations = properties
      .filter(
        (p) =>
          (p.rate_per_night?.extracted_lowest ?? 0) > 0 &&
          (p.total_rate?.extracted_lowest ?? 0) > 0,
      )
      .map((p): Accommodation => {
        const name = p.name;
        return {
          name,
          type: p.type === 'hotel' ? 'hotel' : 'rental',
          category: p.hotel_class,
          rating: p.overall_rating
            ? Math.round(p.overall_rating * 10) / 10
            : undefined,
          totalPrice: p.total_rate!.extracted_lowest!,
          pricePerNight: p.rate_per_night!.extracted_lowest!,
          currency: 'USD',
          link:
            p.link ??
            `https://www.google.com/travel/search?${new URLSearchParams({
              q: `${name} ${input.city}`,
              hl: 'en',
              gl: 'us',
              curr: 'USD',
            })}`,
        };
      })
      .filter(
        (a) =>
          input.maxPricePerNight === undefined ||
          a.pricePerNight <= input.maxPricePerNight,
      )
      .sort((a, b) => a.pricePerNight - b.pricePerNight)
      .slice(0, input.maxResults ?? MAX_RESULTS);

    return { accommodations };
  }
}
