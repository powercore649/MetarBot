// ── FlightUtilities — /help ──────────────────────────────────────────────────
import { baseEmbed, COLORS, DISCLAIMER } from '../ui/embeds.js';
import { sendEmbed } from '../ui/errors.js';

export async function handleHelp(interaction) {
  const embed = baseEmbed(COLORS.help)
    .setTitle('🛫 FlightUtilities — Aide')
    .setDescription(
      [
        'Outils aviation pour la simulation de vol (MSFS, X-Plane, P3D, VATSIM/IVAO).',
        '',
        `⚠️ **${DISCLAIMER.replace('⚠️ ', '')}**`,
      ].join('\n')
    )
    .addFields(
      {
        name: '🌤️ Météo',
        value: [
          '**/metar** — Dernier METAR (`mode: formatted | raw | both`)',
          '**/taf** — Dernier TAF de la station',
        ].join('\n'),
      },
      {
        name: '🏙️ Aéroports',
        value: ['**/airport** — Fiche complète : pistes, fréquences, coordonnées'].join('\n'),
      },
      {
        name: '🎧 Réseaux en ligne',
        value: [
          '**/vatsim** — ATC en ligne, ATIS, pilotes proches (VATSIM)',
          '**/ivao** — Idem, via le flux IVAO Whazzup',
          'Options : `atis: decoded | raw | hidden`, `rayon_km: 5–150`',
        ].join('\n'),
      },
      {
        name: '🔗 Sources',
        value: 'NOAA aviationweather.gov · data.vatsim.net · api.ivao.aero · OurAirports',
      }
    );

  return sendEmbed(interaction, { embeds: [embed] });
}

export default { handleHelp };
