/** One city of the trip and the nights spent there. */
export interface TripStop {
  city: string;
  nights: number;
}

/** What the traveler wants: only flights, only stays, or the full trip with its days. */
export type TripScope = 'flights' | 'stays' | 'full';

export interface TripRequest {
  scope: TripScope;
  /** First city (the headline); the full route is in `stops`. */
  destination: string;
  /** Cities in visiting order; the nights add up to the whole trip. At least one. */
  stops: TripStop[];
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
  /** Null when the trip is stays only. */
  flight: Flight | null;
  /** One stay per stop of the trip, in order; empty when flights only. */
  accommodations: Accommodation[];
  /** Flight + every stay, in USD. */
  total: number;
}

export interface Alternative {
  change: string;
  departure: string;
  returnDate: string;
  stops: TripStop[];
  option: TripOption;
}

export interface TripOptionsResponse {
  status: 'ok' | 'over_budget';
  options: TripOption[];
  cheapest?: TripOption;
  shortfall?: number;
  alternatives?: Alternative[];
  flights: Choice<Flight>[];
  /** Per stop, the stays to choose from. */
  stays: Choice<Accommodation>[][];
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

/** How to get from one city of the trip to the next. */
export interface Transfer {
  from: string;
  to: string;
  leg: Leg | null;
}
