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
  const guildId      = message.guild.id;
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) {
    throw new Error('Vous devez être dans un salon vocal.');
  }

  const queue    = getOrCreateQueue(guildId);
  queue.songs.push(trackPath);
  const position = queue.songs.length;

  // ➤ Détecte s’il faut (re)joindre le salon vocal
  const conn        = queue.connection;
  const joinedInVC  = conn?.joinConfig?.channelId === voiceChannel.id;
  const needToJoin  = !joinedInVC;

  if (needToJoin) {
    // (Re)joindre et démarrer la lecture
    queue.connection = joinVoiceChannel({
      channelId:      voiceChannel.id,
      guildId,
      adapterCreator: message.guild.voiceAdapterCreator
    });
    queue.connection.subscribe(queue.player);
    _playNext(message);
    return { position, isFirst: true };
  }

  // Sinon, si on est déjà connecté mais idle et qu'il n'y a qu'un seul titre, on relance
  if (
    queue.player.state.status === AudioPlayerStatus.Idle &&
    queue.songs.length === 1
  ) {
    _playNext(message);
  }

  return { position, isFirst: false };
}

function _playNext(message) {
  const guildId = message.guild.id;
  const queue   = guildQueues.get(guildId);

  // Si la queue a disparu (stop/kick), on ne fait rien
  if (!queue) return;

  const nextTrack = queue.songs.shift();
  if (!nextTrack) {
    // plus de piste → cleanup
    queue.connection.destroy();
    guildQueues.delete(guildId);
    return;
  }

  // Flux ffmpeg pour lecture en temps réel
  const ffmpeg   = new prism.FFmpeg({
    args: [
      '-i', nextTrack,
      '-analyzeduration', '10',
      '-loglevel', '0',
      '-f', 's16le',
      '-ar', '48000',
      '-ac', '2',
    ]
  });
  const resource = createAudioResource(nextTrack, { inputType: StreamType.Arbitrary });
  queue.player.play(resource);

  ffmpeg.on('error', console.error);
  queue.player.on('error', console.error);

  // Calcul de l'ID et envoi du message
  const filename = path.basename(nextTrack);
  const allFiles = getMashups();
  const id       = allFiles.indexOf(filename) + 1;
  message.channel.send(`▶️ Lecture de \`${id}\` **${filename}**`);

  // À la fin, on relance la suivante
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
