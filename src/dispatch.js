// ── FlightUtilities — Routage des commandes ──────────────────────────────────
import { handleMetar } from './commands/metar.js';
import { handleTaf } from './commands/taf.js';
import { handleAirport } from './commands/airport.js';
import { handleNetwork } from './commands/network.js';
import { handleHelp } from './commands/help.js';

const HANDLERS = {
  metar: handleMetar,
  taf: handleTaf,
  airport: handleAirport,
  vatsim: (i) => handleNetwork(i, 'vatsim'),
  ivao: (i) => handleNetwork(i, 'ivao'),
  help: handleHelp,
};

export function dispatch(interaction) {
  const handler = HANDLERS[interaction.commandName];
  if (!handler) return false;
  return true;
}

export async function runCommand(interaction) {
  const handler = HANDLERS[interaction.commandName];
  if (!handler) return;
  await handler(interaction);
}

export default { dispatch, runCommand };
