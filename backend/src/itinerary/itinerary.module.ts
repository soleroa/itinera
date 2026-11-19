import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { GoogleMapsClient } from './google-maps.client';
import { ItineraryController } from './itinerary.controller';
import { ItineraryService } from './itinerary.service';
import { PlaceSuggesterService } from './place-suggester.service';

@Module({
  imports: [LlmModule],
  controllers: [ItineraryController],
  providers: [GoogleMapsClient, ItineraryService, PlaceSuggesterService],
})
export class ItineraryModule {}
