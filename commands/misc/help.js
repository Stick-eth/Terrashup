import { EmbedBuilder } from 'discord.js';

export const name        = 'help';
export const description = 'Affiche la liste des commandes disponibles';

export async function execute(message) {
    const commands = message.client.commands;

    const embed = new EmbedBuilder()
        .setTitle('📖 Aide — Commandes disponibles')
        .setColor(0x00AE86)
        .setDescription(
            Array.from(commands.entries())
                .map(
                    ([name, { description }]) =>
                        `• **${name}**\n   ↳ ${description}`
                )
                .join('\n\n')
        )
        .setFooter({ text: 'Utilisez les commandes avec précaution !' });

    await message.reply({ embeds: [embed] });
}
