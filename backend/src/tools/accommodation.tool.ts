import { Injectable } from '@nestjs/common';
import { JsonSchemaObject, Tool } from '../common/tool.interface';
import { AmadeusClient } from './amadeus-client';

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

interface AmadeusLocation {
  iataCode: string;
}

interface AmadeusHotelListEntry {
  hotelId: string;
}

interface AmadeusHotelOffer {
  hotel: { name: string };
  offers: { price: { total: string; currency: string } }[];
}

const MAX_HOTELS_TO_PRICE = 20;

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

  constructor(private readonly amadeus: AmadeusClient) {}

  async execute(input: AccommodationInput): Promise<AccommodationOutput> {
    const cityCode = await this.resolveCityCode(input.ciudad);
    const hotelIds = await this.listHotelIds(cityCode);

    if (hotelIds.length === 0) {
      return { alojamientos: [] };
    }

    const { data: offers } = await this.amadeus.get<{
      data: AmadeusHotelOffer[];
    }>('/v3/shopping/hotel-offers', {
      hotelIds: hotelIds.join(','),
      checkInDate: input.fechaEntrada,
      checkOutDate: input.fechaSalida,
      adults: '1',
    });

    const alojamientos = offers
      .map((offer) => {
        const price = offer.offers[0]?.price;
        return {
          nombre: offer.hotel.name,
          precioPorNoche: Number(price?.total ?? 0),
          moneda: price?.currency ?? '',
        };
      })
      .filter(
        (alojamiento) =>
          input.presupuestoMaxPorNoche === undefined ||
          alojamiento.precioPorNoche <= input.presupuestoMaxPorNoche,
      );

    return { alojamientos };
  }

  private async resolveCityCode(ciudad: string): Promise<string> {
    const { data } = await this.amadeus.get<{ data: AmadeusLocation[] }>(
      '/v1/reference-data/locations',
      { subType: 'CITY', keyword: ciudad },
    );

    if (data.length === 0) {
      throw new Error(`No se encontró la ciudad "${ciudad}" en Amadeus.`);
    }

    return data[0].iataCode;
  }

  private async listHotelIds(cityCode: string): Promise<string[]> {
    const { data } = await this.amadeus.get<{
      data: AmadeusHotelListEntry[];
    }>('/v1/reference-data/locations/hotels/by-city', { cityCode });

    return data.slice(0, MAX_HOTELS_TO_PRICE).map((hotel) => hotel.hotelId);
  }
}
