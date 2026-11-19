import { Injectable, Logger } from '@nestjs/common';
import { LlmProvider } from '../agent/llm-provider';
import { GoogleMapsClient, Place } from './google-maps.client';

/**
 * Asks the LLM for places worth visiting, then keeps only the ones Google Places can
 * resolve: the model proposes, but it never gets to invent a place that does not exist.
 */
@Injectable()
export class PlaceSuggesterService {
  private readonly logger = new Logger(PlaceSuggesterService.name);

  constructor(
    private readonly llm: LlmProvider,
    private readonly maps: GoogleMapsClient,
  ) {}

  async suggest(destination: string, count: number): Promise<Place[]> {
    const decision = await this.llm.decide(
      [
        {
          role: 'system',
          content:
            'You are a travel guide. Reply with ONLY a JSON array of strings, no other text.',
        },
        {
          role: 'user',
          content: `List the ${count} best-known tourist attractions to visit in ${destination}. Use their official names.`,
        },
      ],
      [],
    );
    const names =
      decision.type === 'final_answer' ? parseNames(decision.content) : [];

    const resolved = await Promise.all(
      names.slice(0, count + 3).map(async (name) => {
        try {
          return await this.maps.findPlace(`${name}, ${destination}`);
        } catch (error) {
          this.logger.warn(
            `Could not resolve "${name}": ${error instanceof Error ? error.message : error}`,
          );
          return null;
        }
      }),
    );

    const unique = new Map<string, Place>();
    for (const place of resolved) {
      if (place) unique.set(place.id, place);
    }
    return [...unique.values()].slice(0, count);
  }
}

/** Extracts the first JSON array of strings from the model's reply. */
export function parseNames(text: string): string[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const parsed: unknown = JSON.parse(match[0]);
    return Array.isArray(parsed)
      ? parsed.filter((n): n is string => typeof n === 'string' && n.trim() !== '')
      : [];
  } catch {
    return [];
  }
}
