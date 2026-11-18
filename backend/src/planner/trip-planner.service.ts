import { BadRequestException, Injectable } from '@nestjs/common';
import { AccommodationTool } from '../tools/accommodation.tool';
import { FlightsTool } from '../tools/flights.tool';
import { Combinacion, elegirOpciones, todasLasCombinaciones } from './combinations';
import { Cotizacion, FxService } from './fx.service';

export interface TripRequest {
  origen: string;
  destino: string;
  salida: string;
  vuelta: string;
  personas: number;
  /** Presupuesto total en pesos argentinos; null si no hay tope. */
  presupuestoMax: number | null;
}

export interface OpcionConPrecio extends Combinacion {
  totalArs: number;
}

export interface TripOptions {
  estado: 'ok' | 'presupuesto_insuficiente';
  cotizacion: Cotizacion;
  opciones: OpcionConPrecio[];
  /** Solo si el presupuesto no alcanza: la combinación más barata y cuánto falta (en pesos). */
  masBarata?: OpcionConPrecio;
  faltanteArs?: number;
  /** Lo que el presupuesto NO cubre. */
  aviso: string;
}

const AVISO =
  'El presupuesto se verificó solo contra vuelo + alojamiento. Comida, entradas y transporte local no están incluidos.';
const CANDIDATOS = 15;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

@Injectable()
export class TripPlannerService {
  constructor(
    private readonly flights: FlightsTool,
    private readonly accommodation: AccommodationTool,
    private readonly fx: FxService,
  ) {}

  validate(body: Partial<TripRequest>): TripRequest {
    const { origen, destino, salida, vuelta, personas, presupuestoMax } = body;
    if (!origen?.trim() || !destino?.trim()) {
      throw new BadRequestException('Faltan origen y/o destino.');
    }
    if (!salida || !vuelta || !DATE.test(salida) || !DATE.test(vuelta)) {
      throw new BadRequestException('Las fechas deben tener formato YYYY-MM-DD.');
    }
    if (vuelta <= salida) {
      throw new BadRequestException('La vuelta debe ser posterior a la salida.');
    }
    if (!Number.isInteger(personas) || personas! < 1) {
      throw new BadRequestException('personas debe ser un entero >= 1.');
    }
    if (
      presupuestoMax != null &&
      (typeof presupuestoMax !== 'number' || presupuestoMax <= 0)
    ) {
      throw new BadRequestException('presupuestoMax debe ser un número positivo.');
    }
    return {
      origen: origen.trim(),
      destino: destino.trim(),
      salida,
      vuelta,
      personas: personas!,
      presupuestoMax: presupuestoMax ?? null,
    };
  }

  async options(req: TripRequest): Promise<TripOptions> {
    const [cotizacion, vuelos, alojamientos] = await Promise.all([
      this.fx.getMep(),
      this.flights.execute({
        origen: req.origen,
        destino: req.destino,
        fechaIda: req.salida,
        fechaVuelta: req.vuelta,
        pasajeros: req.personas,
        maxResultados: CANDIDATOS,
      }),
      this.accommodation.execute({
        ciudad: req.destino,
        fechaEntrada: req.salida,
        fechaSalida: req.vuelta,
        pasajeros: req.personas,
        maxResultados: CANDIDATOS,
      }),
    ]);

    // Todo el cálculo se hace en USD; las APIs devuelven USD y se verifica acá, no en el LLM.
    const usd = (m: { moneda: string }) => m.moneda === 'USD';
    const candidatas = todasLasCombinaciones(
      vuelos.vuelos.filter(usd),
      alojamientos.alojamientos.filter(usd),
    );
    if (candidatas.length === 0) {
      throw new Error('No hay vuelos y alojamientos con precio para combinar.');
    }

    const rate = cotizacion.pesosPorDolar;
    const conPrecio = (c: Combinacion): OpcionConPrecio => ({
      ...c,
      totalArs: Math.round(c.totalUsd * rate),
    });
    const maxUsd = req.presupuestoMax === null ? null : req.presupuestoMax / rate;

    const opciones = elegirOpciones(candidatas, maxUsd);
    if (opciones.length > 0) {
      return {
        estado: 'ok',
        cotizacion,
        opciones: opciones.map(conPrecio),
        aviso: AVISO,
      };
    }

    const masBarata = conPrecio({ nivel: 'economica', ...candidatas[0] });
    return {
      estado: 'presupuesto_insuficiente',
      cotizacion,
      opciones: [],
      masBarata,
      faltanteArs: masBarata.totalArs - req.presupuestoMax!,
      aviso: AVISO,
    };
  }
}
