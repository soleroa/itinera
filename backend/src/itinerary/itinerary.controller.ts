import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import { GoogleMapsClient } from './google-maps.client';
import { ItineraryRequest, ItineraryService } from './itinerary.service';
import { PlaceSuggesterService } from './place-suggester.service';

@Controller('trips')
export class ItineraryController {
  constructor(
    private readonly itinerary: ItineraryService,
    private readonly suggester: PlaceSuggesterService,
    private readonly maps: GoogleMapsClient,
  ) {}

  /** City search-as-you-type for the destination and origin fields. */
  @Get('places/autocomplete')
  async autocomplete(@Query('q') q?: string) {
    const input = q?.trim() ?? '';
    if (input.length < 2) return { suggestions: [] };
    return { suggestions: (await this.maps.autocompleteCities(input)).slice(0, 6) };
  }

  /** Places worth visiting in a destination: its top-rated tourist attractions on Google Places. */
  @Post('places/suggest')
  async suggest(@Body() body: { destination?: string; count?: number }) {
    if (!body.destination?.trim()) {
      throw new BadRequestException('destination is required.');
    }
    const count = Math.min(Math.max(Math.trunc(body.count ?? 8), 1), 20);
    return {
      places: await this.suggester.suggest(body.destination.trim(), count),
    };
  }

  /** How to travel between two cities of a multi-city trip (train/bus, else driving). */
  @Post('transfer')
  transfer(@Body() body: { from?: string; to?: string }) {
    if (!body.from?.trim() || !body.to?.trim()) {
      throw new BadRequestException('from and to are required.');
    }
    return this.itinerary.transfer(body.from.trim(), body.to.trim());
  }

  /** Day-by-day itinerary for a chosen hotel and list of places. */
  @Post('itinerary')
  build(@Body() body: Partial<ItineraryRequest>) {
    return this.itinerary.build(this.itinerary.validate(body));
  }
}
