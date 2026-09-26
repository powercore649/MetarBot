// ── FlightUtilities — /vatsim et /ivao (logique partagée) ────────────────────
import { baseEmbed, COLORS } from '../ui/embeds.js';
import { errorEmbed, sendEmbed } from '../ui/errors.js';
import { getAirport } from '../services/airports.js';
import { getFeed, analyzeNetwork, formatCoverage, formatOverlying, formatNearby, decodeAtis } from '../services/networks.js';

const NETWORK_LABEL = { vatsim: 'VATSIM', ivao: 'IVAO' };

export async function handleNetwork(interaction, network) {
  await interaction.deferReply();
  try {
    const icao = interaction.options.getString('icao', true);
    const atisMode = interaction.options.getString('atis') || 'decoded';
    const radiusKm = interaction.options.getInteger('rayon_km') || 30;

    const airport = await getAirport(icao);
    if (!airport) {
      return sendEmbed(interaction, {
        embeds: [errorEmbed(`Aéroport \`${icao.toUpperCase()}\` introuvable`, 'Vérifiez le code ICAO.')],
      });
    }

    const feed = await getFeed(network);
    const analysis = analyzeNetwork(feed, airport, { radiusKm });

    const embed = baseEmbed(COLORS.network)
      .setTitle(`🎧 ${NETWORK_LABEL[network]} — ${airport.icao}`)
      .setDescription(`**${airport.name}**${airport.municipality ? ` — ${airport.municipality}` : ''}`);

    // Couverture locale
    embed.addFields({ name: '📻 Couverture', value: formatCoverage(analysis.coverage).slice(0, 1024) });

    // Secteurs englobants (CTR / FSS)
    embed.addFields({
      name: '🛰️ Secteurs englobants (CTR / FSS)',
      value: formatOverlying(analysis.overlying).slice(0, 1024),
    });

    // ATIS
    const atisStation = analysis.atis;
    let atisValue;
    if (atisMode === 'hidden' || !atisStation) {
      atisValue = atisMode === 'hidden' ? '_masqué_' : '_Aucun ATIS en ligne_';
    } else {
      const decoded = decodeAtis(atisStation.atisText);
      const code = atisStation.atisCode ? ` (info ${atisStation.atisCode})` : '';
      if (atisMode === 'raw') {
        atisValue = `\`\`\`\n${(decoded?.raw || atisStation.atisText || '').slice(0, 900)}\n\`\`\``;
      } else {
        atisValue = [
          `**Info** : ${decoded?.info || '—'}${code}`,
          decoded?.metarDecoded ? `**Météo** : ${decoded.metarDecoded}` : null,
        ]
          .filter(Boolean)
          .join('\n');
      }
    }
    embed.addFields({ name: '📡 ATIS', value: atisValue.slice(0, 1024) });

    // Pilotes proches
    const nearbyTxt = formatNearby(analysis.nearby, { max: 10 });
    embed.addFields({
      name: `✈️ Pilotes à proximité (rayon ${radiusKm} km — ${analysis.nearby.length})`,
      value: nearbyTxt.slice(0, 1024),
    });

    const onlineCount = analysis.coverage.filter((c) => c.online).length;
    embed.addFields({
      name: '📊 Résumé',
      value: `**${onlineCount}** position(s) locale(s) · **${analysis.overlying.length}** secteur(s) englobant(s) · **${analysis.nearby.length}** pilote(s)`,
    });

    return sendEmbed(interaction, { embeds: [embed] });
  } catch (err) {
    console.error(`[${network}]`, err);
    return sendEmbed(interaction, {
      embeds: [errorEmbed(`Impossible de récupérer les données ${NETWORK_LABEL[network]}`, `\`${err.message}\``)],
    });
  }
}

export default { handleNetwork };
