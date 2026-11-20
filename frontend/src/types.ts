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

export type OptionLevel = 'cheapest' | 'balanced' | 'best' | 'custom';

/** A flight or stay offered for choosing; `recommended` marks our pick. */
export type Choice<T> = T & { recommended: boolean };

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
  flights: Choice<Flight>[];
  stays: Choice<Accommodation>[];
  recommendationReason: string;
  notice: string;
}

export interface Place {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export interface RouteStep {
  mode: string;
  instruction?: string;
  line?: string;
  vehicle?: string;
  from?: string;
  to?: string;
  seconds: number;
}

export interface Leg {
  from: string;
  mode: 'TRANSIT' | 'WALK' | 'DRIVE';
  transitAvailable: boolean;
  minutes: number;
  meters: number;
  steps: RouteStep[];
}

export interface Stop {
  place: Place;
  leg: Leg | null;
}

export interface ItineraryDay {
  day: number;
  stops: Stop[];
  totalTravelMinutes: number;
  warnings: string[];
}

export interface Itinerary {
  hotel: Place;
  days: ItineraryDay[];
  unresolved: string[];
}
