import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { TripRequest } from '../types';
import { MinusIcon, PlusIcon } from './Icons';
import { PlaceSearch } from './PlaceSearch';

type Draft = {
  destination: string;
  origin: string;
  departure: string;
  returnDate: string;
  travelers: number;
  maxBudget: string;
};

const DESTINATIONS = ['Bariloche', 'Mendoza', 'Salta', 'Ushuaia'];
const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

const input =
  'w-full border-0 border-b border-transparent bg-transparent py-1 font-display text-3xl font-semibold tracking-tight text-ink outline-none focus-visible:outline-none placeholder:font-normal placeholder:text-ink-3/50 focus:border-accent';

/** The whole search as one ruled sheet: numbered fields instead of a step-by-step wizard. */
export function TripForm({ onSubmit }: { onSubmit: (trip: TripRequest) => void }) {
  const [draft, setDraft] = useState<Draft>({
    destination: '',
    origin: '',
    departure: '',
    returnDate: '',
    travelers: 2,
    maxBudget: '',
  });
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const datesOk = draft.departure !== '' && draft.returnDate !== '' && draft.returnDate > draft.departure;
  const budgetOk = draft.maxBudget === '' || Number(draft.maxBudget) > 0;
  const missing = !draft.destination.trim()
    ? 'Add a destination'
    : !draft.origin.trim()
      ? 'Add where you fly from'
      : draft.departure === '' || draft.returnDate === ''
        ? 'Pick your dates'
        : !datesOk
          ? 'The return must be after the departure'
          : !budgetOk
            ? 'The budget must be greater than zero'
            : null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (missing) return;
    onSubmit({
      destination: draft.destination.trim(),
      origin: draft.origin.trim(),
      departure: draft.departure,
      returnDate: draft.returnDate,
      travelers: draft.travelers,
      maxBudget: draft.maxBudget ? Number(draft.maxBudget) : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="hard-shadow border border-ink bg-card">
      <div className="flex items-center justify-between border-b border-ink bg-ink px-5 py-2.5 text-paper">
        <span className="label text-paper">New itinerary</span>
        <span className="label text-paper/70">6 quick questions</span>
      </div>

      <Field n="01" label="Where to" htmlFor="destination">
        <PlaceSearch
          id="destination"
          value={draft.destination}
          onChange={(v) => update('destination', v)}
          placeholder="Search a city, e.g. Bariloche"
          className={input}
        />
        <p className="flex flex-wrap gap-x-3 gap-y-1 pt-2 font-mono text-xs text-ink-3">
          {DESTINATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => update('destination', d)}
              className="underline decoration-line underline-offset-4 transition hover:text-accent hover:decoration-accent"
            >
              {d}
            </button>
          ))}
        </p>
      </Field>

      <Field n="02" label="Flying from" htmlFor="origin">
        <PlaceSearch
          id="origin"
          value={draft.origin}
          onChange={(v) => update('origin', v)}
          placeholder="Search a city, e.g. Buenos Aires"
          className={input}
        />
      </Field>

      <div className="grid sm:grid-cols-2 sm:divide-x sm:divide-line">
        <Field n="03" label="Depart" htmlFor="departure">
          <input
            id="departure"
            type="date"
            min={today}
            value={draft.departure}
            onChange={(e) => update('departure', e.target.value)}
            className={`${input} font-mono text-xl`}
          />
        </Field>
        <Field n="04" label="Return" htmlFor="return">
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
        <Field n="05" label="Travelers">
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
        <Field n="06" label="Budget for flight + stay (USD)" htmlFor="max-budget">
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
          Plan my trip
          <span aria-hidden="true" className="font-mono text-xl transition group-hover:translate-x-1">→</span>
        </button>
        <p className="label min-h-4 normal-case tracking-normal" role="status">
          {missing ?? 'Budget is optional. Next you pick flight + stay, then we plan the days.'}
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
