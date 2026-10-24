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

/** Convierte el formulario en el pedido en lenguaje natural que espera el agente. */
export function buildPrompt(trip: TripRequest): string {
  const personas = trip.personas === 1 ? '1 persona' : `${trip.personas} personas`;
  const presupuesto =
    trip.presupuesto === null
      ? 'No tengo un presupuesto definido.'
      : `Mi presupuesto total es de ${formatPesos(trip.presupuesto)} pesos argentinos.`;

  return (
    `Armame un itinerario de viaje a ${trip.destino}, saliendo desde ${trip.origen}, ` +
    `del ${trip.salida} al ${trip.vuelta} (formato YYYY-MM-DD), para ${personas}. ${presupuesto} ` +
    `Buscá vuelos y alojamiento.`
  );
}
