/**
 * Well-known cities for the countries and regions travelers most often type. A country is too broad
 * to search flights or plan days, so picking one offers these as a shortcut to a real city.
 * Keys are lowercase, accent-free, in English and Spanish.
 */
const POPULAR: Record<string, string[]> = {
  italy: ['Rome', 'Florence', 'Venice', 'Milan', 'Naples', 'Bologna', 'Verona', 'Turin'],
  italia: ['Rome', 'Florence', 'Venice', 'Milan', 'Naples', 'Bologna', 'Verona', 'Turin'],
  spain: ['Madrid', 'Barcelona', 'Seville', 'Valencia', 'Granada', 'Malaga', 'Bilbao'],
  espana: ['Madrid', 'Barcelona', 'Seville', 'Valencia', 'Granada', 'Malaga', 'Bilbao'],
  france: ['Paris', 'Nice', 'Lyon', 'Marseille', 'Bordeaux', 'Strasbourg'],
  francia: ['Paris', 'Nice', 'Lyon', 'Marseille', 'Bordeaux', 'Strasbourg'],
  portugal: ['Lisbon', 'Porto', 'Faro', 'Coimbra'],
  germany: ['Berlin', 'Munich', 'Hamburg', 'Cologne', 'Frankfurt'],
  alemania: ['Berlin', 'Munich', 'Hamburg', 'Cologne', 'Frankfurt'],
  'united kingdom': ['London', 'Edinburgh', 'Manchester', 'Bath', 'Liverpool'],
  'reino unido': ['London', 'Edinburgh', 'Manchester', 'Bath', 'Liverpool'],
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
  japan: ['Tokyo', 'Kyoto', 'Osaka', 'Nara', 'Hiroshima', 'Sapporo'],
  japon: ['Tokyo', 'Kyoto', 'Osaka', 'Nara', 'Hiroshima', 'Sapporo'],
  greece: ['Athens', 'Santorini', 'Thessaloniki', 'Heraklion'],
  grecia: ['Athens', 'Santorini', 'Thessaloniki', 'Heraklion'],
  netherlands: ['Amsterdam', 'Rotterdam', 'Utrecht', 'The Hague'],
  'paises bajos': ['Amsterdam', 'Rotterdam', 'Utrecht', 'The Hague'],
  switzerland: ['Zurich', 'Geneva', 'Lucerne', 'Interlaken'],
  suiza: ['Zurich', 'Geneva', 'Lucerne', 'Interlaken'],
  austria: ['Vienna', 'Salzburg', 'Innsbruck'],
  croatia: ['Dubrovnik', 'Split', 'Zagreb'],
  croacia: ['Dubrovnik', 'Split', 'Zagreb'],
  turkey: ['Istanbul', 'Cappadocia', 'Antalya', 'Izmir'],
  turquia: ['Istanbul', 'Cappadocia', 'Antalya', 'Izmir'],
  egypt: ['Cairo', 'Luxor', 'Aswan', 'Hurghada'],
  egipto: ['Cairo', 'Luxor', 'Aswan', 'Hurghada'],
  thailand: ['Bangkok', 'Chiang Mai', 'Phuket', 'Krabi'],
  tailandia: ['Bangkok', 'Chiang Mai', 'Phuket', 'Krabi'],
  canada: ['Toronto', 'Vancouver', 'Montreal', 'Quebec City'],
  ecuador: ['Quito', 'Guayaquil', 'Cuenca'],
  bolivia: ['La Paz', 'Uyuni', 'Sucre'],
  cuba: ['Havana', 'Varadero', 'Trinidad'],
  'costa rica': ['San Jose', 'La Fortuna', 'Manuel Antonio'],
  argentina: ['Buenos Aires', 'Bariloche', 'Mendoza', 'Salta', 'Ushuaia', 'El Calafate', 'Iguazu', 'Cordoba'],
  patagonia: ['Bariloche', 'El Calafate', 'Ushuaia', 'Puerto Madryn'],
};

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

/** Popular cities for a country or region, or an empty list if we don't have any. */
export function popularCities(place: string): string[] {
  return POPULAR[normalize(place)] ?? [];
}
