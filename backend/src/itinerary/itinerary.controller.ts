import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { ItineraryRequest, ItineraryService } from './itinerary.service';
import { PlaceSuggesterService } from './place-suggester.service';

@Controller('trips')
export class ItineraryController {
  constructor(
    private readonly itinerary: ItineraryService,
    private readonly suggester: PlaceSuggesterService,
  ) {}

  /** Places worth visiting in a destination: proposed by the LLM, verified with Google Places. */
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

  /** Day-by-day itinerary for a chosen hotel and list of places. */
  @Post('itinerary')
  build(@Body() body: Partial<ItineraryRequest>) {
    return this.itinerary.build(this.itinerary.validate(body));
  }
}
