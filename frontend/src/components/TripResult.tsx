import type { AgentResponse, Accommodation, Flight, TripRequest } from '../types';
import { formatDate, formatUsd } from '../lib/format';

export function TripLoading({ trip }: { trip: TripRequest }) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="h-14 w-14 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600 dark:border-emerald-900 dark:border-t-emerald-500" />
      <div className="flex flex-col gap-1.5">
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
          Planning your trip to {trip.destination}
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400">
          I'm searching flights and accommodation, this can take a minute.
        </p>
      </div>
    </div>
  );
}

export function TripResult({
  trip,
  result,
  error,
  onReset,
  children,
}: {
  trip: TripRequest;
  result: AgentResponse | null;
  error: string | null;
  onReset: () => void;
  children?: React.ReactNode;
}) {
  const chips = [
    `${trip.origin} → ${trip.destination}`,
    `${formatDate(trip.departure)} – ${formatDate(trip.returnDate)}`,
    trip.travelers === 1 ? '1 traveler' : `${trip.travelers} travelers`,
    trip.maxBudget !== null ? `Up to ${formatUsd(trip.maxBudget)}` : 'No budget set',
  ];

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
          {error ? "I couldn't plan your trip" : `Your trip to ${trip.destination}`}
        </h2>
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span
              key={chip}
              className="rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>

      {!error && result && result.flights.length > 0 && (
        <Section title="Recommended flights">
          {result.flights.map((f, i) => (
            <FlightCard key={i} flight={f} best={i === 0} />
          ))}
        </Section>
      )}

      {!error && result && result.accommodations.length > 0 && (
        <Section title="Recommended accommodation">
          {result.accommodations.map((a, i) => (
            <AccommodationCard key={i} stay={a} travelers={trip.travelers} best={i === 0} />
          ))}
        </Section>
      )}

      {(error || result?.answer) && (
      <article
        className={`whitespace-pre-wrap rounded-3xl p-6 leading-relaxed shadow-sm ring-1 sm:p-8 ${
          error
            ? 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900'
            : 'bg-white text-neutral-800 ring-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:ring-neutral-800'
        }`}
      >
        {error ?? result?.answer}
      </article>
      )}

      {children}

      <button
        onClick={onReset}
        className="self-start rounded-2xl bg-emerald-600 px-6 py-3 font-medium text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
      >
        Plan another trip
      </button>
    </div>
  );
}

/** Times arrive as "2026-11-28T08:40:00-03:00": shown as-is, in local time. */
function formatDateTime(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d\d)-(\d\d)T(\d\d:\d\d)/);
  if (!m) return iso;
  const day = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
  });
  return `${day}, ${m[4]}`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">{title}</h3>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Card({
  title,
  lines,
  price,
  priceNote,
  href,
  cta,
  best,
}: {
  title: string;
  lines: string[];
  price: string;
  priceNote: string;
  href: string;
  cta: string;
  best: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-neutral-200 sm:flex-row sm:items-center sm:justify-between dark:bg-neutral-900 dark:ring-neutral-800">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-neutral-900 dark:text-neutral-50">{title}</span>
          {best && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
              Cheapest
            </span>
          )}
        </div>
        {lines.map((line) => (
          <span key={line} className="text-sm text-neutral-500 dark:text-neutral-400">
            {line}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-2">
        <div className="flex flex-col sm:items-end">
          <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">{price}</span>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">{priceNote}</span>
        </div>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          {cta}
        </a>
      </div>
    </div>
  );
}

export function FlightCard({ flight, best }: { flight: Flight; best: boolean }) {
  return (
    <Card
      title={flight.airline}
      lines={[
        `Outbound: ${formatDateTime(flight.outboundDeparture)} → ${formatDateTime(flight.outboundArrival)}`,
        flight.stops === 0
          ? 'Nonstop'
          : `${flight.stops} ${flight.stops === 1 ? 'stop' : 'stops'}`,
      ]}
      price={formatUsd(flight.totalPrice)}
      priceNote="total, all passengers"
      href={flight.link}
      cta="View flight"
      best={best}
    />
  );
}

export function AccommodationCard({
  stay,
  travelers,
  best,
}: {
  stay: Accommodation;
  travelers: number;
  best: boolean;
}) {
  const details = [
    stay.type === 'hotel' ? 'Hotel' : 'Rental',
    stay.category,
    stay.rating ? `${stay.rating} / 5` : undefined,
  ].filter(Boolean);
  return (
    <Card
      title={stay.name}
      lines={[details.join(' · '), `${formatUsd(stay.totalPrice)} for the whole stay`]}
      price={`${formatUsd(stay.pricePerNight)} / night`}
      priceNote={travelers === 1 ? 'for 1 traveler' : `for ${travelers} travelers`}
      href={stay.link}
      cta="View accommodation"
      best={best}
    />
  );
}
