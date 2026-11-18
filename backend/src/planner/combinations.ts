import type { Alojamiento } from '../tools/accommodation.tool';
import type { Vuelo } from '../tools/flights.tool';

export type Nivel = 'economica' | 'equilibrada' | 'mejor';

export interface Combinacion {
  nivel: Nivel;
  vuelo: Vuelo;
  alojamiento: Alojamiento;
  totalUsd: number;
}

/** Calidad de una combinación: puntaje y categoría del hotel, penalizada por escalas. */
export function calidad(vuelo: Vuelo, hotel: Alojamiento): number {
  const estrellas = Number(hotel.categoria?.match(/\d/)?.[0] ?? 0);
  return (hotel.puntaje ?? 3.5) + estrellas * 0.3 - vuelo.escalas * 0.5;
}

interface Par {
  vuelo: Vuelo;
  alojamiento: Alojamiento;
  totalUsd: number;
  calidad: number;
}

function pares(vuelos: Vuelo[], hoteles: Alojamiento[]): Par[] {
  const result: Par[] = [];
  for (const vuelo of vuelos) {
    for (const alojamiento of hoteles) {
      result.push({
        vuelo,
        alojamiento,
        totalUsd: vuelo.precioTotal + alojamiento.precioTotal,
        calidad: calidad(vuelo, alojamiento),
      });
    }
  }
  return result;
}

/** Todas las combinaciones (en USD), de la más barata a la más cara. */
export function todasLasCombinaciones(
  vuelos: Vuelo[],
  hoteles: Alojamiento[],
): Par[] {
  return pares(vuelos, hoteles).sort((a, b) => a.totalUsd - b.totalUsd);
}

/**
 * Elige hasta 3 combinaciones distintas que entran en `maxUsd` (sin tope si es null):
 * la más barata, la de mejor relación calidad/precio y la de mayor calidad.
 */
export function elegirOpciones(
  candidatas: Par[],
  maxUsd: number | null,
): Combinacion[] {
  const factibles = candidatas.filter(
    (c) => maxUsd === null || c.totalUsd <= maxUsd,
  );
  if (factibles.length === 0) return [];

  const usadas = new Set<Par>();
  const pick = (nivel: Nivel, orden: (a: Par, b: Par) => number) => {
    const elegida = factibles
      .filter((c) => !usadas.has(c))
      .sort(orden)[0];
    if (!elegida) return null;
    usadas.add(elegida);
    return { nivel, ...elegida } as Combinacion & { calidad?: number };
  };

  const resultado = [
    pick('economica', (a, b) => a.totalUsd - b.totalUsd),
    pick(
      'equilibrada',
      (a, b) => b.calidad / b.totalUsd - a.calidad / a.totalUsd,
    ),
    pick('mejor', (a, b) => b.calidad - a.calidad || a.totalUsd - b.totalUsd),
  ].filter((c): c is Combinacion => c !== null);

  return resultado.map(({ nivel, vuelo, alojamiento, totalUsd }) => ({
    nivel,
    vuelo,
    alojamiento,
    totalUsd,
  }));
}
