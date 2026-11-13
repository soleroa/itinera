export interface TripRequest {
  destino: string;
  origen: string;
  salida: string;
  vuelta: string;
  personas: number;
  /** Presupuesto total en pesos argentinos; null si el usuario no quiso fijar uno. */
  presupuesto: number | null;
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
