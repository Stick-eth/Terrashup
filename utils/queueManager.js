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
import { getMashups } from './mashupUtils.js';  // ← on importe la liste des mashups

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

  // Ajout à la liste
  queue.songs.push(trackPath);
  const position = queue.songs.length;

  // Si pas encore connecté, on démarre la lecture
  if (!queue.connection) {
    const voiceChannel = message.member.voice.channel;
    queue.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId:    guildId,
      adapterCreator: message.guild.voiceAdapterCreator
    });
    queue.connection.subscribe(queue.player);
    _playNext(message);
  }
  // Si player idle (rare), on relance
  else if (queue.player.state.status === AudioPlayerStatus.Idle && queue.songs.length === 1) {
    _playNext(message);
  }

  return position;
}

function _playNext(message) {
  const guildId = message.guild.id;
  const queue   = guildQueues.get(guildId);

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

  // **Calcul de l'ID** à partir du nom du fichier
  const filename = path.basename(nextTrack);
  const allFiles = getMashups();                  // liste des noms (avec .mp3)
  const id       = allFiles.indexOf(filename) + 1; // +1 car index 0-based

  // Envoi du message avec ID + nom
  message.channel.send(`▶️ Lecture de \`${id}\` **${filename}**`);

  // Quand la piste finit, on passe à la suivante
  queue.player.once(AudioPlayerStatus.Idle, () => _playNext(message));
}

export function insert(message, trackPath) {
  const guildId = message.guild.id;
  const queue   = getOrCreateQueue(guildId);

  // On met la piste en premier dans songs
  queue.songs.unshift(trackPath);

  // Si pas encore connecté : on crée la connexion et on lance la lecture
  if (!queue.connection) {
    const voiceChannel = message.member.voice.channel;
    queue.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId,
      adapterCreator: message.guild.voiceAdapterCreator
    });
    queue.connection.subscribe(queue.player);
    _playNext(message);
  }
  // Si le player est déjà idle (rare) et qu'il n'y a qu'un seul élément après unshift
  else if (queue.player.state.status === AudioPlayerStatus.Idle) {
    _playNext(message);
  }

  // On renvoie toujours 1 (position dans la queue)
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
