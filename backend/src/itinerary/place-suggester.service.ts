import { Injectable } from '@nestjs/common';
import { GoogleMapsClient, Place } from './google-maps.client';

/**
 * Suggests places to visit using Google Places' own ranking of the destination's tourist
 * attractions. They are real, rated and inside the destination; no LLM is involved, since a
 * small model proposed namesakes in other cities and non-attractions such as bus stops.
 */
@Injectable()
export class PlaceSuggesterService {
  constructor(private readonly maps: GoogleMapsClient) {}

  suggest(destination: string, count: number): Promise<Place[]> {
    return this.maps.topAttractions(destination, count);
  }
}
