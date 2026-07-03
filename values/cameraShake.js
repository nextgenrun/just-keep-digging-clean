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
 *   - misc.*          — gem-vision reveal, level-up, cave-in, player hit
 *
 * Each signature defines:
 *   duration   – how long the shake lasts (ms)
 *   intensity  – peak shake amplitude in pixels
 *   freqX/Y    – oscillation frequency per axis (Hz-ish, lower = rumbly)
 *   decay      – 'exp' (default) | 'linear' | 'none'
 *   priority   – higher-priority shakes can interrupt lower-priority shakes
 *   color      – optional companion screen flash color (0xRRGGBB)
 *   flashAlpha – optional companion flash peak alpha (0-1)
 *
 * Callsite example:  scene.shakeSystem.shake('earthquake.major')
 *
 * The wrapper system lives at js/systems/CameraShakeSystem.js.
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
    light:   { duration: 45,  intensity: 0.9, freqX: 0.070, freqY: 0.095, decay: 'exp', priority: 10 },
    medium:  { duration: 65,  intensity: 1.4, freqX: 0.080, freqY: 0.110, decay: 'exp', priority: 10 },
    heavy:   { duration: 90,  intensity: 2.2, freqX: 0.090, freqY: 0.125, decay: 'exp', priority: 10 },
    crit:    { duration: 125, intensity: 3.4, freqX: 0.105, freqY: 0.135, decay: 'exp', priority: 20,
               color: 0xFFE066, flashAlpha: 0.016 },
    skyTile: { duration: 150, intensity: 3.8, freqX: 0.095, freqY: 0.120, decay: 'exp', priority: 18,
               color: 0xFFD700, flashAlpha: 0.02 },
  },

  // ─── Earthquakes ─────────────────────────────────────────────────────────
  // Long, low-frequency rumble that builds. The intensity grows with the
  // depth-band so deep quakes feel catastrophic.
  earthquake: {
    minor:       { duration: 650,  intensity: 1.5, freqX: 0.010, freqY: 0.018, decay: 'linear', priority: 60 },
    moderate:    { duration: 850,  intensity: 2.4, freqX: 0.011, freqY: 0.020, decay: 'linear', priority: 65 },
    major:       { duration: 1050, intensity: 3.6, freqX: 0.012, freqY: 0.023, decay: 'linear', priority: 70 },
    cataclysmic: { duration: 1300, intensity: 5.2, freqX: 0.013, freqY: 0.026, decay: 'linear', priority: 75 },
    // The very brief "warning" rumble that happens between tremble phases
    warning:     { duration: 240,  intensity: 0.7, freqX: 0.016, freqY: 0.024, decay: 'exp', priority: 45 },
    caveIn:      { duration: 420,  intensity: 5.8, freqX: 0.028, freqY: 0.060, decay: 'exp', priority: 82 },
    // A single falling-rock impact
    rockImpact:  { duration: 180,  intensity: 3.0, freqX: 0.050, freqY: 0.080, decay: 'exp', priority: 80 },
  },

  // ─── Player Thunder Strike (ability) ────────────────────────────────────
  // Fixed every time so the ability feels reliable and learnable.
  thunderStrike: {
    ability: { duration: 140, intensity: 4.0, freqX: 0.155, freqY: 0.085, decay: 'exp', priority: 55 },
  },

  // ─── Weather Thunder (storms) ────────────────────────────────────────────
  // Dynamic per bolt. Call sites scale duration/intensity so distant and close
  // thunder do not all feel identical.
  weatherThunder: {
    close: { duration: 420, intensity: 4.6, freqX: 0.070, freqY: 0.030, decay: 'exp', priority: 50 },
    mid:   { duration: 290, intensity: 2.8, freqX: 0.055, freqY: 0.024, decay: 'exp', priority: 42 },
    far:   { duration: 180, intensity: 1.3, freqX: 0.038, freqY: 0.018, decay: 'exp', priority: 35 },
  },

  // ─── Combo milestones ────────────────────────────────────────────────────
  // Tiny celebratory bump only. No full-screen flash here.
  combo: {
    small:   { duration: 70,  intensity: 1.0, freqX: 0.070, freqY: 0.080, decay: 'exp', priority: 12 },
    medium:  { duration: 90,  intensity: 1.4, freqX: 0.075, freqY: 0.085, decay: 'exp', priority: 14 },
    large:   { duration: 120, intensity: 1.8, freqX: 0.080, freqY: 0.090, decay: 'exp', priority: 16 },
    huge:    { duration: 150, intensity: 2.3, freqX: 0.085, freqY: 0.095, decay: 'exp', priority: 18 },
    godlike: { duration: 190, intensity: 2.8, freqX: 0.090, freqY: 0.100, decay: 'exp', priority: 20 },
  },

  // ─── Misc one-shots ──────────────────────────────────────────────────────
  misc: {
    gemVisionActivate: { duration: 220, intensity: 4.5, freqX: 0.040, freqY: 0.050, decay: 'exp',
                          color: 0x44CCFF, flashAlpha: 0.024 },
    levelUp:           { duration: 420, intensity: 6.0, freqX: 0.045, freqY: 0.055, decay: 'exp',
                          color: 0xFFD700, flashAlpha: 0.044 },
    caveIn:            { duration: 600, intensity: 11.0, freqX: 0.030, freqY: 0.060, decay: 'exp',
                          color: 0x6B3010, flashAlpha: 0.04 },
    playerHit:         { duration: 160, intensity: 4.0, freqX: 0.055, freqY: 0.075, decay: 'exp',
                          color: 0xFF3030, flashAlpha: 0.04 },
    constellationUnlock:{ duration: 500, intensity: 5.0, freqX: 0.040, freqY: 0.050, decay: 'exp',
                          color: 0xAABBFF, flashAlpha: 0.036 },
    teleport:          { duration: 380, intensity: 5.0, freqX: 0.030, freqY: 0.040, decay: 'exp',
                          color: 0xAA66FF, flashAlpha: 0.05 },
    depthMilestone:    { duration: 220, intensity: 3.0, freqX: 0.045, freqY: 0.060, decay: 'exp',
                          color: 0xFFD700, flashAlpha: 0.02, priority: 35 },
    legendBlock:       { duration: 260, intensity: 4.4, freqX: 0.060, freqY: 0.080, decay: 'exp',
                          color: 0xFFD700, flashAlpha: 0.024, priority: 45 },
  },
});
