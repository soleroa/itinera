import type { AgentResponse, Accommodation, Flight, TripRequest } from '../types';
import { formatBudget, formatDate, formatUsd } from '../lib/trip-prompt';

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
  result,
  error,
  onReset,
}: {
  trip: TripRequest;
  result: AgentResponse | null;
  error: string | null;
  onReset: () => void;
}) {
  const chips = [
    `${trip.origen} → ${trip.destino}`,
    `${formatDate(trip.salida)} – ${formatDate(trip.vuelta)}`,
    trip.personas === 1 ? '1 persona' : `${trip.personas} personas`,
    formatBudget(trip) ?? 'Sin presupuesto definido',
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

      {!error && result && result.flights.length > 0 && (
        <Section title="Vuelos recomendados">
          {result.flights.map((f, i) => (
            <FlightCard key={i} flight={f} best={i === 0} />
          ))}
        </Section>
      )}

      {!error && result && result.accommodations.length > 0 && (
        <Section title="Alojamientos recomendados">
          {result.accommodations.map((a, i) => (
            <AccommodationCard key={i} stay={a} personas={trip.personas} best={i === 0} />
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

      <button
        onClick={onReset}
        className="self-start rounded-2xl bg-emerald-600 px-6 py-3 font-medium text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
      >
        Planear otro viaje
      </button>
    </div>
  );
}

/** Los horarios llegan como "2026-11-28T08:40:00-03:00": se muestran tal cual, en hora local. */
function formatDateTime(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d\d)-(\d\d)T(\d\d:\d\d)/);
  if (!m) return iso;
  const day = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString('es-AR', {
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
              Más barato
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
      title={flight.aerolinea}
      lines={[
        `Ida: ${formatDateTime(flight.salidaIda)} → ${formatDateTime(flight.llegadaIda)}`,
        flight.escalas === 0
          ? 'Directo'
          : `${flight.escalas} ${flight.escalas === 1 ? 'escala' : 'escalas'}`,
      ]}
      price={formatUsd(flight.precioTotal)}
      priceNote="total, todos los pasajeros"
      href={flight.enlace}
      cta="Ver vuelo"
      best={best}
    />
  );
}

export function AccommodationCard({
  stay,
  personas,
  best,
}: {
  stay: Accommodation;
  personas: number;
  best: boolean;
}) {
  const details = [
    stay.tipo === 'hotel' ? 'Hotel' : 'Alquiler',
    stay.categoria,
    stay.puntaje ? `${stay.puntaje.toString().replace('.', ',')} / 5` : undefined,
  ].filter(Boolean);
  return (
    <Card
      title={stay.nombre}
      lines={[details.join(' · '), `${formatUsd(stay.precioTotal)} por toda la estadía`]}
      price={`${formatUsd(stay.precioPorNoche)} / noche`}
      priceNote={personas === 1 ? 'para 1 persona' : `para ${personas} personas`}
      href={stay.enlace}
      cta="Ver alojamiento"
      best={best}
    />
  );
}
