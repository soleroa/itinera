import { ToolDefinition } from "../common/tool.interface";

export interface ToolCallRequest {
  toolName: string;
  input: unknown;
}

export interface LlmMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  /** Solo en mensajes 'assistant': la tool que el modelo pidió llamar. */
  toolCall?: ToolCallRequest;
  /** Solo en mensajes 'tool': a qué tool corresponde el resultado. */
  toolName?: string;
}

export type LlmDecision =
  | { type: "final_answer"; content: string }
  | { type: "tool_call"; toolCall: ToolCallRequest };

export abstract class LlmProvider {
  abstract decide(
    messages: LlmMessage[],
    tools: ToolDefinition[],
  ): Promise<LlmDecision>;
}
