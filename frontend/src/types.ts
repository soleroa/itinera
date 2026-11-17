export interface TripRequest {
  destino: string;
  origen: string;
  salida: string;
  vuelta: string;
  personas: number;
  /** Rango de presupuesto total en pesos argentinos; null en el extremo que el usuario no fijó. */
  presupuestoMin: number | null;
  presupuestoMax: number | null;
}

export interface Flight {
  aerolinea: string;
  precioTotal: number;
  moneda: string;
  escalas: number;
  salidaIda: string;
  llegadaIda: string;
  enlace: string;
}

export interface Accommodation {
  nombre: string;
  tipo: 'hotel' | 'alquiler';
  categoria?: string;
  puntaje?: number;
  precioTotal: number;
  precioPorNoche: number;
  moneda: string;
  enlace: string;
}

export interface AgentResponse {
  answer: string;
  flights: Flight[];
  accommodations: Accommodation[];
}
