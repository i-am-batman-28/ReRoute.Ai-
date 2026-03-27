/** IATA airline codes → name + logo. Logos from logo.clearbit.com (free, no key). */

export type AirlineEntry = { iata: string; name: string; logo: string };

function L(domain: string): string { return `https://logo.clearbit.com/${domain}`; }

export const AIRLINES: AirlineEntry[] = [
  { iata: "AA", name: "American Airlines", logo: L("aa.com") },
  { iata: "DL", name: "Delta Air Lines", logo: L("delta.com") },
  { iata: "UA", name: "United Airlines", logo: L("united.com") },
  { iata: "WN", name: "Southwest Airlines", logo: L("southwest.com") },
  { iata: "B6", name: "JetBlue Airways", logo: L("jetblue.com") },
  { iata: "AS", name: "Alaska Airlines", logo: L("alaskaair.com") },
  { iata: "NK", name: "Spirit Airlines", logo: L("spirit.com") },
  { iata: "F9", name: "Frontier Airlines", logo: L("flyfrontier.com") },
  { iata: "HA", name: "Hawaiian Airlines", logo: L("hawaiianairlines.com") },
  { iata: "BA", name: "British Airways", logo: L("britishairways.com") },
  { iata: "LH", name: "Lufthansa", logo: L("lufthansa.com") },
  { iata: "AF", name: "Air France", logo: L("airfrance.com") },
  { iata: "KL", name: "KLM", logo: L("klm.com") },
  { iata: "TK", name: "Turkish Airlines", logo: L("turkishairlines.com") },
  { iata: "FR", name: "Ryanair", logo: L("ryanair.com") },
  { iata: "U2", name: "easyJet", logo: L("easyjet.com") },
  { iata: "EK", name: "Emirates", logo: L("emirates.com") },
  { iata: "QR", name: "Qatar Airways", logo: L("qatarairways.com") },
  { iata: "EY", name: "Etihad Airways", logo: L("etihad.com") },
  { iata: "SQ", name: "Singapore Airlines", logo: L("singaporeair.com") },
  { iata: "CX", name: "Cathay Pacific", logo: L("cathaypacific.com") },
  { iata: "QF", name: "Qantas", logo: L("qantas.com") },
  { iata: "NH", name: "ANA", logo: L("ana.co.jp") },
  { iata: "JL", name: "Japan Airlines", logo: L("jal.co.jp") },
  { iata: "KE", name: "Korean Air", logo: L("koreanair.com") },
  { iata: "AI", name: "Air India", logo: L("airindia.com") },
  { iata: "6E", name: "IndiGo", logo: L("goindigo.in") },
  { iata: "SG", name: "SpiceJet", logo: L("spicejet.com") },
  { iata: "AC", name: "Air Canada", logo: L("aircanada.com") },
  { iata: "AM", name: "Aeromexico", logo: L("aeromexico.com") },
  { iata: "LA", name: "LATAM Airlines", logo: L("latamairlines.com") },
  { iata: "ET", name: "Ethiopian Airlines", logo: L("ethiopianairlines.com") },
  { iata: "MS", name: "EgyptAir", logo: L("egyptair.com") },
  { iata: "CA", name: "Air China", logo: L("airchina.com.cn") },
  { iata: "MU", name: "China Eastern", logo: L("ceair.com") },
  { iata: "CZ", name: "China Southern", logo: L("csair.com") },
  { iata: "LX", name: "Swiss", logo: L("swiss.com") },
  { iata: "OS", name: "Austrian Airlines", logo: L("austrian.com") },
  { iata: "IB", name: "Iberia", logo: L("iberia.com") },
  { iata: "AY", name: "Finnair", logo: L("finnair.com") },
  { iata: "TP", name: "TAP Air Portugal", logo: L("flytap.com") },
  { iata: "W6", name: "Wizz Air", logo: L("wizzair.com") },
  { iata: "TG", name: "Thai Airways", logo: L("thaiairways.com") },
  { iata: "MH", name: "Malaysia Airlines", logo: L("malaysiaairlines.com") },
  { iata: "VN", name: "Vietnam Airlines", logo: L("vietnamairlines.com") },
  { iata: "GA", name: "Garuda Indonesia", logo: L("garuda-indonesia.com") },
  { iata: "OZ", name: "Asiana Airlines", logo: L("flyasiana.com") },
  { iata: "AV", name: "Avianca", logo: L("avianca.com") },
  { iata: "CM", name: "Copa Airlines", logo: L("copaair.com") },
  { iata: "SA", name: "South African Airways", logo: L("flysaa.com") },
  { iata: "KQ", name: "Kenya Airways", logo: L("kenya-airways.com") },
  { iata: "SK", name: "SAS", logo: L("flysas.com") },
  { iata: "EI", name: "Aer Lingus", logo: L("aerlingus.com") },
  { iata: "IX", name: "Air India Express", logo: L("airindiaexpress.com") },
  { iata: "QP", name: "Akasa Air", logo: L("akasaair.com") },
  { iata: "GF", name: "Gulf Air", logo: L("gulfair.com") },
  { iata: "SV", name: "Saudia", logo: L("saudia.com") },
];

const _map = new Map(AIRLINES.map((a) => [a.iata, a]));

export function findAirlineByIata(iata: string): AirlineEntry | undefined {
  return _map.get(iata.toUpperCase());
}

export function extractAirlineCode(flightNumber: string): string | null {
  const m = flightNumber.trim().toUpperCase().match(/^([A-Z0-9]{2})\d/);
  return m ? m[1] : null;
}

export function airlineFromFlight(flightNumber: string): AirlineEntry | undefined {
  const code = extractAirlineCode(flightNumber);
  return code ? findAirlineByIata(code) : undefined;
}
