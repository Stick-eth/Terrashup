import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { Client, GatewayIntentBits, Collection } from 'discord.js';

const PREFIX = 'mimou ';
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// Chargement dynamique des commandes
client.commands = new Collection();
const commandsPath = path.resolve('./commands');
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const { name, execute } = await import(`./commands/${file}`);
  client.commands.set(name, execute);
}

client.once('ready', () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const [cmd, ...args] = message.content
    .slice(PREFIX.length)
    .trim()
    .split(/\s+/);

  const command = client.commands.get(cmd);
  if (!command) return;

  try {
    await command(message, args);
  } catch (err) {
    console.error(err);
    message.reply('❌ Une erreur est survenue lors de l’exécution de la commande.');
  }
});

client.login(process.env.DISCORD_TOKEN);
