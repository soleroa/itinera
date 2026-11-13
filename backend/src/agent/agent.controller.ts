import { Body, Controller, Post } from '@nestjs/common';
import { ReactAgentService } from './react-agent.service';

@Controller('agent')
export class AgentController {
  constructor(private readonly agent: ReactAgentService) {}

  @Post()
  async chat(@Body('message') message: string) {
    return this.agent.run(message);
  }
}
