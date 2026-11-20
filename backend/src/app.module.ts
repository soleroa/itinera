import { Module } from '@nestjs/common';
import { AgentModule } from './agent/agent.module';
import { ToolsModule } from './tools/tools.module';
import { ItineraryModule } from './itinerary/itinerary.module';
import { PlannerModule } from './planner/planner.module';
import { LlmModule } from './llm/llm.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [AnalyticsModule, AgentModule, PlannerModule, ItineraryModule, ToolsModule, LlmModule],
})
export class AppModule {}
