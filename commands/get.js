import { EmbedBuilder } from 'discord.js';
import { getMashups } from '../utils/mashupUtils.js';

export const name = 'get';

export async function execute(message, args) {
  const list = getMashups();
  if (!list.length) {
    return message.reply('📂 Le dossier est vide ou inaccessible.');
  }

  const itemsPerPage = 10;
  const totalMashups = list.length;
  const totalPages   = Math.ceil(list.length / itemsPerPage);

  // 1) Détermine la page initiale
  let page = 1;
  if (args[0]) {
    const p = parseInt(args[0], 10);
    if (isNaN(p) || p < 1 || p > totalPages) {
      return message.reply(`🚫 Page invalide. Choisis un numéro entre 1 et ${totalPages}.`);
    }
    page = p;
  }

  // 2) Fonction pour construire l’embed d’une page donnée
  const makeEmbed = (pg) => {
    const start     = (pg - 1) * itemsPerPage;
    const pageItems = list.slice(start, start + itemsPerPage);
    const lines     = pageItems.map((f, i) => `\`${start + i + 1}.\` ${f}`);

    return new EmbedBuilder()
      .setTitle(`Liste des mashups (Page ${pg}/${totalPages}) - ${totalMashups} au total`)
      .setColor(0x00AE86)
      .setDescription(lines.join('\n'));
  };

  // 3) Envoi du message paginé
  const embedMessage = await message.channel.send({ embeds: [makeEmbed(page)] });
  await embedMessage.react('⬅️');
  await embedMessage.react('➡️');

  // 4) Collector limité à l’auteur, 2 min
  const filter = (reaction, user) =>
    ['⬅️','➡️'].includes(reaction.emoji.name) &&
    user.id === message.author.id;

  const collector = embedMessage.createReactionCollector({
    filter,
    time: 120_000
  });

  collector.on('collect', async (reaction, user) => {
    // retire la réaction de l'utilisateur pour pouvoir la réutiliser
    await reaction.users.remove(user.id);

    // change de page
    if (reaction.emoji.name === '⬅️') {
      page = page > 1 ? page - 1 : totalPages;
    } else {
      page = page < totalPages ? page + 1 : 1;
    }

    // met à jour l'embed
    await embedMessage.edit({ embeds: [makeEmbed(page)] });
  });

  collector.on('end', () => {
    // optionnel : enlève toutes les réactions quand c'est fini
    embedMessage.reactions.removeAll().catch(() => {});
  });
}
