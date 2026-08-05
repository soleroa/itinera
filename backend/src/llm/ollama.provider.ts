import { Injectable } from '@nestjs/common';
import {
  LlmDecision,
  LlmMessage,
  LlmProvider,
} from '../agent/llm-provider';
import { ToolDefinition } from '../common/tool.interface';

interface OllamaToolCall {
  function: {
    name: string;
    arguments: unknown;
  };
}

interface OllamaChatResponse {
  message: {
    content: string;
    tool_calls?: OllamaToolCall[];
  };
}

@Injectable()
export class OllamaProvider extends LlmProvider {
  private readonly baseUrl =
    process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
  private readonly model = process.env.OLLAMA_MODEL ?? 'qwen3:8b';

  async decide(
    messages: LlmMessage[],
    tools: ToolDefinition[],
  ): Promise<LlmDecision> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        messages,
        tools: tools.map((tool) => ({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
          },
        })),
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Ollama respondió ${response.status}: ${await response.text()}`,
      );
    }

    const data = (await response.json()) as OllamaChatResponse;
    const toolCall = data.message.tool_calls?.[0];

    if (toolCall) {
      return {
        type: 'tool_call',
        toolCall: {
          toolName: toolCall.function.name,
          input: toolCall.function.arguments,
        },
      };
    }

    return { type: 'final_answer', content: data.message.content };
  }
}
