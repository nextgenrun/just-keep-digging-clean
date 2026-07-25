function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function mixColor(from, to, amount) {
  const t = clamp01(amount);
  const channel = shift => Math.round(((from >> shift) & 255) * (1 - t) + ((to >> shift) & 255) * t);
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

export class WorldVisualLightingBridge {
  constructor(scene) {
    this.scene = scene;
  }

  sample() {
    const night = clamp01(this.scene.dayNightCycle?.getNightAmount?.() || 0);
    const weather = this.scene.weatherSystem;
    const snapshot = weather?.getLightingSnapshot?.() || {};
    const intensity = clamp01(snapshot.intensity ?? weather?.intensity ?? 0);
    const kind = String(snapshot.kind || weather?.kind || weather?.currentWeather || "clear").toLowerCase();
    const wet = clamp01(
      snapshot.surfaceWetness
      ?? snapshot.worldWetnessAmount
      ?? (["drizzle", "rain", "storm"].includes(kind) ? intensity : 0)
    );
    const fog = clamp01(snapshot.fogAmount ?? (kind.includes("fog") ? intensity : 0));
    const snow = kind.includes("snow") ? intensity : 0;
    const lightning = clamp01(snapshot.lightningFlashAmount ?? snapshot.lightning ?? snapshot.flash ?? 0);
    const daylight = 1 - night;
    const coolWeather = clamp01(wet * 0.24 + fog * 0.18 + snow * 0.14);
    const farTint = mixColor(
      mixColor(0xffffff, 0xd6e3f2, daylight * 0.34),
      0xa9c7e5,
      coolWeather
    );
    const terrainTint = mixColor(
      mixColor(0xffffff, 0xf2dfbd, daylight * 0.08),
      0xa8bfd5,
      wet * 0.16 + fog * 0.08
    );
    return Object.freeze({
      night,
      daylight,
      wet,
      fog,
      snow,
      lightning,
      wind: Number(snapshot.wind ?? weather?.wind ?? 0) || 0,
      exposure: clamp01(snapshot.sunExposure ?? snapshot.exposure ?? 1),
      farTint: lightning > 0 ? mixColor(farTint, 0xeaf7ff, lightning) : farTint,
      terrainTint: lightning > 0 ? mixColor(terrainTint, 0xffffff, lightning * 0.65) : terrainTint,
      cloudAlpha: clamp01(0.035 + wet * 0.15 + fog * 0.12 + snow * 0.06),
    });
  }
}
