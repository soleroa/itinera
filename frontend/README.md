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

## Design

Editorial travel style: Fraunces (serif) for headings and prices, Inter for text, a warm
paper background with terracotta and forest-green accents, and a matching dark mode.
Colors are CSS variables in `src/index.css`, so light and dark share the same classes.
The destination banner uses a photo from Wikipedia (free, no key) and falls back to a
gradient when there is none. Animations respect `prefers-reduced-motion`.

## Structure

```
src/
├── App.tsx                    → screen phase (planning / loading / options / chosen / error) and the landing
├── components/
│   ├── Layout.tsx             → header, footer, eyebrow label and decorative contour lines
│   ├── TripWizard.tsx         → step-by-step guided form
│   ├── TripLoading.tsx        → animated plane and status messages while searching
│   ├── TripOptions.tsx        → three option cards, budget meters and cheaper alternatives
│   ├── TripResult.tsx         → chosen trip summary and the error state
│   ├── TripParts.tsx          → destination banner, budget meter, boarding-pass flight and stay cards
│   ├── ItineraryPlanner.tsx   → editable place list and the day-by-day timeline
│   └── Icons.tsx              → inline SVG icons
├── lib/
│   ├── analytics.ts           → PostHog init and track() helper
│   ├── trips-client.ts        → fetch to POST /trips/options
│   ├── itinerary-client.ts    → fetch to /trips/places/suggest and /trips/itinerary
│   ├── agent-client.ts        → fetch to POST /agent (ReAct agent, currently unused in the UI)
│   ├── destination-photo.ts   → destination photo from Wikipedia
│   └── format.ts              → USD, date and duration formatting
└── types.ts                   → request and response types
```

## Commands

```bash
npm run dev       # dev server with HMR
npm run build     # typecheck + production build to dist/
npm run lint      # oxlint
npm run preview   # serve the dist/ build locally
```
