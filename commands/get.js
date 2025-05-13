import { getMashups } from '../utils/mashupUtils.js';

export const name = 'get';

export async function execute(message) {
  const list = getMashups();
  if (!list.length) {
    return message.reply('📂 Le dossier est vide ou inaccessible.');
  }
  const lines = list.map((f,i) => `\`${i+1}.\` ${f}`);
  await message.reply('**Liste des mashups :**\n' + lines.join('\n'));
}
