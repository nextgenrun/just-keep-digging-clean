/**
 * Camera Shake Signatures
 * ───────────────────────
 * Each in-game event that triggers screen shake uses one of these named
 * "signatures" so the player can tell them apart:
 *
 *   - mining.*        — pickaxe hits tiles (short, sharp, varies by tile hardness)
 *   - earthquake.*    — seismic rumbles (long, low-frequency, building)
 *   - thunderStrike.* — player Thunder Strike ability (fixed feel)
 *   - weatherThunder.*— storm thunder (dynamic intensity/duration)
 *   - combo.*         — combo milestones (tier-scaled punchy)
 *   - misc.*          — level-up, cave-in, player hit
 *
 * Each signature defines:
 *   duration   – how long the shake lasts (ms)
 *   intensity  – peak shake amplitude in pixels
 *   freqX/Y    – oscillation frequency per axis in Hz (lower = rumbly)
 *   decay      – 'exp' (default) | 'linear' | 'none'
 *   priority   – higher-priority shakes can interrupt lower-priority shakes
 *   color      – optional companion screen flash color (0xRRGGBB)
 *   flashAlpha – optional companion flash peak alpha (0-1)
 *
 * Callsite example:  scene.shakeSystem.shake('earthquake.major')
 *
 * The wrapper system lives at systems/visual/CameraShakeSystem.js.
 * It implements a custom multi-frequency shake via camera.setFollowOffset()
 * so we don't rely on Phaser's built-in (which is purely random-noise).
 */
export const CAMERA_SHAKE_DEFAULT_INTENSITY = 1;
export const CAMERA_SHAKE_DEFAULT_FLASH_ENABLED = true;

export const CAMERA_SHAKE_EVENT_GROUPS = Object.freeze({
  mining: "mining",
  earthquake: "earthquake",
  weatherThunder: "weather",
  thunderStrike: "thunderStrike",
  combo: "combo",
  misc: "misc",
});

export const CAMERA_SHAKE_DEFAULT_ENABLED_BY_GROUP = Object.freeze({
  mining: true,
  earthquake: true,
  weather: true,
  thunderStrike: true,
  combo: true,
  misc: true,
});

export const CAMERA_SHAKE_SETTINGS_GROUPS = Object.freeze([
  { key: "mining", label: "Mining", groupKeys: ["mining"] },
  { key: "earthquake", label: "Earthquakes", groupKeys: ["earthquake"] },
  { key: "weather", label: "Weather", groupKeys: ["weather"] },
  { key: "combo", label: "Combat / Combo", groupKeys: ["combo", "thunderStrike"] },
  { key: "misc", label: "Misc", groupKeys: ["misc"] },
]);

export const CAMERA_SHAKE_SIGNATURES = Object.freeze({

  // ─── Mining (pickaxe hits) ───────────────────────────────────────────────
  // Short and tactile. Destruction scales via call-site intensityScale.
  mining: {
    light:   { duration: 45,  intensity: 0.9, freqX: 7.0,  freqY: 9.5,  decay: 'exp', priority: 10 },
    medium:  { duration: 65,  intensity: 1.4, freqX: 8.0,  freqY: 11.0, decay: 'exp', priority: 11 },
    heavy:   { duration: 90,  intensity: 2.2, freqX: 9.0,  freqY: 12.5, decay: 'exp', priority: 12 },
    skyTile: { duration: 150, intensity: 3.8, freqX: 9.5,  freqY: 12.0, decay: 'exp', priority: 18,
               color: 0xFFD700, flashAlpha: 0.02 },
  },

  // ─── Earthquakes ─────────────────────────────────────────────────────────
  // Long, low-frequency rumble that builds. The intensity grows with the
  // depth-band so deep quakes feel catastrophic.
  earthquake: {
    minor:       { duration: 850,  intensity: 2.4, freqX: 1.0, freqY: 1.8, decay: 'linear', priority: 60 },
    moderate:    { duration: 1100, intensity: 3.7, freqX: 1.1, freqY: 2.0, decay: 'linear', priority: 65 },
    major:       { duration: 1450, intensity: 5.3, freqX: 1.2, freqY: 2.3, decay: 'linear', priority: 70 },
    cataclysmic: { duration: 1800, intensity: 7.2, freqX: 1.3, freqY: 2.6, decay: 'linear', priority: 75 },
    // The very brief "warning" rumble that happens between tremble phases
    warning:     { duration: 360,  intensity: 1.15, freqX: 1.6, freqY: 2.4, decay: 'exp', priority: 45 },
    caveIn:      { duration: 560,  intensity: 7, freqX: 2.8, freqY: 6.0, decay: 'exp', priority: 82 },
    // A single falling-rock impact
    rockImpact:  { duration: 230,  intensity: 3.8, freqX: 5.0, freqY: 8.0, decay: 'exp', priority: 80 },
  },

  // ─── Player Thunder Strike (ability) ────────────────────────────────────
  // Escalates with each earned slam while keeping the original key as fallback.
  thunderStrike: {
    ability: { duration: 140, intensity: 4.0, freqX: 15.5, freqY: 8.5, decay: 'exp', priority: 55 },
    slam1:   { duration: 140, intensity: 4.0, freqX: 15.5, freqY: 8.5, decay: 'exp', priority: 55 },
    slam2:   { duration: 190, intensity: 6.4, freqX: 14.5, freqY: 7.5, decay: 'exp', priority: 58,
               color: 0xA982FF, flashAlpha: 0.028 },
    slam3:   { duration: 280, intensity: 10.0, freqX: 12.5, freqY: 6.0, decay: 'exp', priority: 64,
               color: 0xFFE29A, flashAlpha: 0.05 },
  },

  // ─── Weather Thunder (storms) ────────────────────────────────────────────
  // Dynamic per bolt. Call sites scale duration/intensity so distant and close
  // thunder do not all feel identical.
  weatherThunder: {
    close: { duration: 420, intensity: 4.6, freqX: 7.0, freqY: 3.0, decay: 'exp', priority: 50 },
    mid:   { duration: 290, intensity: 2.8, freqX: 5.5, freqY: 2.4, decay: 'exp', priority: 42 },
    far:   { duration: 180, intensity: 1.3, freqX: 3.8, freqY: 1.8, decay: 'exp', priority: 35 },
  },

  // ─── Combo milestones ────────────────────────────────────────────────────
  // Tiny celebratory bump only. No full-screen flash here.
  combo: {
    small:   { duration: 70,  intensity: 1.0, freqX: 7.0, freqY: 8.0,  decay: 'exp', priority: 12 },
    medium:  { duration: 90,  intensity: 1.4, freqX: 7.5, freqY: 8.5,  decay: 'exp', priority: 14 },
    large:   { duration: 120, intensity: 1.8, freqX: 8.0, freqY: 9.0,  decay: 'exp', priority: 16 },
    huge:    { duration: 150, intensity: 2.3, freqX: 8.5, freqY: 9.5,  decay: 'exp', priority: 18 },
    godlike: { duration: 190, intensity: 2.8, freqX: 9.0, freqY: 10.0, decay: 'exp', priority: 20 },
  },

  // ─── Misc one-shots ──────────────────────────────────────────────────────
  misc: {
    levelUp:           { duration: 420, intensity: 6.0, freqX: 4.5, freqY: 5.5, decay: 'exp',
                          color: 0xFFD700, flashAlpha: 0.044 },
    caveIn:            { duration: 600, intensity: 11.0, freqX: 3.0, freqY: 6.0, decay: 'exp',
                          color: 0x6B3010, flashAlpha: 0.04 },
    playerHit:         { duration: 160, intensity: 4.0, freqX: 5.5, freqY: 7.5, decay: 'exp',
                          color: 0xFF3030, flashAlpha: 0.04 },
    constellationUnlock:{ duration: 500, intensity: 5.0, freqX: 4.0, freqY: 5.0, decay: 'exp',
                          color: 0xAABBFF, flashAlpha: 0.036 },
    teleport:          { duration: 380, intensity: 5.0, freqX: 3.0, freqY: 4.0, decay: 'exp',
                          color: 0xAA66FF, flashAlpha: 0.05 },
    depthMilestone:    { duration: 220, intensity: 3.0, freqX: 4.5, freqY: 6.0, decay: 'exp',
                          color: 0xFFD700, flashAlpha: 0.02, priority: 35 },
    legendBlock:       { duration: 260, intensity: 4.4, freqX: 6.0, freqY: 8.0, decay: 'exp',
                          color: 0xFFD700, flashAlpha: 0.024, priority: 45 },
  },
});
