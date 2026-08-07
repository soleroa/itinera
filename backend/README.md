# Itinera — backend

Agente de viajes que arma itinerarios a partir de un pedido en lenguaje natural
(ej: "quiero 5 días en Bariloche con 300 mil pesos"), usando el patrón **ReAct**:
razona → actúa llamando una tool → observa el resultado → repite hasta tener
suficiente información → responde.

El frontend (React + Vite + Tailwind) vive en `../frontend` — ver
[frontend/README.md](../frontend/README.md).

## Stack

- **NestJS + TypeScript**
- **LLM**: switcheable entre Ollama local (`qwen3:8b`, para desarrollo gratis)
  y la API de Anthropic (para mayor confiabilidad), sin reescribir la lógica
  del agente — ver [Por qué `LlmProvider` vive en `agent/`](#por-qué-llmprovider-vive-en-agent).

## Arquitectura

### Los tres módulos

| Módulo | Responsabilidad | Qué NO sabe |
|---|---|---|
| `AgentModule` | El loop ReAct: razona, decide, orquesta | No sabe si el LLM es Ollama o Anthropic, ni cómo funciona cada tool por dentro |
| `LlmModule` | Le habla a un modelo (Ollama o Anthropic) y traduce la respuesta a una decisión genérica | No sabe qué es un itinerario ni ejecuta tools |
| `ToolsModule` | Expone las acciones que el agente puede ejecutar (clima, vuelos, actividades, presupuesto) | No sabe nada de LLMs ni del loop |

Están separados en tres módulos de Nest (no carpetas sueltas) para que las
dependencias entre dominios sean explícitas vía `imports`/`exports` — si
`ToolsModule` intentara importar algo de `AgentModule`, sería una señal de
alarma visible en el código, no un import silencioso.

### El contrato `Tool` (`src/common/tool.interface.ts`)

```ts
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JsonSchemaObject; // JSON Schema, tipo objeto en la raíz
}

export interface Tool<TInput = unknown, TOutput = unknown> extends ToolDefinition {
  execute(input: TInput): Promise<TOutput>;
}
```

- **`ToolDefinition` separado de `Tool`**: `LlmModule` solo necesita la parte
  declarativa (nombre, descripción, schema) para armar el payload hacia el
  modelo — nunca ejecuta nada. Quien sí ejecuta (`execute()`) es el
  `AgentModule`, cuando el LLM decide llamar a una tool.
- **Vive en `common/`, no en `tools/` ni en `llm/`**: es un contrato entre dos
  pares (`ToolsModule` y `LlmModule`), ninguno de los dos es "dueño" del tipo.
  Ambos lo importan desde un lugar neutral.

### Por qué `LlmProvider` vive en `agent/`

```ts
// src/agent/llm-provider.ts
export abstract class LlmProvider {
  abstract decide(messages: LlmMessage[], tools: ToolDefinition[]): Promise<LlmDecision>;
}
```

A diferencia de `Tool`, esta relación no es entre pares: es algo que
`AgentModule` **necesita** para funcionar, y `LlmModule` lo **implementa**.
Es inversión de dependencias clásica — el módulo de alto nivel (el loop,
que contiene la lógica de negocio) define qué necesita; el módulo de bajo
nivel (un detalle de implementación, "hoy es Ollama, mañana puede ser
Anthropic") se adapta a esa definición. Por eso el archivo vive en `agent/`,
y `OllamaProvider` (en `llm/`) lo implementa, no al revés.

Es una `abstract class` y no una `interface` porque las interfaces de
TypeScript desaparecen en runtime y Nest no las puede usar como token de
inyección de dependencias. La abstract class sobrevive y sirve como token:
`ReactAgentService` pide `private readonly llm: LlmProvider` en su
constructor sin saber (ni poder saber) qué implementación hay detrás. Esa
decisión se toma una sola vez, en `llm.module.ts`:

```ts
providers: [{ provide: LlmProvider, useClass: OllamaProvider }],
```

### El loop ReAct (`src/agent/react-agent.service.ts`)

```
POST /agent {"message": "..."}
  → ReactAgentService.run()
      → messages = [{role: user, content: "..."}]
      → repite hasta 5 veces:
          1. llm.decide(messages, tools)              → LlmProvider
          2. si decide "final_answer"                  → devuelve texto, listo
          3. si decide "tool_call"                      → busca la tool en
             ToolRegistryService, la ejecuta, agrega el resultado como
             mensaje role:"tool" (la Observation del ReAct), repite
```

Si pasa el límite de vueltas sin llegar a una respuesta final, tira error
(no hay manejo elegante todavía — es intencional, es el loop más simple
posible).

### Registro de tools (`src/tools/tool-registry.service.ts`)

Por ahora `ToolRegistryService` recibe cada tool por constructor
(`constructor(weatherTool: WeatherTool) {...}`). Con una sola tool es lo más
simple y explícito. Con más tools (vuelos, actividades, presupuesto) esa
lista de parámetros va a crecer, y ahí hay que decidir si se migra a un
patrón de inyección múltiple de Nest (un token compartido con un array de
tools) — deliberadamente no resuelto todavía.

## Estructura de carpetas

```
backend/
├── src/
│   ├── main.ts                    → bootstrap, escucha en PORT (default 3001)
│   ├── app.module.ts              → módulo raíz, importa los tres módulos
│   ├── common/
│   │   └── tool.interface.ts      → contrato Tool / ToolDefinition
│   ├── agent/
│   │   ├── llm-provider.ts        → contrato LlmProvider (abstract class)
│   │   ├── react-agent.service.ts → el loop ReAct
│   │   ├── agent.controller.ts    → POST /agent
│   │   └── agent.module.ts
│   ├── llm/
│   │   ├── ollama.provider.ts     → implementación de LlmProvider vía Ollama
│   │   └── llm.module.ts          → decide qué implementación usar
│   └── tools/
│       ├── weather.tool.ts        → tool de clima (hardcodeada, sin API real)
│       ├── accommodation.tool.ts  → tool de alojamiento, vía API de Amadeus
│       ├── amadeus-client.ts      → auth OAuth2 + fetch genérico contra Amadeus
│       ├── tool-registry.service.ts
│       └── tools.module.ts
```

## Cómo correr

Requiere [Ollama](https://ollama.com) corriendo localmente con `qwen3:8b`
descargado (soporta tool calling):

```bash
brew install ollama
brew services start ollama
ollama pull qwen3:8b
```

Después:

```bash
cd backend
npm install
npm run start:dev   # http://localhost:3001, con watch
```

Variables de entorno opcionales (todas tienen default):

| Variable | Default | Uso |
|---|---|---|
| `PORT` | `3001` | Puerto del servidor Nest |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Dónde está Ollama |
| `OLLAMA_MODEL` | `qwen3:8b` | Qué modelo pedirle |
| `AMADEUS_BASE_URL` | `https://test.api.amadeus.com` | Entorno de Amadeus (sandbox por default) |
| `AMADEUS_API_KEY` | — | Requerida para `search_accommodation`. Se obtiene gratis en [developers.amadeus.com](https://developers.amadeus.com) |
| `AMADEUS_API_SECRET` | — | Ídem, par de la API key |

Sin `AMADEUS_API_KEY`/`AMADEUS_API_SECRET`, la tool `search_accommodation`
tira error al ejecutarse (no hay fallback a datos hardcodeados).

Probar:

```bash
curl -X POST http://localhost:3001/agent \
  -H 'Content-Type: application/json' \
  -d '{"message":"¿Qué tiempo hace en Bariloche?"}'
```

## Estado actual

**Hecho:**
- Estructura de módulos (`AgentModule`, `ToolsModule`, `LlmModule`)
- Contrato `Tool` / `ToolDefinition`
- Contrato `LlmProvider`
- `OllamaProvider` (única implementación de `LlmProvider` por ahora)
- Loop ReAct funcionando de punta a punta
- Una tool de prueba: clima, hardcodeada (sin API real)
- Tool de alojamiento (`search_accommodation`) vía API real de Amadeus
  (búsqueda por ciudad + fechas, filtro opcional por presupuesto/noche)

**Pendiente:**
- `AnthropicProvider` — segunda implementación de `LlmProvider`
- Mecanismo de switch Ollama↔Anthropic (hoy `llm.module.ts` tiene
  `OllamaProvider` hardcodeado vía `useClass`; falta un `useFactory` que
  lea una env var como `LLM_PROVIDER`)
- Más tools: vuelos, actividades, presupuesto
- Manejo de errores más prolijo en el loop (hoy tira excepción sin más si
  se pasa de vueltas)
