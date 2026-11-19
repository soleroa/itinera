/**
 * Well-known cities for the countries and regions travelers most often type. A country is too broad
 * to search flights or plan days, so picking one offers these as a shortcut to a real city.
 * Keys are lowercase, accent-free, in English and Spanish.
 */
const POPULAR: Record<string, string[]> = {
  italy: ['Rome', 'Florence', 'Venice', 'Milan'],
  italia: ['Rome', 'Florence', 'Venice', 'Milan'],
  spain: ['Madrid', 'Barcelona', 'Seville', 'Valencia'],
  espana: ['Madrid', 'Barcelona', 'Seville', 'Valencia'],
  france: ['Paris', 'Nice', 'Lyon', 'Marseille'],
  francia: ['Paris', 'Nice', 'Lyon', 'Marseille'],
  portugal: ['Lisbon', 'Porto', 'Faro'],
  germany: ['Berlin', 'Munich', 'Hamburg'],
  alemania: ['Berlin', 'Munich', 'Hamburg'],
  'united kingdom': ['London', 'Edinburgh', 'Manchester'],
  'reino unido': ['London', 'Edinburgh', 'Manchester'],
  'united states': ['New York', 'Miami', 'Los Angeles', 'Orlando'],
  usa: ['New York', 'Miami', 'Los Angeles', 'Orlando'],
  'estados unidos': ['New York', 'Miami', 'Los Angeles', 'Orlando'],
  brazil: ['Rio de Janeiro', 'Florianópolis', 'Salvador', 'São Paulo'],
  brasil: ['Rio de Janeiro', 'Florianópolis', 'Salvador', 'São Paulo'],
  chile: ['Santiago', 'Valparaíso', 'San Pedro de Atacama', 'Puerto Varas'],
  uruguay: ['Montevideo', 'Punta del Este', 'Colonia del Sacramento'],
  peru: ['Lima', 'Cusco', 'Arequipa'],
  colombia: ['Bogotá', 'Medellín', 'Cartagena'],
  mexico: ['Mexico City', 'Cancún', 'Oaxaca', 'Playa del Carmen'],
  japan: ['Tokyo', 'Kyoto', 'Osaka'],
  japon: ['Tokyo', 'Kyoto', 'Osaka'],
  argentina: ['Buenos Aires', 'Bariloche', 'Mendoza', 'Salta'],
  patagonia: ['Bariloche', 'El Calafate', 'Ushuaia', 'Puerto Madryn'],
};

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

/** Popular cities for a country or region, or an empty list if we don't have any. */
export function popularCities(place: string): string[] {
  return POPULAR[normalize(place)] ?? [];
}
