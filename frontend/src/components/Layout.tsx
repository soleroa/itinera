import type { ReactNode } from 'react';

export function Header({ onHome, onTrips, tripCount = 0 }: { onHome?: () => void; onTrips?: () => void; tripCount?: number }) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <button onClick={onHome} className="group flex items-baseline gap-2" aria-label="Itinera, start over">
        <span className="flex h-7 w-7 items-center justify-center bg-accent font-display text-lg font-bold leading-none text-on-accent">
          i
        </span>
        <span className="display text-3xl">Itinera</span>
      </button>
      <div className="flex items-center gap-5">
        <span className="label hidden sm:block">Real prices · Real routes</span>
        {onTrips && (
          <button
            onClick={onTrips}
            className="border border-ink px-4 py-2 font-mono text-xs font-medium uppercase tracking-widest transition hover:bg-ink hover:text-paper"
          >
            My trips{tripCount > 0 ? ` (${tripCount})` : ''}
          </button>
        )}
      </div>
    </header>
  );
}

const BOARD = [
  ['BRC', 'Bariloche'],
  ['MDZ', 'Mendoza'],
  ['SLA', 'Salta'],
  ['USH', 'Ushuaia'],
  ['IGR', 'Iguazú'],
  ['FTE', 'El Calafate'],
  ['COR', 'Córdoba'],
  ['ROS', 'Rosario'],
  ['MDQ', 'Mar del Plata'],
  ['TUC', 'Tucumán'],
];

/** A slow departure-board strip. Decorative. */
export function Ticker() {
  const row = BOARD.map(([code, name]) => (
    <span key={code} className="flex items-baseline gap-2 px-6">
      <span className="font-mono text-sm font-semibold text-accent">{code}</span>
      <span className="font-mono text-sm uppercase tracking-widest text-ink-2">{name}</span>
    </span>
  ));
  return (
    <div className="overflow-hidden border-y border-ink bg-card py-2.5" aria-hidden="true">
      <div className="ticker-track">
        <div className="flex">{row}</div>
        <div className="flex">{row}</div>
      </div>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8">
      <p className="label max-w-3xl normal-case tracking-normal">
        Prices from Google Flights and Google Hotels · Routes and places from Google Maps · Destination
        photos from Wikipedia
      </p>
    </footer>
  );
}

/** Caption above a heading: a small square, then a monospace label. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="label flex items-center gap-2 text-ink">
      <span className="h-2 w-2 bg-accent" />
      {children}
    </p>
  );
}
