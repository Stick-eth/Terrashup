import 'dotenv/config';
import fs   from 'fs';
import path from 'path';
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { stop, hasQueue } from './utils/queueManager.js';

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

// Chargement dynamique des commandes avec description
client.commands = new Collection();
const commandsPath = path.resolve('./commands');
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const { name, description, execute } = await import(`./commands/${file}`);
  client.commands.set(name, { description, execute });
}

client.once('ready', () => {
  console.log(`✅ Connecté comme ${client.user.tag}`);
});

// Écoute des changements d'état vocal pour détecter un kick du bot
client.on('voiceStateUpdate', (oldState, newState) => {
  // Ne traiter que si c'est le bot qui est affecté
  if (oldState.member.id !== client.user.id) return;

  // Si le bot était dans un salon avant et en est sorti sans en rejoindre un autre
  if (oldState.channelId && !newState.channelId) {
    const guildId = oldState.guild.id;
    if (hasQueue(guildId)) {
      stop(guildId);
      // Optionnel : prévenir dans le salon système de la guilde
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

client.login(process.env.DISCORD_TOKEN);
