// ── FlightUtilities — Service OurAirports (aéroports, pistes, fréquences) ────
// CSV publics mis en cache 24 h en mémoire. Aucune clé API requise.
import { getText } from '../lib/http.js';
import { parseCSVObjects } from '../lib/csv.js';
import { getStation } from './weather.js';

const BASE_URL = 'https://davidmegginson.github.io/ourairports-data';
const DAY_MS = 24 * 60 * 60 * 1000;

const TYPE_LABELS = {
  large_airport: 'Grand aéroport',
  medium_airport: 'Aéroport moyen',
  small_airport: 'Petit aéroport',
  heliport: 'Héliport',
  seaplane_base: "Base d'hydravions",
  balloonport: 'Base de ballons',
  closed: 'Fermé',
};

const SURFACE_LABELS = {
  ASP: 'Asphalte',
  ASPH: 'Asphalte',
  BIT: 'Bitume',
  BLT: 'Bitume',
  TAR: 'Bitume',
  CON: 'Béton',
  GRS: 'Herbe',
  GRASS: 'Herbe',
  CLA: 'Argile',
  SAN: 'Sable',
  GVL: 'Gravier',
  GRAVEL: 'Gravier',
  SMT: 'Métal damier',
  PER: 'Surface permanente',
  ICE: 'Glace',
  SNO: 'Neige',
  WAT: 'Eau',
  WPE: 'Bois',
  UNK: 'Inconnue',
};

const FREQ_TYPE_LABELS = {
  ATIS: 'ATIS',
  TWR: 'TWR',
  GND: 'GND',
  CLD: 'DEL',
  CD: 'DEL',
  DEL: 'DEL',
  APP: 'APP',
  DEP: 'DEP',
  FSS: 'FSS',
  'A/D': 'TWR',
  GC: 'GND',
  TC: 'TWR',
  CTAF: 'CTAF',
  UNICOM: 'UNICOM',
  RDO: 'RDO',
  EMR: 'Urgence',
  PTD: 'Pré-vol',
  INFO: 'INFO',
  MIL: 'Militaire',
  AWOS: 'AWOS',
  ASOS: 'ASOS',
};

const FREQ_ORDER = ['DEL', 'GND', 'TWR', 'ATIS', 'APP', 'DEP', 'FSS'];

let dbPromise = null;

function loadDB() {
  if (!dbPromise) {
    dbPromise = Promise.all([
      getText(`${BASE_URL}/airports.csv`, { ttlMs: DAY_MS }),
      getText(`${BASE_URL}/runways.csv`, { ttlMs: DAY_MS }),
      getText(`${BASE_URL}/airport-frequencies.csv`, { ttlMs: DAY_MS }),
    ])
      .then(([airportsCsv, runwaysCsv, freqsCsv]) => {
        const airports = new Map();
        const byIata = new Map();
        for (const row of parseCSVObjects(airportsCsv)) {
          const icao = (row.ident || '').toUpperCase();
          if (!/^[A-Z0-9]{3,4}$/.test(icao)) continue;
          const entry = {
            icao,
            iata: (row.iata_code || '').toUpperCase(),
            name: row.name || icao,
            lat: Number(row.latitude_deg),
            lon: Number(row.longitude_deg),
            elevFt: Number(row.elevation_ft),
            municipality: row.municipality || '',
            country: row.iso_country || '',
            region: row.iso_region || '',
            type: row.type || '',
          };
          airports.set(icao, entry);
          if (entry.iata && !byIata.has(entry.iata)) byIata.set(entry.iata, entry);
        }

        const runways = new Map();
        for (const row of parseCSVObjects(runwaysCsv)) {
          const ident = (row.airport_ident || '').toUpperCase();
          if (!ident || !runways.has(ident)) runways.set(ident, []);
          runways.get(ident).push({
            ident: row.he_ident ? `${row.le_ident}/${row.he_ident}` : row.le_ident,
            lengthFt: Number(row.length_ft),
            widthFt: Number(row.width_ft),
            surface: row.surface || '',
            lighted: row.lighted === '1',
            closed: row.closed === '1',
          });
        }

        const freqs = new Map();
        for (const row of parseCSVObjects(freqsCsv)) {
          const ident = (row.airport_ident || '').toUpperCase();
          if (!ident || !freqs.has(ident)) freqs.set(ident, []);
          freqs.get(ident).push({
            type: (row.type || '').toUpperCase(),
            description: row.description || '',
            mhz: row.frequency_mhz || '',
          });
        }

        return { airports, byIata, runways, freqs };
      })
      .catch((err) => {
        dbPromise = null; // permettra une nouvelle tentative au prochain appel
        throw err;
      });
  }
  return dbPromise;
}

function fmtSurface(s) {
  return SURFACE_LABELS[s.toUpperCase()] || s || 'Inconnue';
}

function fmtNumber(n) {
  return Number.isFinite(n) ? n.toLocaleString('fr-FR') : '—';
}

export function formatRunways(runways, { max = 12 } = {}) {
  if (!runways?.length) return [];
  const lines = runways.slice(0, max).map((r) => {
    const flags = [r.closed ? '⛔' : '', r.lighted ? '💡' : ''].filter(Boolean).join('');
    return `• ${r.ident || '—'} — ${fmtNumber(Math.round(r.lengthFt * 0.3048))} m × ${fmtNumber(
      Math.round(r.widthFt * 0.3048)
    )} m — ${fmtSurface(r.surface)} ${flags}`.trimEnd();
  });
  if (runways.length > max) lines.push(`• … +${runways.length - max} autres pistes`);
  return lines;
}

export function formatFrequencies(freqs) {
  if (!freqs?.length) return [];
  const sorted = [...freqs]
    .map((f) => ({
      label: FREQ_TYPE_LABELS[f.type] || f.type || '?',
      text: f.description ? `${f.description} — ${f.mhz} MHz` : `${f.mhz} MHz`,
    }))
    .sort((a, b) => {
      const ia = FREQ_ORDER.indexOf(a.label);
      const ib = FREQ_ORDER.indexOf(b.label);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.label.localeCompare(b.label);
    });
  const seen = new Set();
  const lines = [];
  for (const f of sorted) {
    const key = `${f.label}:${f.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(`**${f.label}** ${f.text}`);
  }
  return lines;
}

export async function getAirport(rawCode) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{3,4}$/.test(code)) return null;

  const db = await loadDB();
  let ap = db.airports.get(code) || db.byIata.get(code);
  if (!ap && code.length === 4 && code.startsWith('K')) ap = db.airports.get(code.slice(1));
  if (!ap && code.length === 3) ap = db.airports.get(`K${code}`);

  if (ap) {
    return {
      ...ap,
      runways: db.runways.get(ap.icao) || [],
      frequencies: db.freqs.get(ap.icao) || [],
      source: 'OurAirports',
    };
  }

  // Repli : stations météo connues (aérodromes militaires, petits terrains…)
  const station = await getStation(code);
  if (station) {
    return {
      icao: code,
      iata: (station.iataId || '').toUpperCase(),
      name: station.site || code,
      lat: Number(station.lat),
      lon: Number(station.lon),
      elevFt: Number(station.elev),
      municipality: '',
      country: station.country || '',
      region: '',
      type: 'station',
      runways: [],
      frequencies: [],
      source: 'stations météo NOAA',
    };
  }
  return null;
}

export function airportTypeLabel(type) {
  return TYPE_LABELS[type] || type || 'Aéroport';
}

export default { getAirport, formatRunways, formatFrequencies, airportTypeLabel };
