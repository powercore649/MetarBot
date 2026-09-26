// ── FlightUtilities — Enregistrement des slash commands ──────────────────────
// `npm run deploy` — global par défaut ; instantané si DISCORD_GUILD_ID est défini.
import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { COMMANDS } from './commands.js';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error('❌ DISCORD_TOKEN et DISCORD_CLIENT_ID requis dans .env (voir .env.example)');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

try {
  console.log(`📡 Enregistrement de ${COMMANDS.length} commandes slash…`);
  const data = guildId
    ? await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: COMMANDS })
    : await rest.put(Routes.applicationCommands(clientId), { body: COMMANDS });
  console.log(`✅ ${data.length} commande(s) enregistrée(s) ${guildId ? `sur le serveur ${guildId}` : 'globalement (propagation < 1 h)'} `.trim());
} catch (err) {
  console.error('❌ Échec de l’enregistrement :', err);
  process.exit(1);
}
