/**
 * Airports (IATA codes) of the cities travelers most often pick abroad, keyed by lowercase,
 * accent-free city name in English and the local/Spanish spelling.
 *
 * fli-js searches airports by name, which confuses namesakes ("Athens" finds Athens, Georgia;
 * "Naples" finds Naples, Florida; "Venice" finds Venice, Florida), so these are resolved by hand.
 * Cities without an airport list the closest big one. Anything not listed falls back to the search.
 */
const ROME = ['FCO', 'CIA'];
const MILAN = ['MXP', 'LIN', 'BGY'];
const LONDON = ['LHR', 'LGW', 'STN', 'LTN', 'LCY'];
const PARIS = ['CDG', 'ORY'];
const NEW_YORK = ['JFK', 'EWR', 'LGA'];
const TOKYO = ['HND', 'NRT'];
const OSAKA = ['KIX', 'ITM'];
const ISTANBUL = ['IST', 'SAW'];
const BANGKOK = ['BKK', 'DMK'];
const SAO_PAULO = ['GRU', 'CGH'];
const RIO = ['GIG', 'SDU'];
const MEXICO_CITY = ['MEX'];
const CANCUN = ['CUN'];

export const INTERNATIONAL_AIRPORTS: Record<string, string[]> = {
  // Italy
  rome: ROME, roma: ROME, florence: ['FLR'], florencia: ['FLR'], firenze: ['FLR'],
  venice: ['VCE'], venecia: ['VCE'], venezia: ['VCE'], milan: MILAN, milano: MILAN,
  naples: ['NAP'], napoles: ['NAP'], napoli: ['NAP'], bologna: ['BLQ'], verona: ['VRN'],
  turin: ['TRN'], torino: ['TRN'],
  // Spain and Portugal
  madrid: ['MAD'], barcelona: ['BCN'], seville: ['SVQ'], sevilla: ['SVQ'], valencia: ['VLC'],
  granada: ['GRX'], malaga: ['AGP'], bilbao: ['BIO'],
  lisbon: ['LIS'], lisboa: ['LIS'], porto: ['OPO'], oporto: ['OPO'], faro: ['FAO'], coimbra: ['OPO'],
  // France, Germany, UK, Benelux, Alps
  paris: PARIS, nice: ['NCE'], niza: ['NCE'], lyon: ['LYS'], marseille: ['MRS'], marsella: ['MRS'],
  bordeaux: ['BOD'], burdeos: ['BOD'], strasbourg: ['SXB'], estrasburgo: ['SXB'],
  berlin: ['BER'], munich: ['MUC'], hamburg: ['HAM'], hamburgo: ['HAM'], cologne: ['CGN'],
  colonia: ['CGN'], frankfurt: ['FRA'], francfort: ['FRA'],
  london: LONDON, londres: LONDON, edinburgh: ['EDI'], edimburgo: ['EDI'], manchester: ['MAN'],
  bath: ['BRS'], liverpool: ['LPL'],
  amsterdam: ['AMS'], rotterdam: ['RTM'], utrecht: ['AMS'], 'the hague': ['AMS'],
  zurich: ['ZRH'], geneva: ['GVA'], ginebra: ['GVA'], lucerne: ['ZRH'], interlaken: ['ZRH'],
  vienna: ['VIE'], viena: ['VIE'], salzburg: ['SZG'], innsbruck: ['INN'],
  // Southeast Europe, Turkey, Egypt
  athens: ['ATH'], atenas: ['ATH'], santorini: ['JTR'], thessaloniki: ['SKG'], heraklion: ['HER'],
  dubrovnik: ['DBV'], split: ['SPU'], zagreb: ['ZAG'],
  istanbul: ISTANBUL, estambul: ISTANBUL, cappadocia: ['NAV', 'ASR'], capadocia: ['NAV', 'ASR'],
  antalya: ['AYT'], izmir: ['ADB'],
  cairo: ['CAI'], 'el cairo': ['CAI'], luxor: ['LXR'], aswan: ['ASW'], hurghada: ['HRG'],
  // Asia
  tokyo: TOKYO, tokio: TOKYO, kyoto: OSAKA, osaka: OSAKA, nara: OSAKA, hiroshima: ['HIJ'],
  sapporo: ['CTS'],
  bangkok: BANGKOK, 'chiang mai': ['CNX'], phuket: ['HKT'], krabi: ['KBV'],
  // North America and the Caribbean
  'new york': NEW_YORK, 'nueva york': NEW_YORK, miami: ['MIA'], 'los angeles': ['LAX'],
  orlando: ['MCO'], toronto: ['YYZ'], vancouver: ['YVR'], montreal: ['YUL'], 'quebec city': ['YQB'],
  'mexico city': MEXICO_CITY, 'ciudad de mexico': MEXICO_CITY, cdmx: MEXICO_CITY,
  cancun: CANCUN, 'playa del carmen': CANCUN, oaxaca: ['OAX'],
  havana: ['HAV'], 'la habana': ['HAV'], varadero: ['VRA'], trinidad: ['HAV'],
  'san jose': ['SJO'], 'la fortuna': ['SJO'], 'manuel antonio': ['SJO'],
  // South America (outside Argentina)
  'rio de janeiro': RIO, florianopolis: ['FLN'], salvador: ['SSA'], 'sao paulo': SAO_PAULO,
  santiago: ['SCL'], valparaiso: ['SCL'], 'san pedro de atacama': ['CJC'], 'puerto varas': ['PMC'],
  montevideo: ['MVD'], 'punta del este': ['PDP'], 'colonia del sacramento': ['MVD'],
  lima: ['LIM'], cusco: ['CUZ'], arequipa: ['AQP'],
  bogota: ['BOG'], medellin: ['MDE'], cartagena: ['CTG'],
  quito: ['UIO'], guayaquil: ['GYE'], cuenca: ['CUE'],
  'la paz': ['LPB'], uyuni: ['UYU'], sucre: ['SRE'],
};
