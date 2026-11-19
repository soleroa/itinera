import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { buildItinerary, ItineraryError, suggestPlaces } from '../lib/itinerary-client';
import { formatDuration, nightsBetween, plural } from '../lib/format';
import type { Itinerary, ItineraryDay, Leg, TripOption, TripRequest } from '../types';
import { AlertIcon, BusIcon, CarIcon, PinIcon, PlusIcon, WalkIcon, XIcon } from './Icons';
import { Eyebrow } from './Layout';

const MODES = {
  TRANSIT: { label: 'Public transport', Icon: BusIcon },
  WALK: { label: 'On foot', Icon: WalkIcon },
  DRIVE: { label: 'By car', Icon: CarIcon },
} as const;

/** Mirrors the backend's guideline: a leg longer than this is flagged (the place is kept). */
const LONG_LEG_MINUTES = 30;

function messageOf(error: unknown): string {
  return error instanceof ItineraryError ? error.message : 'Could not reach the backend.';
}

export function ItineraryPlanner({ trip, option }: { trip: TripRequest; option: TripOption }) {
  const [places, setPlaces] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);

  const days = nightsBetween(trip.departure, trip.returnDate);

  useEffect(() => {
    let cancelled = false;
    suggestPlaces(trip.destination)
      .then((suggested) => !cancelled && setPlaces(suggested.map((p) => p.name)))
      .catch((err) => !cancelled && setSuggestionError(messageOf(err)))
      .finally(() => !cancelled && setLoadingSuggestions(false));
    return () => {
      cancelled = true;
    };
  }, [trip.destination]);

  const addPlace = (e: FormEvent) => {
    e.preventDefault();
    const name = draft.trim();
    if (name && !places.includes(name)) setPlaces([...places, name]);
    setDraft('');
  };

  const build = async () => {
    setBuilding(true);
    setError(null);
    try {
      setItinerary(
        await buildItinerary({
          destination: trip.destination,
          hotel: option.accommodation.name,
          days,
          places,
        }),
      );
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBuilding(false);
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Eyebrow>Day by day</Eyebrow>
        <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          {itinerary ? 'Your itinerary' : 'What do you want to see?'}
        </h2>
        {!itinerary && (
          <p className="max-w-2xl text-ink-2">
            These are the top-rated attractions in {trip.destination}. Remove what you don't want and add
            your own. We group the places by proximity into {plural(days, 'day')}, starting from your hotel,
            and show how to get between them.
          </p>
        )}
      </div>

      {!itinerary && (
        <div className="flex flex-col gap-5 rounded-3xl border border-line bg-card p-6 sm:p-8">
          {loadingSuggestions && (
            <div className="flex flex-wrap gap-2" aria-label="Loading suggestions" aria-busy="true">
              {[120, 160, 96, 140, 110, 150].map((w, i) => (
                <span key={i} className="skeleton h-9 rounded-full" style={{ width: w }} />
              ))}
            </div>
          )}
          {suggestionError && (
            <p className="rounded-xl bg-amber-soft px-4 py-3 text-sm text-amber-ink">
              We couldn't load suggestions ({suggestionError}). You can still add places yourself.
            </p>
          )}

          {places.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {places.map((name) => (
                <li
                  key={name}
                  className="animate-fade-up flex items-center gap-1.5 rounded-full border border-line bg-paper py-1.5 pl-3.5 pr-1.5 text-sm font-medium"
                >
                  <PinIcon width={14} height={14} className="text-terracotta" />
                  {name}
                  <button
                    type="button"
                    aria-label={`Remove ${name}`}
                    onClick={() => setPlaces(places.filter((p) => p !== name))}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-ink-3 transition hover:bg-paper-2 hover:text-terracotta"
                  >
                    <XIcon width={14} height={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={addPlace} className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a place, e.g. Cerro Campanario"
              aria-label="Add a place"
              className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-4 py-3 outline-none focus-visible:outline-none transition placeholder:text-ink-3/70 focus:border-terracotta focus:ring-4 focus:ring-terracotta/15"
            />
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl border border-line px-4 py-3 font-medium text-ink-2 transition hover:border-terracotta hover:text-terracotta"
            >
              <PlusIcon width={18} height={18} /> Add
            </button>
          </form>

          {error && <p className="text-sm text-terracotta">{error}</p>}

          <div className="flex flex-wrap items-center gap-4 border-t border-line pt-5">
            <button
              onClick={build}
              disabled={building || places.length === 0}
              className="rounded-xl bg-terracotta px-6 py-3 font-semibold text-on-accent transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {building ? 'Building your itinerary…' : 'Build itinerary'}
            </button>
            <span className="text-sm text-ink-3">
              {plural(places.length, 'place')} · {plural(days, 'day')}
            </span>
          </div>
        </div>
      )}

      {itinerary && <ItineraryView itinerary={itinerary} onEdit={() => setItinerary(null)} />}
    </section>
  );
}

function ItineraryView({ itinerary, onEdit }: { itinerary: Itinerary; onEdit: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      {itinerary.unresolved.length > 0 && (
        <p className="rounded-xl bg-amber-soft px-4 py-3 text-sm text-amber-ink">
          We couldn't find: {itinerary.unresolved.join(', ')}.
        </p>
      )}
      {itinerary.days.map((day, i) => (
        <DayCard key={day.day} day={day} hotel={itinerary.hotel.name} delay={i * 90} />
      ))}
      <button
        onClick={onEdit}
        className="self-start rounded-xl border border-line px-5 py-2.5 font-medium text-ink-2 transition hover:border-terracotta hover:text-terracotta"
      >
        Edit places
      </button>
    </div>
  );
}

function DayCard({ day, hotel, delay }: { day: ItineraryDay; hotel: string; delay: number }) {
  return (
    <article
      className="animate-fade-up rounded-3xl border border-line bg-card p-6 sm:p-8"
      style={{ animationDelay: `${delay}ms` }}
    >
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-4xl font-semibold leading-none tracking-tight">
          Day <span className="text-terracotta">{day.day}</span>
        </h3>
        <p className="text-sm text-ink-3">
          {plural(day.stops.length, 'stop')} · {formatDuration(day.totalTravelMinutes)} of travel
        </p>
      </header>

      <ol className="relative flex flex-col gap-1 pl-9 before:absolute before:bottom-2 before:left-[13px] before:top-2 before:w-px before:bg-line">
        <TimelineNode label="Start" title={hotel} tone="start" />
        {day.stops.map((stop) => (
          <li key={stop.place.id} className="flex flex-col gap-1">
            <LegBlock leg={stop.leg} />
            <TimelineNode label={stop.place.name} title={stop.place.address} tone="stop" />
          </li>
        ))}
      </ol>

      {day.warnings.length > 0 && (
        <div className="mt-6 flex flex-col gap-2 rounded-2xl bg-amber-soft p-4 text-sm text-amber-ink">
          {day.warnings.map((warning) => (
            <p key={warning} className="flex gap-2">
              <AlertIcon width={16} height={16} className="mt-0.5 shrink-0" />
              {warning}
            </p>
          ))}
        </div>
      )}
    </article>
  );
}

function TimelineNode({ label, title, tone }: { label: string; title: string; tone: 'start' | 'stop' }) {
  return (
    <div className="relative py-2">
      <span
        className={`absolute -left-9 top-2.5 flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 ${
          tone === 'start'
            ? 'border-forest bg-forest text-paper'
            : 'border-terracotta bg-card text-terracotta'
        }`}
      >
        <PinIcon width={13} height={13} />
      </span>
      {tone === 'start' && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-3">{label}</p>
      )}
      <p className={tone === 'start' ? 'font-medium' : 'font-display text-xl font-semibold leading-snug'}>
        {tone === 'start' ? title : label}
      </p>
      {tone === 'stop' && <p className="text-sm text-ink-3">{title}</p>}
    </div>
  );
}

function LegBlock({ leg }: { leg: Leg | null }) {
  if (!leg) {
    return <p className="py-1 text-sm text-ink-3">No route found from the previous stop.</p>;
  }
  const { label, Icon } = MODES[leg.mode];
  const long = leg.minutes > LONG_LEG_MINUTES;
  const transit = leg.steps.filter((s) => s.line);
  return (
    <div className="flex flex-col gap-1.5 py-1">
      <p className={`flex items-center gap-2 text-sm font-medium ${long ? 'text-amber-ink' : 'text-ink-2'}`}>
        <Icon width={16} height={16} />
        <span>
          {formatDuration(leg.minutes)} · {label}
        </span>
        {long && (
          <span className="rounded-full bg-amber-soft px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider">
            Long leg
          </span>
        )}
      </p>
      {!leg.transitAvailable && (
        <p className="text-xs text-ink-3">No public transport data for this leg.</p>
      )}
      {transit.map((step, i) => (
        <p key={i} className="text-xs text-ink-3">
          <span className="font-semibold text-ink-2">
            {step.vehicle ?? 'Transit'} {step.line}
          </span>{' '}
          · {step.from} → {step.to}
        </p>
      ))}
    </div>
  );
}
