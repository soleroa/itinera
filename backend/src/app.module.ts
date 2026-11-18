import { Module } from '@nestjs/common';
import { AgentModule } from './agent/agent.module';
import { ToolsModule } from './tools/tools.module';
import { PlannerModule } from './planner/planner.module';
import { LlmModule } from './llm/llm.module';

@Module({
  imports: [AgentModule, PlannerModule, ToolsModule, LlmModule],
})
export class AppModule {}
