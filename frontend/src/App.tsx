import { useState } from 'react';
import { CheckIcon, BusIcon, PlaneIcon } from './components/Icons';
import { ItineraryPlanner } from './components/ItineraryPlanner';
import { Contours, Eyebrow, Footer, Header } from './components/Layout';
import { TripLoading } from './components/TripLoading';
import { TripOptions } from './components/TripOptions';
import { TripChosen, TripError } from './components/TripResult';
import { TripWizard } from './components/TripWizard';
import { track } from './lib/analytics';
import { fetchTripOptions, TripsError } from './lib/trips-client';
import type { TripOption, TripOptionsResponse, TripRequest } from './types';

type Phase =
  | { name: 'planning' }
  | { name: 'loading'; trip: TripRequest }
  | { name: 'options'; trip: TripRequest; data: TripOptionsResponse }
  | { name: 'chosen'; trip: TripRequest; option: TripOption }
  | { name: 'error'; trip: TripRequest; error: string };

export default function App() {
  const [phase, setPhase] = useState<Phase>({ name: 'planning' });
  const reset = () => setPhase({ name: 'planning' });

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
      <Header onHome={reset} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-8 sm:px-8">
        {phase.name === 'planning' && <Landing onSubmit={handleSubmit} />}
        {phase.name === 'loading' && <TripLoading trip={phase.trip} />}
        {phase.name === 'options' && (
          <TripOptions
            trip={phase.trip}
            data={phase.data}
            onChoose={(option, dates) => {
              track('trip_option_chosen', { level: option.level });
              window.scrollTo({ top: 0 });
              setPhase({ name: 'chosen', trip: { ...phase.trip, ...dates }, option });
            }}
            onReset={reset}
          />
        )}
        {phase.name === 'chosen' && (
          <TripChosen trip={phase.trip} option={phase.option} onReset={reset}>
            <ItineraryPlanner trip={phase.trip} option={phase.option} />
          </TripChosen>
        )}
        {phase.name === 'error' && <TripError error={phase.error} onReset={reset} />}
      </main>

      <Footer />
    </div>
  );
}

const PROOF = [
  { Icon: PlaneIcon, title: 'Real prices', text: 'Live flights and hotels, not estimates.' },
  { Icon: CheckIcon, title: 'Checked against your budget', text: 'We add it up, so you never have to.' },
  { Icon: BusIcon, title: 'Routes, stop by stop', text: 'How to get between places, bus by bus.' },
] as const;

function Landing({ onSubmit }: { onSubmit: (trip: TripRequest) => void }) {
  return (
    <div className="relative grid items-center gap-10 py-6 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:py-12">
      <Contours className="absolute -right-24 -top-24 -z-10 hidden w-[620px] opacity-70 lg:block" />

      <section className="animate-fade-up flex flex-col gap-7">
        <Eyebrow>Trip planning, with the numbers</Eyebrow>
        <h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
          Know what the trip costs <em className="text-terracotta">before</em> you book it.
        </h1>
        <p className="max-w-lg text-lg leading-relaxed text-ink-2">
          Tell us where, when and how much. Itinera finds real flights and hotels that fit your budget,
          then plans each day with the way to get around.
        </p>
        <ul className="flex flex-col gap-4 pt-2">
          {PROOF.map(({ Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-soft text-forest">
                <Icon width={18} height={18} />
              </span>
              <p className="text-ink-2">
                <span className="font-semibold text-ink">{title}.</span> {text}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <div className="animate-fade-up" style={{ animationDelay: '120ms' }}>
        <TripWizard onSubmit={onSubmit} />
      </div>
    </div>
  );
}
