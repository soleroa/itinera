export interface TripRequest {
  destination: string;
  origin: string;
  /** Departure date, YYYY-MM-DD. */
  departure: string;
  /** Return date, YYYY-MM-DD. */
  returnDate: string;
  travelers: number;
  /** Total budget in USD; null if the user did not set one. */
  maxBudget: number | null;
}

export interface Flight {
  airline: string;
  totalPrice: number;
  currency: string;
  stops: number;
  outboundDeparture: string;
  outboundArrival: string;
  link: string;
}

export interface Accommodation {
  name: string;
  type: 'hotel' | 'rental';
  category?: string;
  rating?: number;
  totalPrice: number;
  pricePerNight: number;
  currency: string;
  link: string;
}

export interface AgentResponse {
  answer: string;
  flights: Flight[];
  accommodations: Accommodation[];
}

export type OptionLevel = 'cheapest' | 'balanced' | 'best';

export interface TripOption {
  level: OptionLevel;
  flight: Flight;
  accommodation: Accommodation;
  /** Flight + accommodation, in USD. */
  total: number;
}

export interface Alternative {
  change: string;
  departure: string;
  returnDate: string;
  option: TripOption;
}

export interface TripOptionsResponse {
  status: 'ok' | 'over_budget';
  options: TripOption[];
  cheapest?: TripOption;
  shortfall?: number;
  alternatives?: Alternative[];
  notice: string;
}
