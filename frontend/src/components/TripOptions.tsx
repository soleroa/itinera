import type { Alternative, OptionLevel, TripOption, TripOptionsResponse, TripRequest } from '../types';
import { formatDateRange, formatUsd } from '../lib/format';
import { AlertIcon, CheckIcon } from './Icons';
import { Eyebrow } from './Layout';
import { BudgetMeter, DestinationBanner, FlightRow, StayRow } from './TripParts';

type Dates = { departure: string; returnDate: string };

const LEVELS: Record<OptionLevel, { title: string; hint: string }> = {
  cheapest: { title: 'Cheapest', hint: 'The lowest total price' },
  balanced: { title: 'Balanced', hint: 'Best quality for the price' },
  best: { title: 'Best', hint: 'Top quality in budget' },
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
    <div className="flex flex-col gap-10">
      <DestinationBanner trip={trip} />

      {overBudget && data.cheapest && data.shortfall !== undefined ? (
        <section className="animate-fade-up flex flex-col gap-3 rounded-3xl bg-amber-soft p-6 text-amber-ink sm:p-8">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em]">
            <AlertIcon width={18} height={18} /> Over budget
          </div>
          <h2 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
            The cheapest trip is {formatUsd(data.shortfall)} above your budget
          </h2>
          <p className="max-w-2xl">
            The lowest-cost flight + accommodation we found totals {formatUsd(data.cheapest.total)}. You can
            raise your budget or try one of the nearby variants below.
          </p>
        </section>
      ) : (
        <section className="animate-fade-up flex flex-col gap-2">
          <Eyebrow>Within your budget</Eyebrow>
          <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            Choose how you want to travel
          </h2>
          <p className="max-w-2xl text-ink-2">
            Each total covers flight + stay, uses real prices and is already checked against your budget. Pick one to plan the days.
          </p>
        </section>
      )}

      {data.options.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-3">
          {data.options.map((option, i) => (
            <OptionCard
              key={option.level}
              option={option}
              maxBudget={trip.maxBudget}
              title={LEVELS[option.level].title}
              hint={LEVELS[option.level].hint}
              featured={option.level === 'balanced'}
              delay={i * 90}
              onChoose={() => onChoose(option)}
            />
          ))}
        </div>
      )}

      {overBudget && (
        <section className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Eyebrow>Nearby alternatives</Eyebrow>
            <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight">
              Cheaper ways to make it work
            </h2>
          </div>
          {alternatives.length === 0 ? (
            <p className="rounded-2xl border border-line bg-card p-6 text-ink-2">
              No nearby variant (fewer nights or one week later) fits your budget. Try raising it or changing
              your dates.
            </p>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {alternatives.map((alt, i) => (
                <OptionCard
                  key={alt.change}
                  option={alt.option}
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

      <div className="flex flex-col items-start gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm text-ink-3">{data.notice}</p>
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

function datesOf(alt: Alternative): Dates {
  return { departure: alt.departure, returnDate: alt.returnDate };
}

function OptionCard({
  option,
  maxBudget,
  title,
  hint,
  featured = false,
  delay,
  onChoose,
}: {
  option: TripOption;
  maxBudget: number | null;
  title: string;
  hint: string;
  featured?: boolean;
  delay: number;
  onChoose: () => void;
}) {
  return (
    <article
      className={`animate-fade-up relative flex flex-col gap-5 rounded-3xl border bg-card p-6 transition hover:-translate-y-0.5 ${
        featured ? 'border-terracotta shadow-[0_20px_40px_-24px_var(--accent)]' : 'border-line'
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {featured && (
        <span className="absolute -top-3 left-6 flex items-center gap-1 rounded-full bg-terracotta px-3 py-1 text-xs font-semibold uppercase tracking-wider text-on-accent">
          <CheckIcon width={14} height={14} /> Best value
        </span>
      )}
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-3">{title}</p>
        <p className="font-display text-5xl font-semibold leading-none tracking-tight">{formatUsd(option.total)}</p>
        <p className="text-sm text-ink-2">{hint}</p>
      </header>
      <BudgetMeter total={option.total} max={maxBudget} />
      <div className="flex flex-col gap-4 border-t border-line pt-5">
        <FlightRow flight={option.flight} />
        <StayRow stay={option.accommodation} />
      </div>
      <button
        onClick={onChoose}
        className={`mt-auto rounded-xl px-5 py-3 font-semibold transition ${
          featured
            ? 'bg-terracotta text-on-accent hover:brightness-110'
            : 'border border-line text-ink hover:border-terracotta hover:text-terracotta'
        }`}
      >
        Choose this trip
      </button>
    </article>
  );
}
