# Itinera — frontend

UI de chat para hablar con el agente de viajes. React + Vite + Tailwind, sin
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
├── App.tsx                    → estado del chat (mensajes, envío, loading)
├── components/
│   ├── ChatInput.tsx          → textarea + botón de enviar
│   └── MessageBubble.tsx      → burbuja de mensaje (usuario/agente/error/pending)
├── lib/agent-client.ts        → fetch a POST /agent
└── types.ts                   → tipo ChatMessage
```

## Comandos

```bash
npm run dev       # servidor de desarrollo con HMR
npm run build     # typecheck + build de producción a dist/
npm run lint      # oxlint
npm run preview   # sirve el build de dist/ localmente
```
