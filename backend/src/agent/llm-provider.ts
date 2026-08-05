import { ToolDefinition } from '../common/tool.interface';

export interface LlmMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
}

export interface ToolCallRequest {
  toolName: string;
  input: unknown;
}

export type LlmDecision =
  | { type: 'final_answer'; content: string }
  | { type: 'tool_call'; toolCall: ToolCallRequest };

export abstract class LlmProvider {
  abstract decide(
    messages: LlmMessage[],
    tools: ToolDefinition[],
  ): Promise<LlmDecision>;
}
