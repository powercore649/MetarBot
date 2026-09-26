// ── FlightUtilities — Service météo (NOAA aviationweather.gov) ───────────────
// METAR/TAF en direct + cache des stations mondiales (fallback ICAO).
import { getJSON } from '../lib/http.js';
import zlib from 'node:zlib';

const AVWX_BASE = 'https://aviationweather.gov/api/data';
const STATIONS_URL = 'https://aviationweather.gov/data/cache/stations.cache.json.gz';

let stationsPromise = null;

function loadStations() {
  if (!stationsPromise) {
    stationsPromise = (async () => {
      const res = await fetch(STATIONS_URL, { headers: { 'Accept-Encoding': 'identity' } });
      if (!res.ok) throw new Error(`HTTP ${res.status} — stations NOAA`);
      const text = zlib.gunzipSync(Buffer.from(await res.arrayBuffer())).toString('utf8');
      const map = new Map();
      for (const s of JSON.parse(text)) {
        const key = String(s.icaoId || s.id || '').toUpperCase();
        if (key) map.set(key, s);
      }
      return map;
    })().catch((err) => {
      stationsPromise = null;
      throw err;
    });
  }
  return stationsPromise;
}

export async function getStation(code) {
  try {
    const map = await loadStations();
    return map.get(String(code).toUpperCase()) || null;
  } catch {
    return null; // le cache stations est un confort, jamais bloquant
  }
}

export function normalizeIcao(raw) {
  return String(raw || '').trim().toUpperCase();
}

// Récupère le dernier METAR brutes + infos utiles pour l'affichage.
export async function getMetar(rawIcao) {
  const icao = normalizeIcao(rawIcao);
  if (!/^[A-Z0-9]{3,4}$/.test(icao)) return null;
  const list = await getJSON(`${AVWX_BASE}/metar?ids=${icao}&format=json`, { ttlMs: 90_000 });
  const m = Array.isArray(list) ? list[0] : null;
  if (!m || !m.rawOb) return null;
  const station = await getStation(icao);
  return {
    icao: m.icaoId || icao,
    raw: m.rawOb,
    reportTime: m.reportTime || null,
    obsTime: m.obsTime || null,
    flightCategory: m.fltCat || null,
    stationName: station?.site || m.name || null,
  };
}

// Récupère le dernier TAF brut (peut être absent : petits terrains).
export async function getTaf(rawIcao) {
  const icao = normalizeIcao(rawIcao);
  if (!/^[A-Z0-9]{3,4}$/.test(icao)) return null;
  const list = await getJSON(`${AVWX_BASE}/taf?ids=${icao}&format=json`, { ttlMs: 90_000 });
  const t = Array.isArray(list) ? list[0] : null;
  const raw = t && (t.rawTAF || t.rawOb || t.rawText || t.raw);
  if (!raw) return null;
  return { icao: t.icaoId || icao, raw: String(raw).trim(), issueTime: t.issueTime || null };
}

export default { getMetar, getTaf, getStation, normalizeIcao };
