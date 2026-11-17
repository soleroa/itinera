import { Injectable } from '@nestjs/common';
import { JsonSchemaObject, Tool } from '../common/tool.interface';
import { SerpApiHotelsClient } from './serpapi-hotels-client';

interface AccommodationInput {
  ciudad: string;
  fechaEntrada: string;
  fechaSalida: string;
  pasajeros?: number;
  presupuestoMaxPorNoche?: number;
}

const MAX_RESULTS = 5;

interface Alojamiento {
  nombre: string;
  tipo: 'hotel' | 'alquiler';
  /** Ej: "Hotel de 3 estrellas"; ausente si Google no la informa. */
  categoria?: string;
  /** Puntaje de huéspedes sobre 5; ausente si no hay. */
  puntaje?: number;
  precioTotal: number;
  precioPorNoche: number;
  moneda: string;
  /** Sitio del alojamiento o, si no tiene, su ficha en Google Hotels. */
  enlace: string;
}

interface AccommodationOutput {
  alojamientos: Alojamiento[];
}

@Injectable()
export class AccommodationTool
  implements Tool<AccommodationInput, AccommodationOutput>
{
  name = 'search_accommodation';
  description =
    'Busca alojamientos disponibles en una ciudad para un rango de fechas, ' +
    'opcionalmente filtrando por presupuesto máximo por noche.';
  inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      ciudad: {
        type: 'string',
        description: 'Nombre de la ciudad, ej: Bariloche',
      },
      fechaEntrada: {
        type: 'string',
        description: 'Fecha de check-in en formato YYYY-MM-DD',
      },
      fechaSalida: {
        type: 'string',
        description: 'Fecha de check-out en formato YYYY-MM-DD',
      },
      pasajeros: {
        type: 'number',
        description: 'Cantidad de huéspedes adultos (opcional, por defecto 2)',
      },
      presupuestoMaxPorNoche: {
        type: 'number',
        description:
          'Presupuesto máximo por noche, en la moneda que devuelva la API (opcional)',
      },
    },
    required: ['ciudad', 'fechaEntrada', 'fechaSalida'],
  };

  constructor(private readonly hotels: SerpApiHotelsClient) {}

  async execute(input: AccommodationInput): Promise<AccommodationOutput> {
    const properties = await this.hotels.search(
      input.ciudad,
      input.fechaEntrada,
      input.fechaSalida,
      input.pasajeros ?? 2,
    );

    const alojamientos = properties
      .filter(
        (p) =>
          (p.rate_per_night?.extracted_lowest ?? 0) > 0 &&
          (p.total_rate?.extracted_lowest ?? 0) > 0,
      )
      .map((p): Alojamiento => {
        const nombre = p.name;
        return {
          nombre,
          tipo: p.type === 'hotel' ? 'hotel' : 'alquiler',
          categoria: p.hotel_class,
          puntaje: p.overall_rating
            ? Math.round(p.overall_rating * 10) / 10
            : undefined,
          precioTotal: p.total_rate!.extracted_lowest!,
          precioPorNoche: p.rate_per_night!.extracted_lowest!,
          moneda: 'USD',
          enlace:
            p.link ??
            `https://www.google.com/travel/search?${new URLSearchParams({
              q: `${nombre} ${input.ciudad}`,
              hl: 'es',
              gl: 'ar',
              curr: 'USD',
            })}`,
        };
      })
      .filter(
        (a) =>
          input.presupuestoMaxPorNoche === undefined ||
          a.precioPorNoche <= input.presupuestoMaxPorNoche,
      )
      .sort((a, b) => a.precioPorNoche - b.precioPorNoche)
      .slice(0, MAX_RESULTS);

    return { alojamientos };
  }
}
