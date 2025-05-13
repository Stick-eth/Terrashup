import { joinVoiceChannel, createAudioPlayer,
         createAudioResource, AudioPlayerStatus,
         NoSubscriberBehavior } from '@discordjs/voice';
import { getMashups, getTrackPath } from '../utils/mashupUtils.js';

export const name = 'play';

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

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId:    message.guild.id,
    adapterCreator: message.guild.voiceAdapterCreator
  });

  const player   = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
  const resource = createAudioResource(getTrackPath(list[idx-1]), { inputType: 'arbitrary' });

  player.play(resource);
  connection.subscribe(player);
  message.reply(`▶️ Lecture de **${list[idx-1]}**`);

  player.on(AudioPlayerStatus.Idle, () => connection.destroy());
  player.on('error', () => {
    message.reply('❌ Erreur de lecture.');
    connection.destroy();
  });
}
