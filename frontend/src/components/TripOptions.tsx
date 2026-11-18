import type { Alternative, OptionLevel, TripOption, TripOptionsResponse, TripRequest } from '../types';
import { formatDate, formatPesos, formatUsd } from '../lib/trip-prompt';
import { AccommodationCard, FlightCard } from './TripResult';

const LEVELS: Record<OptionLevel, { title: string; hint: string }> = {
  economica: { title: 'Económica', hint: 'La combinación más barata' },
  equilibrada: { title: 'Equilibrada', hint: 'La mejor relación calidad / precio' },
  mejor: { title: 'La mejor', hint: 'Mayor calidad dentro de tu presupuesto' },
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
  const insufficient = data.estado === 'presupuesto_insuficiente';
  const alternatives = data.alternativas ?? [];

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl dark:text-neutral-50">
          {insufficient ? 'Tu presupuesto no alcanza' : `Opciones para tu viaje a ${trip.destino}`}
        </h2>
        {insufficient && data.masBarata && data.faltanteArs !== undefined && (
          <p className="text-neutral-600 dark:text-neutral-300">
            La combinación más barata de vuelo + alojamiento cuesta{' '}
            {formatPesos(data.masBarata.totalArs)} ({formatUsd(data.masBarata.totalUsd)}): te faltan{' '}
            {formatPesos(data.faltanteArs)}. Podés subir el presupuesto o probar una de estas
            alternativas.
          </p>
        )}
      </div>

      {data.opciones.map((option) => (
        <OptionBlock
          key={option.nivel}
          option={option}
          personas={trip.personas}
          title={LEVELS[option.nivel].title}
          hint={LEVELS[option.nivel].hint}
          action="Elegir esta opción"
          onChoose={() => onChoose(option)}
        />
      ))}

      {insufficient && alternatives.length === 0 && (
        <p className="rounded-3xl bg-white p-6 text-neutral-700 ring-1 ring-neutral-200 dark:bg-neutral-900 dark:text-neutral-200 dark:ring-neutral-800">
          Ninguna variante cercana (menos noches o una semana después) entra en tu presupuesto.
        </p>
      )}

      {alternatives.map((alt) => (
        <OptionBlock
          key={alt.cambio}
          option={alt.opcion}
          personas={trip.personas}
          title={alt.cambio}
          hint={dates(alt)}
          action="Elegir esta alternativa"
          onChoose={() => onChoose(alt.opcion)}
        />
      ))}

      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        {data.aviso} Precios convertidos con el dólar {data.cotizacion.tipo} a{' '}
        {formatPesos(data.cotizacion.pesosPorDolar)} ({data.cotizacion.fuente}).
      </p>

      <button
        onClick={onReset}
        className="self-start rounded-2xl bg-emerald-600 px-6 py-3 font-medium text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
      >
        Planear otro viaje
      </button>
    </div>
  );
}

function dates(alt: Alternative): string {
  return `${formatDate(alt.salida)} – ${formatDate(alt.vuelta)}`;
}

function OptionBlock({
  option,
  personas,
  title,
  hint,
  action,
  onChoose,
}: {
  option: TripOption;
  personas: number;
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
            {formatPesos(option.totalArs)}
          </span>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {formatUsd(option.totalUsd)} · vuelo + alojamiento
          </span>
        </div>
      </div>
      <FlightCard flight={option.vuelo} best={false} />
      <AccommodationCard stay={option.alojamiento} personas={personas} best={false} />
      <button
        onClick={onChoose}
        className="self-start rounded-xl bg-emerald-600 px-5 py-2.5 font-medium text-white transition hover:bg-emerald-700"
      >
        {action}
      </button>
    </section>
  );
}
