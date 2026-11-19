import type { ReactNode } from 'react';
import { useDestinationPhoto } from '../lib/destination-photo';
import { formatDateRange, formatUsd, plural, splitDateTime } from '../lib/format';
import type { Accommodation, Flight, TripRequest } from '../types';
import { ArrowUpRightIcon, BedIcon, PlaneIcon } from './Icons';

/** Full-width destination photo (Wikipedia) with the trip summary on top; gradient if no photo. */
export function DestinationBanner({ trip, compact = false }: { trip: TripRequest; compact?: boolean }) {
  const photo = useDestinationPhoto(trip.destination);
  return (
    <section
      className={`animate-fade-up relative isolate flex flex-col justify-end overflow-hidden rounded-3xl bg-forest ${
        compact ? 'min-h-48 sm:min-h-56' : 'min-h-60 sm:min-h-80'
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
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/25 to-black/5" />
      <div className="flex flex-col gap-3 p-6 text-white sm:p-8">
        <h1 className="font-display text-4xl font-semibold leading-none tracking-tight sm:text-6xl">
          {trip.destination}
        </h1>
        <div className="flex flex-wrap gap-2 text-sm">
          {[
            `${trip.origin} → ${trip.destination}`,
            formatDateRange(trip.departure, trip.returnDate),
            plural(trip.travelers, 'traveler'),
            trip.maxBudget !== null ? `Up to ${formatUsd(trip.maxBudget)}` : 'No budget set',
          ].map((chip) => (
            <span key={chip} className="rounded-full bg-white/15 px-3 py-1 backdrop-blur-sm">
              {chip}
            </span>
          ))}
        </div>
      </div>
      {photo && (
        <span className="absolute right-4 top-4 rounded-full bg-black/35 px-2.5 py-1 text-[11px] text-white/85 backdrop-blur-sm">
          Photo: Wikipedia
        </span>
      )}
    </section>
  );
}

/** How much of the budget a trip uses. Without a budget, nothing is shown. */
export function BudgetMeter({ total, max }: { total: number; max: number | null }) {
  if (max === null) return null;
  const used = Math.min(100, Math.round((total / max) * 100));
  const left = max - total;
  const tight = used >= 90;
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="h-1.5 overflow-hidden rounded-full bg-line"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.min(total, max)}
        aria-label="Share of your budget used"
      >
        <div
          className={`h-full rounded-full ${tight ? 'bg-terracotta' : 'bg-forest'}`}
          style={{ width: `${used}%` }}
        />
      </div>
      <p className="text-xs text-ink-3">
        {left >= 0 ? (
          <>
            <span className="font-semibold text-forest">{formatUsd(left)} under</span> your {formatUsd(max)} budget
          </>
        ) : (
          <>
            <span className="font-semibold text-terracotta">{formatUsd(-left)} over</span> your {formatUsd(max)} budget
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
      className="inline-flex items-center gap-1 text-sm font-medium text-terracotta underline-offset-4 hover:underline"
    >
      {children}
      <ArrowUpRightIcon width={14} height={14} />
    </a>
  );
}

/** Compact flight line for the option cards. */
export function FlightRow({ flight }: { flight: Flight }) {
  const dep = splitDateTime(flight.outboundDeparture);
  const arr = splitDateTime(flight.outboundArrival);
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper-2 text-forest">
        <PlaneIcon width={18} height={18} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="font-medium">
          {flight.airline} <span className="font-normal text-ink-3">· {stopsLabel(flight.stops)}</span>
        </p>
        <p className="text-sm text-ink-2">
          {dep.date}, {dep.time} → {arr.time}
        </p>
        <p className="text-sm text-ink-3">{formatUsd(flight.totalPrice)} round trip, all travelers</p>
        <span className="pt-1">
          <ExternalLink href={flight.link}>View flight</ExternalLink>
        </span>
      </div>
    </div>
  );
}

/** Compact stay line for the option cards. */
export function StayRow({ stay }: { stay: Accommodation }) {
  const details = [stay.type === 'hotel' ? 'Hotel' : 'Rental', stay.category, stay.rating ? `${stay.rating} / 5` : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-paper-2 text-forest">
        <BedIcon width={18} height={18} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="font-medium">{stay.name}</p>
        <p className="text-sm text-ink-2">{details}</p>
        <p className="text-sm text-ink-3">
          {formatUsd(stay.pricePerNight)} / night · {formatUsd(stay.totalPrice)} total
        </p>
        <span className="pt-1">
          <ExternalLink href={stay.link}>View stay</ExternalLink>
        </span>
      </div>
    </div>
  );
}

/** Large boarding-pass style flight card for the chosen trip. */
export function FlightPass({ flight, trip }: { flight: Flight; trip: TripRequest }) {
  const dep = splitDateTime(flight.outboundDeparture);
  const arr = splitDateTime(flight.outboundArrival);
  return (
    <article className="relative overflow-hidden rounded-3xl border border-line bg-card">
      <div className="flex items-center justify-between border-b border-dashed border-line px-6 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-ink-3">
        <span>Your flight</span>
        <span>{flight.airline}</span>
      </div>
      <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="flex items-center gap-4">
          <div className="min-w-0">
            <p className="font-display text-3xl font-semibold leading-none">{dep.time}</p>
            <p className="mt-1 truncate text-sm text-ink-2">{trip.origin}</p>
            <p className="text-xs text-ink-3">{dep.date}</p>
          </div>
          <div className="flex min-w-16 flex-1 flex-col items-center gap-1 text-terracotta">
            <PlaneIcon width={22} height={22} />
            <span className="h-px w-full border-t border-dashed border-terracotta/60" />
            <span className="text-xs text-ink-3">{stopsLabel(flight.stops)}</span>
          </div>
          <div className="min-w-0 text-right">
            <p className="font-display text-3xl font-semibold leading-none">{arr.time}</p>
            <p className="mt-1 truncate text-sm text-ink-2">{trip.destination}</p>
            <p className="text-xs text-ink-3">{arr.date}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-dashed border-line pt-4 sm:flex-col sm:items-end sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
          <div className="sm:text-right">
            <p className="font-display text-2xl font-semibold">{formatUsd(flight.totalPrice)}</p>
            <p className="text-xs text-ink-3">round trip, all travelers</p>
          </div>
          <ExternalLink href={flight.link}>View flight</ExternalLink>
        </div>
      </div>
    </article>
  );
}

export function StayCard({ stay, travelers }: { stay: Accommodation; travelers: number }) {
  const details = [stay.type === 'hotel' ? 'Hotel' : 'Rental', stay.category, stay.rating ? `${stay.rating} / 5` : null]
    .filter(Boolean)
    .join(' · ');
  return (
    <article className="flex flex-col gap-4 rounded-3xl border border-line bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forest-soft text-forest">
          <BedIcon />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-3">Your stay</p>
          <p className="font-display text-2xl font-semibold leading-tight">{stay.name}</p>
          <p className="text-sm text-ink-2">{details}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
        <div className="sm:text-right">
          <p className="font-display text-2xl font-semibold">{formatUsd(stay.totalPrice)}</p>
          <p className="text-xs text-ink-3">
            {formatUsd(stay.pricePerNight)} / night · {plural(travelers, 'traveler')}
          </p>
        </div>
        <ExternalLink href={stay.link}>View stay</ExternalLink>
      </div>
    </article>
  );
}
