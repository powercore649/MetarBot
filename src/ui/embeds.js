// ── FlightUtilities — Pied de page et couleurs d'embeds ──────────────────────
import { EmbedBuilder } from 'discord.js';

export const BRAND = 'FlightUtilities';
export const BRAND_ICON = '🛫';

export const DISCLAIMER = '⚠️ Simulation uniquement — ne pas utiliser pour des opérations aériennes réelles.';

export const COLORS = {
  metar: 0x3b82f6,
  airport: 0x10b981,
  network: 0x8b5cf6,
  help: 0xf59e0b,
  error: 0xef4444,
};

export const FOOTER_TEXT = `${BRAND_ICON} ${BRAND} · ${DISCLAIMER}`;

export function baseEmbed(color) {
  return new EmbedBuilder()
    .setColor(color ?? COLORS.metar)
    .setFooter({ text: FOOTER_TEXT })
    .setTimestamp(new Date());
}

export default { BRAND, DISCLAIMER, COLORS, FOOTER_TEXT, baseEmbed };
