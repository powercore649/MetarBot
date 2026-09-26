// ── FlightUtilities — /metar ─────────────────────────────────────────────────
import { baseEmbed, COLORS } from '../ui/embeds.js';
import { errorEmbed, sendEmbed } from '../ui/errors.js';
import { getMetar } from '../services/weather.js';
import { decodeMetar, formatMetar, FLIGHT_CATEGORY } from '../lib/metar.js';

const FLIGHT_CAT_FROM_NOAA = {
  VFR: 'VFR',
  MVFR: 'MVFR',
  IFR: 'IFR',
  LIFR: 'LIFR',
};

export async function handleMetar(interaction) {
  await interaction.deferReply();
  try {
    const icao = interaction.options.getString('icao', true);
    const mode = interaction.options.getString('mode') || 'formatted';

    const metar = await getMetar(icao);
    if (!metar) {
      return sendEmbed(
        interaction,
        { embeds: [errorEmbed(`Aucun METAR trouvé pour \`${icao.toUpperCase()}\``, "Vérifiez le code ICAO — certaines petites stations n'en publient pas.")] }
      );
    }

    const decoded = decodeMetar(metar.raw);
    const cat = FLIGHT_CAT_FROM_NOAA[metar.flightCategory] || null;
    const catLine = cat ? `${FLIGHT_CATEGORY[cat]}\n` : '';
    const formatted = formatMetar(decoded, { stationName: metar.stationName }) || metar.raw;

    const embed = baseEmbed(COLORS.metar).setTitle(`🌤️ METAR — ${metar.icao}`);

    if (mode === 'raw') {
      embed.setDescription(`\`\`\`\n${metar.raw}\n\`\`\``);
    } else {
      // formatted & both : décodage lisible + catégorie de vol
      embed.setDescription(`${catLine}${formatted}`);
      if (mode === 'both') {
        embed.addFields({ name: 'Brut', value: `\`\`\`\n${metar.raw}\n\`\`\`` });
      }
    }

    return sendEmbed(interaction, { embeds: [embed] });
  } catch (err) {
    console.error('[metar]', err);
    return sendEmbed(interaction, {
      embeds: [errorEmbed('Impossible de récupérer le METAR', `\`${err.message}\``)],
    });
  }
}

export default { handleMetar };
