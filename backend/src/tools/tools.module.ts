import { Module } from '@nestjs/common';
import { WeatherTool } from './weather.tool';
import { AccommodationTool } from './accommodation.tool';
import { AmadeusClient } from './amadeus-client';
import { ToolRegistryService } from './tool-registry.service';

@Module({
  providers: [
    WeatherTool,
    AmadeusClient,
    AccommodationTool,
    ToolRegistryService,
  ],
  exports: [ToolRegistryService],
})
export class ToolsModule {}
