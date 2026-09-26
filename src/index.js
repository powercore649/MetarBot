// ── FlightUtilities — Point d'entrée ─────────────────────────────────────────
import 'dotenv/config';
import { Client, GatewayIntentBits, Events, ActivityType } from 'discord.js';
import { runCommand } from './dispatch.js';

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('❌ DISCORD_TOKEN manquant — créez un fichier .env (voir .env.example).');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (c) => {
  console.log(`✅ ${c.user.tag} connecté — ${c.guilds.cache.size} serveur(s)`);
  c.user.setPresence({
    activities: [{ name: 'la simulation · /help', type: ActivityType.Watching }],
    status: 'online',
  });
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  try {
    await runCommand(interaction);
  } catch (err) {
    console.error(`[${interaction.commandName}]`, err);
    const payload = {
      content: '❌ Une erreur inattendue est survenue.',
      ephemeral: true,
    };
    try {
      if (interaction.deferred || interaction.replied) await interaction.editReply(payload);
      else await interaction.reply(payload);
    } catch {
      /* l'interaction a peut-être expiré */
    }
  }
});

process.on('unhandledRejection', (reason) => console.error('unhandledRejection:', reason));
process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err);
  process.exit(1);
});

client.login(token);
