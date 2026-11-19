import type { ReactNode } from 'react';
import { useDestinationPhoto } from '../lib/destination-photo';
import { formatDateRange, formatUsd, plural, splitDateTime } from '../lib/format';
import type { Accommodation, Flight, TripRequest } from '../types';

/** Destination plate: a duotone Wikipedia photo (solid cobalt without one), name set huge on top. */
export function DestinationBanner({ trip, compact = false }: { trip: TripRequest; compact?: boolean }) {
  const photo = useDestinationPhoto(trip.destination);
  return (
    <section className="animate-rise border border-ink">
      <div
        className={`duotone relative isolate flex items-end overflow-hidden bg-accent ${
          compact ? 'min-h-44 sm:min-h-56' : 'min-h-56 sm:min-h-80'
        }`}
      >
        {photo && (
          <img
            src={photo}
            alt=""
            className="absolute inset-0 -z-10 h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        )}
        <h1 className="display relative z-10 p-5 text-6xl text-white sm:p-8 sm:text-9xl">{trip.destination}</h1>
        {photo && (
          <span className="label absolute right-3 top-3 z-10 bg-black/40 px-2 py-1 text-white/80">Photo: Wikipedia</span>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-px border-t border-ink bg-line sm:grid-cols-4">
        <Meta label="Route" value={`${trip.origin} → ${trip.destination}`} wide />
        <Meta label="Dates" value={formatDateRange(trip.departure, trip.returnDate)} />
        <Meta label="Travelers" value={String(trip.travelers)} />
        <Meta label="Budget" value={trip.maxBudget !== null ? formatUsd(trip.maxBudget) : 'Open'} wide />
      </dl>
    </section>
  );
}

/** One cell of the trip summary strip. `wide` spans both columns on small screens. */
function Meta({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`flex min-w-0 flex-col gap-0.5 bg-card px-4 py-3 ${wide ? 'col-span-2 sm:col-span-1' : ''}`}>
      <dt className="label">{label}</dt>
      <dd className="font-medium sm:truncate">{value}</dd>
    </div>
  );
}

/** How much of the budget a trip uses, as a row of ticks. Without a budget, nothing is shown. */
export function BudgetMeter({ total, max }: { total: number; max: number | null }) {
  if (max === null) return null;
  const TICKS = 24;
  const filled = Math.min(TICKS, Math.round((total / max) * TICKS));
  const left = max - total;
  const tight = filled >= TICKS - 2;
  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex gap-0.5"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.min(total, max)}
        aria-label="Share of your budget used"
      >
        {Array.from({ length: TICKS }, (_, i) => (
          <span key={i} className={`h-3 flex-1 ${i < filled ? (tight ? 'bg-accent' : 'bg-ink') : 'bg-line'}`} />
        ))}
      </div>
      <p className="label normal-case tracking-normal">
        {left >= 0 ? (
          <>
            <b className="text-ok">{formatUsd(left)} under</b> a {formatUsd(max)} budget
          </>
        ) : (
          <>
            <b className="bg-mark px-1 text-black">{formatUsd(-left)} over</b> a {formatUsd(max)} budget
          </>
        )}
      </p>
    </div>
  );
}

function stopsLabel(stops: number): string {
  return stops === 0 ? 'Nonstop' : plural(stops, 'stop');
}

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-mono text-xs font-medium uppercase tracking-widest text-accent underline decoration-accent/40 underline-offset-4 transition hover:decoration-accent"
    >
      {children} <span aria-hidden="true">↗</span>
    </a>
  );
}

/** One labeled row of a fare table: label column, then the details. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-3 border-t border-line py-3.5 first:border-t-0 first:pt-0">
      <span className="label pt-0.5">{label}</span>
      <div className="flex min-w-0 flex-col gap-0.5">{children}</div>
    </div>
  );
}

/** Compact flight rows for the option cards. */
export function FlightRow({ flight }: { flight: Flight }) {
  const dep = splitDateTime(flight.outboundDeparture);
  const arr = splitDateTime(flight.outboundArrival);
  return (
    <Row label="Flight">
      <p className="font-medium">
        {flight.airline} <span className="font-normal text-ink-3">· {stopsLabel(flight.stops)}</span>
      </p>
      <p className="font-mono text-sm text-ink-2">
        {dep.date} {dep.time} → {arr.time}
      </p>
      <p className="font-mono text-sm text-ink-3">{formatUsd(flight.totalPrice)} round trip</p>
      <span className="pt-1">
        <ExternalLink href={flight.link}>Book flight</ExternalLink>
      </span>
    </Row>
  );
}

export function StayRow({ stay }: { stay: Accommodation }) {
  const details = [stay.category, stay.rating ? `${stay.rating}/5` : null].filter(Boolean).join(' · ');
  return (
    <Row label="Stay">
      <p className="font-medium">{stay.name}</p>
      {details && <p className="text-sm text-ink-2">{details}</p>}
      <p className="font-mono text-sm text-ink-3">
        {formatUsd(stay.pricePerNight)}/night · {formatUsd(stay.totalPrice)}
      </p>
      <span className="pt-1">
        <ExternalLink href={stay.link}>Book stay</ExternalLink>
      </span>
    </Row>
  );
}

/** Boarding pass: perforated stub on the right, barcode, huge times. */
export function FlightPass({ flight, trip }: { flight: Flight; trip: TripRequest }) {
  const dep = splitDateTime(flight.outboundDeparture);
  const arr = splitDateTime(flight.outboundArrival);
  return (
    <article className="hard-shadow relative grid border border-ink bg-card sm:grid-cols-[1fr_15rem]">
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <span className="label text-ink">Boarding pass</span>
          <span className="label">{flight.airline}</span>
        </div>
        <div className="flex items-end gap-4">
          <Time time={dep.time} place={trip.origin} date={dep.date} />
          <div className="mb-8 flex min-w-10 flex-1 flex-col items-center gap-1">
            <span className="label normal-case tracking-normal">{stopsLabel(flight.stops)}</span>
            <span className="h-px w-full bg-ink" />
          </div>
          <Time time={arr.time} place={trip.destination} date={arr.date} align="right" />
        </div>
      </div>

      {/* Perforation: dashed rule with a notch at each end. */}
      <div className="relative flex flex-col justify-between gap-5 border-t border-dashed border-ink p-6 sm:border-l sm:border-t-0">
        <span aria-hidden="true" className="absolute -left-2.5 -top-2.5 hidden h-5 w-5 rounded-full border border-ink bg-paper sm:block" />
        <span aria-hidden="true" className="absolute -bottom-2.5 -left-2.5 hidden h-5 w-5 rounded-full border border-ink bg-paper sm:block" />
        <div>
          <p className="label">Fare</p>
          <p className="font-display text-4xl font-semibold tabular-nums">{formatUsd(flight.totalPrice)}</p>
          <p className="label normal-case tracking-normal">round trip, all travelers</p>
        </div>
        <div className="flex flex-col gap-3">
          <div className="barcode" aria-hidden="true" />
          <ExternalLink href={flight.link}>Book flight</ExternalLink>
        </div>
      </div>
    </article>
  );
}

function Time({ time, place, date, align = 'left' }: { time: string; place: string; date: string; align?: 'left' | 'right' }) {
  return (
    <div className={`min-w-0 ${align === 'right' ? 'text-right' : ''}`}>
      <p className="display text-6xl tabular-nums sm:text-7xl">{time}</p>
      <p className="mt-1 truncate font-medium">{place}</p>
      <p className="font-mono text-xs text-ink-3">{date}</p>
    </div>
  );
}

export function StayCard({ stay, travelers }: { stay: Accommodation; travelers: number }) {
  const details = [stay.type === 'hotel' ? 'Hotel' : 'Rental', stay.category, stay.rating ? `${stay.rating}/5` : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <article className="grid gap-4 border border-ink bg-card p-6 sm:grid-cols-[1fr_auto] sm:items-end">
      <div>
        <p className="label">Your stay</p>
        <p className="display mt-2 text-4xl sm:text-5xl">{stay.name}</p>
        <p className="mt-2 text-ink-2">{details}</p>
      </div>
      <div className="flex flex-col gap-3 sm:items-end sm:text-right">
        <div>
          <p className="font-display text-4xl font-semibold tabular-nums">{formatUsd(stay.totalPrice)}</p>
          <p className="label normal-case tracking-normal">
            {formatUsd(stay.pricePerNight)}/night · {plural(travelers, 'traveler')}
          </p>
        </div>
        <ExternalLink href={stay.link}>Book stay</ExternalLink>
      </div>
    </article>
  );
}
