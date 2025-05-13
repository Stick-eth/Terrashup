import fs from 'fs';
import path from 'path';
import Fuse from 'fuse.js';

const MASHUPS_DIR = path.resolve('./mashups');

export function getMashups() {
  try {
    return fs.readdirSync(MASHUPS_DIR)
      .filter(f => f.toLowerCase().endsWith('.mp3'));
  } catch {
    return [];
  }
}

export function searchMashups(term, limit = 3) {
  const list = getMashups();
  const fuse = new Fuse(list, {
    includeScore: true,
    threshold: 0.4,
    ignoreLocation: true
  });
  return fuse.search(term, { limit })
             .map(res => res.item);
}

export function getTrackPath(filename) {
  return path.join(MASHUPS_DIR, filename);
}
