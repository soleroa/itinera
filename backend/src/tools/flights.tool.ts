import { Injectable } from "@nestjs/common";
import {
  Airport,
  FlightSearchFilters,
  FlightResult,
  SearchFlights,
  SeatType,
  SortBy,
  buildFlightSegments,
  searchAirports,
} from "fli-js";
import { JsonSchemaObject, Tool } from "../common/tool.interface";

interface FlightsInput {
  origen: string;
  destino: string;
  fechaIda: string;
  fechaVuelta?: string;
  pasajeros?: number;
  presupuestoMaxTotal?: number;
}

interface Vuelo {
  aerolinea: string;
  precioTotal: number;
  moneda: string;
  escalas: number;
  salidaIda: string;
  llegadaIda: string;
}

interface FlightsOutput {
  vuelos: Vuelo[];
}

const MAX_RESULTS = 5;

@Injectable()
export class FlightsTool implements Tool<FlightsInput, FlightsOutput> {
  name = "search_flights";
  description =
    "Busca vuelos de ida (o ida y vuelta) entre dos ciudades para una fecha, " +
    "opcionalmente filtrando por presupuesto máximo total. Devuelve los más baratos.";
  inputSchema: JsonSchemaObject = {
    type: "object",
    properties: {
      origen: {
        type: "string",
        description: "Ciudad o aeropuerto de origen, ej: Buenos Aires",
      },
      destino: {
        type: "string",
        description: "Ciudad o aeropuerto de destino, ej: Bariloche",
      },
      fechaIda: {
        type: "string",
        description: "Fecha de ida en formato YYYY-MM-DD",
      },
      fechaVuelta: {
        type: "string",
        description: "Fecha de vuelta en formato YYYY-MM-DD (opcional)",
      },
      pasajeros: {
        type: "number",
        description: "Cantidad de pasajeros adultos (opcional, por defecto 1)",
      },
      presupuestoMaxTotal: {
        type: "number",
        description:
          "Presupuesto máximo total, en la moneda que devuelva la API (opcional)",
      },
    },
    required: ["origen", "destino", "fechaIda"],
  };

  async execute(input: FlightsInput): Promise<FlightsOutput> {
    const { segments, tripType } = buildFlightSegments(
      this.resolveAirports(input.origen),
      this.resolveAirports(input.destino),
      input.fechaIda,
      input.fechaVuelta,
    );

    const filters = new FlightSearchFilters({
      trip_type: tripType,
      passenger_info: {
        adults: input.pasajeros ?? 1,
        children: 0,
        infants_in_seat: 0,
        infants_on_lap: 0,
      },
      flight_segments: segments,
      seat_type: SeatType.ECONOMY,
      sort_by: SortBy.CHEAPEST,
    });

    const results = await new SearchFlights().search(filters, {
      currency: "USD",
    });
    if (results === null) {
      throw new Error(
        "Google Flights no devolvió resultados (puede ser un bloqueo o un cambio en su formato).",
      );
    }

    const vuelos = results
      .map((result) => {
        // En ida y vuelta, cada resultado es [ida, vuelta] y el precio total va en el último.
        const [ida] = Array.isArray(result) ? result : [result];
        const total = Array.isArray(result)
          ? result[result.length - 1]
          : result;
        return this.toVuelo(ida, total);
      })
      .filter((vuelo) => !Number.isNaN(vuelo.precioTotal))
      .filter(
        (vuelo) =>
          input.presupuestoMaxTotal === undefined ||
          vuelo.precioTotal <= input.presupuestoMaxTotal,
      )
      .slice(0, MAX_RESULTS);

    return { vuelos };
  }

  private toVuelo(ida: FlightResult, total: FlightResult): Vuelo {
    const first = ida.legs[0];
    const last = ida.legs[ida.legs.length - 1];
    const local = this.localTimes(ida);
    return {
      aerolinea: ida.primary_airline_name ?? first.airline,
      precioTotal: total.price ?? Number.NaN,
      moneda: total.currency ?? "USD",
      escalas: ida.stops,
      salidaIda: local?.salida ?? first.departure_datetime.toISOString(),
      llegadaIda: local?.llegada ?? last.arrival_datetime.toISOString(),
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
    const decoded = Buffer.from(ida.booking_token, "base64").toString("latin1");
    const times =
      decoded.match(/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d/g) ?? [];
    const salida = times[0];
    const llegada = times[ida.legs.length * 2 - 1];
    return salida && llegada ? { salida, llegada } : null;
  }

  /** Una ciudad con varios aeropuertos (ej: Buenos Aires) se busca en todos ellos. */
  private resolveAirports(lugar: string): Airport[] {
    const matches = searchAirports(lugar, 5);
    if (matches.length === 0) {
      throw new Error(`No se encontró "${lugar}" como ciudad o aeropuerto.`);
    }
    return matches[0].match_type === "city"
      ? matches.filter((m) => m.match_type === "city").map((m) => m.code)
      : [matches[0].code];
  }
}
