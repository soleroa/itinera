import { Injectable } from '@nestjs/common';

interface SerpApiPrice {
  extracted_lowest?: number;
}

export interface SerpApiProperty {
  type?: string;
  name: string;
  link?: string;
  overall_rating?: number;
  hotel_class?: string;
  rate_per_night?: SerpApiPrice;
  total_rate?: SerpApiPrice;
}

interface SerpApiHotelsResponse {
  error?: string;
  properties?: SerpApiProperty[];
}

/** Real prices and availability from Google Hotels, via SerpApi (https://serpapi.com). */
@Injectable()
export class SerpApiHotelsClient {
  private readonly baseUrl =
    process.env.SERPAPI_BASE_URL ?? 'https://serpapi.com/search.json';

  async search(
    ciudad: string,
    checkIn: string,
    checkOut: string,
    adults: number,
  ): Promise<SerpApiProperty[]> {
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) {
      throw new Error('Missing SERPAPI_KEY environment variable.');
    }

    const params = new URLSearchParams({
      engine: 'google_hotels',
      q: ciudad,
      check_in_date: checkIn,
      check_out_date: checkOut,
      adults: String(adults),
      currency: 'USD',
      hl: 'en',
      gl: 'us',
      api_key: apiKey,
    });
    const response = await fetch(`${this.baseUrl}?${params}`);
    const data = (await response.json()) as SerpApiHotelsResponse;

    if (!response.ok || data.error) {
      // SerpApi's message does not include the key, but the URL is not dumped either.
      throw new Error(
        `SerpApi responded ${response.status}: ${data.error ?? 'unknown error'}`,
      );
    }
    return data.properties ?? [];
  }
}
