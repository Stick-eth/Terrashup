import { pause } from '../../utils/queueManager.js';

export const name = 'pause';
export const description = 'Met la musique en pause ou la reprend si elle est déjà en pause.';

export async function execute(message) {
  const guildId = message.guild.id;
  const result  = pause(guildId);

  if (result === 'paused') {
    return message.reply('⏸️ Lecture mise en pause.');
  }
  if (result === 'resumed') {
    return message.reply('▶️ Lecture reprise.');
  }
  return message.reply('❌ Aucune lecture en cours à mettre en pause ou reprendre.');
}
