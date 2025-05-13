import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  NoSubscriberBehavior,
  AudioPlayerStatus,
  StreamType
} from '@discordjs/voice';
import prism from 'prism-media';
import path from 'path';
import { getMashups } from './mashupUtils.js';

// Map<guildId, { connection, player, songs: string[] }>
const guildQueues = new Map();

function getOrCreateQueue(guildId) {
  if (!guildQueues.has(guildId)) {
    const player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Play }
    });
    guildQueues.set(guildId, {
      connection: null,
      player,
      songs: []
    });
  }
  return guildQueues.get(guildId);
}

export async function enqueue(message, trackPath) {
  const guildId = message.guild.id;
  const queue   = getOrCreateQueue(guildId);
  const wasConnected = Boolean(queue.connection);

  queue.songs.push(trackPath);
  const position = queue.songs.length;

  if (!wasConnected) {
    const vc = message.member.voice.channel;
    queue.connection = joinVoiceChannel({
      channelId: vc.id,
      guildId,
      adapterCreator: message.guild.voiceAdapterCreator
    });
    queue.connection.subscribe(queue.player);
    _playNext(message);
  } else if (
    queue.player.state.status === AudioPlayerStatus.Idle &&
    queue.songs.length === 1
  ) {
    _playNext(message);
  }

  return { position, isFirst: !wasConnected };
}

function _playNext(message) {
  const guildId = message.guild.id;
  const queue   = guildQueues.get(guildId);

  // *** Garde : si la queue n'existe plus, on arrête tout ***
  if (!queue) return;

  const nextTrack = queue.songs.shift();
  if (!nextTrack) {
    // plus de piste → cleanup
    queue.connection.destroy();
    guildQueues.delete(guildId);
    return;
  }

  // Flux ffmpeg pour lecture en temps réel
  const ffmpeg = new prism.FFmpeg({
    args: [
      '-re',
      '-i', nextTrack,
      '-analyzeduration', '0',
      '-loglevel', '0',
      '-f', 's16le',
      '-ar', '48000',
      '-ac', '2'
    ]
  });
  const resource = createAudioResource(ffmpeg, {
    inputType: StreamType.Raw
  });

  queue.player.play(resource);

  // Calcul de l'ID et nom du fichier
  const filename = path.basename(nextTrack);
  const allFiles = getMashups();
  const id       = allFiles.indexOf(filename) + 1;

  // Envoi du message (ID + nom)
  message.channel.send(`▶️ Lecture de \`${id}\` **${filename}**`);

  // Quand la piste se termine, on relance la suivante
  queue.player.once(AudioPlayerStatus.Idle, () => _playNext(message));
}

export function insert(message, trackPath) {
  const guildId = message.guild.id;
  const queue   = getOrCreateQueue(guildId);

  queue.songs.unshift(trackPath);

  if (!queue.connection) {
    const vc = message.member.voice.channel;
    queue.connection = joinVoiceChannel({
      channelId: vc.id,
      guildId,
      adapterCreator: message.guild.voiceAdapterCreator
    });
    queue.connection.subscribe(queue.player);
    _playNext(message);
  } else if (queue.player.state.status === AudioPlayerStatus.Idle) {
    _playNext(message);
  }

  return 1;
}

export function skip(guildId) {
  const queue = guildQueues.get(guildId);
  if (queue) queue.player.stop();
}

export function stop(guildId) {
  const queue = guildQueues.get(guildId);
  if (queue) {
    queue.songs = [];
    queue.player.stop();
    queue.connection.destroy();
    guildQueues.delete(guildId);
  }
}

export function remove(guildId, index) {
  const queue = guildQueues.get(guildId);
  if (queue && index > 0 && index <= queue.songs.length) {
    return queue.songs.splice(index - 1, 1)[0];
  }
  return null;
}

export function getQueueList(guildId) {
  const queue = guildQueues.get(guildId);
  if (!queue) return [];
  return queue.songs.map((p, i) => `\`${i+1}.\` ${path.basename(p)}`);
}

export function hasQueue(guildId) {
  return guildQueues.has(guildId);
}

export function pause(guildId) {
  const queue = guildQueues.get(guildId);
  if (!queue) return null;
  const status = queue.player.state.status;
  if (status === AudioPlayerStatus.Playing) {
    queue.player.pause();
    return 'paused';
  }
  if (status === AudioPlayerStatus.Paused) {
    queue.player.unpause();
    return 'resumed';
  }
  return null;
}
