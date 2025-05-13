import { getMashups, getTrackPath } from '../utils/mashupUtils.js';
import { enqueue } from '../utils/queueManager.js';

export const name = 'play';
export const description = 'Joue ou met en queue la piste spécifiée';


export async function execute(message, args) {
  const idx = parseInt(args[0], 10);
  const list = getMashups();
  if (isNaN(idx) || idx < 1 || idx > list.length) {
    return message.reply(`🚫 Usage : \`mimou play [1–${list.length}]\``);
  }

  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) {
    return message.reply('🔊 Vous devez être dans un salon vocal.');
  }

  const trackPath = getTrackPath(list[idx - 1]);

  try {
    const position = await enqueue(message, trackPath);

    if (position === 1) {
      // Quand c'est la première piste, la lecture démarre immédiatement
      // et queueManager envoie déjà ▶️ Lecture de **nom.mp3**
      return;
    }

    // Sinon, on confirme explicitement l'ajout en file d'attente
    await message.reply(
      `➕ **${list[idx - 1]}** ajouté à la queue en position ${position}.`
    );

  } catch (err) {
    console.error(err);
    return message.reply('❌ Impossible d’ajouter la musique à la queue.');
  }
}
