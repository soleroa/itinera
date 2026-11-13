import { Injectable, Logger } from "@nestjs/common";
import { LlmMessage, LlmProvider } from "./llm-provider";
import { ToolRegistryService } from "../tools/tool-registry.service";

const SYSTEM_PROMPT = `Sos Itinera, un agente de viajes. Respondé siempre en español rioplatense.

Para armar un viaje:
1. Llamá a search_flights con el origen, el destino y las fechas de ida y vuelta.
2. Llamá a search_accommodation con el destino y las fechas de entrada y salida.
3. Con los resultados de las dos tools, escribí el itinerario final: una recomendación breve (qué vuelo y qué alojamiento conviene y por qué, con el costo estimado) y qué hacer cada día.

Reglas:
- Los precios que devuelven las tools están en USD y el presupuesto del usuario en pesos argentinos. No tenés tipo de cambio: mostrá los precios en USD, avisá que están en dólares y no los compares con el presupuesto.
- No uses los parámetros de presupuesto de las tools.
- Usá solo datos que devolvieron las tools. Si una tool falla o no devuelve resultados, decilo en vez de inventar precios.
- La lista completa de vuelos y alojamientos, con sus links de reserva, la muestra la app aparte: no armes tablas ni listas de opciones y no inventes links.
- No expliques qué tools llamaste: respondé directamente con el itinerario.`;

export interface AgentResult {
  answer: string;
  /** Vuelos y alojamientos tal como los devolvieron las tools, con sus links de reserva. */
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
        `Vuelta ${i + 1}: llamando a "${toolName}" con ${JSON.stringify(input)}`,
      );

      let toolContent: string;
      try {
        const result = await this.tools.execute(toolName, input);
        toolContent = JSON.stringify(result);
        const data = result as { vuelos?: unknown[]; alojamientos?: unknown[] };
        if (toolName === 'search_flights' && data.vuelos) flights = data.vuelos;
        if (toolName === 'search_accommodation' && data.alojamientos)
          accommodations = data.alojamientos;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Tool "${toolName}" falló: ${message}`);
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
      `El agente no llegó a una respuesta final después de ${this.maxIterations} vueltas.`,
    );
  }
}
