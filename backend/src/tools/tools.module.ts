import { Module } from '@nestjs/common';
import { WeatherTool } from './weather.tool';
import { ToolRegistryService } from './tool-registry.service';

@Module({
  providers: [WeatherTool, ToolRegistryService],
  exports: [ToolRegistryService],
})
export class ToolsModule {}
