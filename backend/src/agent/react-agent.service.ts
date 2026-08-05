import { Injectable, Logger } from '@nestjs/common';
import { LlmMessage, LlmProvider } from './llm-provider';
import { ToolRegistryService } from '../tools/tool-registry.service';

@Injectable()
export class ReactAgentService {
  private readonly logger = new Logger(ReactAgentService.name);
  private readonly maxIterations = 5;

  constructor(
    private readonly llm: LlmProvider,
    private readonly tools: ToolRegistryService,
  ) {}

  async run(userMessage: string): Promise<string> {
    const messages: LlmMessage[] = [{ role: 'user', content: userMessage }];

    for (let i = 0; i < this.maxIterations; i++) {
      const decision = await this.llm.decide(
        messages,
        this.tools.getDefinitions(),
      );

      if (decision.type === 'final_answer') {
        return decision.content;
      }

      const { toolName, input } = decision.toolCall;
      this.logger.log(`Vuelta ${i + 1}: llamando a "${toolName}" con ${JSON.stringify(input)}`);

      const result = await this.tools.execute(toolName, input);

      messages.push({
        role: 'assistant',
        content: `Llamé a la tool "${toolName}" con ${JSON.stringify(input)}`,
      });
      messages.push({
        role: 'tool',
        content: JSON.stringify(result),
      });
    }

    throw new Error(
      `El agente no llegó a una respuesta final después de ${this.maxIterations} vueltas.`,
    );
  }
}
