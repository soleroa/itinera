import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { TripRequest, TripScope, TripStop } from '../types';
import { MinusIcon, PlusIcon } from './Icons';
import type { CitySuggestion } from '../lib/places-client';
import { PlaceSearch } from './PlaceSearch';

type Draft = {
  /** What is typed in the destination box (not yet added to the trip). */
  destination: string;
  /** Cities picked so far, in visiting order. */
  stops: TripStop[];
  origin: string;
  departure: string;
  returnDate: string;
  travelers: number;
  maxBudget: string;
};

const DESTINATIONS = ['Bariloche', 'Mendoza', 'Salta', 'Ushuaia'];
const MAX_STOPS = 4;

const SCOPES: Array<{ id: TripScope; title: string; hint: string }> = [
  { id: 'full', title: 'Full trip', hint: 'Flight, stay and the days' },
  { id: 'flights', title: 'Flights', hint: 'Only the flight' },
  { id: 'stays', title: 'Stays', hint: 'Only where to sleep' },
];

/** `total` nights shared as evenly as possible; the first cities get the extra ones. */
function evenSplit(total: number, count: number): number[] {
  const base = Math.floor(total / count);
  const extra = total % count;
  return Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0));
}

function nightsInTrip(departure: string, returnDate: string): number {
  if (!departure || !returnDate || returnDate <= departure) return 0;
  return Math.round((Date.parse(returnDate) - Date.parse(departure)) / 86_400_000);
}
const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

const input =
  'w-full border-0 border-b border-transparent bg-transparent py-1 font-display text-3xl font-semibold tracking-tight text-ink outline-none focus-visible:outline-none placeholder:font-normal placeholder:text-ink-3/50 focus:border-accent';

/** The whole search as one ruled sheet: numbered fields instead of a step-by-step wizard. */
export function TripForm({ onSubmit }: { onSubmit: (trip: TripRequest) => void }) {
  const [draft, setDraft] = useState<Draft>({
    destination: '',
    stops: [],
    origin: '',
    departure: '',
    returnDate: '',
    travelers: 2,
    maxBudget: '',
  });
  // Whether the destination / origin picked from the suggestions is a whole country or region.
  const [kinds, setKinds] = useState<{ destination: CitySuggestion['kind'] | null; origin: CitySuggestion['kind'] | null }>({
    destination: null,
    origin: null,
  });
  const isBroad = (kind: CitySuggestion['kind'] | null) => kind === 'country' || kind === 'region';
  const [scope, setScope] = useState<TripScope>('full');
  const needsOrigin = scope !== 'stays';
  // Flights are for one destination; stays and the full trip can chain several cities.
  const maxStops = scope === 'flights' ? 1 : MAX_STOPS;
  // True once the traveler edited the nights by hand; until then they are split evenly.
  const [manualNights, setManualNights] = useState(false);
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const totalNights = nightsInTrip(draft.departure, draft.returnDate);
  const typed = draft.destination.trim();
  const cities = draft.stops.map((s) => s.city);

  const setStops = (stops: TripStop[], manual = false) => {
    setManualNights(manual);
    update('stops', stops);
  };
  const addCity = (city: string) => {
    const name = city.trim();
    if (!name || cities.some((c) => c.toLowerCase() === name.toLowerCase())) return;
    // Flights have a single destination: choosing another city replaces it.
    if (maxStops === 1) return setStops([{ city: name, nights: 0 }]);
    if (cities.length >= maxStops) return;
    setStops([...draft.stops, { city: name, nights: 0 }]);
  };
  const chooseScope = (next: TripScope) => {
    setScope(next);
    // Flights go to one city only: keep the first.
    if (next === 'flights' && draft.stops.length > 1) setStops(draft.stops.slice(0, 1));
  };
  const removeCity = (index: number) => setStops(draft.stops.filter((_, i) => i !== index));
  const moveUp = (index: number) => {
    const next = [...draft.stops];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setStops(next, manualNights);
  };
  const changeNights = (index: number, delta: number) =>
    setStops(
      draft.stops.map((s, i) => (i === index ? { ...s, nights: Math.max(1, s.nights + delta) } : s)),
      true,
    );

  // Keep the nights split evenly across the cities until the traveler edits them.
  useEffect(() => {
    if (manualNights || draft.stops.length === 0) return;
    const nights = evenSplit(totalNights, draft.stops.length);
    setDraft((prev) =>
      prev.stops.every((s, i) => s.nights === nights[i])
        ? prev
        : { ...prev, stops: prev.stops.map((s, i) => ({ ...s, nights: nights[i] })) },
    );
  }, [manualNights, draft.stops.length, totalNights]);

  const assigned = draft.stops.reduce((sum, s) => sum + s.nights, 0);

  const datesOk = draft.departure !== '' && draft.returnDate !== '' && draft.returnDate > draft.departure;
  const budgetOk = draft.maxBudget === '' || Number(draft.maxBudget) > 0;
  const multi = draft.stops.length > 0;
  const nightsOff = multi && datesOk && assigned !== totalNights;
  const missing = !multi && !typed
    ? 'Add a destination'
    : !multi && isBroad(kinds.destination)
      ? `Pick a city in ${draft.destination}`
      : multi && typed && !isBroad(kinds.destination)
        ? `Press Add to include "${typed}", or clear it`
        : needsOrigin && !draft.origin.trim()
          ? 'Add where you fly from'
          : needsOrigin && isBroad(kinds.origin)
            ? `Pick the city you fly from in ${draft.origin}`
            : draft.departure === '' || draft.returnDate === ''
              ? 'Pick your dates'
              : !datesOk
                ? scope === 'stays'
                  ? 'Check-out must be after check-in'
                  : 'The return must be after the departure'
                : multi && draft.stops.length > totalNights
                  ? 'You need at least one night in every city'
                  : nightsOff
                    ? assigned < totalNights
                      ? `${totalNights - assigned} night${totalNights - assigned === 1 ? '' : 's'} left to assign`
                      : `${assigned - totalNights} night${assigned - totalNights === 1 ? '' : 's'} too many`
                    : !budgetOk
                      ? 'The budget must be greater than zero'
                      : null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (missing) return;
    const stops = multi ? draft.stops : [{ city: typed, nights: totalNights }];
    onSubmit({
      scope,
      destination: stops[0].city,
      stops,
      origin: needsOrigin ? draft.origin.trim() : '',
      departure: draft.departure,
      returnDate: draft.returnDate,
      travelers: draft.travelers,
      maxBudget: draft.maxBudget ? Number(draft.maxBudget) : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="hard-shadow border border-ink bg-card">
      <div className="flex items-center justify-between border-b border-ink bg-ink px-5 py-2.5 text-paper">
        <span className="label text-paper">New trip</span>
        <span className="label text-paper/70">{needsOrigin ? 6 : 5} quick questions</span>
      </div>

      <div className="border-b border-line px-5 py-4">
        <p className="label mb-2">What do you need?</p>
        <div role="radiogroup" aria-label="What do you need?" className="grid grid-cols-3 border border-ink">
          {SCOPES.map(({ id, title, hint }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={scope === id}
              onClick={() => chooseScope(id)}
              className={`flex flex-col gap-0.5 border-r border-ink px-3 py-2 text-left transition last:border-r-0 ${
                scope === id ? 'bg-ink text-paper' : 'hover:bg-paper-2'
              }`}
            >
              <span className="font-display text-lg font-semibold leading-tight tracking-tight">{title}</span>
              <span className={`hidden font-mono text-[11px] sm:block ${scope === id ? 'text-paper/70' : 'text-ink-3'}`}>
                {hint}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Field
        n="01"
        label={scope === 'stays' ? (multi ? 'Where to stay · your route' : 'Where to stay') : multi && maxStops > 1 ? 'Where to · your route' : 'Where to'}
        htmlFor="destination"
      >
        {multi && (
          <ol className="mb-3 flex flex-col border border-ink">
            {draft.stops.map((stop, i) => (
              <li key={stop.city} className="flex items-center gap-3 border-b border-line bg-paper px-3 py-2 last:border-b-0">
                <span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, '0')}</span>
                <span className="min-w-0 flex-1 truncate font-display text-xl font-semibold tracking-tight">{stop.city}</span>
                {draft.stops.length > 1 && (
                  <span className="flex items-center gap-1.5">
                    <Stepper label={`Fewer nights in ${stop.city}`} disabled={!datesOk || stop.nights <= 1} onClick={() => changeNights(i, -1)}>
                      <MinusIcon width={12} height={12} />
                    </Stepper>
                    <span className="w-14 text-center font-mono text-xs tabular-nums" aria-live="polite">
                      {datesOk ? `${stop.nights} night${stop.nights === 1 ? '' : 's'}` : '— nights'}
                    </span>
                    <Stepper label={`More nights in ${stop.city}`} disabled={!datesOk} onClick={() => changeNights(i, 1)}>
                      <PlusIcon width={12} height={12} />
                    </Stepper>
                  </span>
                )}
                {i > 0 && (
                  <button
                    type="button"
                    aria-label={`Visit ${stop.city} before ${draft.stops[i - 1].city}`}
                    onClick={() => moveUp(i)}
                    className="px-1 font-mono text-sm text-ink-3 transition hover:text-accent"
                  >
                    ↑
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Remove ${stop.city}`}
                  onClick={() => removeCity(i)}
                  className="px-1 font-mono text-sm text-ink-3 transition hover:text-accent"
                >
                  ×
                </button>
              </li>
            ))}
          </ol>
        )}
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <PlaceSearch
              id="destination"
              value={draft.destination}
              onChange={(v) => update('destination', v)}
              onKind={(kind) => setKinds((k) => ({ ...k, destination: kind }))}
              onSelectCity={addCity}
              addedCities={cities}
              placeholder={multi ? (maxStops === 1 ? 'Search another city to replace it' : 'Add another city') : 'Search a city or a country, e.g. Italy'}
              className={input}
            />
          </div>
          {multi && typed && !isBroad(kinds.destination) && (draft.stops.length < maxStops || maxStops === 1) && (
            <button
              type="button"
              onClick={() => {
                addCity(typed);
                update('destination', '');
              }}
              className="pb-2 font-mono text-xs font-medium uppercase tracking-widest text-accent"
            >
              Add ↵
            </button>
          )}
        </div>
        {!multi && (
          <p className="flex flex-wrap gap-x-3 gap-y-1 pt-2 font-mono text-xs text-ink-3">
            {DESTINATIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => addCity(d)}
                className="underline decoration-line underline-offset-4 transition hover:text-accent hover:decoration-accent"
              >
                {d}
              </button>
            ))}
          </p>
        )}
        {multi && (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pt-2 font-mono text-xs text-ink-3">
            <span>
              {maxStops === 1
                ? 'Flights search one destination, round trip.'
                : draft.stops.length >= maxStops
                  ? `Up to ${maxStops} cities per trip.`
                  : draft.stops.length === 1
                    ? 'Add more cities to visit several places on one trip.'
                    : scope === 'stays'
                      ? 'One stay is searched in each city.'
                      : 'Flights go into the first city and out of the last one.'}
            </span>
            {draft.stops.length > 1 && datesOk && (
              <button
                type="button"
                onClick={() => setStops(draft.stops)}
                className="underline decoration-line underline-offset-4 transition hover:text-accent"
              >
                Split nights evenly
              </button>
            )}
          </div>
        )}
      </Field>

      {needsOrigin && (
        <Field n="02" label="Flying from" htmlFor="origin">
          <PlaceSearch
            id="origin"
            value={draft.origin}
            onChange={(v) => update('origin', v)}
            onKind={(kind) => setKinds((k) => ({ ...k, origin: kind }))}
            placeholder="Search a city, e.g. Buenos Aires"
            className={input}
          />
        </Field>
      )}

      <div className="grid sm:grid-cols-2 sm:divide-x sm:divide-line">
        <Field n={needsOrigin ? '03' : '02'} label={scope === 'stays' ? 'Check-in' : 'Depart'} htmlFor="departure">
          <input
            id="departure"
            type="date"
            min={today}
            value={draft.departure}
            onChange={(e) => update('departure', e.target.value)}
            className={`${input} font-mono text-xl`}
          />
        </Field>
        <Field n={needsOrigin ? '04' : '03'} label={scope === 'stays' ? 'Check-out' : 'Return'} htmlFor="return">
          <input
            id="return"
            type="date"
            min={draft.departure || today}
            value={draft.returnDate}
            onChange={(e) => update('returnDate', e.target.value)}
            className={`${input} font-mono text-xl`}
          />
        </Field>
      </div>

      <div className="grid sm:grid-cols-[auto_1fr] sm:divide-x sm:divide-line">
        <Field n={needsOrigin ? '05' : '04'} label="Travelers">
          <div className="flex items-center gap-3 pt-1">
            <Stepper label="Fewer travelers" disabled={draft.travelers <= 1} onClick={() => update('travelers', draft.travelers - 1)}>
              <MinusIcon width={16} height={16} />
            </Stepper>
            <span className="w-8 text-center font-display text-3xl font-semibold tabular-nums" aria-live="polite">
              {draft.travelers}
            </span>
            <Stepper label="More travelers" disabled={draft.travelers >= 9} onClick={() => update('travelers', draft.travelers + 1)}>
              <PlusIcon width={16} height={16} />
            </Stepper>
          </div>
        </Field>
        <Field
          n={needsOrigin ? '06' : '05'}
          label={`Budget for ${scope === 'flights' ? 'flights' : scope === 'stays' ? 'stays' : 'flight + stay'} (USD)`}
          htmlFor="max-budget"
        >
          <div className="flex items-baseline gap-1">
            <span className="font-display text-3xl font-semibold text-ink-3">$</span>
            <input
              id="max-budget"
              type="number"
              inputMode="numeric"
              min={1}
              value={draft.maxBudget}
              onChange={(e) => update('maxBudget', e.target.value)}
              placeholder="2000"
              className={`${input} tabular-nums`}
            />
          </div>
        </Field>
      </div>

      <div className="flex flex-col gap-2 p-5">
        <button
          type="submit"
          disabled={missing !== null}
          className="group flex w-full items-center justify-between bg-ink px-5 py-4 text-left font-display text-2xl font-semibold tracking-tight text-paper transition hover:bg-accent hover:text-on-accent disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-ink disabled:hover:text-paper"
        >
          {scope === 'flights' ? 'Search flights' : scope === 'stays' ? 'Search stays' : 'Plan my trip'}
          <span aria-hidden="true" className="font-mono text-xl transition group-hover:translate-x-1">→</span>
        </button>
        <p className="label min-h-4 normal-case tracking-normal" role="status">
          {missing ??
            (scope === 'flights'
              ? 'Budget is optional. Next you pick your flight.'
              : scope === 'stays'
                ? 'Budget is optional. Next you pick where to stay.'
                : 'Budget is optional. Next you pick flight + stay, then we plan the days.')}
        </p>
      </div>
    </form>
  );
}

function Field({
  n,
  label,
  htmlFor,
  children,
}: {
  n: string;
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-line px-5 py-4">
      <label htmlFor={htmlFor} className="label mb-1 flex gap-3">
        <span className="text-accent">{n}</span>
        {label}
      </label>
      {children}
    </div>
  );
}

function Stepper({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center border border-ink text-ink transition hover:bg-ink hover:text-paper disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-ink"
    >
      {children}
    </button>
  );
}
