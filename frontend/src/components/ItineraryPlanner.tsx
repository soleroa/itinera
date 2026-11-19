import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { buildItinerary, ItineraryError, suggestPlaces } from '../lib/itinerary-client';
import type { Itinerary, Leg, TripOption, TripRequest } from '../types';

const MODE_LABEL = { TRANSIT: 'Public transport', WALK: 'Walking', DRIVE: 'Driving' } as const;

function nights(trip: TripRequest): number {
  const ms = Date.parse(trip.returnDate) - Date.parse(trip.departure);
  return Math.max(1, Math.round(ms / 86_400_000));
}

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
          days: nights(trip),
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
    <section className="flex flex-col gap-4">
      <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
        Day-by-day itinerary
      </h3>

      {!itinerary && (
        <div className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Pick the places you want to visit. They are grouped by proximity into{' '}
            {nights(trip)} {nights(trip) === 1 ? 'day' : 'days'}, starting from your hotel.
          </p>

          {loadingSuggestions && (
            <p className="text-neutral-500 dark:text-neutral-400">Looking for suggestions…</p>
          )}
          {suggestionError && (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Couldn't load suggestions ({suggestionError}). You can add places yourself.
            </p>
          )}

          <ul className="flex flex-wrap gap-2">
            {places.map((name) => (
              <li
                key={name}
                className="flex items-center gap-2 rounded-full bg-emerald-100 py-1 pl-3 pr-1 text-sm text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
              >
                {name}
                <button
                  type="button"
                  aria-label={`Remove ${name}`}
                  onClick={() => setPlaces(places.filter((p) => p !== name))}
                  className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-800"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>

          <form onSubmit={addPlace} className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a place, e.g. Cerro Campanario"
              className="flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-neutral-900 outline-none focus:border-emerald-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            />
            <button
              type="submit"
              className="rounded-xl px-4 py-2.5 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
            >
              Add
            </button>
          </form>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            onClick={build}
            disabled={building || places.length === 0}
            className="self-start rounded-xl bg-emerald-600 px-5 py-2.5 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {building ? 'Building…' : 'Build itinerary'}
          </button>
        </div>
      )}

      {itinerary && <ItineraryView itinerary={itinerary} onEdit={() => setItinerary(null)} />}
    </section>
  );
}

function ItineraryView({ itinerary, onEdit }: { itinerary: Itinerary; onEdit: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      {itinerary.unresolved.length > 0 && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Couldn't find: {itinerary.unresolved.join(', ')}.
        </p>
      )}
      {itinerary.days.map((day) => (
        <article
          key={day.day}
          className="flex flex-col gap-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800"
        >
          <div className="flex items-baseline justify-between">
            <h4 className="font-semibold text-neutral-900 dark:text-neutral-50">Day {day.day}</h4>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {day.totalTravelMinutes} min of travel
            </span>
          </div>
          <ol className="flex flex-col gap-3">
            {day.stops.map((stop) => (
              <li key={stop.place.id} className="flex flex-col gap-1">
                <LegView leg={stop.leg} />
                <span className="font-medium text-neutral-900 dark:text-neutral-50">
                  {stop.place.name}
                </span>
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  {stop.place.address}
                </span>
              </li>
            ))}
          </ol>
          {day.warnings.map((warning) => (
            <p key={warning} className="text-sm text-amber-700 dark:text-amber-400">
              ⚠ {warning}
            </p>
          ))}
        </article>
      ))}
      <button
        onClick={onEdit}
        className="self-start rounded-xl px-4 py-2 text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
      >
        Edit places
      </button>
    </div>
  );
}

function LegView({ leg }: { leg: Leg | null }) {
  if (!leg) {
    return (
      <span className="text-sm text-neutral-500 dark:text-neutral-400">
        No route found from the previous stop.
      </span>
    );
  }
  const transit = leg.steps.filter((s) => s.line);
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-neutral-50 px-3 py-2 text-sm text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300">
      <span>
        {MODE_LABEL[leg.mode]} · {leg.minutes} min from {leg.from}
      </span>
      {!leg.transitAvailable && (
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          No public transport data for this leg.
        </span>
      )}
      {transit.map((step, i) => (
        <span key={i} className="text-xs text-neutral-500 dark:text-neutral-400">
          {step.vehicle ?? 'Transit'} {step.line}: {step.from} → {step.to}
        </span>
      ))}
    </div>
  );
}
