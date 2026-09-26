// ── FlightUtilities — Réseaux en ligne : VATSIM v3 & IVAO Whazzup v2 ─────────
import { getJSON } from '../lib/http.js';
import { haversineKm, kmToNm } from '../lib/geo.js';
import { decodeMetar } from '../lib/metar.js';

const VATSIM_URL = 'https://data.vatsim.net/v3/vatsim-data.json';
const IVAO_URL = 'https://api.ivao.aero/v2/tracker/whazzup';
const FEED_TTL_MS = 60_000; // les flux sont rafraîchis toutes les ~30-60 s

// Règles VATSIM pour convertir les facility ids en étiquettes lisibles.
const VATSIM_FACILITY = { 1: 'FSS', 2: 'DEL', 3: 'GND', 4: 'TWR', 5: 'APP', 6: 'CTR' };
const VATSIM_RATINGS = {
  1: 'OBS', 2: 'S1', 3: 'S2', 4: 'S3', 5: 'C1', 6: 'C2',
  7: 'C3', 8: 'I1', 9: 'I2', 10: 'I3', 11: 'SUP', 12: 'ADM',
};

function normalizeToken(v) {
  return String(v ?? '').trim().toUpperCase();
}

// ── Détection « cet ATC couvre-t-il cet aéroport ? » ─────────────────────────
function matchesCallsign(callsign, icao) {
  const cs = normalizeToken(callsign);
  const base = normalizeToken(icao).replace(/^K/, '');
  const plainIcao = normalizeToken(icao);
  const candidates = base && base !== plainIcao ? [plainIcao, base] : [plainIcao];
  const suffix = cs.slice(-4);
  const suffixIsPosition = ['_DEL', '_GND', '_TWR', '_APP', '_DEP', '_CTR', '_FSS'].some((p) =>
    cs.endsWith(p)
  );
  for (const cand of candidates) {
    if (cs.startsWith(`${cand}_`) || cs.startsWith(`${cand} `)) {
      // "EGLL_TWR" → oui ; "EGLL2_TWR" (position secondaire) → oui aussi
      return suffixIsPosition || cs.startsWith(`${cand}_`);
    }
  }
  return false;
}

// ── Normalisation VATSIM ────────────────────────────────────────────────────
function normalizeVatsimAtc(c) {
  const facility = VATSIM_FACILITY[c.facility] || 'OTHER';
  return {
    callsign: c.callsign,
    frequency: c.frequency != null ? String(c.frequency) : null,
    facility,
    rating: VATSIM_RATINGS[c.rating] || `${c.rating}`,
    atisText: Array.isArray(c.text_atis) ? c.text_atis.join(' | ') : null,
    atisCode: c.atis_code || null,
    logonTime: c.logon_time || null,
    raw: c,
  };
}

function normalizeVatsimPilot(p) {
  return {
    callsign: p.callsign,
    latitude: p.latitude,
    longitude: p.longitude,
    altitudeFt: p.altitude,
    groundSpeed: p.groundspeed,
    aircraft: p.flight_plan?.aircraft_short || null,
    departure: p.flight_plan?.departure || null,
    arrival: p.flight_plan?.arrival || null,
    raw: p,
  };
}

// Les stations ATIS sont dans un tableau dédié du flux VATSIM v3.
function normalizeVatsimAtis(a) {
  return {
    callsign: a.callsign,
    frequency: a.frequency != null ? String(a.frequency) : null,
    facility: 'ATIS',
    rating: 'ATIS',
    atisText: Array.isArray(a.text_atis) ? a.text_atis.join(' | ') : null,
    atisCode: a.atis_code || null,
    logonTime: a.logon_time || null,
    raw: a,
  };
}

// ── Normalisation IVAO ──────────────────────────────────────────────────────
const IVAO_POSITIONS = {
  DEL: 'DEL', GND: 'GND', TWR: 'TWR', APP: 'APP', DEP: 'DEP', CTR: 'CTR', FSS: 'FSS', ATIS: 'ATIS',
};

function normalizeIvaoAtc(a) {
  const pos = normalizeToken(a.atcSession?.position);
  return {
    callsign: a.callsign,
    frequency: a.atcSession?.frequency != null ? String(a.atcSession.frequency) : null,
    facility: IVAO_POSITIONS[pos] || 'OTHER',
    rating: `${a.rating ?? '?'}`,
    atisText: Array.isArray(a.atis?.lines) ? a.atis.lines.join(' | ') : null,
    atisCode: a.atis?.revision || null,
    logonTime: a.createdAt || null,
    raw: a,
  };
}

function normalizeIvaoPilot(p) {
  return {
    callsign: p.callsign,
    latitude: p.lastTrack?.latitude,
    longitude: p.lastTrack?.longitude,
    altitudeFt: p.lastTrack?.altitude,
    groundSpeed: p.lastTrack?.groundSpeed,
    aircraft: p.flightPlan?.aircraft?.icaoCode || null,
    departure: p.flightPlan?.departureId || null,
    arrival: p.flightPlan?.arrivalId || null,
    raw: p,
  };
}

// ── Chargement des flux ─────────────────────────────────────────────────────
async function getVatsim() {
  const data = await getJSON(VATSIM_URL, { ttlMs: FEED_TTL_MS });
  const atcs = [
    ...(data.controllers || [])
      .filter((c) => c.facility !== 0) // exclure les observateurs
      .map(normalizeVatsimAtc),
    ...(data.atis || []).map(normalizeVatsimAtis),
  ];
  const pilots = (data.pilots || []).map(normalizeVatsimPilot);
  return { atcs, pilots, updatedAt: data.general?.update_timestamp || null };
}

async function getIvao() {
  const data = await getJSON(IVAO_URL, { ttlMs: FEED_TTL_MS });
  const atcs = (data.clients?.atcs || []).map(normalizeIvaoAtc);
  const pilots = (data.clients?.pilots || []).map(normalizeIvaoPilot);
  return { atcs, pilots, updatedAt: data.updatedAt || null };
}

export function getFeed(network) {
  return network === 'ivao' ? getIvao() : getVatsim();
}

// ── Analyse d'une position réseau pour un aéroport donné ────────────────────
const COVERAGE_ORDER = ['DEL', 'GND', 'TWR', 'ATIS', 'APP', 'DEP', 'CTR', 'FSS'];

export function analyzeNetwork(feed, airport, { radiusKm = 50 } = {}) {
  const { atcs, pilots } = feed;
  const icao = airport.icao.toUpperCase();

  const matching = atcs.filter((a) => matchesCallsign(a.callsign, icao));
  const byFacility = {};
  for (const a of matching) {
    (byFacility[a.facility] ||= []).push(a);
  }

  const coverage = COVERAGE_ORDER.map((f) => {
    const list = byFacility[f] || [];
    return {
      facility: f,
      online: list.length > 0,
      entries: list.map((a) => ({ callsign: a.callsign, frequency: a.frequency, rating: a.rating })),
    };
  });

  // CTR/FSS « englobants » : suffixe _CTR/_FSS qui matche l'indicatif…
  const namedOverlying = matching.filter((a) => ['CTR', 'FSS'].includes(a.facility));
  // …plus, en secours géographique, tout CTR/FSS dans un rayon généreux.
  const geoOverlying = atcs
    .filter((a) => ['CTR', 'FSS'].includes(a.facility) && !namedOverlying.includes(a))
    .map((a) => ({ a, km: distanceTo(a.raw, airport) }))
    .filter((x) => Number.isFinite(x.km) && x.km <= 300)
    .sort((x, y) => x.km - y.km)
    .map((x) => x.a)
    .slice(0, 4);

  const overlying = [...namedOverlying, ...geoOverlying].slice(0, 5);

  const nearby = pilots
    .map((p) => ({ p, km: haversineKm(airport.lat, airport.lon, p.latitude, p.longitude) }))
    .filter((x) => Number.isFinite(x.km) && x.km <= radiusKm)
    .sort((x, y) => x.km - y.km)
    .map(({ p, km }) => ({
      callsign: p.callsign,
      aircraft: p.aircraft,
      departure: p.departure,
      arrival: p.arrival,
      groundSpeed: p.groundSpeed,
      altitudeFt: p.altitudeFt,
      distanceKm: Math.round(km),
      distanceNm: Math.round(kmToNm(km)),
    }));

  const atis = matching.find((a) => a.facility === 'ATIS') || null;

  return { icao, coverage, overlying, nearby, atis };
}

function distanceTo(rawAtc, airport) {
  // IVAO : lastTrack ; VATSIM v3 n'expose plus de coordonnées pour les ATC.
  const lat = rawAtc?.lastTrack?.latitude ?? rawAtc?.latitude;
  const lon = rawAtc?.lastTrack?.longitude ?? rawAtc?.longitude;
  return haversineKm(airport.lat, airport.lon, lat, lon);
}

// ── Rendu texte (partagé VATSIM / IVAO) ─────────────────────────────────────
const CHECK = { true: '✅', false: '❌' };

export function formatCoverage(coverage) {
  return coverage
    .map((c) => {
      const first = c.entries[0];
      const detail = c.online
        ? ` \`${first.frequency ?? '?'}\`${c.entries.length > 1 ? ` (+${c.entries.length - 1})` : ''}`
        : '';
      return `${CHECK[c.online]} **${c.facility}**${detail}`;
    })
    .join('\n');
}

export function formatOverlying(overlying) {
  if (!overlying.length) return '_Aucun secteur englobant en ligne_';
  return overlying
    .map((a) => `${CHECK.true} **${a.facility}** \`${a.callsign}\`${a.frequency ? ` \`${a.frequency}\`` : ''}`)
    .join('\n');
}

export function formatNearby(nearby, { max = 10 } = {}) {
  if (!nearby.length) return '_Aucun pilote dans le rayon_';
  return nearby
    .slice(0, max)
    .map(
      (p) =>
        `• \`${p.callsign}\` ${p.aircraft || ''} — ${p.departure || '?'}→${p.arrival || '?'} — ${
          p.groundSpeed ?? '?'
        } kt — ${p.distanceNm} NM`
    )
    .join('\n');
}

// Décodage prudent de la première ligne METAR d'un ATIS.
export function decodeAtis(atisText) {
  if (!atisText) return null;
  const parts = atisText.split(' | ').map((s) => s.trim());
  const metarLine = parts.find((s) => /^\s*METAR\b/i.test(s) || /^\s*[A-Z]{4}\s\d{6}Z/.test(s));
  const metarDecoded = metarLine ? decodeMetar(metarLine.replace(/^METAR\s+/i, '')) : null;
  const infoLine = parts.find((s) => /INFO\s+[A-Z]\b/i.test(s) || /ATIS\s+[A-Z]\b/i.test(s));
  return {
    info: infoLine || parts[0] || null,
    metarDecoded: metarDecoded ? [metarDecoded.wind, metarDecoded.visibility, metarDecoded.qnh].filter(Boolean).join(' · ') : null,
    raw: parts.join('\n'),
  };
}

export default { getFeed, analyzeNetwork, formatCoverage, formatOverlying, formatNearby, decodeAtis };
