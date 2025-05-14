import { getMashups, getTrackPath } from '../../utils/mashupUtils.js';
import { enqueue } from '../../utils/queueManager.js';

export const name = 'play';
export const description =
  'Joue ou met en queue la piste spécifiée (usage : mimou play [id])';

export async function execute(message, args) {
  // 1) Validation de l'ID
  const idx = parseInt(args[0], 10);
  const list = getMashups();
  if (isNaN(idx) || idx < 1 || idx > list.length) {
    return message.reply(`🚫 Usage : \`mimou play [1–${list.length}]\``);
  }

  // 2) Vérification que l'utilisateur est en vocal
  const voiceChannel = message.member.voice.channel;
  console.log('[PLAY] member.voice.channel:', voiceChannel?.id, 'guild:', message.guild.id);
  if (!voiceChannel) {
    return message.reply('🔊 Vous devez être dans un salon vocal.');
  }

  // 3) Chemin du fichier
  const filename  = list[idx - 1];
  const trackPath = getTrackPath(filename);

  try {
    // 4) Ajout à la queue (et lancement si nécessaire)
    const { position, isFirst } = await enqueue(message, trackPath);

    // 5a) Si c'est la toute première piste lancée, enqueue()
    //     aura déjà envoyé ▶️ Lecture de … via queueManager
    if (isFirst) return;

    // 5b) Sinon, on confirme systématiquement l'ajout en queue
    await message.reply(
      `➕ **${filename}** ajouté à la queue en position ${position}.`
    );

  } catch (err) {
    console.error(err);
    return message.reply('❌ Impossible d’ajouter la musique à la queue.');
  }
}
