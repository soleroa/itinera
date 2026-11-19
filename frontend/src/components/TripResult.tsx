import type { ReactNode } from 'react';
import type { TripOption, TripRequest } from '../types';
import { formatUsd, nightsBetween, plural, splitDateTime } from '../lib/format';
import { Eyebrow } from './Layout';
import { BudgetMeter, DestinationBanner, FlightPass, StayCard } from './TripParts';

const LEVEL_LABEL = { cheapest: 'Cheapest', balanced: 'Balanced', best: 'Best' } as const;

/** The trip the traveler picked: the itinerary comes first; flight, stay and receipt follow. */
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
  const nights = nightsBetween(trip.departure, trip.returnDate);
  return (
    <div className="flex flex-col gap-12">
      <DestinationBanner trip={trip} compact />

      <TripStrip trip={trip} option={option} nights={nights} />

      {children}

      <section id="trip-details" className="flex scroll-mt-6 flex-col gap-8 border-t-2 border-ink pt-10">
        <div className="flex flex-col gap-4">
          <Eyebrow>Getting there</Eyebrow>
          <h2 className="display max-w-3xl text-5xl sm:text-7xl">Your flight and stay.</h2>
        </div>
        <div className="grid gap-8 lg:grid-cols-[22rem_1fr]">
          <section className="hard-shadow flex flex-col gap-5 self-start border border-ink bg-card p-6">
            <div className="flex items-center justify-between">
              <Eyebrow>{LEVEL_LABEL[option.level]} trip</Eyebrow>
              <span className="label">{plural(nights, 'night')}</span>
            </div>
            <dl className="flex flex-col gap-2 font-mono text-sm">
              <Line label="Flight" amount={option.flight.totalPrice} />
              <Line label="Stay" amount={option.accommodation.totalPrice} />
            </dl>
            <div className="flex items-end justify-between border-t-2 border-ink pt-4">
              <span className="label text-ink">Total</span>
              <span className="display text-6xl tabular-nums">{formatUsd(option.total)}</span>
            </div>
            <BudgetMeter total={option.total} max={trip.maxBudget} />
            <p className="label normal-case tracking-normal">
              Food, tickets and local transport are not included.
            </p>
          </section>

          <div className="flex flex-col gap-6">
            <FlightPass flight={option.flight} trip={trip} />
            <StayCard stay={option.accommodation} travelers={trip.travelers} />
          </div>
        </div>
      </section>

      <div className="border-t border-ink pt-6">
        <button
          onClick={onReset}
          className="border border-ink px-5 py-2.5 font-mono text-xs font-medium uppercase tracking-widest transition hover:bg-ink hover:text-paper"
        >
          ← New itinerary
        </button>
      </div>
    </div>
  );
}

/** One-line recap of the chosen flight and stay, with a jump to the full details below. */
function TripStrip({ trip, option, nights }: { trip: TripRequest; option: TripOption; nights: number }) {
  const dep = splitDateTime(option.flight.outboundDeparture);
  const arr = splitDateTime(option.flight.outboundArrival);
  return (
    <section className="animate-rise grid gap-px border border-ink bg-line sm:grid-cols-[auto_1fr_1fr_auto]">
      <div className="bg-card px-5 py-4">
        <p className="label">{LEVEL_LABEL[option.level]} · {plural(nights, 'night')}</p>
        <p className="display text-4xl tabular-nums">{formatUsd(option.total)}</p>
      </div>
      <div className="bg-card px-5 py-4">
        <p className="label">Flight</p>
        <p className="font-medium">{option.flight.airline}</p>
        <p className="font-mono text-sm text-ink-3">{dep.date} {dep.time} → {arr.time}</p>
      </div>
      <div className="bg-card px-5 py-4">
        <p className="label">Stay</p>
        <p className="font-medium">{option.accommodation.name}</p>
        <p className="font-mono text-sm text-ink-3">
          {formatUsd(option.accommodation.pricePerNight)}/night · {plural(trip.travelers, 'traveler')}
        </p>
      </div>
      <a
        href="#trip-details"
        className="flex items-center bg-card px-5 py-4 font-mono text-xs font-medium uppercase tracking-widest text-accent underline decoration-accent/40 underline-offset-4 transition hover:decoration-accent"
      >
        All details ↓
      </a>
    </section>
  );
}

/** A receipt line: label, dotted leader, amount. */
function Line({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="uppercase tracking-widest">{label}</dt>
      <span className="flex-1 translate-y-[-3px] border-b border-dotted border-ink-3" aria-hidden="true" />
      <dd className="tabular-nums">{formatUsd(amount)}</dd>
    </div>
  );
}

export function TripError({ error, onReset }: { error: string; onReset: () => void }) {
  return (
    <div className="animate-rise mx-auto my-16 flex max-w-2xl flex-col items-start gap-5 border border-ink bg-mark p-8 text-black">
      <p className="label text-black">Something went wrong</p>
      <h2 className="display text-5xl sm:text-6xl">We couldn't price your trip.</h2>
      <p className="text-lg">{error}</p>
      <button
        onClick={onReset}
        className="bg-black px-5 py-3 font-mono text-xs font-medium uppercase tracking-widest text-white transition hover:bg-accent"
      >
        ← Try again
      </button>
    </div>
  );
}
