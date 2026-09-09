/** The original Standard Walk is walking; the retained jog stays on Ctrl running. */
export const PLAYER_SKELETAL_RUN = Object.freeze({
  enabled: true,
  characterId: "survivalUal",
  rollbackQuery: "skeletalRun",
  assetPath: "sprites/character/survival-skeletal-run-v1/survival-legacy-jog.glb",
  clipName: "Legacy_Jog_Run",
  walk: Object.freeze({
    assetPath: "sprites/character/survival-skeletal-walk-v1/standard-walk.glb",
    clipName: "Original_Run_Standard_Walk",
    strideTilesPerCycle: 1.55,
    minTimeScale: 0.3,
  }),
  gaitBlendSeconds: 0.12,
  texturePrefix: "survival-skeletal-run-v1",
  resolution: 384,
  visibleHeightTiles: 0.8,
  cameraExtent: 1.45,
  cameraTargetHeight: 0.5,
  cameraOffset: Object.freeze([1.85, 0.32, -6]),
  near: 0.01,
  far: 100,
  exposure: 1.2,
  environmentColor: 0xb7c6da,
  environmentIntensity: 1.0,
  stepsPerCycle: 2,
  ambient: Object.freeze({ sky: 0xfff4e2, ground: 0x344354, intensity: 2.6 }),
  keyLight: Object.freeze({ color: 0xfff5e7, intensity: 4.8, position: [3, 4, -4] }),
  fillLight: Object.freeze({ color: 0xb8d8ed, intensity: 2.0, position: [-3, 2, 1] }),
  strideTilesPerCycle: 2.4,
  minTimeScale: 0.65,
  maxTimeScale: 2.5,
  maxDeltaMs: 50,
  minimumSpeed: 24,
  postUpdateEvent: "postupdate",
});
export function isSkeletalRunEnabled(profile, search = globalThis.location?.search || "") {
  const value = new URLSearchParams(search).get(PLAYER_SKELETAL_RUN.rollbackQuery);
  return PLAYER_SKELETAL_RUN.enabled && profile?.characterId === PLAYER_SKELETAL_RUN.characterId
    && !["0", "false", "off"].includes(value);
}
