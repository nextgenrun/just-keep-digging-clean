import { readFile, writeFile, stat } from 'node:fs/promises';
import { buildActiveGametimeAudioCatalog } from '../audio-runtime-reaudit-2026-09-04/catalog-builder.mjs';
import { SIGNAL_VOICE_CLIPS } from '../../values/signalVoiceManifest.generated.js';
import { SIGNAL_DOG_CLIPS } from '../../values/signalDogAudio.js';
import { CINEMATIC_VIDEO_CONFIG } from '../../values/cinematicVideoConfig.js';
import { SESSION_AWAKENING } from '../../values/sessionAwakening.js';
import { MERCHANT_SHOP_AUDIO } from '../../values/merchantShopAudio.js';
import { AUDIO_CONFIG } from '../../values/audioConfig.js';

const base = await buildActiveGametimeAudioCatalog();
const root = new URL('../../', import.meta.url);
const items = new Map(base.items.map(({ suggestedGain, suggestedDbChange, volumeReason, ...item }) => [item.path, item]));
function add(path, kind, family, gain, metadata = {}) {
  if (items.has(path)) return;
  items.set(path, { path, kind, families: [family], runtimeGain: gain, metadata });
}
for (const file of JSON.parse(await readFile(new URL('sound/playlists/playlist.json', root), 'utf8'))) {
  add(`sound/playlists/${file}`, 'music', 'menu-music', AUDIO_CONFIG.musicVolume);
}
for (const clip of Object.values(SIGNAL_VOICE_CLIPS)) add(clip.path, 'voice', 'signal', null);
for (const clip of Object.values(SIGNAL_DOG_CLIPS)) add(clip.path, 'voice', 'signal', null);
for (const clip of Object.values(CINEMATIC_VIDEO_CONFIG.assets)) add(clip.path, 'cinematic', clip.id, null);
for (const name of ['breath', 'heartbeat']) {
  const clip = SESSION_AWAKENING.audio[name];
  add(clip.path, 'sfx', `awakening-${name}`, SESSION_AWAKENING.audio[`${name}Gain`] * AUDIO_CONFIG.sfxVolume);
}
add(MERCHANT_SHOP_AUDIO.path, 'sfx', 'merchant-welcome', MERCHANT_SHOP_AUDIO.gain * AUDIO_CONFIG.uiVolume * AUDIO_CONFIG.sfxVolume);
for (const item of items.values()) {
  try { item.byteSize = (await stat(new URL(item.path, root))).size; item.exists = true; }
  catch { item.exists = false; }
}
const catalog = { generatedAt: new Date().toISOString(), gameplayCount: base.counts.total,
  scope: 'Current gameplay catalog plus every menu track, Signal voice, awakening source, merchant entrance and configured cinematic. Review inboxes excluded.',
  defaults: AUDIO_CONFIG, counts: { total: items.size, missing: [...items.values()].filter(i => !i.exists).length }, items: [...items.values()] };
catalog.counts.byKind = Object.fromEntries([...new Set(catalog.items.map(i => i.kind))].map(k => [k, catalog.items.filter(i => i.kind === k).length]));
await writeFile(new URL('catalog.json', import.meta.url), JSON.stringify(catalog, null, 2) + '\n');
console.log(JSON.stringify(catalog.counts));
