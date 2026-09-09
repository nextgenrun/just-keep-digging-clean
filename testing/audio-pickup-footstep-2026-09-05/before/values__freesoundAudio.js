import { CORE_ACTION_AUDIO } from "./coreActionAudio.js";
import { TILE_TYPES } from "./tileTypes.js";
import { FREESOUND_APPROVED_LIST, FREESOUND_ROLE_SETTINGS, FREESOUND_LEVEL_POLICY } from "./generated/approved-freesound/index.js";

export { FREESOUND_ROLE_SETTINGS };
export const FREESOUND_AUDIO_ASSETS = Object.freeze(Object.fromEntries(
  FREESOUND_APPROVED_LIST.map(asset => [asset.id, Object.freeze({
    ...FREESOUND_ROLE_SETTINGS[asset.role], ...asset,
    gain: asset.gain * Math.max(FREESOUND_LEVEL_POLICY.minimum, Math.min(FREESOUND_LEVEL_POLICY.maximum,
      10 ** ((FREESOUND_LEVEL_POLICY.targetRmsDb - asset.activeRmsDb) / 20))),
  })]),
));

const coreRoles = new Map(Object.entries(CORE_ACTION_AUDIO.banks)
  .flatMap(([role, ids]) => ids.map(id => [id, role])));
for (const id of coreRoles.keys()) {
  if (!FREESOUND_AUDIO_ASSETS[id]) throw new Error(`Unknown core audio source: ${id}`);
}
// Recording approval and active routing are separate; preserve the source registry.
export const FREESOUND_RUNTIME_ASSETS = Object.freeze(Object.fromEntries(
  Object.values(FREESOUND_AUDIO_ASSETS).filter(asset =>
    !CORE_ACTION_AUDIO.banks[asset.role] || coreRoles.has(asset.id)).map(asset => {
    const role = coreRoles.get(asset.id) || asset.role;
    const settings = FREESOUND_ROLE_SETTINGS[role];
    return [asset.id, Object.freeze({ ...asset, ...settings, role,
      gain: asset.gain * settings.gain / FREESOUND_ROLE_SETTINGS[asset.role].gain
        * (CORE_ACTION_AUDIO.gain[role] ?? 1) })];
  }),
));

export const FREESOUND_AUDIO = Object.freeze({
  enabledByDefault: true,
  rollbackQuery: "approvedFreesoundAudio",
  maxBankSize: 6,
  minimumBankSize: 2,
  identityHashOffset: 2166136261,
  identityHashMultiplier: 16777619,
  bankHoldMs: 90000,
  bankUsesBeforeRotation: 24,
  warmAhead: 3,
  maxPending: 4,
  maxResident: 48,
  maxDecodedBytes: 33554432,
  sampleRate: 48000,
  sampleBytes: 4,
  codecTailToleranceSeconds: 0.025,
  failedRetryMs: 15000,
  maxHistory: 60,
  maxDeltaMs: 100,
  busyWindowMs: 1800,
  structuralGapMs: 45000,
  structuralFirstDelayMs: 22000,
  structuralBiomes: Object.freeze(["amber", "root", "wood", "timber"]),
  structuralDepth: 100,
  quakeGapMs: 9000,
  quakeStates: Object.freeze(["warning", "earthquake", "aftermath"]),
  flightMinSpeed: 80,
  floorProbeTiles: 0.06,
  flightTurnThreshold: 140,
  crystalTypes: Object.freeze([TILE_TYPES.GEODE_INTERIOR, TILE_TYPES.MAGMA_CRYSTAL, TILE_TYPES.OBSIDIAN]),
  softTypes: Object.freeze([TILE_TYPES.DIRT, TILE_TYPES.DARK_DIRT_NORMAL, TILE_TYPES.DARK_DIRT_STRONG, TILE_TYPES.LAVA_DIRT]),
  metalTypes: Object.freeze([TILE_TYPES.COPPER, TILE_TYPES.BRONZE, TILE_TYPES.STEEL, TILE_TYPES.IRON, TILE_TYPES.SILVER, TILE_TYPES.GOLD, TILE_TYPES.EMBER_ORE]),
  menuRoles: Object.freeze(["uiClick", "uiMechanical", "coinReward"]),
  stars: Object.freeze({
    enterRadius: 10, exitRadius: 12, fullRadius: 1.8, detailRadius: 3.4,
    scanMs: 180, handoverMargin: 0.9, maxPan: 0.82,
    rockGain: 0.55, rockCutoff: 1300, openCutoff: 10000,
    rockSampleStep: 0.6, maxRockSamples: 24,
    peakBudget: 0.045, maxVoices: 4, fadeMs: 950,
    holdWhileLoading: false,
    accentGapMs: 26000, firstAccentMs: 12000, consumptionQuietMs: 1600,
    refugeAmbienceGain: 0.55, normalAmbienceGain: 1,
    fallbackTileSize: 94,
  }),
  panic: Object.freeze({
    peakBudget: 0.045, maxVoices: 2, fadeMs: 1500,
    holdWhileLoading: false, recoveryMs: 6500, minimumBandHoldMs: 1600,
    warningGain: 0.8, criticalGain: 1, recoveryGain: 0.45,
  }),
});
