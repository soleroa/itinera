import { useState } from 'react';
import type { SavedTrip } from '../lib/saved-trips';
import { formatDateRange, formatUsd, nightsBetween, plural, tripTitle } from '../lib/format';
import { Eyebrow } from './Layout';

export function SavedTrips({
  trips,
  onOpen,
  onDelete,
  onNew,
}: {
  trips: SavedTrip[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <div className="flex flex-col gap-10 pb-10 pt-4">
      <div className="flex flex-col gap-4">
        <Eyebrow>Your panel</Eyebrow>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h1 className="display text-5xl sm:text-7xl">My trips.</h1>
          <button
            onClick={onNew}
            className="bg-ink px-6 py-3 font-display text-xl font-semibold tracking-tight text-paper transition hover:bg-accent hover:text-on-accent"
          >
            + New itinerary
          </button>
        </div>
        <p className="label normal-case tracking-normal">Saved in this browser only.</p>
      </div>

      {trips.length === 0 ? (
        <p className="border border-ink bg-card p-6 text-ink-2">
          Nothing saved yet. When you pick a flight and stay, the trip is saved here automatically.
        </p>
      ) : (
        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {trips.map((saved, i) => (
            <SavedTripCard
              key={saved.id}
              saved={saved}
              delay={i * 60}
              onOpen={() => onOpen(saved.id)}
              onDelete={() => onDelete(saved.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function SavedTripCard({
  saved,
  delay,
  onOpen,
  onDelete,
}: {
  saved: SavedTrip;
  delay: number;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const { trip, option } = saved;
  const nights = nightsBetween(trip.departure, trip.returnDate);
  const built = saved.plan.filter((p) => p.itinerary).length;
  const itinerary = built > 0 && built === saved.plan.length;
  const placeCount = saved.plan.reduce((sum, p) => sum + (p.places?.length ?? 0), 0);
  const days = saved.plan.reduce((sum, p) => sum + (p.itinerary?.days.length ?? 0), 0);

  return (
    <li
      className="animate-rise flex flex-col border border-ink bg-card text-ink"
      style={{ animationDelay: `${delay}ms` }}
    >
      <header className="flex items-center justify-between border-b border-line px-5 py-3">
        <span className="label text-ink">{formatDateRange(trip.departure, trip.returnDate)}</span>
        <span
          className={`px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-widest ${
            itinerary ? 'bg-mark text-black' : 'border border-ink text-ink-3'
          }`}
        >
          {itinerary ? 'Itinerary ready' : 'Draft'}
        </span>
      </header>

      <button onClick={onOpen} className="flex flex-1 flex-col gap-3 px-5 py-5 text-left transition hover:bg-paper">
        <p className={`display ${trip.stops.length > 1 ? 'text-4xl' : 'text-5xl'}`}>{tripTitle(trip)}</p>
        <p className="label normal-case tracking-normal">
          From {trip.origin} · {plural(nights, 'night')} · {plural(trip.travelers, 'traveler')}
        </p>
        <p className="font-mono text-sm text-ink-3">
          {formatUsd(option.total)} flight + stay ·{' '}
          {itinerary ? plural(days, 'day') + ' planned' : plural(placeCount, 'place') + ' picked'}
        </p>
      </button>

      <footer className="flex items-center justify-between border-t border-ink">
        <button
          onClick={onOpen}
          className="px-5 py-3 font-mono text-xs font-medium uppercase tracking-widest text-accent transition hover:underline"
        >
          Open →
        </button>
        {confirming ? (
          <span className="flex items-center">
            <button
              onClick={onDelete}
              className="bg-black px-4 py-3 font-mono text-xs font-medium uppercase tracking-widest text-white transition hover:bg-accent"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="px-4 py-3 font-mono text-xs font-medium uppercase tracking-widest transition hover:underline"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            aria-label={`Delete trip to ${tripTitle(trip)}`}
            className="px-5 py-3 font-mono text-xs font-medium uppercase tracking-widest text-ink-3 transition hover:text-ink"
          >
            Delete
          </button>
        )}
      </footer>
    </li>
  );
}
