import { PLAYER_ASSET_PROFILES } from "../values/playerAssetProfiles.js?rev=20260825-unified-animation-v1";
import { resolvePlayerDeferredAssetPackId } from
  "../values/playerDeferredAssetPacks.js";
import { RUNTIME_ASSET_LOADING } from "../values/runtimeAssetLoading.js";

export const PLAYER_ABILITY_ASSET_IDS = Object.freeze({
  quickslash: "quickslash",
  thunderStrike: "thunderStrike",
});

export const PLAYER_ABILITY_ASSET_PACKS = Object.freeze({
  [PLAYER_ABILITY_ASSET_IDS.quickslash]: Object.freeze({
    owner: RUNTIME_ASSET_LOADING.owners.abilityQuickslash,
    upgradeId: "quickslashAbility",
    sheetProperties: Object.freeze(["quickslashSheet"]),
  }),
  [PLAYER_ABILITY_ASSET_IDS.thunderStrike]: Object.freeze({
    owner: RUNTIME_ASSET_LOADING.owners.abilityThunderStrike,
    upgradeId: "thunderStrikeAbility",
    sheetProperties: Object.freeze([
      "thunderStrikeChargeSheet",
      "thunderStrikeStrikeSheet",
    ]),
  }),
});

const ROBOT_SHEETS = Object.freeze([
  ["idleSheet", "idle-sheet.webp", "idleFrames"],
  ["walkStartSheet", "walk-start-sheet.webp", "walkStartFrames"],
  ["walkLoopSheet", "walk-loop-sheet.webp", "walkLoopFrames"],
  ["walkRunSheet", "walk-run-sheet.webp", "walkRunFrames"],
  ["walkStopSheet", "walk-stop-sheet.webp", "walkStopFrames"],
  ["airborneSheet", "jump-sheet.webp", "airborneFrames"],
  ["fallingSheet", "falling-sheet.webp", "fallingFrames"],
  ["duckSheet", "duck-sheet.webp", "duckFrames"],
  ["digDownSheet", "dig-down-sheet.webp", "digDownFrames"],
  ["digSidewaysSheet", "dig-sideways-sheet.webp", "digSidewaysFrames"],
  ["digUpSheet", "dig-up-sheet.webp", "digUpFrames"],
  ["digUpSidewaysSheet", "dig-up-sideways-sheet.webp", "digUpSidewaysFrames"],
  ["digUpLookSheet", "dig-up-look-sheet.webp", "digUpLookFrames"],
  ["wallPushSheet", "wall-push-sheet.webp", "wallPushFrames"],
  ["combatIdleRecoverSheet", "combat-idle-recover-sheet.webp", "combatIdleRecoverFrames"],
  ["flySheet", "fly-sheet.webp", "flyFrames"],
  ["quickslashSheet", "quickslash-sheet.webp", "quickslashFrames"],
  ["thunderStrikeChargeSheet", "thunder-charge-sheet.webp", "thunderStrikeChargeFrames"],
  ["thunderStrikeStrikeSheet", "thunder-strike-sheet.webp", "thunderStrikeStrikeFrames"],
  ["attackDownSheet", "attack-down-sheet.webp", "attackDownFrames"],
  ["earthquakeReactSheet", "earthquake-react-sheet.webp", "earthquakeReactFrames"],
]);

export function highestReferencedPlayerFrame(frames = []) {
  return frames.reduce((highest, frame) => Math.max(highest, Number(frame) || 0), 0);
}

function abilityIdForSheetProperty(property) {
  return Object.keys(PLAYER_ABILITY_ASSET_PACKS).find(
    id => PLAYER_ABILITY_ASSET_PACKS[id].sheetProperties.includes(property),
  ) || null;
}

function dedicatedAbilityId(profile, property) {
  const abilityId = abilityIdForSheetProperty(property);
  if (!abilityId) return null;
  const key = profile?.[property];
  const hasCoreConsumer = Object.entries(profile || {}).some(([name, value]) => (
    name.endsWith("Sheet")
    && value === key
    && !abilityIdForSheetProperty(name)
  ));
  return hasCoreConsumer ? null : abilityId;
}

function createRawEntry(profile, file) {
  const [property, fileName, framesProperty, sourceBasePath] = file;
  const frames = profile[framesProperty] || [];
  const basePath = sourceBasePath || profile.basePath;
  return {
    property,
    key: profile[property],
    path: `${basePath}/${fileName}?v=${profile.version}`,
    type: profile.sheetType || RUNTIME_ASSET_LOADING.types.spritesheet,
    atlasPath: profile.sheetType === RUNTIME_ASSET_LOADING.types.multiatlas ? `${basePath}/` : undefined,
    frames,
    abilityId: dedicatedAbilityId(profile, property),
    deferredId: resolvePlayerDeferredAssetPackId(property),
    fileName,
    sourceBasePath,
  };
}

function freezeMergedEntry(entry, profile) {
  const deferredIds = entry.hasCoreConsumer ? [] : [...entry.deferredIds];
  const abilityIds = entry.hasCoreConsumer ? [] : [...entry.abilityIds];
  const frames = Object.freeze([...entry.frames]);
  const profileFrameSize = profile.frameSizePxBySheet?.[entry.key];
  const isRobot = profile?.characterId === PLAYER_ASSET_PROFILES.robot.characterId;
  const frameWidth = isRobot
    ? 341
    : (profileFrameSize || profile.frameWidth);
  const frameHeight = isRobot
    ? 341
    : (profileFrameSize || profile.frameHeight);
  return Object.freeze({
    property: entry.property,
    key: entry.key,
    path: entry.path,
    type: entry.type,
    atlasPath: entry.atlasPath,
    frames,
    abilityId: abilityIds.length === 1 ? abilityIds[0] : null,
    deferredId: deferredIds.length === 1 ? deferredIds[0] : null,
    deferredIds: Object.freeze(deferredIds),
    frameConfig: Object.freeze({
      frameWidth,
      frameHeight,
      endFrame: highestReferencedPlayerFrame(frames),
    }),
    fileName: entry.fileName,
    sourceBasePath: entry.sourceBasePath,
  });
}

export function getUniquePlayerSheetEntries(profile) {
  const files = profile?.characterId === PLAYER_ASSET_PROFILES.robot.characterId
    ? ROBOT_SHEETS
    : profile?.sheetFiles || [];
  const byKey = new Map();
  for (const file of files) {
    const raw = createRawEntry(profile, file);
    if (!raw.key || !raw.frames.length) continue;
    let merged = byKey.get(raw.key);
    if (!merged) {
      merged = {
        ...raw,
        frames: new Set(),
        abilityIds: new Set(),
        deferredIds: new Set(),
        hasCoreConsumer: false,
      };
      byKey.set(raw.key, merged);
    } else if (merged.path !== raw.path) {
      throw new Error(`Player texture key ${raw.key} maps to multiple files`);
    }
    raw.frames.forEach(frame => merged.frames.add(frame));
    if (raw.abilityId) merged.abilityIds.add(raw.abilityId);
    if (raw.deferredId) merged.deferredIds.add(raw.deferredId);
    if (!raw.deferredId && !raw.abilityId) merged.hasCoreConsumer = true;
  }
  return Object.freeze([...byKey.values()]
    .map(entry => freezeMergedEntry(entry, profile)));
}

export function isPlayerAbilityUnlocked(abilityId, upgradeLevels = {}) {
  return !abilityId
    || Number(upgradeLevels?.[PLAYER_ABILITY_ASSET_PACKS[abilityId].upgradeId]) > 0;
}
