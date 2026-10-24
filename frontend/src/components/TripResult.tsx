import type { TripRequest } from '../types';
import { formatDate, formatPesos } from '../lib/trip-prompt';

export function TripLoading({ trip }: { trip: TripRequest }) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="h-14 w-14 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600 dark:border-emerald-900 dark:border-t-emerald-500" />
      <div className="flex flex-col gap-1.5">
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
          Armando tu viaje a {trip.destino}
        </h2>
        <p className="text-neutral-500 dark:text-neutral-400">
          Estoy buscando vuelos y alojamiento, puede tardar un minuto.
        </p>
      </div>
    </div>
  );
}

export function TripResult({
  trip,
  answer,
  error,
  onReset,
}: {
  trip: TripRequest;
  answer: string | null;
  error: string | null;
  onReset: () => void;
}) {
  const chips = [
    `${trip.origen} → ${trip.destino}`,
    `${formatDate(trip.salida)} – ${formatDate(trip.vuelta)}`,
    trip.personas === 1 ? '1 persona' : `${trip.personas} personas`,
    trip.presupuesto === null ? 'Sin presupuesto definido' : formatPesos(trip.presupuesto),
  ];

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
          {error ? 'No pude armar tu viaje' : `Tu viaje a ${trip.destino}`}
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

      <article
        className={`whitespace-pre-wrap rounded-3xl p-6 leading-relaxed shadow-sm ring-1 sm:p-8 ${
          error
            ? 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900'
            : 'bg-white text-neutral-800 ring-neutral-200 dark:bg-neutral-900 dark:text-neutral-100 dark:ring-neutral-800'
        }`}
      >
        {error ?? answer}
      </article>

      <button
        onClick={onReset}
        className="self-start rounded-2xl bg-emerald-600 px-6 py-3 font-medium text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
      >
        Planear otro viaje
      </button>
    </div>
  );
}
