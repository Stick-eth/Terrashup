import { EmbedBuilder } from 'discord.js';
import { getMashups } from '../../utils/mashupUtils.js';

export const name = 'status';
export const description = 'Affiche depuis combien de temps le bot est en ligne et le nombre de mashups disponibles';

export async function execute(message) {
  const client = message.client;

  // 1) Calcul de l’uptime en ms, puis conversion en j/h/m/s
  const uptimeMs = client.uptime;
  const totalSeconds = Math.floor(uptimeMs / 1000);
  const days    = Math.floor(totalSeconds / 86400);
  const hours   = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const uptime = `${days}j ${hours}h ${minutes}m ${seconds}s`;

  // 2) Nombre de mashups
  const totalMashups = getMashups().length;

  // 3) Construction de l’embed
  const embed = new EmbedBuilder()
    .setTitle('📊 Statut de Terrashup')
    .addFields(
      { name: '🕒 Uptime', value: uptime, inline: true },
      { name: '🎵 Mashups disponibles', value: `${totalMashups}`, inline: true }
    )
    .setColor(0x00AE86)
    .setTimestamp();

  // 4) Envoi
  await message.reply({ embeds: [embed] });
}
