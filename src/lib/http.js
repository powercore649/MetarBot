// ── FlightUtilities — Client HTTP avec timeout, retry et cache ───────────────
// - getJSON / getText avec timeout court (AbortController)
// - 1 retry après 250 ms sur les erreurs réseau / HTTP 5xx
// - cache mémoire TTL via lib/cache (aucune donnée personnelle stockée)
import * as cache from './cache.js';

const DEFAULT_TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 250;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchOnce(url, { timeoutMs, headers } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'FlightUtilitiesDiscordBot/1.0 (simulation only)', ...headers },
      redirect: 'follow',
    });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status} ${res.statusText} — ${url}`);
      err.status = res.status;
      err.retryable = res.status >= 500 || res.status === 429;
      throw err;
    }
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchRetry(url, opts = {}) {
  try {
    return await fetchOnce(url, opts);
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Délai dépassé (${opts.timeoutMs ?? DEFAULT_TIMEOUT_MS} ms) — ${url}`);
    }
    if (err.retryable) {
      await sleep(RETRY_DELAY_MS);
      return fetchOnce(url, opts); // dernier essai, laisse remonter l'erreur
    }
    throw err;
  }
}

export async function getText(url, opts = {}) {
  const { ttlMs = 0, ...fetchOpts } = opts;
  if (ttlMs > 0) {
    const hit = cache.get(`text:${url}`);
    if (hit !== undefined) return hit;
    const text = await (await fetchRetry(url, fetchOpts)).text();
    return cache.set(`text:${url}`, text, ttlMs);
  }
  return (await fetchRetry(url, fetchOpts)).text();
}

export async function getJSON(url, opts = {}) {
  const { ttlMs = 0, ...fetchOpts } = opts;
  if (ttlMs > 0) {
    const hit = cache.get(`json:${url}`);
    if (hit !== undefined) return hit;
    const text = await (await fetchRetry(url, fetchOpts)).text();
    // Certaines API (NOAA) répondent avec un corps vide (ex. ICAO inconnu).
    const json = text.trim() ? JSON.parse(text) : null;
    return ttlMs > 0 ? cache.set(`json:${url}`, json, ttlMs) : json;
  }
  const text = await (await fetchRetry(url, fetchOpts)).text();
  return text.trim() ? JSON.parse(text) : null;
}

export function isAbortError(err) {
  return err && (err.name === 'AbortError' || /Délai dépassé/.test(String(err.message)));
}

export default { getText, getJSON, isAbortError };
