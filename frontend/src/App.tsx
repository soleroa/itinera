import { useState } from 'react';
import { TripWizard } from './components/TripWizard';
import { TripLoading, TripResult } from './components/TripResult';
import { askAgent, AgentError } from './lib/agent-client';
import { track } from './lib/analytics';
import { buildPrompt } from './lib/trip-prompt';
import type { AgentResponse, TripRequest } from './types';

type Phase =
  | { name: 'planning' }
  | { name: 'loading'; trip: TripRequest }
  | { name: 'done'; trip: TripRequest; result: AgentResponse | null; error: string | null };

export default function App() {
  const [phase, setPhase] = useState<Phase>({ name: 'planning' });

  const handleSubmit = async (trip: TripRequest) => {
    setPhase({ name: 'loading', trip });
    track('trip_submitted', {
      personas: trip.personas,
      has_budget: trip.presupuesto !== null,
    });
    try {
      const result = await askAgent(buildPrompt(trip));
      track('trip_plan_succeeded');
      setPhase({ name: 'done', trip, result, error: null });
    } catch (err) {
      const error = err instanceof AgentError ? err.message : 'No se pudo contactar al agente.';
      track('trip_plan_failed', { error });
      setPhase({ name: 'done', trip, result: null, error });
    }
  };

  return (
    <div className="flex min-h-svh flex-col bg-gradient-to-b from-emerald-50 via-neutral-50 to-neutral-100 dark:from-neutral-950 dark:via-neutral-950 dark:to-emerald-950/30">
      <header className="px-6 py-5 sm:px-10">
        <span className="text-xl font-semibold tracking-tight text-emerald-700 dark:text-emerald-400">
          Itinera
        </span>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-16 sm:px-10">
        {phase.name === 'planning' && <TripWizard onSubmit={handleSubmit} />}
        {phase.name === 'loading' && <TripLoading trip={phase.trip} />}
        {phase.name === 'done' && (
          <TripResult
            trip={phase.trip}
            result={phase.result}
            error={phase.error}
            onReset={() => setPhase({ name: 'planning' })}
          />
        )}
      </main>
    </div>
  );
}
