import type { Alternative, OptionLevel, TripOption, TripOptionsResponse, TripRequest } from '../types';
import { formatDate, formatUsd } from '../lib/format';
import { AccommodationCard, FlightCard } from './TripResult';

const LEVELS: Record<OptionLevel, { title: string; hint: string }> = {
  cheapest: { title: 'Cheapest', hint: 'The lowest-cost combination' },
  balanced: { title: 'Balanced', hint: 'The best quality-to-price ratio' },
  best: { title: 'Best', hint: 'Highest quality within your budget' },
};

export function TripOptions({
  trip,
  data,
  onChoose,
  onReset,
}: {
  trip: TripRequest;
  data: TripOptionsResponse;
  onChoose: (option: TripOption) => void;
  onReset: () => void;
}) {
  const overBudget = data.status === 'over_budget';
  const alternatives = data.alternatives ?? [];

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
          {overBudget ? 'Your budget falls short' : `Options for your trip to ${trip.destination}`}
        </h2>
        {overBudget && data.cheapest && data.shortfall !== undefined && (
          <p className="text-neutral-600 dark:text-neutral-300">
            The cheapest flight + accommodation combination costs {formatUsd(data.cheapest.total)}:
            you are {formatUsd(data.shortfall)} short. You can raise your budget or try one of
            these alternatives.
          </p>
        )}
      </div>

      {data.options.map((option) => (
        <OptionBlock
          key={option.level}
          option={option}
          travelers={trip.travelers}
          title={LEVELS[option.level].title}
          hint={LEVELS[option.level].hint}
          action="Choose this option"
          onChoose={() => onChoose(option)}
        />
      ))}

      {overBudget && alternatives.length === 0 && (
        <p className="rounded-3xl bg-white p-6 text-neutral-700 ring-1 ring-neutral-200 dark:bg-neutral-900 dark:text-neutral-200 dark:ring-neutral-800">
          No nearby variant (fewer nights or one week later) fits your budget.
        </p>
      )}

      {alternatives.map((alt) => (
        <OptionBlock
          key={alt.change}
          option={alt.option}
          travelers={trip.travelers}
          title={alt.change}
          hint={dates(alt)}
          action="Choose this alternative"
          onChoose={() => onChoose(alt.option)}
        />
      ))}

      <p className="text-sm text-neutral-500 dark:text-neutral-400">{data.notice}</p>

      <button
        onClick={onReset}
        className="self-start rounded-2xl bg-emerald-600 px-6 py-3 font-medium text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
      >
        Plan another trip
      </button>
    </div>
  );
}

function dates(alt: Alternative): string {
  return `${formatDate(alt.departure)} – ${formatDate(alt.returnDate)}`;
}

function OptionBlock({
  option,
  travelers,
  title,
  hint,
  action,
  onChoose,
}: {
  option: TripOption;
  travelers: number;
  title: string;
  hint: string;
  action: string;
  onChoose: () => void;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-emerald-50/60 p-4 ring-1 ring-emerald-200 dark:bg-emerald-950/20 dark:ring-emerald-900">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex flex-col">
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">{title}</h3>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">{hint}</span>
        </div>
        <div className="flex flex-col sm:items-end">
          <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            {formatUsd(option.total)}
          </span>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            flight + accommodation
          </span>
        </div>
      </div>
      <FlightCard flight={option.flight} best={false} />
      <AccommodationCard stay={option.accommodation} travelers={travelers} best={false} />
      <button
        onClick={onChoose}
        className="self-start rounded-xl bg-emerald-600 px-5 py-2.5 font-medium text-white transition hover:bg-emerald-700"
      >
        {action}
      </button>
    </section>
  );
}
