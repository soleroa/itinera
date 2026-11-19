import type { ReactNode } from 'react';
import type { TripOption, TripRequest } from '../types';
import { formatUsd } from '../lib/format';
import { AlertIcon } from './Icons';
import { Eyebrow } from './Layout';
import { BudgetMeter, DestinationBanner, FlightPass, StayCard } from './TripParts';

const LEVEL_LABEL = { cheapest: 'Cheapest', balanced: 'Balanced', best: 'Best' } as const;

/** The trip the traveler picked: summary, flight, stay and (as children) the itinerary. */
export function TripChosen({
  trip,
  option,
  onReset,
  children,
}: {
  trip: TripRequest;
  option: TripOption;
  onReset: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-8">
      <DestinationBanner trip={trip} compact />

      <section className="animate-fade-up grid gap-6 rounded-3xl border border-line bg-card p-6 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-10 sm:p-8">
        <div>
          <Eyebrow>{LEVEL_LABEL[option.level]} trip</Eyebrow>
          <p className="mt-1 font-display text-5xl font-semibold leading-none tracking-tight sm:text-6xl">
            {formatUsd(option.total)}
          </p>
          <p className="mt-2 text-sm text-ink-2">flight + accommodation</p>
        </div>
        <div className="flex flex-col gap-3">
          <BudgetMeter total={option.total} max={trip.maxBudget} />
          <p className="text-sm text-ink-3">
            Food, tickets and local transport are not included in this total.
          </p>
        </div>
      </section>

      <div className="flex flex-col gap-4">
        <FlightPass flight={option.flight} trip={trip} />
        <StayCard stay={option.accommodation} travelers={trip.travelers} />
      </div>

      {children}

      <div className="border-t border-line pt-6">
        <button
          onClick={onReset}
          className="rounded-xl border border-line px-5 py-2.5 font-medium text-ink-2 transition hover:border-terracotta hover:text-terracotta"
        >
          Plan another trip
        </button>
      </div>
    </div>
  );
}

export function TripError({ error, onReset }: { error: string; onReset: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-xl animate-fade-up flex-col items-start gap-5 rounded-3xl bg-amber-soft p-8 text-amber-ink">
      <AlertIcon width={28} height={28} />
      <h2 className="font-display text-3xl font-semibold leading-tight">We couldn't plan your trip</h2>
      <p>{error}</p>
      <button
        onClick={onReset}
        className="rounded-xl bg-terracotta px-5 py-2.5 font-semibold text-on-accent transition hover:brightness-110"
      >
        Try again
      </button>
    </div>
  );
}
