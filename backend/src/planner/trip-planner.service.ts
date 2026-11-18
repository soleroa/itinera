import { BadRequestException, Injectable, Logger } from '@nestjs/common';
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
  /** Solo si el presupuesto no alcanza: variantes de fechas/noches que sí entran, con su opción más barata. */
  alternativas?: Alternativa[];
  /** Lo que el presupuesto NO cubre. */
  aviso: string;
}

export interface Alternativa {
  cambio: string;
  salida: string;
  vuelta: string;
  opcion: OpcionConPrecio;
}

/** Tope de búsquedas extra (cada una gasta una llamada a vuelos y una a hoteles). */
const MAX_INTENTOS_ALTERNATIVAS = 3;

const AVISO =
  'El presupuesto se verificó solo contra vuelo + alojamiento. Comida, entradas y transporte local no están incluidos.';
const CANDIDATOS = 15;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

@Injectable()
export class TripPlannerService {
  private readonly logger = new Logger(TripPlannerService.name);

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

  /** Todas las combinaciones (en USD) para un pedido, de la más barata a la más cara. */
  private async candidatas(req: TripRequest) {
    const [vuelos, alojamientos] = await Promise.all([
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
    return todasLasCombinaciones(
      vuelos.vuelos.filter(usd),
      alojamientos.alojamientos.filter(usd),
    );
  }

  async options(req: TripRequest): Promise<TripOptions> {
    const [cotizacion, candidatas] = await Promise.all([
      this.fx.getMep(),
      this.candidatas(req),
    ]);
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
    const alternativas = await this.alternativas(req, maxUsd!, conPrecio);
    return {
      estado: 'presupuesto_insuficiente',
      cotizacion,
      opciones: [],
      masBarata,
      faltanteArs: masBarata.totalArs - req.presupuestoMax!,
      alternativas,
      aviso: AVISO,
    };
  }

  /**
   * Prueba, con un tope de búsquedas, menos noches y una semana más tarde; devuelve
   * solo las variantes cuya combinación más barata entra en el presupuesto.
   */
  private async alternativas(
    req: TripRequest,
    maxUsd: number,
    conPrecio: (c: Combinacion) => OpcionConPrecio,
  ): Promise<Alternativa[]> {
    const noches = diasEntre(req.salida, req.vuelta);
    const hoy = new Date().toISOString().slice(0, 10);
    const variantes: Array<{ cambio: string; salida: string; vuelta: string }> = [];
    if (noches >= 2) {
      variantes.push({
        cambio: 'Una noche menos',
        salida: req.salida,
        vuelta: sumarDias(req.vuelta, -1),
      });
    }
    if (noches >= 3) {
      variantes.push({
        cambio: 'Dos noches menos',
        salida: req.salida,
        vuelta: sumarDias(req.vuelta, -2),
      });
    }
    variantes.push({
      cambio: 'Viajar una semana después',
      salida: sumarDias(req.salida, 7),
      vuelta: sumarDias(req.vuelta, 7),
    });

    const intentos = variantes
      .filter((v) => v.salida > hoy)
      .slice(0, MAX_INTENTOS_ALTERNATIVAS);
    const resultados = await Promise.all(
      intentos.map(async (v): Promise<Alternativa | null> => {
        try {
          const cands = await this.candidatas({ ...req, ...v });
          const [mejor] = elegirOpciones(cands, maxUsd);
          return mejor ? { ...v, opcion: conPrecio(mejor) } : null;
        } catch (error) {
          this.logger.warn(
            `Alternativa "${v.cambio}" falló: ${error instanceof Error ? error.message : error}`,
          );
          return null;
        }
      }),
    );
    return resultados.filter((a): a is Alternativa => a !== null);
  }
}

function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(hasta) - Date.parse(desde)) / 86_400_000);
}

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
