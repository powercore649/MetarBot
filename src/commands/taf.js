// ── FlightUtilities — /taf ───────────────────────────────────────────────────
import { baseEmbed, COLORS } from '../ui/embeds.js';
import { errorEmbed, sendEmbed } from '../ui/errors.js';
import { getTaf } from '../services/weather.js';
import { formatTaf } from '../lib/metar.js';

export async function handleTaf(interaction) {
  await interaction.deferReply();
  try {
    const icao = interaction.options.getString('icao', true);
    const taf = await getTaf(icao);

    if (!taf) {
      return sendEmbed(interaction, {
        embeds: [errorEmbed(`Aucun TAF disponible pour \`${icao.toUpperCase()}\``, "Beaucoup d'aérodromes secondaires n'ont pas de TAF — essayez `/metar`.")],
      });
    }

    const issued = taf.issueTime ? `\n-# Émis : ${taf.issueTime}` : '';
    const formatted = formatTaf(taf.raw);
    const embed = baseEmbed(COLORS.metar).setTitle(`🌦️ TAF — ${taf.icao}`);
    if (formatted) {
      embed.setDescription(formatted);
      embed.addFields({ name: 'Brut', value: `\`\`\`\n${taf.raw}\n\`\`\`` });
    } else {
      embed.setDescription(`\`\`\`\n${taf.raw}\n\`\`\`${issued}`);
    }

    return sendEmbed(interaction, { embeds: [embed] });
  } catch (err) {
    console.error('[taf]', err);
    return sendEmbed(interaction, {
      embeds: [errorEmbed('Impossible de récupérer le TAF', `\`${err.message}\``)],
    });
  }
}

export default { handleTaf };
