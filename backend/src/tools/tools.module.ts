import { Module } from '@nestjs/common';
import { WeatherTool } from './weather.tool';
import { AccommodationTool } from './accommodation.tool';
import { SerpApiHotelsClient } from './serpapi-hotels-client';
import { FlightsTool } from './flights.tool';
import { ToolRegistryService } from './tool-registry.service';

@Module({
  providers: [
    WeatherTool,
    SerpApiHotelsClient,
    AccommodationTool,
    FlightsTool,
    ToolRegistryService,
  ],
  exports: [ToolRegistryService, FlightsTool, AccommodationTool],
})
export class ToolsModule {}
