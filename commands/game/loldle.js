// commands/game/loldle.js
import { EmbedBuilder } from 'discord.js';
import { readFile }     from 'fs/promises';
import path             from 'path';
import Fuse             from 'fuse.js';

const games = new Map(); // clé = guildId

async function loadCharacters() {
  const file    = path.resolve('./data/characters.json');
  const content = await readFile(file, 'utf-8');
  return JSON.parse(content);
}

function compareField(guessVal, answerVal) {
  if (!guessVal || !answerVal) return 'red';
  const sep   = /[\/,]+/;
  const gList = guessVal.split(sep).map(s => s.trim().toLowerCase());
  const aList = answerVal.split(sep).map(s => s.trim().toLowerCase());
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
export const description = 'Devinez le champion pour tout le serveur (guess direct démarre la partie)';

export async function execute(message, args) {
  const guildId   = message.guild.id;
  const guessName = args.join(' ').trim();
  const chars     = await loadCharacters();

  // Stop
  if (args[0] === 'stop') {
    if (!games.has(guildId)) {
      return message.reply('❌ Aucune partie en cours sur ce serveur.');
    }
    games.delete(guildId);
    return message.reply('🛑 Partie de loldle terminée pour ce serveur.');
  }

  // Info si pas d'argument
  if (!guessName) {
    return message.reply(
      games.has(guildId)
        ? '🕹️ Partie en cours ! Proposez un champion avec `mimou loldle [nom]` ou `mimou loldle stop`.'
        : '🕹️ Aucune partie en cours. Lancez un essai avec `mimou loldle [nom]` pour démarrer.'
    );
  }

  // Démarrage auto de la partie
  if (!games.has(guildId)) {
    const answer = chars[Math.floor(Math.random() * chars.length)];
    games.set(guildId, { answer, guesses: [] });
    await message.reply(
      '🕹️ **Nouvelle partie de loldle** lancée ! Proposez votre premier champion…'
    );
  }

  const game   = games.get(guildId);
  const answer = game.answer;

  // Recherche exacte ou fuzzy sur championName
  let guess = chars.find(
    c => c.championName.toLowerCase() === guessName.toLowerCase()
  );
  if (!guess) {
    const fuse = new Fuse(chars, {
      keys: ['championName'],
      threshold: 0.4,
      ignoreLocation: true
    });
    const [res] = fuse.search(guessName, { limit: 1 });
    if (res) {
      guess = res.item;
      await message.reply(
        `⚠ Je n'ai pas trouvé “${guessName}”, j'utilise “${guess.championName}” pour cet essai.`
      );
    } else {
      return message.reply(`❌ Champion inconnu : « ${guessName} ».`);
    }
  }

  game.guesses.push(guess);

  // Prépare champs pour comparaison
  const guessNameDisplay   = guess.championName;
  const answerNameDisplay  = answer.championName;
  const guessGender        = guess.gender;
  const answerGender       = answer.gender;
  const guessPos           = guess.positions.join('/');
  const answerPos          = answer.positions.join('/');
  const guessSpecies       = guess.species.join('/');
  const answerSpecies      = answer.species.join('/');
  const guessResource      = guess.resource;
  const answerResource     = answer.resource;
  const guessRange         = guess.range_type.join('/');
  const answerRange        = answer.range_type.join('/');
  const guessRegions       = guess.regions.join('/');
  const answerRegions      = answer.regions.join('/');
  const guessYear          = String(new Date(guess.release_date).getFullYear());
  const answerYear         = String(new Date(answer.release_date).getFullYear());
  const signature         = guess.signature || 'n/a';
  const answerSignature    = answer.signature;


  // Construction de l'embed
  const embed = new EmbedBuilder()
    .setTitle(`Loldle — Essai #${game.guesses.length}`)
    .addFields(
      { name: 'Champion',   value: guessNameDisplay, inline: true },
      { name: 'Genre',      value: `${COLORS[compareField(guessGender, answerGender)]} ${guessGender}`, inline: true },
      { name: 'Position',   value: `${COLORS[compareField(guessPos, answerPos)]} ${guessPos}`, inline: true },
      { name: 'Espèce',     value: `${COLORS[compareField(guessSpecies, answerSpecies)]} ${guess.species.join(', ')}`, inline: true },
      { name: 'Ressource',  value: `${COLORS[compareField(guessResource, answerResource)]} ${guessResource}`, inline: true },
      { name: 'Portée',     value: `${COLORS[compareField(guessRange, answerRange)]} ${guess.range_type.join(', ')}`, inline: true },
      { name: 'Région',     value: `${COLORS[compareField(guessRegions, answerRegions)]} ${guess.regions.join(', ')}`, inline: true },
      { name: 'Année',      value: `${COLORS[compareField(guessYear, answerYear)]} ${guessYear}`, inline: true },
      { name: 'Signature',  value: `${COLORS[compareField(signature, answerSignature)]} ${guess.signature}`, inline: true }
    )
    .setColor(0x00AE86);

  // Victoire
  if (guessNameDisplay.toLowerCase() === answerNameDisplay.toLowerCase()) {
    embed.setTitle(`🎉 ${message.author.username.toUpperCase()} A GAGNÉ ! 🎉`);
    embed.setDescription(
      `Vous avez deviné **${answerNameDisplay}** en ${game.guesses.length} essai(s).`
    );
    games.delete(guildId);
  }

  await message.reply({ embeds: [embed] });
}
