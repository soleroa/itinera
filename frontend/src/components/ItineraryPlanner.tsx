import { Fragment, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { buildItinerary, fetchTransfer, ItineraryError, suggestPlaces } from '../lib/itinerary-client';
import { track } from '../lib/analytics';
import { formatDuration, plural } from '../lib/format';
import type { StopPlan } from '../lib/saved-trips';
import type { Itinerary, ItineraryDay, Leg, Transfer, TripOption, TripRequest } from '../types';
import { BusIcon, CarIcon, WalkIcon } from './Icons';
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

/** The days of the whole trip: one planner per city, with the way to get between cities in between. */
export function TripItineraries({
  trip,
  option,
  plan,
  onSave,
}: {
  trip: TripRequest;
  option: TripOption;
  /** Work restored from a saved trip, one entry per city. */
  plan?: StopPlan[];
  onSave?: (index: number, state: StopPlan) => void;
}) {
  const multi = trip.stops.length > 1;
  return (
    <>
      {trip.stops.map((stop, i) => (
        <Fragment key={`${stop.city}-${i}`}>
          {i > 0 && <TransferBlock from={trip.stops[i - 1].city} to={stop.city} />}
          <ItineraryPlanner
            city={stop.city}
            nights={stop.nights}
            hotel={option.accommodations[i]?.name ?? ''}
            heading={multi ? { eyebrow: `Stop ${i + 1} of ${trip.stops.length} · ${plural(stop.nights, 'night')}` } : undefined}
            saved={plan?.[i]}
            onSave={(state) => onSave?.(i, state)}
          />
        </Fragment>
      ))}
    </>
  );
}

/** How to get from one city to the next. Shown for information: it is not part of the budget. */
function TransferBlock({ from, to }: { from: string; to: string }) {
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setTransfer(null);
    setFailed(false);
    fetchTransfer(from, to)
      .then((t) => !cancelled && setTransfer(t))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  return (
    <section className="flex flex-col gap-3 border-t-2 border-ink pt-8" aria-label={`From ${from} to ${to}`}>
      <Eyebrow>Between cities</Eyebrow>
      <h3 className="display text-4xl sm:text-5xl">
        {from} <span className="text-accent">→</span> {to}
      </h3>
      {failed ? (
        <p className="font-mono text-xs text-ink-3">We couldn't look up this transfer.</p>
      ) : !transfer ? (
        <span className="skeleton h-10 w-64" aria-busy="true" aria-label="Loading transfer" />
      ) : (
        <LegBlock leg={transfer.leg} unavailable="No route found between these cities." />
      )}
      <p className="label normal-case tracking-normal">Transfers are not included in your budget.</p>
    </section>
  );
}

export function ItineraryPlanner({
  city,
  nights,
  hotel,
  heading,
  saved,
  onSave,
}: {
  city: string;
  nights: number;
  /** Where each day starts: the stay chosen for this city. */
  hotel: string;
  /** Overrides the caption above the title (used when the trip has several cities). */
  heading?: { eyebrow: string };
  /** Work restored from a saved trip. */
  saved?: StopPlan;
  /** Called whenever the places or the built itinerary change, so they can be stored. */
  onSave?: (state: { places: string[]; itinerary: Itinerary | null }) => void;
}) {
  const [places, setPlaces] = useState<string[]>(saved?.places ?? []);
  const [draft, setDraft] = useState('');
  const [loadingSuggestions, setLoadingSuggestions] = useState(saved?.places == null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itinerary, setItinerary] = useState<Itinerary | null>(saved?.itinerary ?? null);
  const [suggestionsReady, setSuggestionsReady] = useState(saved?.places != null);

  const days = nights;

  useEffect(() => {
    if (saved?.places != null) return; // restored from a saved trip: keep the user's list
    let cancelled = false;
    suggestPlaces(city)
      .then((suggested) => {
        if (cancelled) return;
        setPlaces(suggested.map((p) => p.name));
        setSuggestionsReady(true);
        track('places_suggested', { count: suggested.length });
      })
      .catch((err) => !cancelled && setSuggestionError(messageOf(err)))
      .finally(() => !cancelled && setLoadingSuggestions(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  // Persist the user's work. Skipped until suggestions loaded, so a draft is never saved half-empty.
  const restored = useRef(saved != null);
  useEffect(() => {
    if (restored.current) {
      restored.current = false; // just opened a saved trip: nothing changed yet
      return;
    }
    if (suggestionsReady || places.length > 0 || itinerary) onSave?.({ places, itinerary });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places, itinerary, suggestionsReady]);

  const addPlace = (e: FormEvent) => {
    e.preventDefault();
    const name = draft.trim();
    if (name && !places.includes(name)) {
      setPlaces([...places, name]);
      track('place_added');
    }
    setDraft('');
  };

  const build = async () => {
    setBuilding(true);
    setError(null);
    track('itinerary_requested', { days, places: places.length });
    try {
      setItinerary(
        await buildItinerary({
          destination: city,
          hotel,
          days,
          places,
        }),
      );
      track('itinerary_built', { days, places: places.length });
    } catch (err) {
      setError(messageOf(err));
      track('itinerary_failed', { error: messageOf(err) });
    } finally {
      setBuilding(false);
    }
  };

  return (
    <section className="flex flex-col gap-8 border-t-2 border-ink pt-10">
      <div className="flex flex-col gap-4">
        <Eyebrow>{heading?.eyebrow ?? 'Step 2 of 2 · Your days'}</Eyebrow>
        <h2 className="display max-w-3xl text-5xl sm:text-7xl">
          {heading ? (itinerary ? `${city}.` : `What to see in ${city}?`) : itinerary ? 'Your itinerary.' : 'What do you want to see?'}
        </h2>
        {!itinerary && (
          <p className="max-w-2xl text-lg text-ink-2">
            These are the top-rated places in {city}. Cross out what you don't want and add your own. We
            group them by proximity into {plural(days, 'day')}, starting from your hotel, and work out how to get
            between them.
          </p>
        )}
      </div>

      {!itinerary && (
        <div className="flex flex-col gap-6 border border-ink bg-card p-6 sm:p-8">
          {loadingSuggestions && (
            <div className="flex flex-wrap gap-2" aria-label="Loading suggestions" aria-busy="true">
              {[120, 160, 96, 140, 110, 150].map((w, i) => (
                <span key={i} className="skeleton h-10" style={{ width: w }} />
              ))}
            </div>
          )}
          {suggestionError && (
            <p className="border border-ink bg-mark px-4 py-3 text-sm text-black">
              We couldn't load suggestions ({suggestionError}). You can still add places yourself.
            </p>
          )}

          {places.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {places.map((name) => (
                <li key={name} className="animate-rise flex items-stretch border border-ink bg-paper">
                  <span className="px-3 py-2 font-mono text-sm">{name}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${name}`}
                    onClick={() => setPlaces(places.filter((p) => p !== name))}
                    className="border-l border-ink px-2.5 font-mono text-sm transition hover:bg-ink hover:text-paper"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={addPlace} className="flex items-end gap-3 border-b border-ink">
            <label htmlFor="add-place" className="label pb-3">
              + Add
            </label>
            <input
              id="add-place"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Cerro Campanario"
              className="min-w-0 flex-1 bg-transparent py-2 font-display text-2xl font-semibold tracking-tight outline-none focus-visible:outline-none placeholder:font-normal placeholder:text-ink-3/50"
            />
            <button type="submit" className="pb-3 font-mono text-xs font-medium uppercase tracking-widest text-accent">
              Add ↵
            </button>
          </form>

          {error && <p className="font-mono text-sm text-accent">{error}</p>}

          <div className="flex flex-wrap items-center gap-5">
            <button
              onClick={build}
              disabled={building || places.length === 0}
              className="bg-ink px-6 py-4 font-display text-xl font-semibold tracking-tight text-paper transition hover:bg-accent hover:text-on-accent disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-ink disabled:hover:text-paper"
            >
              {building ? 'Routing…' : 'Build itinerary →'}
            </button>
            <span className="label">
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
    <div className="flex flex-col gap-10">
      {itinerary.unresolved.length > 0 && (
        <p className="border border-ink bg-mark px-4 py-3 text-sm text-black">
          We couldn't find: {itinerary.unresolved.join(', ')}.
        </p>
      )}
      {itinerary.days.map((day, i) => (
        <DayBlock key={day.day} day={day} hotel={itinerary.hotel.name} delay={i * 90} />
      ))}
      <button
        onClick={onEdit}
        className="self-start border border-ink px-5 py-2.5 font-mono text-xs font-medium uppercase tracking-widest transition hover:bg-ink hover:text-paper"
      >
        ← Edit places
      </button>
    </div>
  );
}

function DayBlock({ day, hotel, delay }: { day: ItineraryDay; hotel: string; delay: number }) {
  return (
    <article
      className="animate-rise grid gap-x-10 gap-y-4 border-t border-ink pt-6 md:grid-cols-[9rem_1fr]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <header className="flex items-baseline justify-between md:flex-col md:justify-start md:gap-2">
        <p className="display text-7xl text-accent md:text-9xl">{String(day.day).padStart(2, '0')}</p>
        <p className="label text-right md:text-left">
          {plural(day.stops.length, 'stop')}
          <br className="hidden md:block" /> {formatDuration(day.totalTravelMinutes)} moving
        </p>
      </header>

      <div>
        <ol className="relative flex flex-col border-l border-ink pl-6">
          <Node tone="start">
            <p className="label">Start</p>
            <p className="font-medium">{hotel}</p>
          </Node>
          {day.stops.map((stop) => (
            <li key={stop.place.id} className="flex flex-col">
              <LegBlock leg={stop.leg} />
              <Node tone="stop">
                <p className="display text-3xl sm:text-4xl">{stop.place.name}</p>
                <p className="mt-1 text-sm text-ink-3">{stop.place.address}</p>
              </Node>
            </li>
          ))}
        </ol>

        {day.warnings.length > 0 && (
          <div className="mt-6 flex flex-col gap-2 border border-ink bg-mark p-4 text-sm text-black">
            {day.warnings.map((warning) => (
              <p key={warning}>
                <b className="font-mono text-xs uppercase tracking-widest">Heads up · </b>
                {warning}
              </p>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function Node({ tone, children }: { tone: 'start' | 'stop'; children: React.ReactNode }) {
  return (
    <div className="relative py-3">
      <span
        aria-hidden="true"
        className={`absolute -left-[31px] top-[1.15rem] h-2.5 w-2.5 border border-ink ${
          tone === 'start' ? 'bg-accent' : 'bg-paper'
        }`}
      />
      {children}
    </div>
  );
}

function LegBlock({ leg, unavailable = 'No route found from the previous stop.' }: { leg: Leg | null; unavailable?: string }) {
  if (!leg) {
    return <p className="py-1 font-mono text-xs text-ink-3">{unavailable}</p>;
  }
  const { label, Icon } = MODES[leg.mode];
  const long = leg.minutes > LONG_LEG_MINUTES;
  const transit = leg.steps.filter((s) => s.line);
  return (
    <div className="flex flex-col gap-1 py-1 font-mono text-xs">
      <p className="flex flex-wrap items-center gap-2 uppercase tracking-widest">
        <Icon width={14} height={14} />
        <span className={long ? 'bg-mark px-1.5 py-0.5 font-semibold text-black' : 'font-semibold'}>
          {formatDuration(leg.minutes)}
        </span>
        <span className="text-ink-3">{label}</span>
        {long && <span className="text-accent">Long leg</span>}
      </p>
      {!leg.transitAvailable && <p className="text-ink-3">No public transport data for this leg.</p>}
      {transit.map((step, i) => (
        <p key={i} className="text-ink-3">
          <span className="font-semibold text-ink">
            {step.vehicle ?? 'Transit'} {step.line}
          </span>{' '}
          · {step.from} → {step.to}
        </p>
      ))}
    </div>
  );
}
