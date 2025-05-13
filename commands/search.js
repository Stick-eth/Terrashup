import { getMashups, searchMashups } from '../utils/mashupUtils.js';

export const name = 'search';

export async function execute(message, args) {
  const term = args.join(' ');
  if (!term) {
    return message.reply('🚫 Usage : `mimou search [terme]`');
  }

  const matches = searchMashups(term);
  if (!matches.length) {
    return message.reply(`❌ Aucune correspondance pour « ${term} ».`);
  }

  const all = getMashups();
  const lines = matches.map(name => {
    const id = all.indexOf(name) + 1;
    return `\`${id}.\` ${name}`;
  });

  await message.reply(`🔍 Résultats pour « ${term} » :\n` + lines.join('\n'));
}
