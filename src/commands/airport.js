// ── FlightUtilities — /airport ───────────────────────────────────────────────
import { baseEmbed, COLORS } from '../ui/embeds.js';
import { errorEmbed, sendEmbed } from '../ui/errors.js';
import { getAirport, formatRunways, formatFrequencies, airportTypeLabel } from '../services/airports.js';

export async function handleAirport(interaction) {
  await interaction.deferReply();
  try {
    const code = interaction.options.getString('code', true);
    const ap = await getAirport(code);

    if (!ap) {
      return sendEmbed(interaction, {
        embeds: [errorEmbed(`Aéroport \`${code.toUpperCase()}\` introuvable`, "Vérifiez le code ICAO (ou IATA). Les aérodromes très modestes peuvent être absents de la base.")],
      });
    }

    const coordTxt =
      Number.isFinite(ap.lat) && Number.isFinite(ap.lon)
        ? `${ap.lat.toFixed(4)}, ${ap.lon.toFixed(4)}`
        : '—';
    const elevTxt = Number.isFinite(ap.elevFt) ? `${Math.round(ap.elevFt)} ft (${Math.round(ap.elevFt * 0.3048)} m)` : '—';

    const embed = baseEmbed(COLORS.airport).setTitle(`🏙️ ${ap.name} — ${ap.icao}`);
    embed.setDescription(
      [
        `**Type** : ${airportTypeLabel(ap.type)}`,
        `**Ville** : ${ap.municipality || '—'}${ap.region ? ` (${String(ap.region).split('-').pop()})` : ''}`,
        `**Pays** : ${ap.country || '—'}${ap.iata ? ` · **IATA** : ${ap.iata}` : ''}`,
        `**Coordonnées** : ${coordTxt}`,
        `**Altitude terrain** : ${elevTxt}`,
        `_Source : ${ap.source}_`,
      ].join('\n')
    );

    const rwys = formatRunways(ap.runways);
    if (rwys.length) {
      embed.addFields({ name: `🛬 Pistes (${ap.runways.length})`, value: rwys.join('\n').slice(0, 1024) });
    }

    const freqs = formatFrequencies(ap.frequencies);
    if (freqs.length) {
      embed.addFields({ name: '📻 Fréquences', value: freqs.join('\n').slice(0, 1024) });
    }

    return sendEmbed(interaction, { embeds: [embed] });
  } catch (err) {
    console.error('[airport]', err);
    return sendEmbed(interaction, {
      embeds: [errorEmbed('Impossible de récupérer les infos aéroport', `\`${err.message}\``)],
    });
  }
}

export default { handleAirport };
