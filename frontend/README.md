# Itinera — frontend

Itinera's UI: a guided form, one question per screen (destination, origin, dates,
travelers and budget), and a screen with the flight + accommodation combinations
that fit the budget (cheapest, balanced and best), or the alternatives if it
falls short. It is not a chat. React + Vite + Tailwind, with no routing or extra
state management — it is a single screen.

## Running it

With the backend running at `http://localhost:3001` (see
[../backend/README.md](../backend/README.md)):

```bash
npm install
npm run dev   # http://localhost:5173
```

In development, Vite proxies `/trips` and `/agent` to `http://localhost:3001`
(see `vite.config.ts`), so nothing else needs configuring. To point at another
backend (for example in production), set `VITE_TRIPS_URL` (and `VITE_API_URL`
for the agent) — see `.env.example`.

## Analytics (PostHog)

Optional: set `VITE_POSTHOG_KEY` (and `VITE_POSTHOG_HOST` if you use the EU region
or self-hosting) in `.env`. Without a key nothing is sent. Pageviews and the
events `trip_submitted`, `trip_plan_succeeded`, `trip_plan_failed` and
`trip_option_chosen` are captured; destination, origin and dates are not sent.

## Structure

```
src/
├── App.tsx                    → screen phase (planning / loading / options / chosen / error)
├── components/
│   ├── TripWizard.tsx         → step-by-step guided form
│   ├── TripOptions.tsx        → combinations, alternatives and budget notice
│   └── TripResult.tsx         → loading, chosen option (flight + accommodation) and errors
├── lib/
│   ├── analytics.ts           → PostHog init and track() helper
│   ├── trips-client.ts        → fetch to POST /trips/options
│   ├── agent-client.ts        → fetch to POST /agent (ReAct agent, currently unused in the UI)
│   └── format.ts              → USD and date formatting
└── types.ts                   → request and planner response types
```

## Commands

```bash
npm run dev       # dev server with HMR
npm run build     # typecheck + production build to dist/
npm run lint      # oxlint
npm run preview   # serve the dist/ build locally
```
