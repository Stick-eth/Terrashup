import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { stop, hasQueue } from './utils/queueManager.js';
import { generateDependencyReport } from '@discordjs/voice';

const PREFIX = 'mimou ';
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions
  ]
});

// Chargement dynamique des commandes depuis ./commands et ses sous-dossiers
client.commands = new Collection();
const commandsRoot = path.resolve('./commands');

async function loadCommands(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await loadCommands(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      const fileURL = pathToFileURL(fullPath).href;
      const { name, description, execute } = await import(fileURL);
      client.commands.set(name, { description, execute });
    }
  }
}

await loadCommands(commandsRoot);

client.once('ready', () => {
  console.log(`✅ Connecté`);
});

// Gère le cas où le bot est kick du vocal
client.on('voiceStateUpdate', (oldState, newState) => {
  if (oldState.member.id !== client.user.id) return;
  if (oldState.channelId && !newState.channelId) {
    const guildId = oldState.guild.id;
    if (hasQueue(guildId)) {
      stop(guildId);
      const sysChannel = oldState.guild.systemChannel;
      if (sysChannel) {
        sysChannel.send(
          '⚠️ J’ai été déconnecté du salon vocal : arrêt de la lecture et vidage de la queue.'
        );
      }
    }
  }
});

client.on('messageCreate', async message => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const [ cmd, ...args ] = message.content
    .slice(PREFIX.length)
    .trim()
    .split(/\s+/);

  const command = client.commands.get(cmd);
  if (!command) return;

  try {
    await command.execute(message, args);
  } catch (err) {
    console.error(err);
    message.reply('❌ Une erreur est survenue lors de l’exécution de la commande.');
  }
});

// console.log(generateDependencyReport()); // Affiche les dépendances de @discordjs/voice
client.login(process.env.DISCORD_TOKEN);
