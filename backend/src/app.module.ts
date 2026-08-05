import { Module } from '@nestjs/common';
import { AgentModule } from './agent/agent.module';
import { ToolsModule } from './tools/tools.module';
import { LlmModule } from './llm/llm.module';

@Module({
  imports: [AgentModule, ToolsModule, LlmModule],
})
export class AppModule {}
