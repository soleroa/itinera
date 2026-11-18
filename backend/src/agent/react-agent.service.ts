import { Injectable, Logger } from "@nestjs/common";
import { LlmMessage, LlmProvider } from "./llm-provider";
import { ToolRegistryService } from "../tools/tool-registry.service";

const SYSTEM_PROMPT = `You are Itinera, a travel agent. Always answer in English.

To plan a trip:
1. Call search_flights with the origin, destination and the outbound and return dates.
2. Call search_accommodation with the destination, the check-in and check-out dates and the number of guests.
3. With the results of both tools, write the final itinerary: a short recommendation (which flight and accommodation to pick and why, with the estimated cost) and what to do each day.

Rules:
- Tool prices are in USD, and so is the user's budget. Compare them directly.
- Use only data returned by the tools. If a tool fails or returns no results, say so instead of inventing prices.
- The full list of flights and accommodations, with their booking links, is shown separately by the app: do not build tables or lists of options and do not invent links.
- Do not explain which tools you called: answer directly with the itinerary.`;

export interface AgentResult {
  answer: string;
  /** Flights and accommodations as returned by the tools, with their booking links. */
  flights: unknown[];
  accommodations: unknown[];
}

@Injectable()
export class ReactAgentService {
  private readonly logger = new Logger(ReactAgentService.name);
  private readonly maxIterations = 5;

  constructor(
    private readonly llm: LlmProvider,
    private readonly tools: ToolRegistryService,
  ) {}

  async run(userMessage: string): Promise<AgentResult> {
    let flights: unknown[] = [];
    let accommodations: unknown[] = [];
    const messages: LlmMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ];

    for (let i = 0; i < this.maxIterations; i++) {
      const decision = await this.llm.decide(
        messages,
        this.tools.getDefinitions(),
      );

      if (decision.type === "final_answer") {
        return { answer: decision.content, flights, accommodations };
      }

      const { toolName, input } = decision.toolCall;
      this.logger.log(
        `Turn ${i + 1}: calling "${toolName}" with ${JSON.stringify(input)}`,
      );

      let toolContent: string;
      try {
        const result = await this.tools.execute(toolName, input);
        toolContent = JSON.stringify(result);
        const data = result as { flights?: unknown[]; accommodations?: unknown[] };
        if (toolName === 'search_flights' && data.flights) flights = data.flights;
        if (toolName === 'search_accommodation' && data.accommodations)
          accommodations = data.accommodations;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Tool "${toolName}" failed: ${message}`);
        toolContent = JSON.stringify({ error: message });
      }

      messages.push({
        role: "assistant",
        content: "",
        toolCall: { toolName, input },
      });
      messages.push({
        role: "tool",
        content: toolContent,
        toolName,
      });
    }

    throw new Error(
      `The agent did not reach a final answer after ${this.maxIterations} turns.`,
    );
  }
}
