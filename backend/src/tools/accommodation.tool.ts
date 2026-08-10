import { Injectable } from '@nestjs/common';
import { JsonSchemaObject, Tool } from '../common/tool.interface';
import { HotelbedsClient } from './hotelbeds-client';

interface AccommodationInput {
  ciudad: string;
  fechaEntrada: string;
  fechaSalida: string;
  presupuestoMaxPorNoche?: number;
}

interface Alojamiento {
  nombre: string;
  precioPorNoche: number;
  moneda: string;
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

    const alojamientos = hotels
      .map((hotel) => {
        const rate = hotel.rooms[0]?.rates[0];
        return {
          nombre: hotel.name,
          precioPorNoche: Number(rate?.net ?? 0),
          moneda: 'USD',
        };
      })
      .filter(
        (alojamiento) =>
          input.presupuestoMaxPorNoche === undefined ||
          alojamiento.precioPorNoche <= input.presupuestoMaxPorNoche,
      );

    return { alojamientos };
  }
}
