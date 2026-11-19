# Itinera — frontend

Itinera's UI: a one-page search sheet (destination, origin, dates, travelers and budget),
a screen with the flight + accommodation combinations that fit the budget (cheapest,
balanced and best) or the alternatives if it falls short, and then the day-by-day itinerary
of the one you pick. It is not a chat. React + Vite + Tailwind, with no routing or extra
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

The concept is a printed timetable: an itinerary is a schedule, so the interface looks like a
travel document (the budget is a constraint on the plan, not the headline). Hairline rules, square corners and hard offset shadows instead of soft
rounded cards; prices, times and labels in monospace like a receipt or a departure board; huge
condensed headlines (Bricolage Grotesque) with the key word highlighted; one cobalt accent and a
highlighter yellow used only for warnings and emphasis. The search is a single numbered sheet,
the itinerary leads the page with a giant numeral per day, and the chosen flight and stay
follow as a receipt with dotted leaders next to a perforated boarding pass with a barcode.

Colors are CSS variables in `src/index.css`, so light and dark share the same classes and a card
can invert itself locally (the featured option). Custom classes live in `@layer components` so
Tailwind utilities can override them. Destination photos come from Wikipedia (free, no key) and
are shown in a cobalt duotone, or as solid cobalt when there is none. Animations respect
`prefers-reduced-motion`.

## Structure

```
src/
├── App.tsx                    → screen phase (planning / loading / options / chosen / error) and the landing
├── components/
│   ├── Layout.tsx             → header, departure-board ticker, footer and section label
│   ├── TripForm.tsx           → the search as one numbered sheet
│   ├── TripLoading.tsx        → marching rule and status messages while searching
│   ├── TripOptions.tsx        → three fare cards, tick budget meters and cheaper alternatives
│   ├── TripResult.tsx         → chosen trip receipt and the error state
│   ├── TripParts.tsx          → duotone destination plate, budget meter, boarding-pass flight and stay cards
│   ├── ItineraryPlanner.tsx   → editable place list and the day-by-day timeline with giant day numerals
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
