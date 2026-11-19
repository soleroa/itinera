# Itinera

Trip planner that searches **real flights and accommodation** and builds
combinations that **fit your budget in USD**.

Enter an origin, destination, dates, number of travelers and a budget, and Itinera
returns up to three flight + accommodation combinations (cheapest, balanced and
best). If the budget falls short, it tells you by how much and suggests cheaper
variants.

> **Status:** work in progress. Budget-aware combination search and the
> day-by-day itinerary are implemented. The itinerary has been run against the live
> Google APIs for Bariloche only (see the [Roadmap](#roadmap)).

## What it does today

- Searches round-trip flights (Google Flights) and accommodation (Google Hotels,
  via SerpApi) with real prices.
- Verifies in code that flight + accommodation fit your USD budget.
- Offers up to three combinations: **cheapest**, **balanced** (best
  quality-to-price ratio) and **best** (highest quality within the budget).
- If the budget falls short: reports the shortfall and tries alternatives (one or
  two fewer nights, or traveling one week later), capped at 3 extra searches.
- Builds a **day-by-day itinerary** for the option you choose: places are proposed
  by a local LLM (and checked against Google Places) or typed by you, grouped by
  proximity into days, and ordered starting from your hotel. Each leg shows how to
  get there by public transport (Google Routes), falling back to walking or
  driving when there is no transit data. A place far from the rest is accepted but
  flagged with a warning.
- Always states that the budget covers **flight and accommodation only**: food,
  tickets and local transport are not included.

## How it works

```
Form (React)
   │  POST /trips/options  { origin, destination, departure, returnDate, travelers, maxBudget }
   ▼
TripPlannerService (NestJS, no LLM)
   ├─ FlightsTool        → Google Flights (fli-js)      ┐ in parallel
   ├─ AccommodationTool  → Google Hotels (SerpApi)      ┘
   └─ combinations.ts    → builds flight+hotel pairs, filters by budget,
                           picks cheapest / balanced / best

Chosen option → POST /trips/places/suggest   (LLM proposes, Google Places verifies)
              → POST /trips/itinerary        (code clusters and orders; Google Routes times each leg)
```

**Core design decision:** anything verifiable is computed by code, not by a
language model. A small LLM (the project started with `qwen3:8b`) adds badly and
invents prices, so sums and the budget filter are deterministic and run on the
prices the APIs return.

The repo also keeps the original agent (ReAct pattern, `POST /agent`), which uses
a local LLM with tools. The frontend no longer uses it; it stays as the base for
the day-by-day itinerary. Details in [backend/README.md](backend/README.md).

## Structure

```
itinera/
├── backend/    → NestJS API: deterministic planner + ReAct agent
└── frontend/   → React + Vite + Tailwind UI (guided form and results)
```

## Running it

### Requirements

- **Node.js >= 22.12** (the flights package is ESM and loaded with `require(esm)`).
- A **SerpApi API key** ([serpapi.com](https://serpapi.com/manage-api-key); the
  free plan has a monthly search quota). Each combination search uses one hotel
  search, plus up to three more when trying alternatives.
- A **Google Maps Platform API key** with *Places API (New)* and *Routes API*
  enabled, only for the day-by-day itinerary. Without it, flight and hotel search
  still works.
- **Ollama** only for place suggestions and the agent (`/agent`); the planner does
  not need it. You can always type the places yourself.

### 1. Backend

```bash
cd backend
cp .env.example .env      # fill in SERPAPI_KEY
npm install
npm run start:dev         # http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

In development, Vite forwards `/trips` and `/agent` to the backend at
`localhost:3001`, so no further configuration is needed.

### Trying the API directly

```bash
curl -X POST http://localhost:3001/trips/options \
  -H 'Content-Type: application/json' \
  -d '{
    "origin": "Buenos Aires",
    "destination": "Bariloche",
    "departure": "2026-12-15",
    "returnDate": "2026-12-22",
    "travelers": 2,
    "maxBudget": 2500
  }'
```

The response includes `status` (`ok` or `over_budget`), the `options` with their
USD total and, when over budget, `shortfall` and `alternatives`. All amounts are
in USD.

## Configuration

Backend variables (`backend/.env`):

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `SERPAPI_KEY` | Yes | — | Accommodation search |
| `GOOGLE_MAPS_API_KEY` | For itineraries | — | Google Places + Routes |
| `PORT` | No | `3001` | Server port |
| `SERPAPI_BASE_URL` | No | `https://serpapi.com/search.json` | SerpApi endpoint |
| `OLLAMA_BASE_URL` / `OLLAMA_MODEL` | No | `http://localhost:11434` / `qwen3:8b` | `/agent` only |

Frontend (`frontend/.env`, all optional): `VITE_API_URL` and `VITE_TRIPS_URL` to
point at another backend, and `VITE_POSTHOG_KEY` for analytics. See
[frontend/README.md](frontend/README.md).

## Known limitations

- **Flights come from unofficial scraping.** Data from Google Flights is read
  through [fli-js](backend/vendor/fli-js/VENDORED.md), with no API key. It can
  break if Google changes its format, and its use may not be allowed by Google's
  terms of service: this is a personal/educational project, not meant for
  commercial production use.
- **Cost per search.** SerpApi limits searches per plan, and one itinerary makes
  roughly 20–25 Google Routes calls; there is no caching or per-user limit yet.
- **Transit coverage.** Google has no public transport data in some cities; those
  legs fall back to walking or driving and are labelled as such.
- **Airports:** the most searched Argentine cities are resolved by hand; anything
  else relies on fli-js's airport search.

## Roadmap

- [x] Day-by-day itinerary with proximity clustering and nearest-neighbor ordering in code.
- [x] Local transport with Google Routes (`TRANSIT`), falling back to walking or driving.
- [ ] Verify the itinerary against the live Google APIs in more cities, including ones
  with poor public transport coverage, and the LLM place suggestions with Ollama.
- [ ] Caching of Places/Routes results and per-user limits to control costs.

## License

[MIT](LICENSE). `backend/vendor/fli-js` is also MIT (see its own `LICENSE`).
