import type { Alternative, OptionLevel, TripOption, TripOptionsResponse, TripRequest, TripStop } from '../types';
import { formatDateRange, formatUsd } from '../lib/format';
import { Eyebrow } from './Layout';
import { TripCustomPicker } from './TripCustomPicker';
import { BudgetMeter, DestinationBanner, FlightRow, StayRow } from './TripParts';

type Dates = { departure: string; returnDate: string; stops: TripStop[] };

/** What a total covers, for the sentence about being over budget. */
const SCOPE_NOUN = { full: 'flight + stay', flights: 'flight', stays: 'stay' } as const;

const LEVELS: Record<OptionLevel, { title: string; hint: string }> = {
  cheapest: { title: 'Cheapest', hint: 'The lowest total price' },
  balanced: { title: 'Balanced', hint: 'Best quality for the price' },
  best: { title: 'Best', hint: 'Top quality in budget' },
  custom: { title: 'Custom', hint: 'Your own mix' },
};

const OVER_HINTS: Record<OptionLevel, string> = {
  cheapest: 'The lowest total price',
  balanced: 'Best quality for the price',
  best: 'Top quality, highest price',
  custom: 'Your own mix',
};

export function TripOptions({
  trip,
  data,
  onChoose,
  onReset,
}: {
  trip: TripRequest;
  data: TripOptionsResponse;
  onChoose: (option: TripOption, dates?: Dates) => void;
  onReset: () => void;
}) {
  const overBudget = data.status === 'over_budget';
  const alternatives = data.alternatives ?? [];

  return (
    <div className="flex flex-col gap-12">
      <DestinationBanner trip={trip} />

      {overBudget && data.cheapest && data.shortfall !== undefined ? (
        <section className="animate-rise grid gap-6 border border-ink bg-mark p-6 text-black sm:grid-cols-[auto_1fr] sm:items-end sm:gap-10 sm:p-8">
          <div>
            <p className="label text-black">Over budget by</p>
            <p className="display text-7xl tabular-nums sm:text-9xl">{formatUsd(data.shortfall)}</p>
          </div>
          <p className="max-w-xl text-lg">
            The cheapest {SCOPE_NOUN[trip.scope]} we found totals <b>{formatUsd(data.cheapest.total)}</b>. You can still pick one of
            the options below, raise your budget, or try a nearby variant.
          </p>
        </section>
      ) : (
        <section className="animate-rise flex flex-col gap-4">
          <Eyebrow>{trip.scope === 'full' ? 'Step 1 of 2 · Getting there' : 'Your options'}</Eyebrow>
          <h2 className="display max-w-5xl text-5xl sm:text-7xl">
            {trip.scope === 'flights'
              ? 'Pick your flight.'
              : trip.scope === 'stays'
                ? 'Pick where to stay.'
                : 'First, pick your flight and stay.'}
          </h2>
          <p className="max-w-xl text-ink-2">
            Real prices, already checked against your budget.
            {trip.scope === 'full' ? ' Next, we plan your days.' : ''}
          </p>
        </section>
      )}

      {overBudget && data.options.length > 0 && (
        <div className="flex flex-col gap-3">
          <Eyebrow>Over your budget</Eyebrow>
          <h2 className="display text-5xl sm:text-6xl">The closest we found.</h2>
        </div>
      )}

      {data.options.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-3">
          {data.options.map((option, i) => (
            <OptionCard
              key={option.level}
              index={i + 1}
              option={option}
              cities={trip.stops.map((s) => s.city)}
              maxBudget={trip.maxBudget}
              title={LEVELS[option.level].title}
              hint={overBudget ? OVER_HINTS[option.level] : LEVELS[option.level].hint}
              featured={!overBudget && option.level === 'balanced'}
              delay={i * 90}
              onChoose={() => onChoose(option)}
            />
          ))}
        </div>
      )}

      {(data.flights.length > 0 || data.stays.length > 0) && (
        <TripCustomPicker
          flights={data.flights}
          stays={data.stays}
          cities={trip.stops.map((s) => s.city)}
          reason={data.recommendationReason}
          maxBudget={trip.maxBudget}
          onChoose={(option) => onChoose(option)}
        />
      )}

      {overBudget && (
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <Eyebrow>Nearby alternatives</Eyebrow>
            <h2 className="display text-5xl sm:text-6xl">Ways to fit your budget.</h2>
          </div>
          {alternatives.length === 0 ? (
            <p className="border border-ink bg-card p-6 text-ink-2">
              No nearby variant (fewer nights or one week later) fits your budget. Try raising it or changing your
              dates.
            </p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {alternatives.map((alt, i) => (
                <OptionCard
                  key={alt.change}
                  index={i + 1}
                  option={alt.option}
                  cities={alt.stops.map((s) => s.city)}
                  maxBudget={trip.maxBudget}
                  title={alt.change}
                  hint={formatDateRange(alt.departure, alt.returnDate)}
                  delay={i * 90}
                  onChoose={() => onChoose(alt.option, datesOf(alt))}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <div className="flex flex-col items-start gap-4 border-t border-ink pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="label max-w-xl normal-case tracking-normal">{data.notice}</p>
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

function datesOf(alt: Alternative): Dates {
  return { departure: alt.departure, returnDate: alt.returnDate, stops: alt.stops };
}

function OptionCard({
  index,
  option,
  cities,
  maxBudget,
  title,
  hint,
  featured = false,
  delay,
  onChoose,
}: {
  index: number;
  option: TripOption;
  /** City of each stay, in order. */
  cities: string[];
  maxBudget: number | null;
  title: string;
  hint: string;
  featured?: boolean;
  delay: number;
  onChoose: () => void;
}) {
  return (
    <article
      className={`animate-rise flex flex-col border border-ink bg-card text-ink ${featured ? 'inverted hard-shadow' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <header className="flex items-center justify-between border-b border-line px-5 py-3">
        <span className="label text-ink">{title}</span>
        {featured ? (
          <span className="bg-mark px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-widest text-black">
            Best value
          </span>
        ) : (
          <span className="label">{String(index).padStart(2, '0')}</span>
        )}
      </header>

      <div className="flex flex-col gap-4 px-5 pt-5">
        <div>
          <p className="display text-7xl tabular-nums">{formatUsd(option.total)}</p>
          <p className="label mt-2 normal-case tracking-normal">{hint}</p>
        </div>
        <BudgetMeter total={option.total} max={maxBudget} />
      </div>

      <div className="mt-6 flex-1 border-t border-line px-5 pt-5">
        {option.flight && (
          <FlightRow flight={option.flight} priceLabel={cities.length > 1 ? 'in and out' : 'round trip'} />
        )}
        {option.accommodations.map((stay, i) => (
          <StayRow
            key={`${stay.name}-${i}`}
            stay={stay}
            label={cities.length > 1 ? `Stay · ${cities[i]}` : 'Stay'}
          />
        ))}
      </div>

      <button
        onClick={onChoose}
        className={`group flex items-center justify-between border-t border-ink px-5 py-4 text-left font-display text-xl font-semibold tracking-tight transition ${
          featured ? 'bg-accent text-on-accent hover:brightness-110' : 'hover:bg-ink hover:text-paper'
        }`}
      >
        Choose this trip
        <span aria-hidden="true" className="font-mono transition group-hover:translate-x-1">→</span>
      </button>
    </article>
  );
}
