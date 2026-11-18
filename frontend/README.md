# Itinera — frontend

UI de Itinera: un formulario guiado, de a una pregunta por pantalla (destino,
origen, fechas, personas y presupuesto), y una pantalla con las combinaciones de
vuelo + alojamiento que entran en el presupuesto (económica, equilibrada y la
mejor), o las alternativas si no alcanza. No es un chat. React + Vite + Tailwind, sin
routing ni state management extra — es una sola pantalla.

## Cómo correr

Con el backend corriendo en `http://localhost:3001` (ver
[../backend/README.md](../backend/README.md)):

```bash
npm install
npm run dev   # http://localhost:5173
```

En desarrollo, Vite proxea `/trips` y `/agent` hacia `http://localhost:3001`
(ver `vite.config.ts`), así que no hace falta configurar nada más. Para apuntar
a otro backend (por ejemplo en producción), seteá `VITE_TRIPS_URL` (y
`VITE_API_URL` para el agente) — ver `.env.example`.

## Analítica (PostHog)

Opcional: seteá `VITE_POSTHOG_KEY` (y `VITE_POSTHOG_HOST` si usás la región EU o
self-hosted) en `.env`. Sin key no se envía nada. Se capturan pageviews y los
eventos `trip_submitted`, `trip_plan_succeeded`, `trip_plan_failed` y
`trip_option_chosen`; no se
envían destino, origen ni fechas.

## Estructura

```
src/
├── App.tsx                    → fase de la pantalla (planning / loading / options / chosen / error)
├── components/
│   ├── TripWizard.tsx         → formulario guiado paso a paso
│   ├── TripOptions.tsx        → combinaciones, alternativas, cotización y aviso
│   └── TripResult.tsx         → carga, opción elegida (vuelo + alojamiento) y errores
├── lib/
│   ├── analytics.ts           → init de PostHog y helper track()
│   ├── trips-client.ts        → fetch a POST /trips/options
│   ├── agent-client.ts        → fetch a POST /agent (agente ReAct, hoy sin uso en la UI)
│   └── trip-prompt.ts         → formateo de pesos, USD y fechas
└── types.ts                   → tipos del pedido y de la respuesta del planner
```

## Comandos

```bash
npm run dev       # servidor de desarrollo con HMR
npm run build     # typecheck + build de producción a dist/
npm run lint      # oxlint
npm run preview   # sirve el build de dist/ localmente
```
