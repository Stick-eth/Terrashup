import { getMashups, getTrackPath } from '../utils/mashupUtils.js';
import { enqueue, stop, hasQueue } from '../utils/queueManager.js';

export const name = 'shuffle';
export const description = 'Mélange la liste des mashups disponibles et les ajoute à la queue.';

export async function execute(message) {
  const guildId = message.guild.id;
  const list = getMashups();

  if (list.length === 0) {
    return message.reply('📂 Le dossier est vide ou inaccessible.');
  }

  // 1) Si une queue existe, on la stoppe et vide tout
  if (hasQueue(guildId)) {
    return message.reply('❌ Une queue existe déjà. Veuillez d\'abord la vider avec `mimou stop`.');
  }

  // 2) Mélange Fisher-Yates du tableau des fichiers
  const shuffled = list.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // 3) Enqueue chaque piste dans l’ordre aléatoire
  for (const filename of shuffled) {
    const trackPath = getTrackPath(filename);
    // enqueue gère la connexion et le démarrage si besoin
    // on attend chaque appel pour éviter de surcharger
    // (le premier enqueue lance la lecture automatiquement)
    // pas de message ici, enqueue envoie ▶️ pour la 1ère piste
    // et on enverra un résumé ensuite
    // on ignore la position retournée
    // eslint-disable-next-line no-await-in-loop
    await enqueue(message, trackPath);
  }

  // 4) Retour utilisateur
  return message.reply(
    `🔀 Shuffle : ${list.length} pistes ont été ajoutées en ordre aléatoire à la queue.`
  );
}
