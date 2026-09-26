// ── FlightUtilities — Décodeur METAR (formaté lisible) ───────────────────────
// Traduction française des groupes METAR usuels. Ne remplace jamais
// le texte brut : affiché en complément (`/metar mode:raw` ou `both`).

const CLOUD_COVER = {
  SKC: 'Ciel dégagé',
  NSC: 'Aucun nuage significatif',
  NCD: 'Aucun nuage détecté',
  CLR: 'Ciel clair (aucun en dessous de 12 000 ft)',
  FEW: 'Peu (1–2 octas)',
  SCT: 'Éparpillés (3–4 octas)',
  BKN: 'Fragmentés (5–7 octas)',
  OVC: 'Couvert (8 octas)',
};

const CLOUD_MEANINGS = { CB: 'cumulonimbus', TCU: 'cumulus bourgeonnant' };

const WX_DESCRIPTORS = {
  MI: 'peu étendus',
  BC: 'par bandes',
  PR: 'partiels',
  DR: 'dérive basse',
  BL: 'basse couche soulevée',
  SH: 'averses',
  TS: 'orage',
  FZ: 'surgelés',
};

const WX_PHENOMENA = {
  DZ: 'bruine',
  RA: 'pluie',
  SN: 'neige',
  SG: 'neige en grains',
  IC: 'cristaux de glace',
  PL: 'grésil',
  GR: 'grêle',
  GS: 'petit grésil',
  UP: 'précipitations inconnues',
  BR: 'brume',
  FG: 'brouillard',
  FU: 'fumée',
  VA: 'cendres volcaniques',
  DU: 'poussières',
  SA: 'sable',
  HZ: 'brume sèche',
  PY: 'spray',
  PO: 'tourbillons de poussière',
  SQ: 'grain',
  FC: 'trombe / tornado',
  SS: 'tempête de sable',
  DS: 'tempête de poussière',
};

const INTENSITY = { '-': 'légers', '+': 'forts', VC: 'au voisinage' };

const TREND_CHANGE = { NOSIG: 'Pas de changement significatif', TEMPO: 'Temporaire', BECMG: 'Évolution' };

const ALL_WX_CODES = new Set([
  ...Object.keys(WX_DESCRIPTORS),
  ...Object.keys(WX_PHENOMENA),
  ...Object.keys(INTENSITY),
]);

const DASH = '—';

// "261530Z" → "le 26 à 15:30 UTC"
function decodeTime(tok) {
  const m = /^(\d{2})(\d{2})(\d{2})Z$/.exec(tok);
  if (!m) return null;
  return `le ${m[1]} à ${m[2]}:${m[3]} UTC`;
}

// "24012G25KT" / "VRB03KT" / "/////KT" → objet
function decodeWind(tok) {
  const m = /^(\d{3}|VRB|\/\/\/)(\d{2,3}|\/\/)(?:G(\d{2,3}|\/\/))?(KT|MPS|KMH)$/.exec(tok);
  if (!m) return null;
  const [, dir, spd, gust, unit] = m;
  const unitLabel = unit === 'KT' ? 'kt' : unit === 'MPS' ? 'm/s' : 'km/h';
  const dirLabel = dir === 'VRB' ? 'variable' : /^\d+$/.test(dir) ? `${dir}°` : DASH;
  const spdLabel = /^\d+$/.test(spd) ? `${spd} ${unitLabel}` : DASH;
  const gustLabel =
    gust != null ? (/^\d+$/.test(gust) ? `, rafales ${gust} ${unitLabel}` : '') : '';
  return { text: `Vent ${dirLabel} à ${spdLabel}${gustLabel}` };
}

// "9999", "8000", "10SM", "1/2SM", "P6SM" → lisible
function decodeVisibility(tok, unitIsSM) {
  if (unitIsSM) {
    // P6SM → « 6 SM ou plus » (convention US)
    if (/^P\d+SM$/.test(tok)) return `≥ ${tok.slice(1, -2)} SM`;
    const frac = /^(\d+)?\s?(M)?(\d+)\/(\d+)SM$/.exec(tok);
    if (frac) {
      const [, whole, minus, num, den] = frac;
      const prefix = [whole, minus ? 'moins de' : ''].filter(Boolean).join(' ');
      return `${prefix ? `${prefix} ` : ''}${num}/${den} SM`;
    }
    const whole = /^(\d+)SM$/.exec(tok);
    if (whole) return `${whole[1]} SM`;
    return null;
  }
  const m = /^(\d{4})(?:NDV)?$/.exec(tok);
  if (!m) return null;
  const meters = Number(m[1]);
  if (meters === 9999) return '≥ 10 km';
  if (meters >= 1000 && meters % 1000 === 0) return `${meters / 1000} km`;
  return `${meters} m`;
}

function decodeRvr(tok) {
  const m = /^R(\d{2}[LRC]?)\/([MP])?(\d{4})(?:V(\d{4}))?(?:FT|N)?(?:D|U|N)?$/.exec(tok);
  if (!m) return null;
  const [, runway, trend, min, max] = m;
  const rwy = runway.replace(/([LRC])$/, ' $1');
  let text = `RVR piste ${rwy} : ${min} ft`;
  if (max) text += ` à ${max} ft`;
  if (trend === 'P') text += ' (en hausse, > valeur affichée)';
  if (trend === 'M') text += ' (en baisse, < valeur affichée)';
  return text;
}

// "TSRA", "-SHSNRA", "+TSRA", "VCSH"
function decodeWeatherGroup(tok) {
  let rest = tok;
  let intensity = '';
  for (const key of ['VC', '-', '+']) {
    if (rest.startsWith(key)) {
      intensity = INTENSITY[key];
      rest = rest.slice(key.length);
      break;
    }
  }
  const bits = [];
  let i = 0;
  while (i < rest.length) {
    const two = rest.slice(i, i + 2);
    if (WX_DESCRIPTORS[two]) {
      bits.push(WX_DESCRIPTORS[two]);
      i += 2;
      continue;
    }
    if (WX_PHENOMENA[two]) {
      bits.push(WX_PHENOMENA[two]);
      i += 2;
      continue;
    }
    return null; // groupe inconnu → ne rien afficher plutôt que du faux
  }
  if (!bits.length) return null;
  return `${intensity ? `${intensity} : ` : ''}${bits.join(' + ')}`;
}

// "SCT034CB", "BKN260", "OVC008", "VV002", "FEW018///"
function decodeCloudGroup(tok) {
  let m = /^(SKC|NSC|NCD|CLR)$/.exec(tok);
  if (m) return CLOUD_COVER[m[1]];
  m = /^(VV)(\d{3}|\/\/)/.exec(tok);
  if (m) {
    const base = /^\d+$/.test(m[2]) ? Number(m[2]) * 100 : null;
    return `Verticale visibilité ${base != null ? `${base} ft` : 'non renseignée'}`;
  }
  m = /^(FEW|SCT|BKN|OVC)(\d{3}|\/\/)(?:\/\/|([A-Z]{2}))?$/.exec(tok);
  if (m) {
    const [, cover, baseTok, type] = m;
    const base = /^\d+$/.test(baseTok) ? Number(baseTok) * 100 : null;
    let text = `${CLOUD_COVER[cover]}${base != null ? ` à ${base} ft` : ''}`;
    if (type && CLOUD_MEANINGS[type]) text += ` (${CLOUD_MEANINGS[type]})`;
    return text;
  }
  return null;
}

export function decodeMetar(raw) {
  const body = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!body) return null;

  const parts = body.split(' ');
  const decoded = {
    icao: /^\w{3,4}$/.test(parts[1] ?? '') ? parts[1] : null,
    time: null,
    wind: null,
    cavok: false,
    visibility: null,
    rvr: [],
    weather: [],
    clouds: [],
    temp: null,
    dewpoint: null,
    qnh: null,
    trend: null,
  };

  let i = decoded.icao ? 2 : 1;
  let visInSM = false;

  for (; i < parts.length; i++) {
    const tok = parts[i];
    if (tok === 'RMK') break;
    if (tok === 'CAVOK') {
      decoded.cavok = true;
      continue;
    }
    if (!decoded.time) {
      const t = decodeTime(tok);
      if (t) {
        decoded.time = t;
        continue;
      }
    }
    if (!decoded.wind) {
      const w = decodeWind(tok);
      if (w) {
        decoded.wind = w.text;
        continue;
      }
    }
    // Visibilité en miles terrestres (US) : "10SM", "P6SM", "M1/4SM", "1/2SM"…
    // Cas particulier "1 1/2SM" : l'entier arrive comme token précédent.
    if (/^[PM]?\d+(?:\/\d+)?SM$/.test(tok)) {
      visInSM = true;
      const prevIsWhole = /^\d$/.test(parts[i - 1] || '') && /^\d\/\dSM$/.test(tok);
      const v = prevIsWhole ? `${parts[i - 1]} ${tok}` : decodeVisibility(tok, true);
      if (v && !decoded.visibility) decoded.visibility = v;
      continue;
    }
    if (/^\d{4}(NDV)?$/.test(tok) || tok === '////') {
      const v = decodeVisibility(tok, false);
      if (v && !decoded.visibility) decoded.visibility = v;
      continue;
    }
    if (/^R\d{2}[LRC]?\//.test(tok)) {
      const r = decodeRvr(tok);
      if (r) decoded.rvr.push(r);
      continue;
    }
    if (ALL_WX_CODES.has(tok.slice(0, 2)) || /^[-+]/.test(tok)) {
      const w = decodeWeatherGroup(tok);
      if (w) decoded.weather.push(w);
      continue;
    }
    const trendKey = Object.keys(TREND_CHANGE).find((k) => tok === k || tok.startsWith(`${k} `));
    if (trendKey) {
      decoded.trend = TREND_CHANGE[trendKey];
      continue;
    }
    const tempM = /^(M?\d{2})\/(M?\d{2})?$/.exec(tok);
    if (tempM && decoded.temp == null) {
      const toC = (t) => (t.startsWith('M') ? -Number(t.slice(1)) : Number(t));
      decoded.temp = `${toC(tempM[1])}°C`;
      if (tempM[2]) decoded.dewpoint = `${toC(tempM[2])}°C`;
      continue;
    }
    const qnhM = /^Q(\d{4})$/.exec(tok) || /^A(\d{4})$/.exec(tok);
    if (qnhM && decoded.qnh == null) {
      decoded.qnh =
        tok.startsWith('Q')
          ? `${Number(qnhM[1])} hPa`
          : `${Number(qnhM[1]) / 100} inHg`;
      continue;
    }
    const cloud = decodeCloudGroup(tok);
    if (cloud) decoded.clouds.push(cloud);
  }

  // ignore unused flag (kept for clarity if format evolves)
  void visInSM;

  return decoded;
}

// TAF lisible : groupe de base + évolutions FM/BECMG/TEMPO
export function formatTaf(raw) {
  const body = String(raw || '').replace(/\s+/g, ' ').trim();
  if (!body) return null;
  const tokens = body.split(' ');
  let idx = 0;
  if (/^TAF$/i.test(tokens[0] || '')) idx = 1;
  if (/^[A-Z]{4}$/i.test(tokens[idx] || '')) idx++;
  if (/^\d{6}Z$/i.test(tokens[idx] || '')) idx++;
  if (/^\d{4}\/\d{4}$/i.test(tokens[idx] || '')) idx++;
  const rest = tokens.slice(idx).join(' ');
  if (!rest) return null;
  const segments = rest.split(/\s+(?=FM\d{6,10}\b|BECMG\b|TEMPO\b)/g);
  const label = (s) =>
    s.startsWith('FM')
      ? `📌 À partir du ${s.slice(2, 4)} ${s.slice(4, 6)}:${s.slice(6, 8)}Z`
      : s.startsWith('BECMG')
        ? '🔄 Évolution progressive (BECMG)'
        : '⏱️ Temporaire (TEMPO)';
  const lines = [`**Base** : ${segments[0]}`];
  for (const seg of segments.slice(1)) lines.push(`${label(seg.trim())} : ${seg.trim()}`);
  return lines.join('\n');
}

export function formatMetar(decoded, { stationName } = {}) {  if (!decoded) return null;
  const lines = [];
  if (stationName) lines.push(`📍 ${stationName}`);
  if (decoded.icao) lines.push(`**Station** : ${decoded.icao}${decoded.time ? ` — obs. ${decoded.time}` : ''}`);
  else if (decoded.time) lines.push(`**Observation** : ${decoded.time}`);

  if (decoded.cavok) {
    lines.push('**CAVOK** : plafond & visibilité OK, aucun nuage significatif sous 5 000 ft (CAA/1 500 ft QNH), aucun temps significatif');
  } else {
    if (decoded.wind) lines.push(`💨 ${decoded.wind}`);
    if (decoded.visibility) lines.push(`👁️ Visibilité : ${decoded.visibility}`);
    for (const r of decoded.rvr) lines.push(`🛬 ${r}`);
    if (decoded.weather.length) lines.push(`🌧️ Temps : ${decoded.weather.join(' · ')}`);
    if (decoded.clouds.length) lines.push(`☁️ Nuages : ${decoded.clouds.join(' · ')}`);
    else if (!decoded.cavok) lines.push(`☁️ Nuages : non renseignés (${DASH})`);
  }

  const temps = [];
  if (decoded.temp) temps.push(`Température ${decoded.temp}`);
  if (decoded.dewpoint) temps.push(`point de rosée ${decoded.dewpoint}`);
  if (temps.length) lines.push(`🌡️ ${temps.join(' · ')}`);
  if (decoded.qnh) lines.push(`🧭 QNH : ${decoded.qnh}`);
  if (decoded.trend) lines.push(`🔄 ${decoded.trend}`);

  return lines.join('\n');
}

export const FLIGHT_CATEGORY = {
  LIFR: '🔴 LIFR',
  IFR: '🔴 IFR',
  MVFR: '🟦 MVFR',
  VFR: '🟩 VFR',
};

export default { decodeMetar, formatMetar, FLIGHT_CATEGORY };
