# Itinera — backend

Itinera's API. It has two independent paths:

1. **Deterministic planner** (`POST /trips/options`): searches real flights and
   accommodation and builds combinations that fit the budget. It **uses no LLM**
   and is what the frontend consumes.
2. **ReAct agent** (`POST /agent`): from a natural-language request it reasons →
   calls a tool → observes → repeats → answers. Needs Ollama. It is the base for
   the day-by-day itinerary.

The frontend (React + Vite + Tailwind) lives in `../frontend` — see
[frontend/README.md](../frontend/README.md).

## Stack

- **NestJS + TypeScript**
- **LLM**: local Ollama (`qwen3:8b`, free for development). The `LlmProvider`
  contract allows adding another provider (e.g. the Anthropic API) without
  rewriting the agent logic — see
  [Why `LlmProvider` lives in `agent/`](#why-llmprovider-lives-in-agent).

## Architecture

### The planner (`src/planner/`)

Principle: **anything verifiable is computed by code**, not by the model. An 8B
LLM adds badly and invents prices, so the budget is checked against the real
prices from the APIs. All amounts are in USD.

| File | Responsibility |
|---|---|
| `trip-planner.service.ts` | Validates the request, searches flights and hotels in parallel and decides the status (`ok` / `over_budget`). When over budget it tries up to 3 alternatives (one or two fewer nights, one week later) |
| `combinations.ts` | Pure functions: every flight+hotel pair, and selection of **cheapest** (lowest total), **balanced** (best quality/price) and **best** (highest quality). Quality = hotel rating + 0.3 × stars − 0.5 × stops |
| `planner.controller.ts` | `POST /trips/options` |

The planner reuses `FlightsTool` and `AccommodationTool` by calling them directly
(with the internal `maxResults` parameter, which is not in the schema the LLM sees).

### The itinerary (`src/itinerary/`)

Same principle: the LLM may *propose* places, but grouping, ordering and timing are
computed by code.

| File | Responsibility |
|---|---|
| `geo.ts` | Pure functions: haversine distance, `clusterIntoDays` (deterministic k-means with a per-day capacity) and `nearestNeighborOrder` |
| `google-maps.client.ts` | Google Places (New) text search and Routes `computeRoutes` |
| `place-suggester.service.ts` | Asks the LLM for attractions and keeps only those Google Places can resolve |
| `itinerary.service.ts` | Locates the hotel and places, splits them into days, orders each day from the hotel and times every leg. Tries `TRANSIT`, then `WALK`, then `DRIVE`; legs over 30 min add a warning but the place is kept. A leg with no route at all stays `null` rather than being invented |
| `itinerary.controller.ts` | `POST /trips/places/suggest`, `POST /trips/itinerary` |

### The agent's three modules

| Module | Responsibility | What it does NOT know |
|---|---|---|
| `AgentModule` | The ReAct loop: reasons, decides, orchestrates | Whether the LLM is Ollama or Anthropic, or how each tool works inside |
| `LlmModule` | Talks to a model (Ollama or Anthropic) and turns its reply into a generic decision | What an itinerary is; it does not run tools |
| `ToolsModule` | Exposes the actions the agent can run (weather, flights, accommodation) | Anything about LLMs or the loop |

They are separate Nest modules (not loose folders) so dependencies between
domains are explicit through `imports`/`exports` — if `ToolsModule` tried to
import something from `AgentModule`, it would be a visible alarm in the code,
not a silent import.

### The `Tool` contract (`src/common/tool.interface.ts`)

```ts
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: JsonSchemaObject; // JSON Schema, object at the root
}

export interface Tool<TInput = unknown, TOutput = unknown> extends ToolDefinition {
  execute(input: TInput): Promise<TOutput>;
}
```

- **`ToolDefinition` separate from `Tool`**: `LlmModule` only needs the
  declarative part (name, description, schema) to build the payload for the model
  — it never executes anything. `AgentModule` is the one that runs `execute()`
  when the LLM decides to call a tool.
- **Lives in `common/`, not in `tools/` or `llm/`**: it is a contract between two
  peers (`ToolsModule` and `LlmModule`) and neither "owns" the type. Both import
  it from a neutral place.

### Why `LlmProvider` lives in `agent/`

```ts
// src/agent/llm-provider.ts
export abstract class LlmProvider {
  abstract decide(messages: LlmMessage[], tools: ToolDefinition[]): Promise<LlmDecision>;
}
```

Unlike `Tool`, this is not a relationship between peers: it is something
`AgentModule` **needs** in order to work, and `LlmModule` **implements**. It is
classic dependency inversion — the high-level module (the loop, which holds the
business logic) defines what it needs; the low-level module (an implementation
detail: "Ollama today, Anthropic tomorrow") adapts to that definition. That is
why the file lives in `agent/`, and `OllamaProvider` (in `llm/`) implements it,
not the other way around.

It is an `abstract class` and not an `interface` because TypeScript interfaces
disappear at runtime and Nest cannot use them as dependency-injection tokens. The
abstract class survives and serves as the token: `ReactAgentService` asks for
`private readonly llm: LlmProvider` in its constructor without knowing (or being
able to know) which implementation is behind it. That decision is made once, in
`llm.module.ts`:

```ts
providers: [{ provide: LlmProvider, useClass: OllamaProvider }],
```

### The ReAct loop (`src/agent/react-agent.service.ts`)

```
POST /agent {"message": "..."}
  → ReactAgentService.run()
      → messages = [{role: user, content: "..."}]
      → repeat up to 5 times:
          1. llm.decide(messages, tools)              → LlmProvider
          2. if it decides "final_answer"             → return the text, done
          3. if it decides "tool_call"                → look the tool up in
             ToolRegistryService, run it, append the result as a
             role:"tool" message (ReAct's Observation), repeat
```

If it goes past the turn limit without a final answer it throws (no graceful
handling yet — intentionally the simplest possible loop).

### Tool registry (`src/tools/tool-registry.service.ts`)

For now `ToolRegistryService` receives each tool through its constructor. With a
few tools that is the simplest and most explicit option. With more, that
parameter list will grow, and then it will need to move to Nest's multi-injection
pattern (a shared token with an array of tools) — deliberately left open for now.

## Folder structure

```
backend/
├── src/
│   ├── main.ts                    → bootstrap, listens on PORT (default 3001)
│   ├── app.module.ts              → root module
│   ├── common/
│   │   └── tool.interface.ts      → Tool / ToolDefinition contract
│   ├── planner/
│   │   ├── trip-planner.service.ts → budget-aware combinations + alternatives
│   │   ├── combinations.ts        → cheapest / balanced / best selection
│   │   ├── planner.controller.ts  → POST /trips/options
│   │   └── planner.module.ts
│   ├── itinerary/
│   │   ├── geo.ts                 → distance, clustering by day, nearest-neighbor order
│   │   ├── google-maps.client.ts  → Places + Routes
│   │   ├── place-suggester.service.ts → LLM proposes, Places verifies
│   │   ├── itinerary.service.ts   → days, legs and warnings
│   │   ├── itinerary.controller.ts → /trips/places/suggest, /trips/itinerary
│   │   └── itinerary.module.ts
│   ├── agent/
│   │   ├── llm-provider.ts        → LlmProvider contract (abstract class)
│   │   ├── react-agent.service.ts → the ReAct loop
│   │   ├── agent.controller.ts    → POST /agent
│   │   └── agent.module.ts
│   ├── llm/
│   │   ├── ollama.provider.ts     → LlmProvider implementation via Ollama
│   │   └── llm.module.ts          → decides which implementation to use
│   └── tools/
│       ├── weather.tool.ts        → weather tool (hardcoded, no real API)
│       ├── accommodation.tool.ts  → accommodation tool, real Google Hotels prices
│       ├── serpapi-hotels-client.ts → SerpApi client (google_hotels engine)
│       ├── flights.tool.ts        → flights tool, via Google Flights (fli-js)
│       ├── tool-registry.service.ts
│       └── tools.module.ts
└── vendor/
    └── fli-js/                    → vendored fli-js build (see VENDORED.md)
```

## Running it

Requires Node >= 22.12.

```bash
cp .env.example .env     # fill in SERPAPI_KEY
npm install
npm run start:dev        # http://localhost:3001, with watch
```

Environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `SERPAPI_KEY` | — | **Required.** Accommodation. Get one at [serpapi.com](https://serpapi.com/manage-api-key) (free plan with a monthly quota) |
| `GOOGLE_MAPS_API_KEY` | — | Required for the itinerary: Places API (New) + Routes API |
| `PORT` | `3001` | Server port |
| `SERPAPI_BASE_URL` | `https://serpapi.com/search.json` | SerpApi endpoint |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | `/agent` only: where Ollama is |
| `OLLAMA_MODEL` | `qwen3:8b` | `/agent` only: which model to ask for |

Without `SERPAPI_KEY`, accommodation search fails (there is no placeholder data).
Each search uses one from the SerpApi quota.

### Running the tests

```bash
npm test   # compiles to .test-dist/ and runs node --test on *.spec.ts
```

### Trying the planner

```bash
curl -X POST http://localhost:3001/trips/options \
  -H 'Content-Type: application/json' \
  -d '{"origin":"Buenos Aires","destination":"Bariloche","departure":"2026-12-15","returnDate":"2026-12-22","travelers":2,"maxBudget":2500}'
```

### Trying the itinerary

Needs `GOOGLE_MAPS_API_KEY` (and Ollama only for `/trips/places/suggest`):

```bash
curl -X POST http://localhost:3001/trips/itinerary \
  -H 'Content-Type: application/json' \
  -d '{"destination":"Bariloche","hotel":"Hotel Edelweiss","days":3,"places":["Cerro Campanario","Cerro Catedral","Centro Cívico"]}'
```

### Trying the agent (optional)

Requires [Ollama](https://ollama.com) with `qwen3:8b`:

```bash
brew install ollama && brew services start ollama && ollama pull qwen3:8b
curl -X POST http://localhost:3001/agent \
  -H 'Content-Type: application/json' \
  -d '{"message":"What is the weather like in Bariloche?"}'
```

## Current status

**Done:**
- Day-by-day itinerary (`POST /trips/itinerary`, `POST /trips/places/suggest`):
  places grouped by proximity, ordered from the hotel, each leg timed with Google
  Routes. Logic is unit-tested with a fake Google client; **not yet tried against
  the live APIs**
- Unit tests for the combination logic (`npm test`, Node's built-in runner)
- Deterministic planner (`POST /trips/options`): flight + accommodation
  combinations within a USD budget, cheaper alternatives and a notice of what the
  budget does not cover
- Flights tool (`search_flights`) via Google Flights with
  [fli-js](vendor/fli-js/VENDORED.md): no API key, city → airports, one-way or
  round trip. It is unofficial scraping: it can break if Google changes its format
- Accommodation tool (`search_accommodation`) via Google Hotels with
  [SerpApi](https://serpapi.com): real prices and availability, with a link to
  each property's site
- ReAct agent with `OllamaProvider`, and a hardcoded weather tool (no real API)

**Pending:**
- Try the itinerary against the live Google APIs in several cities
- Caching and per-user limits to control API costs
- Better error handling in the agent loop
