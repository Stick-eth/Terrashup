import { skip, hasQueue } from '../utils/queueManager.js';

export const name = 'skip';

export async function execute(message) {
  const guildId = message.guild.id;

  // Si pas de queue en cours → rien à passer
  if (!hasQueue(guildId)) {
    return message.reply('❌ Aucune musique en cours à passer.');
  }

  // On passe à la piste suivante
  skip(guildId);
  return message.reply('⏭️ Musique suivante !');
}
