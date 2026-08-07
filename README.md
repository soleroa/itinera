# Itinera

Agente de viajes que arma itinerarios a partir de un pedido en lenguaje natural
(ej: "quiero 5 días en Bariloche con 300 mil pesos"), usando el patrón **ReAct**:
razona → actúa llamando una tool → observa el resultado → repite hasta tener
suficiente información → responde.

## Estructura del repo

```
itinera/
├── backend/    → API NestJS con el agente ReAct (ver backend/README.md para arquitectura)
└── frontend/   → UI de chat en React + Vite + Tailwind (ver frontend/README.md)
```

## Cómo correr

### 1. Backend

Requiere [Ollama](https://ollama.com) corriendo localmente con `qwen3:8b`
descargado (soporta tool calling):

```bash
brew install ollama
brew services start ollama
ollama pull qwen3:8b
```

Después:

```bash
cd backend
npm install
npm run start:dev   # http://localhost:3001, con watch
```

Ver [backend/README.md](backend/README.md) para detalles de arquitectura,
variables de entorno y endpoints.

### 2. Frontend

React + Vite + Tailwind. En desarrollo, Vite proxea `/agent` hacia
`http://localhost:3001`, así que con el backend corriendo alcanza con:

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173
```
