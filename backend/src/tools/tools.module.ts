import { Module } from '@nestjs/common';
import { WeatherTool } from './weather.tool';
import { AccommodationTool } from './accommodation.tool';
import { HotelbedsClient } from './hotelbeds-client';
import { FlightsTool } from './flights.tool';
import { ToolRegistryService } from './tool-registry.service';

@Module({
  providers: [
    WeatherTool,
    HotelbedsClient,
    AccommodationTool,
    FlightsTool,
    ToolRegistryService,
  ],
  exports: [ToolRegistryService],
})
export class ToolsModule {}
