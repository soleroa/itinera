# Itinera — backend

API de Itinera. Tiene dos caminos independientes:

1. **Planner determinístico** (`POST /trips/options`): busca vuelos y alojamientos
   reales y arma combinaciones que entran en el presupuesto. **No usa LLM** y es
   lo que consume el frontend.
2. **Agente ReAct** (`POST /agent`): a partir de un pedido en lenguaje natural
   razona → llama una tool → observa → repite → responde. Necesita Ollama. Es la
   base para el itinerario por día.

El frontend (React + Vite + Tailwind) vive en `../frontend` — ver
[frontend/README.md](../frontend/README.md).

## Stack

- **NestJS + TypeScript**
- **LLM**: Ollama local (`qwen3:8b`, para desarrollo gratis). El contrato
  `LlmProvider` permite sumar otro proveedor (ej: la API de Anthropic) sin
  reescribir la lógica del agente — ver
  [Por qué `LlmProvider` vive en `agent/`](#por-qué-llmprovider-vive-en-agent).

## Arquitectura

### El planner (`src/planner/`)

Principio: **lo verificable lo calcula el código**, no el modelo. Un LLM de 8B
suma mal e inventa precios, así que el presupuesto se verifica sobre los precios
reales de las APIs.

| Archivo | Responsabilidad |
|---|---|
| `trip-planner.service.ts` | Valida el pedido, busca vuelos y hoteles en paralelo, convierte el presupuesto y decide el estado (`ok` / `presupuesto_insuficiente`). Si no alcanza, prueba hasta 3 alternativas (una o dos noches menos, una semana después) |
| `combinations.ts` | Funciones puras: todos los pares vuelo+hotel, y selección de **económica** (más barata), **equilibrada** (mayor calidad/precio) y **mejor** (mayor calidad). Calidad = puntaje del hotel + 0,3 × estrellas − 0,5 × escalas |
| `fx.service.ts` | Dólar MEP (venta) de dolarapi.com con caché de 30 min; si falla usa `USD_ARS_RATE` |
| `planner.controller.ts` | `POST /trips/options` |

El planner reutiliza `FlightsTool` y `AccommodationTool` llamándolas directo (con
el parámetro interno `maxResultados`, que no está en el schema que ve el LLM).

### Los tres módulos del agente

| Módulo | Responsabilidad | Qué NO sabe |
|---|---|---|
| `AgentModule` | El loop ReAct: razona, decide, orquesta | No sabe si el LLM es Ollama o Anthropic, ni cómo funciona cada tool por dentro |
| `LlmModule` | Le habla a un modelo (Ollama o Anthropic) y traduce la respuesta a una decisión genérica | No sabe qué es un itinerario ni ejecuta tools |
| `ToolsModule` | Expone las acciones que el agente puede ejecutar (clima, vuelos, alojamiento) | No sabe nada de LLMs ni del loop |

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
(`constructor(weatherTool, accommodationTool, flightsTool) {...}`). Con pocas
tools es lo más simple y explícito. Con más tools esa
lista de parámetros va a crecer, y ahí hay que decidir si se migra a un
patrón de inyección múltiple de Nest (un token compartido con un array de
tools) — deliberadamente no resuelto todavía.

## Estructura de carpetas

```
backend/
├── src/
│   ├── main.ts                    → bootstrap, escucha en PORT (default 3001)
│   ├── app.module.ts              → módulo raíz
│   ├── common/
│   │   └── tool.interface.ts      → contrato Tool / ToolDefinition
│   ├── planner/
│   │   ├── trip-planner.service.ts → combinaciones según presupuesto + alternativas
│   │   ├── combinations.ts        → selección económica / equilibrada / mejor
│   │   ├── fx.service.ts          → dólar MEP
│   │   ├── planner.controller.ts  → POST /trips/options
│   │   └── planner.module.ts
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
│       ├── accommodation.tool.ts  → tool de alojamiento, precios reales de Google Hotels
│       ├── serpapi-hotels-client.ts → cliente de SerpApi (engine google_hotels)
│       ├── flights.tool.ts        → tool de vuelos, vía Google Flights (fli-js)
│       ├── tool-registry.service.ts
│       └── tools.module.ts
└── vendor/
    └── fli-js/                    → build vendorizado de fli-js (ver VENDORED.md)
```

## Cómo correr

Requiere Node >= 22.12.

```bash
cp .env.example .env     # completá SERPAPI_KEY
npm install
npm run start:dev        # http://localhost:3001, con watch
```

Variables de entorno:

| Variable | Default | Uso |
|---|---|---|
| `SERPAPI_KEY` | — | **Requerida.** Alojamientos. Se obtiene en [serpapi.com](https://serpapi.com/manage-api-key) (plan gratuito con cupo mensual) |
| `USD_ARS_RATE` | — | Cotización de respaldo si falla dolarapi.com |
| `FX_API_URL` | `https://dolarapi.com/v1/dolares/bolsa` | Fuente del dólar MEP |
| `PORT` | `3001` | Puerto del servidor |
| `SERPAPI_BASE_URL` | `https://serpapi.com/search.json` | Endpoint de SerpApi |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Solo `/agent`: dónde está Ollama |
| `OLLAMA_MODEL` | `qwen3:8b` | Solo `/agent`: qué modelo pedirle |

Sin `SERPAPI_KEY` la búsqueda de alojamientos falla (no hay datos de relleno).
Cada búsqueda consume una del cupo de SerpApi.

### Probar el planner

```bash
curl -X POST http://localhost:3001/trips/options \
  -H 'Content-Type: application/json' \
  -d '{"origen":"Buenos Aires","destino":"Bariloche","salida":"2026-12-15","vuelta":"2026-12-22","personas":2,"presupuestoMax":3000000}'
```

### Probar el agente (opcional)

Requiere [Ollama](https://ollama.com) con `qwen3:8b`:

```bash
brew install ollama && brew services start ollama && ollama pull qwen3:8b
curl -X POST http://localhost:3001/agent \
  -H 'Content-Type: application/json' \
  -d '{"message":"¿Qué tiempo hace en Bariloche?"}'
```

## Estado actual

**Hecho:**
- Planner determinístico (`POST /trips/options`): combinaciones vuelo+alojamiento
  según presupuesto en pesos (dólar MEP), alternativas más baratas y aviso de lo
  que el presupuesto no cubre
- Tool de vuelos (`search_flights`) vía Google Flights con
  [fli-js](vendor/fli-js/VENDORED.md): sin API key, ciudad → aeropuertos, ida o
  ida y vuelta. Es scraping no oficial: puede romperse si Google cambia su
  formato
- Tool de alojamiento (`search_accommodation`) vía Google Hotels con
  [SerpApi](https://serpapi.com): precios y disponibilidad reales, con link al
  sitio de cada alojamiento
- Agente ReAct con `OllamaProvider`, y una tool de clima hardcodeada (sin API real)

**Pendiente:**
- Itinerario por día con Google Places (agrupado por cercanía) y transporte local
  con Google Routes
- Caché y límites por usuario para controlar costos de APIs
- Tests automatizados de `combinations.ts`
- Verificar el mínimo del presupuesto (hoy solo se respeta el tope)
- Manejo de errores más prolijo en el loop del agente
