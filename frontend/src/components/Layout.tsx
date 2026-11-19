import type { ReactNode } from 'react';
import { CompassIcon } from './Icons';

export function Header({ onHome }: { onHome?: () => void }) {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-6 sm:px-8">
      <button
        onClick={onHome}
        className="flex items-center gap-2 text-forest"
        aria-label="Itinera, start over"
      >
        <CompassIcon width={26} height={26} className="text-terracotta" />
        <span className="font-display text-2xl font-semibold italic tracking-tight">Itinera</span>
      </button>
      <span className="hidden text-sm text-ink-3 sm:block">Real prices. Real routes.</span>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mx-auto w-full max-w-5xl px-5 py-10 text-xs text-ink-3 sm:px-8">
      Flight and hotel prices from Google Flights and Google Hotels. Routes and places from Google
      Maps. Destination photos from Wikipedia.
    </footer>
  );
}

/** Small uppercase label used above headings. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta">{children}</p>
  );
}

/** Concentric, hand-drawn-feeling contour lines, like a topographic map. Purely decorative. */
export function Contours({ className = '' }: { className?: string }) {
  const rings = [0, 1, 2, 3, 4, 5, 6, 7];
  return (
    <svg
      viewBox="0 0 600 600"
      fill="none"
      aria-hidden="true"
      className={`pointer-events-none text-line ${className}`}
    >
      {rings.map((i) => {
        const r = 40 + i * 34;
        const wob = 14 + (i % 3) * 6;
        return (
          <path
            key={i}
            d={`M${300 - r},300 C${300 - r},${300 - r - wob} ${300 - r / 2},${300 - r} 300,${300 - r + wob / 2} C${300 + r / 1.4},${300 - r - wob} ${300 + r + wob},${300 - r / 2} ${300 + r},300 C${300 + r + wob / 2},${300 + r / 1.5} ${300 + r / 2},${300 + r + wob} 300,${300 + r} C${300 - r / 1.6},${300 + r + wob / 2} ${300 - r - wob},${300 + r / 2} ${300 - r},300Z`}
            stroke="currentColor"
            strokeWidth="1.2"
          />
        );
      })}
    </svg>
  );
}
