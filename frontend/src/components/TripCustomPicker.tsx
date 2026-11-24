import { useState } from 'react';
import type { Accommodation, Choice, Flight, TripOption } from '../types';
import { formatDate, formatUsd } from '../lib/format';
import { Eyebrow } from './Layout';
import { BudgetMeter, FlightRow, StayRow } from './TripParts';

/** Drops the `recommended` flag so a chosen item is stored like any other. */
function plain<T>(item: Choice<T>): T {
  const { recommended: _recommended, ...rest } = item;
  return rest as unknown as T;
}

/** Lets the traveler mix any listed flight with any listed stay. The recommended ones start selected. */
export function TripCustomPicker({
  flights,
  stays,
  cities,
  reason,
  maxBudget,
  onChoose,
}: {
  flights: Choice<Flight>[];
  /** One list of stays per city of the trip. */
  stays: Choice<Accommodation>[][];
  /** City of each list in `stays`. */
  cities: string[];
  reason: string;
  maxBudget: number | null;
  onChoose: (option: TripOption) => void;
}) {
  const [flightIdx, setFlightIdx] = useState(Math.max(0, flights.findIndex((f) => f.recommended)));
  const [stayIdx, setStayIdx] = useState<number[]>(() =>
    stays.map((list) => Math.max(0, list.findIndex((s) => s.recommended))),
  );
  // Flights are absent for a stays-only search, and stays for a flights-only one.
  const flight = flights[flightIdx] ?? null;
  const chosenStays = stays.map((list, i) => list[stayIdx[i]]);
  const total = (flight?.totalPrice ?? 0) + chosenStays.reduce((sum, s) => sum + s.totalPrice, 0);
  const multi = stays.length > 1;
  const both = flights.length > 0 && stays.length > 0;

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Eyebrow>{both ? 'Mix and match' : 'All options'}</Eyebrow>
        <h2 className="display text-5xl sm:text-6xl">
          {both ? 'Pick your own flight and stay.' : flights.length > 0 ? 'More flights to choose from.' : 'More stays to choose from.'}
        </h2>
        <p className="max-w-2xl text-ink-2">
          Our recommendation is preselected: <b>{reason.toLowerCase()}</b>. Change anything and the total updates.
        </p>
      </div>

      <div className={`grid gap-8 ${both ? 'lg:grid-cols-2' : ''}`}>
        {flights.length > 0 && (
        <ChoiceList title={multi ? 'Flights (in and out)' : 'Flights'} count={flights.length}>
          {flights.map((f, i) => (
            <ChoiceItem
              key={`${f.airline}-${f.outboundDeparture}-${f.totalPrice}-${i}`}
              selected={i === flightIdx}
              recommended={f.recommended}
              price={f.totalPrice}
              onSelect={() => setFlightIdx(i)}
              label={`${f.airline}, ${formatDate(f.outboundDeparture.slice(0, 10))}`}
            >
              <FlightRow flight={f} priceLabel={multi ? 'in and out' : 'round trip'} />
            </ChoiceItem>
          ))}
        </ChoiceList>
        )}
        <div className="flex flex-col gap-8">
          {stays.map((list, c) => (
            <ChoiceList key={cities[c] ?? c} title={multi ? `Stays in ${cities[c]}` : 'Stays'} count={list.length}>
              {list.map((s, i) => (
                <ChoiceItem
                  key={`${s.name}-${s.totalPrice}-${i}`}
                  selected={i === stayIdx[c]}
                  recommended={s.recommended}
                  price={s.totalPrice}
                  onSelect={() => setStayIdx((prev) => prev.map((v, k) => (k === c ? i : v)))}
                  label={s.name}
                >
                  <StayRow stay={s} />
                </ChoiceItem>
              ))}
            </ChoiceList>
          ))}
        </div>
      </div>

      <div className="hard-shadow sticky bottom-4 z-10 grid gap-4 border border-ink bg-card p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-8">
        <div>
          <p className="label">Your total</p>
          <p className="display text-5xl tabular-nums">{formatUsd(total)}</p>
        </div>
        <BudgetMeter total={total} max={maxBudget} />
        <button
          onClick={() =>
            onChoose({ level: 'custom', flight: flight ? plain(flight) : null, accommodations: chosenStays.map(plain), total })
          }
          className="bg-ink px-6 py-4 font-display text-xl font-semibold tracking-tight text-paper transition hover:bg-accent hover:text-on-accent"
        >
          Choose this trip →
        </button>
      </div>
    </section>
  );
}

function ChoiceList({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="label text-ink">
        {title} · {count}, cheapest first
      </p>
      <ul className="flex flex-col gap-3" role="radiogroup" aria-label={title}>
        {children}
      </ul>
    </div>
  );
}

function ChoiceItem({
  selected,
  recommended,
  price,
  label,
  onSelect,
  children,
}: {
  selected: boolean;
  recommended: boolean;
  price: number;
  label: string;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <li
      className={`border bg-card transition ${selected ? 'border-2 border-accent' : 'border-ink'}`}
    >
      <button
        role="radio"
        aria-checked={selected}
        aria-label={`${label}, ${formatUsd(price)}`}
        onClick={onSelect}
        className="flex w-full items-center justify-between gap-3 border-b border-line px-4 py-2 text-left"
      >
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`h-3.5 w-3.5 rounded-full border border-ink ${selected ? 'bg-accent' : 'bg-paper'}`}
          />
          {recommended && (
            <span className="bg-mark px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-widest text-black">
              Recommended
            </span>
          )}
        </span>
        <span className="font-display text-2xl font-semibold tabular-nums">{formatUsd(price)}</span>
      </button>
      <div className="px-4 pb-3">{children}</div>
    </li>
  );
}
