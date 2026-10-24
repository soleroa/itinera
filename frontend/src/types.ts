export interface TripRequest {
  destino: string;
  origen: string;
  salida: string;
  vuelta: string;
  personas: number;
  /** Presupuesto total en pesos argentinos; null si el usuario no quiso fijar uno. */
  presupuesto: number | null;
}
