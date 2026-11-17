import { Injectable } from '@nestjs/common';
import { JsonSchemaObject, Tool } from '../common/tool.interface';
import { HotelbedsClient } from './hotelbeds-client';

interface AccommodationInput {
  ciudad: string;
  fechaEntrada: string;
  fechaSalida: string;
  presupuestoMaxPorNoche?: number;
}

const MAX_RESULTS = 5;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface Alojamiento {
  nombre: string;
  precioTotal: number;
  precioPorNoche: number;
  moneda: string;
  /** Búsqueda en Booking.com de la ciudad y fechas (no del hotel: puede no estar disponible allá). */
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
      presupuestoMaxPorNoche: {
        type: 'number',
        description:
          'Presupuesto máximo por noche, en la moneda que devuelva la API (opcional)',
      },
    },
    required: ['ciudad', 'fechaEntrada', 'fechaSalida'],
  };

  constructor(private readonly hotelbeds: HotelbedsClient) {}

  async execute(input: AccommodationInput): Promise<AccommodationOutput> {
    const destinationCode = await this.hotelbeds.resolveDestinationCode(
      input.ciudad,
    );
    const hotels = await this.hotelbeds.searchAvailability(
      destinationCode,
      input.fechaEntrada,
      input.fechaSalida,
    );

    const noches = Math.max(
      1,
      Math.round(
        (Date.parse(input.fechaSalida) - Date.parse(input.fechaEntrada)) /
          MS_PER_DAY,
      ),
    );

    const alojamientos = hotels
      .map((hotel) => {
        // Hotelbeds devuelve en `net` el precio de toda la estadía, no por noche.
        const precioTotal = Number(hotel.rooms[0]?.rates[0]?.net ?? 0);
        return {
          nombre: hotel.name,
          precioTotal,
          precioPorNoche: Math.round(precioTotal / noches),
          moneda: 'USD',
          enlace: this.bookingUrl(input),
        };
      })
      .filter(
        (alojamiento) =>
          input.presupuestoMaxPorNoche === undefined ||
          alojamiento.precioPorNoche <= input.presupuestoMaxPorNoche,
      )
      .sort((a, b) => a.precioPorNoche - b.precioPorNoche)
      .slice(0, MAX_RESULTS);

    return { alojamientos };
  }

  private bookingUrl(input: AccommodationInput): string {
    const params = new URLSearchParams({
      ss: input.ciudad,
      checkin: input.fechaEntrada,
      checkout: input.fechaSalida,
      group_adults: '2',
      no_rooms: '1',
      selected_currency: 'USD',
    });
    return `https://www.booking.com/searchresults.es.html?${params}`;
  }
}
