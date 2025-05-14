// commands/game/loldle.js
import { EmbedBuilder }   from 'discord.js';
import { readFile }       from 'fs/promises';
import path               from 'path';
import Fuse               from 'fuse.js';

const games = new Map(); // clé = guildId

async function loadCharacters() {
  const file    = path.resolve('./data/characters.json');
  const content = await readFile(file, 'utf-8');
  return JSON.parse(content);
}

function compareField(guess, answer) {
  const sep   = /[\/,]+/;
  const gList = guess.split(sep).map(s => s.trim().toLowerCase());
  const aList = answer.split(sep).map(s => s.trim().toLowerCase());
  const equalSets =
    gList.length === aList.length &&
    gList.every(v => aList.includes(v));
  if (equalSets) return 'green';
  if (gList.some(v => aList.includes(v))) return 'orange';
  return 'red';
}

const COLORS = {
  green:  '🟩',
  orange: '🟧',
  red:    '🟥'
};

export const name        = 'loldle';
export const description = 'Devinez le champion pour tout le serveur (le guess direct démarre la partie)';

export async function execute(message, args) {
  const guildId   = message.guild.id;
  const guessName = args.join(' ').trim();
  const chars     = await loadCharacters();

  // -- Stop de la partie
  if (args[0] === 'stop') {
    if (!games.has(guildId)) {
      return message.reply('❌ Aucune partie en cours sur ce serveur.');
    }
    games.delete(guildId);
    return message.reply('🛑 Partie de loldle terminée pour ce serveur.');
  }

  // -- Si pas d'argument c'est juste un appel info
  if (!guessName) {
    if (!games.has(guildId)) {
      return message.reply(
        '🕹️ Aucune partie en cours. Lancez un essai avec `mimou loldle [nom]` pour démarrer.'
      );
    } else {
      return message.reply(
        '🕹️ Partie en cours ! Proposez un champion avec `mimou loldle [nom]` ou `mimou loldle stop`.'
      );
    }
  }

  // -- Si première tentative, on démarre la partie automatiquement
  if (!games.has(guildId)) {
    const answer = chars[Math.floor(Math.random() * chars.length)];
    games.set(guildId, { answer, guesses: [] });
    await message.reply(
      '🕹️ **Nouvelle partie de loldle** lancée ! ' +
      'Proposez votre premier champion…'
    );
  }

  // -- Gestion d'un essai
  const game   = games.get(guildId);
  const answer = game.answer;

  // 1) Recherche exacte ou fuzzy
  let guess = chars.find(c => c.name.toLowerCase() === guessName.toLowerCase());
  if (!guess) {
    const fuse = new Fuse(chars, { keys: ['name'], threshold: 0.4, ignoreLocation: true });
    const [res] = fuse.search(guessName, { limit: 1 });
    if (res) {
      guess = res.item;
      await message.reply(
        `⚠ Je n'ai pas trouvé “${guessName}”, j'utilise “${guess.name}” pour cet essai.`
      );
    } else {
      return message.reply(`❌ Champion inconnu : « ${guessName} ».`);
    }
  }

  game.guesses.push(guess);

  // 2) Construction de l'embed de feedback
  const embed = new EmbedBuilder()
    .setTitle(`Loldle — Essai #${game.guesses.length}`)
    .addFields(
      { name: 'Champion',     value: guess.name, inline: true },
      { name: 'Genre',        value: `${COLORS[compareField(guess.genre, answer.genre)]} ${guess.genre}`, inline: true },
      { name: 'Rôle',         value: `${COLORS[compareField(guess.role, answer.role)]} ${guess.role}`, inline: true },
      { name: 'Type Dégats',  value: `${COLORS[compareField(guess.damages, answer.damages)]} ${guess.damages}`, inline: true },
      { name: 'Ressource',    value: `${COLORS[compareField(guess.ressource, answer.ressource)]} ${guess.ressource}`, inline: true },
      { name: 'Portée',       value: `${COLORS[compareField(guess.rangeType, answer.rangeType)]} ${guess.rangeType}`, inline: true },
      { name: 'Signature',    value: `${COLORS[compareField(guess.signature, answer.signature)]} ${guess.signature}`, inline: true },
      { name: 'Année sortie', value: `${COLORS[compareField(String(guess.releaseYear), String(answer.releaseYear))]} ${guess.releaseYear}`, inline: true }
    )
    .setColor(0x00AE86);

  // 3) Victoire
  if (guess.name.toLowerCase() === answer.name.toLowerCase()) {
    embed.setTitle(`🎉 ${message.author.username.toUpperCase()} A GAGNÉ ! 🎉`);
    embed.setDescription(
      `Vous avez deviné **${answer.name}** en ${game.guesses.length} essai(s).`
    );
    games.delete(guildId);
  }

  await message.reply({ embeds: [embed] });
}
