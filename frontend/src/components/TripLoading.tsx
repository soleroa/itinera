import { useEffect, useState } from 'react';
import type { TripRequest } from '../types';
import { Eyebrow } from './Layout';

const MESSAGES = [
  'Finding real flights',
  'Finding a place to stay',
  'Fitting it to your budget',
  'Lining up your options',
];

export function TripLoading({ trip }: { trip: TripRequest }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % MESSAGES.length), 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="animate-rise flex flex-col gap-10 py-16 sm:py-24">
      <Eyebrow>Planning</Eyebrow>
      <h2 className="display max-w-4xl text-6xl sm:text-8xl">
        {trip.origin} <span className="text-accent">→</span> {trip.destination}
      </h2>

      <div className="max-w-xl">
        <div className="marching h-1 w-full" />
        <p className="mt-4 flex items-center gap-2 font-mono text-sm uppercase tracking-widest" role="status" aria-live="polite">
          {MESSAGES[index]}
          <span className="blink inline-block h-4 w-2 bg-accent" />
        </p>
        <p className="label mt-3 normal-case tracking-normal">Live prices can take up to a minute.</p>
      </div>
    </div>
  );
}
