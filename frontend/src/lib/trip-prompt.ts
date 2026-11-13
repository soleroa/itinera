import type { TripRequest } from '../types';

const formatter = new Intl.NumberFormat('es-AR');

export function formatPesos(amount: number): string {
  return `$${formatter.format(amount)}`;
}

export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
  });
}

/** Describe el rango de presupuesto ("entre $X y $Y", "hasta $Y", "desde $X"), o null si no hay. */
export function formatBudget(trip: TripRequest): string | null {
  const { presupuestoMin: min, presupuestoMax: max } = trip;
  if (min !== null && max !== null) return `Entre ${formatPesos(min)} y ${formatPesos(max)}`;
  if (max !== null) return `Hasta ${formatPesos(max)}`;
  if (min !== null) return `Desde ${formatPesos(min)}`;
  return null;
}

/** Convierte el formulario en el pedido en lenguaje natural que espera el agente. */
export function buildPrompt(trip: TripRequest): string {
  const personas = trip.personas === 1 ? '1 persona' : `${trip.personas} personas`;
  const rango = formatBudget(trip);
  const presupuesto =
    rango === null
      ? 'No tengo un presupuesto definido.'
      : `Mi presupuesto total es ${rango.charAt(0).toLowerCase()}${rango.slice(1)} pesos argentinos.`;

  return (
    `Armame un itinerario de viaje a ${trip.destino}, saliendo desde ${trip.origen}, ` +
    `del ${trip.salida} al ${trip.vuelta} (formato YYYY-MM-DD), para ${personas}. ${presupuesto} ` +
    `Buscá vuelos y alojamiento.`
  );
}
