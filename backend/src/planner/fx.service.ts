import { Injectable, Logger } from '@nestjs/common';

export interface Cotizacion {
  tipo: 'MEP';
  /** Pesos por dólar (precio de venta). */
  pesosPorDolar: number;
  /** Cuándo actualizó la fuente la cotización, o null si viene del valor fijo de respaldo. */
  actualizada: string | null;
  fuente: string;
}

const TTL_MS = 30 * 60 * 1000;

/** Dólar MEP en pesos, de dolarapi.com; si falla, usa USD_ARS_RATE del .env. */
@Injectable()
export class FxService {
  private readonly logger = new Logger(FxService.name);
  private readonly url =
    process.env.FX_API_URL ?? 'https://dolarapi.com/v1/dolares/bolsa';
  private cached: { value: Cotizacion; at: number } | null = null;

  async getMep(): Promise<Cotizacion> {
    if (this.cached && Date.now() - this.cached.at < TTL_MS) {
      return this.cached.value;
    }
    try {
      const response = await fetch(this.url);
      const data = (await response.json()) as {
        venta?: number;
        fechaActualizacion?: string;
      };
      if (!response.ok || !data.venta || data.venta <= 0) {
        throw new Error(`respuesta inválida (${response.status})`);
      }
      const value: Cotizacion = {
        tipo: 'MEP',
        pesosPorDolar: data.venta,
        actualizada: data.fechaActualizacion ?? null,
        fuente: 'dolarapi.com',
      };
      this.cached = { value, at: Date.now() };
      return value;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const fallback = Number(process.env.USD_ARS_RATE);
      if (fallback > 0) {
        this.logger.warn(`Cotización MEP falló (${message}); uso USD_ARS_RATE.`);
        return {
          tipo: 'MEP',
          pesosPorDolar: fallback,
          actualizada: null,
          fuente: 'USD_ARS_RATE (valor fijo)',
        };
      }
      throw new Error(
        `No se pudo obtener la cotización del dólar MEP (${message}) y no hay USD_ARS_RATE de respaldo.`,
      );
    }
  }
}
