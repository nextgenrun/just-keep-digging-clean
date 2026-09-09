import { RETENTION_CONFIG } from "../../values/retentionConfig.js";

function isTutorialActive(scene) {
  const stage = scene.retentionProgressSystem?.getTutorialState?.()?.stage;
  return RETENTION_CONFIG.tutorial.activeStages.includes(stage);
}

export function buildPlaySceneMusicSnapshot(scene, depth = 0) {
  const earthquake = scene.earthquakeSystem?.getStatus?.() || {};
  const wurm = scene.graveborerWurmSystem?.getSnapshot?.() || {};
  const hardcore = scene._hardcoreRuntime?.system?.getSnapshot?.() || {};
  return Object.freeze({
    scene: "play",
    gameState: scene.gameState || "playing",
    depth: Math.max(0, Number(depth) || 0),
    biome: scene.biomeSystem?.getActiveBiomeName?.(depth) || "surface",
    dayPhase: scene.dayNightCycle?.getCurrentPhaseName?.() || "afternoon",
    weather: scene.weatherSystem?.kind || "clear",
    tutorialActive: isTutorialActive(scene),
    earthquakeState: earthquake.state || "idle",
    earthquakePlayerAware: earthquake.playerAware === true,
    wurmActive: wurm.active === true,
    wurmPhase: wurm.phase || "dormant",
    hardcoreArmed: hardcore.armed === true,
    hardcoreStressBand: hardcore.stressBand || "calm",
  });
}

export function syncPlaySceneMusicContext(
  scene,
  time,
  depth,
  options = {},
) {
  if (!scene.soundSystem?.updateMusicContext) return null;
  return scene.soundSystem.updateMusicContext(
    buildPlaySceneMusicSnapshot(scene, depth),
    { ...options, now: time },
  );
}
