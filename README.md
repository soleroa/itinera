# Itinera

Planificador de viajes que busca **vuelos y alojamientos reales** y arma
combinaciones que **entran en tu presupuesto en pesos argentinos**.

Cargás origen, destino, fechas, cantidad de personas y presupuesto, y Itinera te
devuelve hasta tres combinaciones de vuelo + alojamiento (económica, equilibrada
y la mejor). Si el presupuesto no alcanza, te dice cuánto falta y te propone
variantes más baratas.

> **Estado:** proyecto en desarrollo. La búsqueda de combinaciones según
> presupuesto funciona de punta a punta; el itinerario día por día con
> transporte local todavía no está implementado (ver [Roadmap](#roadmap)).

## Qué hace hoy

- Busca vuelos de ida y vuelta (Google Flights) y alojamientos (Google Hotels,
  vía SerpApi) con precios reales.
- Convierte el presupuesto con el **dólar MEP** actual y verifica en código que
  vuelo + alojamiento entren.
- Ofrece hasta tres combinaciones: **económica**, **equilibrada** (mejor
  relación calidad/precio) y **la mejor** (mayor calidad dentro del presupuesto).
- Si no alcanza: informa el faltante y prueba alternativas (una o dos noches
  menos, o viajar una semana después), con un tope de 3 búsquedas extra.
- Avisa siempre que el presupuesto cubre **solo vuelo y alojamiento**: comida,
  entradas y transporte local no están incluidos.

## Cómo funciona

```
Formulario (React)
   │  POST /trips/options  { origen, destino, salida, vuelta, personas, presupuestoMax }
   ▼
TripPlannerService (NestJS, sin LLM)
   ├─ FlightsTool        → Google Flights (fli-js)       ┐ en paralelo
   ├─ AccommodationTool  → Google Hotels (SerpApi)       ┘
   ├─ FxService          → dólar MEP (dolarapi.com)
   └─ combinations.ts    → arma pares vuelo+hotel, filtra por presupuesto,
                           elige económica / equilibrada / mejor
```

**Decisión de diseño central:** todo lo verificable lo calcula el código, no un
modelo de lenguaje. Un LLM chico (el proyecto empezó con `qwen3:8b`) suma mal e
inventa precios; por eso las sumas, la conversión de moneda y el filtro por
presupuesto son determinísticos y se hacen sobre los precios que devuelven las
APIs.

El repo conserva además el agente original (patrón ReAct, `POST /agent`), que
usa un LLM local con tools. Ya no lo usa el frontend; sigue como base para el
itinerario por día. Detalles en [backend/README.md](backend/README.md).

## Estructura

```
itinera/
├── backend/    → API NestJS: planner determinístico + agente ReAct
└── frontend/   → UI en React + Vite + Tailwind (formulario guiado y resultados)
```

## Cómo correrlo

### Requisitos

- **Node.js >= 22.12** (el paquete de vuelos es ESM y se carga con `require(esm)`).
- Una **API key de SerpApi** ([serpapi.com](https://serpapi.com/manage-api-key);
  el plan gratuito tiene un cupo mensual de búsquedas). Cada búsqueda de
  combinaciones consume una búsqueda de hoteles, y hasta tres más si hay que
  probar alternativas.
- **Ollama** solo si querés usar el agente (`/agent`); el planner no lo necesita.

### 1. Backend

```bash
cd backend
cp .env.example .env      # completá SERPAPI_KEY
npm install
npm run start:dev         # http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173
```

En desarrollo, Vite redirige `/trips` y `/agent` al backend en
`localhost:3001`, así que no hace falta más configuración.

### Probar la API directamente

```bash
curl -X POST http://localhost:3001/trips/options \
  -H 'Content-Type: application/json' \
  -d '{
    "origen": "Buenos Aires",
    "destino": "Bariloche",
    "salida": "2026-12-15",
    "vuelta": "2026-12-22",
    "personas": 2,
    "presupuestoMax": 3000000
  }'
```

La respuesta incluye `estado` (`ok` o `presupuesto_insuficiente`), las
`opciones` con su total en USD y en pesos, la `cotizacion` usada y, si no
alcanza, `faltanteArs` y `alternativas`.

## Configuración

Variables del backend (`backend/.env`):

| Variable | Requerida | Default | Uso |
|---|---|---|---|
| `SERPAPI_KEY` | Sí | — | Búsqueda de alojamientos |
| `USD_ARS_RATE` | No | — | Cotización de respaldo si falla dolarapi.com |
| `FX_API_URL` | No | `https://dolarapi.com/v1/dolares/bolsa` | Fuente del dólar MEP |
| `PORT` | No | `3001` | Puerto del servidor |
| `SERPAPI_BASE_URL` | No | `https://serpapi.com/search.json` | Endpoint de SerpApi |
| `OLLAMA_BASE_URL` / `OLLAMA_MODEL` | No | `http://localhost:11434` / `qwen3:8b` | Solo para `/agent` |

Frontend (`frontend/.env`, todas opcionales): `VITE_API_URL`, `VITE_TRIPS_URL`
para apuntar a otro backend y `VITE_POSTHOG_KEY` para analítica. Ver
[frontend/README.md](frontend/README.md).

## Limitaciones conocidas

- **Vuelos por scraping no oficial.** Se usan los datos de Google Flights a
  través de [fli-js](backend/vendor/fli-js/VENDORED.md), sin API key. Puede
  romperse si Google cambia su formato y su uso puede no estar permitido por los
  términos del servicio: está pensado como proyecto personal/educativo, no para
  producción comercial.
- **Costo por búsqueda.** SerpApi limita las búsquedas por plan; no hay caché ni
  límite por usuario todavía.
- **El mínimo del presupuesto no se verifica**, solo el tope.
- **Precios en dólares.** Las APIs devuelven USD; la conversión usa el MEP y
  puede diferir del costo real con tu tarjeta.
- **Aeropuertos:** las ciudades argentinas más buscadas están resueltas a mano;
  el resto depende de la búsqueda de fli-js.

## Roadmap

- [ ] Itinerario por día: lugares con Google Places, agrupados por cercanía
  (clustering y orden por vecino más cercano en código, no en el prompt).
- [ ] Transporte local paso a paso con Google Routes (`TRANSIT`), con
  alternativa a pie o en auto cuando no hay datos de transporte público.
- [ ] Caché de Places/Routes y límites por usuario para controlar costos.
- [ ] Tests automatizados de la lógica de combinaciones.

## Licencia

Pendiente de definir. `backend/vendor/fli-js` es MIT (ver su `LICENSE`).
