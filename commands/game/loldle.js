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
  // 1) Si les valeurs sont strictement égales (===), pas besoin de comparer
  if (guessVal == answerVal) return 'green';

  // 2) Si l’une des valeurs est vide et l’autre non, pas de correspondance
  if (!guessVal && answerVal) return 'red';
  if (guessVal && !answerVal) return 'red';

  // 2) Si l’une des valeurs est un array, on transforme en string "a/b/..."
  if (Array.isArray(guessVal))   guessVal   = guessVal.join('/');
  if (Array.isArray(answerVal))  answerVal  = answerVal.join('/');

  // 3) On force en string
  guessVal  = String(guessVal);
  answerVal = String(answerVal);

  // 4) On normalise pour enlever les accents
  guessVal  = guessVal.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  answerVal = answerVal.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  // 5) Séparateur de sous-valeurs
  const sep = /[\/,]+/;
  const gList = guessVal.split(sep).map(s => s.trim());
  const aList = answerVal.split(sep).map(s => s.trim());

  // 6) Comparaison des ensembles
  const equalSets =
    gList.length === aList.length &&
    gList.every(v => aList.includes(v));
  if (equalSets) return 'green';

  // 7) Partage au moins un élément ?
  if (gList.some(v => aList.includes(v))) return 'orange';

  // 8) Aucune correspondance
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

  // Force win by 'mimou loldle force'
  if (args[0] === 'force') {
    if (!games.has(guildId)) {
      return message.reply('❌ Aucune partie en cours sur ce serveur.');
    }
    const game = games.get(guildId);
    const answer = game.answer;
    const answerNameDisplay = answer.championName;
    game.guesses.push(answer);
    games.delete(guildId);
    return message.reply(
      `🎉 Vous avez forcé fin de la partie ! Le champion était **${answerNameDisplay}**.`
    );
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
  const Signature          = guess.Signature;
  const guessSignatureDisplay = Array.isArray(guess.Signature)
    ? guess.Signature.join(', ')
    : guess.Signature || 'Personne😿' ;
  const answerSignature    = answer.Signature;
    const answerSignatureDisplay = Array.isArray(answer.Signature)
        ? answer.Signature.join(', ')
        : answer.Signature || 'Personne😿' ;


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
        { name: 'Signature',  value: `${COLORS[compareField(Signature, answerSignature)]} ${guessSignatureDisplay}`, inline: true }
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
