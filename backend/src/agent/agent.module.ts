import { Module } from '@nestjs/common';
import { ToolsModule } from '../tools/tools.module';
import { LlmModule } from '../llm/llm.module';
import { ReactAgentService } from './react-agent.service';
import { AgentController } from './agent.controller';

@Module({
  imports: [ToolsModule, LlmModule],
  controllers: [AgentController],
  providers: [ReactAgentService],
})
export class AgentModule {}
