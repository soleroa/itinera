import { ToolDefinition } from "../common/tool.interface";

export interface ToolCallRequest {
  toolName: string;
  input: unknown;
}

export interface LlmMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  /** Only on 'assistant' messages: the tool the model asked to call. */
  toolCall?: ToolCallRequest;
  /** Only on 'tool' messages: which tool the result belongs to. */
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
