import { stop, hasQueue } from '../../utils/queueManager.js';

export const name = 'stop';
export const description = 'Arrête la musique et vide la queue.';

export async function execute(message) {
  const guildId = message.guild.id;

  if (!hasQueue(guildId)) {
    return message.reply('❌ Aucune musique en cours.');
  }

  stop(guildId);
  return message.reply('⏹️ Lecture arrêtée, queue vidée et déconnexion du salon vocal.');
}
