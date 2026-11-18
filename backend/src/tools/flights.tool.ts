import { Injectable } from '@nestjs/common';
import {
  Airport,
  FlightSearchFilters,
  FlightResult,
  SearchFlights,
  SeatType,
  SortBy,
  buildFlightSegments,
  googleFlightsUrl,
  searchAirports,
} from 'fli-js';
import { JsonSchemaObject, Tool } from '../common/tool.interface';

interface FlightsInput {
  origen: string;
  destino: string;
  fechaIda: string;
  fechaVuelta?: string;
  pasajeros?: number;
  presupuestoMaxTotal?: number;
  /** Uso interno (no está en el schema del LLM): tope de resultados, por defecto 5. */
  maxResultados?: number;
}

export interface Vuelo {
  aerolinea: string;
  precioTotal: number;
  moneda: string;
  escalas: number;
  salidaIda: string;
  llegadaIda: string;
  /** Link a Google Flights con la ruta y fechas ya cargadas, para reservar. */
  enlace: string;
}

export interface FlightsOutput {
  vuelos: Vuelo[];
}

const MAX_RESULTS = 5;

/**
 * searchAirports no distingue países ("Santa Fe" devuelve el de Nuevo México),
 * así que las ciudades argentinas más buscadas se resuelven acá primero.
 */
const ARGENTINE_AIRPORTS: Record<string, string[]> = {
  'santa fe': ['SFN'],
  rosario: ['ROS'],
  cordoba: ['COR'],
  mendoza: ['MDZ'],
  tucuman: ['TUC'],
  salta: ['SLA'],
  jujuy: ['JUJ'],
  neuquen: ['NQN'],
  bariloche: ['BRC'],
  'san carlos de bariloche': ['BRC'],
  ushuaia: ['USH'],
  'el calafate': ['FTE'],
  iguazu: ['IGR'],
  'puerto iguazu': ['IGR'],
  'mar del plata': ['MDQ'],
  parana: ['PRA'],
  corrientes: ['CNQ'],
  posadas: ['PSS'],
  resistencia: ['RES'],
  'comodoro rivadavia': ['CRD'],
  trelew: ['REL'],
  'puerto madryn': ['PMY'],
  'san juan': ['UAQ'],
  'san luis': ['LUQ'],
  'santiago del estero': ['SDE'],
};

@Injectable()
export class FlightsTool implements Tool<FlightsInput, FlightsOutput> {
  name = 'search_flights';
  description =
    'Busca vuelos de ida (o ida y vuelta) entre dos ciudades para una fecha, ' +
    'opcionalmente filtrando por presupuesto máximo total. Devuelve los más baratos.';
  inputSchema: JsonSchemaObject = {
    type: 'object',
    properties: {
      origen: {
        type: 'string',
        description: 'Ciudad o aeropuerto de origen, ej: Buenos Aires',
      },
      destino: {
        type: 'string',
        description: 'Ciudad o aeropuerto de destino, ej: Bariloche',
      },
      fechaIda: {
        type: 'string',
        description: 'Fecha de ida en formato YYYY-MM-DD',
      },
      fechaVuelta: {
        type: 'string',
        description: 'Fecha de vuelta en formato YYYY-MM-DD (opcional)',
      },
      pasajeros: {
        type: 'number',
        description: 'Cantidad de pasajeros adultos (opcional, por defecto 1)',
      },
      presupuestoMaxTotal: {
        type: 'number',
        description:
          'Presupuesto máximo total, en la moneda que devuelva la API (opcional)',
      },
    },
    required: ['origen', 'destino', 'fechaIda'],
  };

  async execute(input: FlightsInput): Promise<FlightsOutput> {
    const origins = this.resolveAirports(input.origen);
    const destinations = this.resolveAirports(input.destino);
    const pasajeros = input.pasajeros ?? 1;

    const enlace = googleFlightsUrl(
      input.origen,
      input.destino,
      input.fechaIda,
      input.fechaVuelta,
      { currency: 'USD', language: 'es', country: 'AR' },
    );

    const results = await this.search(
      origins,
      destinations,
      input.fechaIda,
      input.fechaVuelta,
      pasajeros,
    );

    const vuelos =
      results !== null
        ? results.map((result) => {
            // En ida y vuelta, cada resultado es [ida, vuelta] y el precio total va en el último.
            const [ida] = Array.isArray(result) ? result : [result];
            const total = Array.isArray(result)
              ? result[result.length - 1]
              : result;
            return this.toVuelo(ida, total.price, total.currency, enlace);
          })
        : await this.searchLegsSeparately(
            input,
            origins,
            destinations,
            pasajeros,
            enlace,
          );

    return {
      vuelos: vuelos
        .filter((vuelo) => !Number.isNaN(vuelo.precioTotal))
        .filter(
          (vuelo) =>
            input.presupuestoMaxTotal === undefined ||
            vuelo.precioTotal <= input.presupuestoMaxTotal,
        )
        .slice(0, input.maxResultados ?? MAX_RESULTS),
    };
  }

  /**
   * Google a veces no devuelve ida y vuelta para una ruta con poca oferta (ej: Santa Fe -
   * Bariloche) aunque cada tramo por separado sí tenga vuelos. En ese caso se buscan los
   * dos tramos y el precio total es la ida más la vuelta más barata.
   */
  private async searchLegsSeparately(
    input: FlightsInput,
    origins: Airport[],
    destinations: Airport[],
    pasajeros: number,
    enlace: string,
  ): Promise<Vuelo[]> {
    const ida = input.fechaVuelta
      ? await this.search(
          origins,
          destinations,
          input.fechaIda,
          null,
          pasajeros,
        )
      : null;
    const vuelta = input.fechaVuelta
      ? await this.search(
          destinations,
          origins,
          input.fechaVuelta,
          null,
          pasajeros,
        )
      : null;

    if (!ida?.length || !vuelta?.length) {
      throw new Error(
        'Google Flights no devolvió resultados (puede ser un bloqueo o un cambio en su formato).',
      );
    }

    const vueltaMasBarata = Math.min(
      ...(vuelta as FlightResult[]).map(
        (v) => v.price ?? Number.POSITIVE_INFINITY,
      ),
    );
    return (ida as FlightResult[]).map((v) =>
      this.toVuelo(
        v,
        (v.price ?? Number.NaN) + vueltaMasBarata,
        v.currency,
        enlace,
      ),
    );
  }

  private async search(
    origins: Airport[],
    destinations: Airport[],
    fechaIda: string,
    fechaVuelta: string | null | undefined,
    pasajeros: number,
  ) {
    const { segments, tripType } = buildFlightSegments(
      origins,
      destinations,
      fechaIda,
      fechaVuelta,
    );

    const filters = new FlightSearchFilters({
      trip_type: tripType,
      passenger_info: {
        adults: pasajeros,
        children: 0,
        infants_in_seat: 0,
        infants_on_lap: 0,
      },
      flight_segments: segments,
      seat_type: SeatType.ECONOMY,
      sort_by: SortBy.CHEAPEST,
    });

    return new SearchFlights().search(filters, { currency: 'USD' });
  }

  private toVuelo(
    ida: FlightResult,
    precioTotal: number | null,
    moneda: string | null,
    enlace: string,
  ): Vuelo {
    const first = ida.legs[0];
    const last = ida.legs[ida.legs.length - 1];
    const local = this.localTimes(ida);
    return {
      aerolinea: ida.primary_airline_name ?? first.airline,
      precioTotal: precioTotal ?? Number.NaN,
      moneda: moneda ?? 'USD',
      escalas: ida.stops,
      salidaIda: local?.salida ?? first.departure_datetime.toISOString(),
      llegadaIda: local?.llegada ?? last.arrival_datetime.toISOString(),
      enlace,
    };
  }

  /**
   * fli-js entrega los horarios en UTC y no conoce husos horarios de aeropuertos,
   * pero el booking_token (protobuf en base64) trae cada tramo con su hora local y offset
   * (ej: 2026-12-15T21:00:00-03:00): salida, llegada, salida, llegada...
   */
  private localTimes(
    ida: FlightResult,
  ): { salida: string; llegada: string } | null {
    if (!ida.booking_token) return null;
    const decoded = Buffer.from(ida.booking_token, 'base64').toString('latin1');
    const times =
      decoded.match(/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d/g) ?? [];
    const salida = times[0];
    const llegada = times[ida.legs.length * 2 - 1];
    return salida && llegada ? { salida, llegada } : null;
  }

  /** Una ciudad con varios aeropuertos (ej: Buenos Aires) se busca en todos ellos. */
  private resolveAirports(lugar: string): Airport[] {
    const argentine = ARGENTINE_AIRPORTS[this.normalize(lugar)];
    if (argentine) return argentine as Airport[];

    const matches = searchAirports(lugar, 5);
    if (matches.length === 0) {
      throw new Error(`No se encontró "${lugar}" como ciudad o aeropuerto.`);
    }
    return matches[0].match_type === 'city'
      ? matches.filter((m) => m.match_type === 'city').map((m) => m.code)
      : [matches[0].code];
  }

  private normalize(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }
}
