import { useState } from 'react';
import { TripWizard } from './components/TripWizard';
import { TripLoading, TripResult } from './components/TripResult';
import { ItineraryPlanner } from './components/ItineraryPlanner';
import { TripOptions } from './components/TripOptions';
import { fetchTripOptions, TripsError } from './lib/trips-client';
import { track } from './lib/analytics';
import type { TripOption, TripOptionsResponse, TripRequest } from './types';

type Phase =
  | { name: 'planning' }
  | { name: 'loading'; trip: TripRequest }
  | { name: 'options'; trip: TripRequest; data: TripOptionsResponse }
  | { name: 'chosen'; trip: TripRequest; option: TripOption }
  | { name: 'error'; trip: TripRequest; error: string };

export default function App() {
  const [phase, setPhase] = useState<Phase>({ name: 'planning' });

  const handleSubmit = async (trip: TripRequest) => {
    setPhase({ name: 'loading', trip });
    track('trip_submitted', {
      travelers: trip.travelers,
      has_budget: trip.maxBudget !== null,
    });
    try {
      const data = await fetchTripOptions(trip);
      track('trip_plan_succeeded', { status: data.status });
      setPhase({ name: 'options', trip, data });
    } catch (err) {
      const error = err instanceof TripsError ? err.message : 'Could not reach the backend.';
      track('trip_plan_failed', { error });
      setPhase({ name: 'error', trip, error });
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
        {phase.name === 'options' && (
          <TripOptions
            trip={phase.trip}
            data={phase.data}
            onChoose={(option, dates) => {
              track('trip_option_chosen', { level: option.level });
              setPhase({ name: 'chosen', trip: { ...phase.trip, ...dates }, option });
            }}
            onReset={() => setPhase({ name: 'planning' })}
          />
        )}
        {phase.name === 'chosen' && (
          <TripResult
            trip={phase.trip}
            result={{
              answer: '',
              flights: [phase.option.flight],
              accommodations: [phase.option.accommodation],
            }}
            error={null}
            onReset={() => setPhase({ name: 'planning' })}
          >
            <ItineraryPlanner trip={phase.trip} option={phase.option} />
          </TripResult>
        )}
        {phase.name === 'error' && (
          <TripResult
            trip={phase.trip}
            result={null}
            error={phase.error}
            onReset={() => setPhase({ name: 'planning' })}
          />
        )}
      </main>
    </div>
  );
}
