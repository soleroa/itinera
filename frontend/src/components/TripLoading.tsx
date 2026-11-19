import { useEffect, useState } from 'react';
import type { TripRequest } from '../types';
import { PlaneIcon } from './Icons';
import { Eyebrow } from './Layout';

const MESSAGES = [
  'Searching real flights…',
  'Comparing hotels…',
  'Checking everything against your budget…',
  'Picking the best combinations…',
];

export function TripLoading({ trip }: { trip: TripRequest }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % MESSAGES.length), 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-10 py-16 text-center">
      <div className="flex w-full flex-col gap-3">
        <Eyebrow>One moment</Eyebrow>
        <h2 className="font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Planning your trip to <em className="text-terracotta">{trip.destination}</em>
        </h2>
      </div>

      <div className="w-full">
        <div className="flex items-center justify-between text-sm font-medium text-ink-2">
          <span>{trip.origin}</span>
          <span>{trip.destination}</span>
        </div>
        <div className="relative mt-3 h-8">
          <svg className="absolute inset-x-0 top-1/2 h-1 w-full -translate-y-1/2 text-line" aria-hidden="true">
            <line x1="0" y1="2" x2="100%" y2="2" stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" />
          </svg>
          <span className="animate-fly absolute top-0 text-terracotta">
            <PlaneIcon width={28} height={28} />
          </span>
        </div>
      </div>

      <p className="min-h-6 text-ink-2" role="status" aria-live="polite">
        {MESSAGES[index]}
      </p>
      <p className="text-sm text-ink-3">Live prices can take up to a minute.</p>
    </div>
  );
}
