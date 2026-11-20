import { useState } from 'react';
import { ItineraryPlanner } from './components/ItineraryPlanner';
import { Footer, Header, Ticker } from './components/Layout';
import { TripLoading } from './components/TripLoading';
import { TripOptions } from './components/TripOptions';
import { TripChosen, TripError } from './components/TripResult';
import { TripForm } from './components/TripForm';
import { SavedTrips } from './components/SavedTrips';
import { track } from './lib/analytics';
import { useSavedTrips } from './lib/saved-trips';
import { fetchTripOptions, TripsError } from './lib/trips-client';
import type { TripOption, TripOptionsResponse, TripRequest } from './types';

type Phase =
  | { name: 'planning' }
  | { name: 'loading'; trip: TripRequest }
  | { name: 'options'; trip: TripRequest; data: TripOptionsResponse }
  | { name: 'dashboard' }
  | { name: 'chosen'; id: string; trip: TripRequest; option: TripOption }
  | { name: 'error'; trip: TripRequest; error: string };

export default function App() {
  const [phase, setPhase] = useState<Phase>({ name: 'planning' });
  const saved = useSavedTrips();
  const reset = () => setPhase({ name: 'planning' });
  const showTrips = () => {
    window.scrollTo({ top: 0 });
    setPhase({ name: 'dashboard' });
  };
  const openSaved = (id: string) => {
    const found = saved.trips.find((t) => t.id === id);
    if (!found) return;
    track('saved_trip_opened');
    window.scrollTo({ top: 0 });
    setPhase({ name: 'chosen', id, trip: found.trip, option: found.option });
  };

  const handleSubmit = async (trip: TripRequest) => {
    setPhase({ name: 'loading', trip });
    window.scrollTo({ top: 0 });
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
    <div className="flex min-h-svh flex-col">
      <Header onHome={reset} onTrips={showTrips} tripCount={saved.trips.length} />
      <Ticker />

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-8 pt-8 sm:px-8">
        {phase.name === 'planning' && <Landing onSubmit={handleSubmit} />}
        {phase.name === 'loading' && <TripLoading trip={phase.trip} />}
        {phase.name === 'options' && (
          <TripOptions
            trip={phase.trip}
            data={phase.data}
            onChoose={(option, dates) => {
              track('trip_option_chosen', { level: option.level });
              window.scrollTo({ top: 0 });
              const trip = { ...phase.trip, ...dates };
              setPhase({ name: 'chosen', id: saved.create(trip, option), trip, option });
            }}
            onReset={reset}
          />
        )}
        {phase.name === 'dashboard' && (
          <SavedTrips
            trips={saved.trips}
            onOpen={openSaved}
            onDelete={saved.remove}
            onNew={reset}
          />
        )}
        {phase.name === 'chosen' && (
          <TripChosen trip={phase.trip} option={phase.option} onReset={showTrips} resetLabel="← My trips">
            <ItineraryPlanner
              key={phase.id}
              trip={phase.trip}
              option={phase.option}
              saved={saved.trips.find((t) => t.id === phase.id)}
              onSave={(state) => saved.update(phase.id, state)}
            />
          </TripChosen>
        )}
        {phase.name === 'error' && <TripError error={phase.error} onReset={reset} />}
      </main>

      <Footer />
    </div>
  );
}

const PROOF = [
  { n: '01', title: 'A plan for every day', text: 'Places grouped by proximity, in an order that makes sense.' },
  { n: '02', title: 'Routes, stop by stop', text: 'Which bus, how long it takes, where to get off.' },
  { n: '03', title: 'Flights and a stay that fit', text: 'Real prices, checked against your budget.' },
] as const;

function Landing({ onSubmit }: { onSubmit: (trip: TripRequest) => void }) {
  return (
    <div className="flex flex-col gap-12 pb-10 pt-4 lg:gap-16 lg:pt-8">
      <h1 className="display animate-rise max-w-5xl text-[clamp(3.5rem,10.5vw,9.5rem)]">
        Your trip, planned{' '}
        <span className="bg-mark px-2 text-black [box-decoration-break:clone]">day by day.</span>
      </h1>

      <div className="grid gap-12 lg:grid-cols-[1fr_30rem] lg:gap-16">
        <section className="animate-rise flex flex-col gap-10" style={{ animationDelay: '100ms' }}>
          <p className="max-w-lg text-xl leading-snug text-ink-2">
            Tell us where, when and your budget. Itinera finds flights and a hotel that fit, then lays out every day:
            what to see, in what order, and exactly how to get between stops.
          </p>
          <dl>
            {PROOF.map(({ n, title, text }) => (
              <div key={n} className="grid grid-cols-[3.5rem_1fr] gap-4 border-t border-ink py-4 last:border-b">
                <dt className="font-mono text-sm text-accent">{n}</dt>
                <dd>
                  <b className="font-display text-xl font-semibold tracking-tight">{title}.</b>{' '}
                  <span className="text-ink-2">{text}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="animate-rise" style={{ animationDelay: '180ms' }}>
          <TripForm onSubmit={onSubmit} />
        </div>
      </div>
    </div>
  );
}
