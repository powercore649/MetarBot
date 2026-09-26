// ── FlightUtilities — Géodésie simple (haversine) ────────────────────────────
const R_KM = 6371;

const toRad = (d) => (d * Math.PI) / 180;

export function haversineKm(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some((v) => v == null || Number.isNaN(Number(v)))) {
    return Infinity;
  }
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export const kmToNm = (km) => km / 1.852;
export const nmToKm = (nm) => nm * 1.852;
export const mToKm = (m) => m / 1000;

export default { haversineKm, kmToNm, nmToKm, mToKm };
