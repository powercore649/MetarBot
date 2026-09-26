// ── FlightUtilities — Cache TTL mémoire ──────────────────────────────────────
// Cache clé → { valeur, expireÀ }. Les entrées périmées sont élaguées
// au fil de l'eau ; un intervalle global purge au moins une fois par heure.
const store = new Map();
let interval = null;
const MS_HOUR = 60 * 60 * 1000;

function ensureInterval() {
  if (!interval) {
    interval = setInterval(() => {
      const now = Date.now();
      for (const [k, v] of store) if (v.expireAt <= now) store.delete(k);
    }, MS_HOUR);
    interval.unref?.();
  }
}

export function set(key, value, ttlMs) {
  ensureInterval();
  store.set(key, { value, expireAt: Date.now() + ttlMs });
  return value;
}

export function get(key) {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expireAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

export function has(key) {
  return get(key) !== undefined;
}

export function clear() {
  store.clear();
}

export function getOrSet(key, ttlMs, producer) {
  const existing = get(key);
  if (existing !== undefined) return Promise.resolve(existing);
  return Promise.resolve()
    .then(producer)
    .then((value) => set(key, value, ttlMs));
}

export default { set, get, has, clear, getOrSet };
