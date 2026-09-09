import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLAYER_ASSET_PROFILES } from '../../values/playerAssetProfiles.js';
import { DEFAULT_PLAYER_CHARACTER_ID } from '../../values/playerCharacters.js';
import { createUalNativePlayerAnimations } from '../../player/UalNativePlayerAnimations.js';
import { UalNativeLocomotionTransitionSelector } from '../../systems/visual/UalNativeLocomotionTransitionSelector.js';
const output = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(output, '../..');
const p = PLAYER_ASSET_PROFILES[DEFAULT_PLAYER_CHARACTER_ID];
const definitions = [], registered = new Set(), available = new Set(p.requiredSheets);
createUalNativePlayerAnimations({
  anims: {
    exists: key => registered.has(key),
    create: d => { registered.add(d.key); definitions.push(d); },
  },
  textures: { exists: key => available.has(key), get: () => ({ setFilter() {} }) },
}, p);
const paths = new Map(p.sheetFiles.map(([field, file, , base]) => [p[field], `${base || p.basePath}/${file}`]));
const runtimeAnimations = definitions.map(d => {
  const sheet = d.frames[0].key, size = p.frameSizePxBySheet?.[sheet];
  const origin = p.visualOriginByAnimation?.[d.key] || p.visualOriginBySheet?.[sheet]
    || { x: p.visualOriginX, y: p.visualOriginY };
  return {
    key: d.key, status: 'current-default', sheet, assetPath: paths.get(sheet),
    frames: d.frames.length, frameSequence: d.frames.map(f => f.frame),
    frameRate: d.frameRate, repeat: d.repeat,
    frameWidth: size || p.frameWidth, frameHeight: size || p.frameHeight,
    displaySizePx: p.displaySizePxByAnimation?.[d.key] || p.displaySizePx,
    originX: origin.x, originY: origin.y,
    heldTorchVariant: p.heldTorchAnimationByBaseAnimation?.[d.key] || null,
    recovery: p.actionRecoveryAnimationByCompletedAnimation?.[d.key] || null,
    contact: p.actionContactByAnimation?.[d.key] || null,
  };
});
const defaultAnimationKeys = Object.fromEntries(Object.entries(p)
  .filter(([k, v]) => k.endsWith('Anim') && typeof v === 'string')
  .map(([k, v]) => [k.slice(0, -4), v]));
function trace(name, snapshots) {
  const selector = new UalNativeLocomotionTransitionSelector(p);
  return { name, frames: snapshots.map(input => ({ input, output: selector.resolve(input) })) };
}
const idle = { grounded: true, flying: false, running: false, groundMovementActive: false,
  horizontalVelocity: 0, verticalVelocity: 0, currentAnimationKey: p.idleAnim,
  currentFrameIndex: 1, isPlaying: true, facingFlipX: false };
const traces = [
  trace('ordinary walk start and stop', [idle,
    { ...idle, groundMovementActive: true, horizontalVelocity: 160 },
    { ...idle, currentAnimationKey: p.walkLoopAnim, currentFrameIndex: 8 }]),
  trace('Ctrl run start', [idle,
    { ...idle, running: true, groundMovementActive: true, horizontalVelocity: 240 }]),
  trace('flight enter, travel and release', [idle,
    { ...idle, grounded: false, flying: true, verticalVelocity: -50 },
    { ...idle, grounded: false, flying: true, horizontalVelocity: 240, currentAnimationKey: p.flyAnim, currentFrameIndex: 15 },
    { ...idle, grounded: false, verticalVelocity: 90, currentAnimationKey: p.flyAnim, currentFrameIndex: 18 }]),
];
const transitionRoutes = Object.entries(p.actionRecoveryAnimationByCompletedAnimation || {});
const sheets = new Set(runtimeAnimations.map(r => r.sheet));
const inventory = { generatedAt: new Date().toISOString(), defaultCharacterId: DEFAULT_PLAYER_CHARACTER_ID,
  renderPipeline: p.renderPipeline, runtimeAnimations, defaultAnimationKeys, transitionRoutes, traces,
  summary: {
    registeredAnimations: definitions.length, registeredSheets: sheets.size, requiredSheets: available.size,
    uniqueFrameSequences: new Set(runtimeAnimations.map(r => `${r.sheet}:${r.frameSequence}`)).size,
    heldTorchBindings: Object.keys(p.heldTorchAnimationByBaseAnimation || {}).length,
    continuousFlightLoop: p.continuousFlightLoop, rigManifestKey: p.rigManifestKey,
    missingAssets: runtimeAnimations.filter(r => !r.assetPath || !fs.existsSync(path.join(root, r.assetPath))).map(r => r.key),
    missingRecoveryTargets: transitionRoutes.filter(([a, b]) => registered.has(a) && b && !registered.has(b)),
    nullRecoveryMappings: transitionRoutes.filter(([a, b]) => registered.has(a) && !b),
    requiredSheetsWithoutAnimation: [...available].filter(k => !sheets.has(k)),
  },
};
fs.writeFileSync(path.join(output, 'inventory.json'), JSON.stringify(inventory, null, 2));
fs.writeFileSync(path.join(output, 'profile.json'), JSON.stringify(p, null, 2));
console.log(JSON.stringify({ summary: inventory.summary, keys: defaultAnimationKeys,
  traces: traces.map(t => ({ name: t.name, decisions: t.frames.map(f => f.output) })) }, null, 2));

