import { getMashups, getTrackPath } from '../utils/mashupUtils.js';
import { insert } from '../utils/queueManager.js';

export const name = 'insert';

export async function execute(message, args) {
  const list = getMashups();
  const idx  = parseInt(args[0], 10);

  // Validation de l'ID
  if (isNaN(idx) || idx < 1 || idx > list.length) {
    return message.reply(`🚫 Usage : \`mimou insert [1–${list.length}]\``);
  }
  // Vérification salon vocal
  if (!message.member.voice.channel) {
    return message.reply('🔊 Vous devez être dans un salon vocal.');
  }

  const filename  = list[idx - 1];
  const trackPath = getTrackPath(filename);

  try {
    insert(message, trackPath);
    return message.reply(`⏫ **${filename}** inséré en tête de la queue.`);
  } catch (err) {
    console.error(err);
    return message.reply('❌ Impossible d’insérer la piste dans la queue.');
  }
}
