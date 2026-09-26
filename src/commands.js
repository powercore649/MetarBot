// ── FlightUtilities — Définition des commandes slash ─────────────────────────
import { SlashCommandBuilder } from 'discord.js';

export const COMMANDS = [
  new SlashCommandBuilder()
    .setName('metar')
    .setDescription('🌤️ Dernier METAR (données en direct NOAA)')
    .addStringOption((o) =>
      o
        .setName('icao')
        .setDescription('Code ICAO de la station (ex. KLAX, LFPG, EGLL)')
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(7)
    )
    .addStringOption((o) =>
      o
        .setName('mode')
        .setDescription('Format d’affichage')
        .addChoices(
          { name: 'formatted', value: 'formatted' },
          { name: 'raw', value: 'raw' },
          { name: 'both', value: 'both' }
        )
    ),
  new SlashCommandBuilder()
    .setName('taf')
    .setDescription('🌦️ Dernier TAF de la station (NOAA)')
    .addStringOption((o) =>
      o
        .setName('icao')
        .setDescription('Code ICAO de la station (ex. KLAX, LFPG, EGLL)')
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(7)
    ),
  new SlashCommandBuilder()
    .setName('airport')
    .setDescription('🏙️ Informations sur un aéroport (OurAirports)')
    .addStringOption((o) =>
      o
        .setName('code')
        .setDescription('Code ICAO ou IATA (ex. YSSY, KLAX, LFPG)')
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(7)
    ),
  new SlashCommandBuilder()
    .setName('vatsim')
    .setDescription('🎧 ATC en ligne et trafic VATSIM autour d’un aéroport')
    .addStringOption((o) =>
      o
        .setName('icao')
        .setDescription('Code ICAO de l’aéroport (ex. EGLL)')
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(7)
    )
    .addStringOption((o) =>
      o
        .setName('atis')
        .setDescription('Affichage de l’ATIS')
        .addChoices(
          { name: 'decoded', value: 'decoded' },
          { name: 'raw', value: 'raw' },
          { name: 'hidden', value: 'hidden' }
        )
    )
    .addIntegerOption((o) =>
      o
        .setName('rayon_km')
        .setDescription('Rayon de recherche des pilotes en km (défaut 30, max 150)')
        .setMinValue(5)
        .setMaxValue(150)
    ),
  new SlashCommandBuilder()
    .setName('ivao')
    .setDescription('🎧 ATC en ligne et trafic IVAO autour d’un aéroport')
    .addStringOption((o) =>
      o
        .setName('icao')
        .setDescription('Code ICAO de l’aéroport (ex. LFPG)')
        .setRequired(true)
        .setMinLength(3)
        .setMaxLength(7)
    )
    .addStringOption((o) =>
      o
        .setName('atis')
        .setDescription('Affichage de l’ATIS')
        .addChoices(
          { name: 'decoded', value: 'decoded' },
          { name: 'raw', value: 'raw' },
          { name: 'hidden', value: 'hidden' }
        )
    )
    .addIntegerOption((o) =>
      o
        .setName('rayon_km')
        .setDescription('Rayon de recherche des pilotes en km (défaut 30, max 150)')
        .setMinValue(5)
        .setMaxValue(150)
    ),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('📖 Liste des commandes FlightUtilities'),
].map((c) => c.toJSON());
