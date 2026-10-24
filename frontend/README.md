# Itinera — frontend

UI para planear un viaje con el agente: un formulario guiado, de a una pregunta
por pantalla (destino, origen, fechas, personas y presupuesto), y una pantalla de
resultado. No es un chat. React + Vite + Tailwind, sin
routing ni state management extra — es una sola pantalla.

## Cómo correr

Con el backend corriendo en `http://localhost:3001` (ver
[../backend/README.md](../backend/README.md)):

```bash
npm install
npm run dev   # http://localhost:5173
```

En desarrollo, Vite proxea las requests a `/agent` hacia
`http://localhost:3001` (ver `vite.config.ts`), así que no hace falta
configurar nada más. Para apuntar a otro backend (por ejemplo en producción),
seteá `VITE_API_URL` — ver `.env.example`.

## Estructura

```
src/
├── App.tsx                    → fase de la pantalla (planning / loading / done)
├── components/
│   ├── TripWizard.tsx         → formulario guiado paso a paso
│   └── TripResult.tsx         → pantalla de carga y de resultado (o error)
├── lib/
│   ├── agent-client.ts        → fetch a POST /agent
│   └── trip-prompt.ts         → arma el pedido en lenguaje natural desde el formulario
└── types.ts                   → tipo TripRequest
```

## Comandos

```bash
npm run dev       # servidor de desarrollo con HMR
npm run build     # typecheck + build de producción a dist/
npm run lint      # oxlint
npm run preview   # sirve el build de dist/ localmente
```
