// ── FlightUtilities — Réponses d'erreur uniformes ────────────────────────────
import { EmbedBuilder } from 'discord.js';
import { COLORS, FOOTER_TEXT } from './embeds.js';

export function errorEmbed(title, detail = null) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.error)
    .setTitle(`❌ ${title}`)
    .setFooter({ text: FOOTER_TEXT })
    .setTimestamp(new Date());
  if (detail) embed.setDescription(detail);
  return embed;
}

// Répondre ou suivre avec un embed, en gérant les réponses déjà envoyées.
export async function sendEmbed(interaction, payload) {
  const data = typeof payload === 'function' ? payload() : payload;
  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(data);
  }
  return interaction.reply(data);
}

export default { errorEmbed, sendEmbed };
