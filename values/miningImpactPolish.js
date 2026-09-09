/** Contact-owned camera/pose feedback and native-pixel selection, never mining authority. */
export const MINING_IMPACT_POLISH_CONFIG = Object.freeze({
  enabled: true,
  queryParam: "impactPolish",
  shakeQueryParam: "impactShake",
  hitstopQueryParam: "impactHitstop",
  disabledValues: Object.freeze(["0", "false", "off", "legacy"]),
  reducedMotionMediaQuery: "(prefers-reduced-motion: reduce)",
  events: Object.freeze({ preUpdate: "preupdate", render: "render", pause: "pause", sleep: "sleep", shutdown: "shutdown" }),
  texture: Object.freeze({ maximumUpscale: 1.15, linearFilter: "LINEAR" }),
  shake: Object.freeze({ hitScale: 1, breakScale: 1.4, maximumIntensityPx: 3, tangentRatio: 0.24 }),
  hitstop: Object.freeze({
    authoredTrigger: "animationupdate",
    // A tiny pose-only hold: input, collision, hazards, cooldowns and scene time keep running.
    minimumMs: 12, maximumMs: 40, breakBonusMs: 8, minimumIntervalMs: 90,
    movingScale: 0.65, movingThresholdPxPerSec: 30, maximumFrameRatio: 0.85,
    fallbackFrameMs: 33.333333333333336,
    durationByFamily: Object.freeze({
      dirt: 18, damp: 18, hard: 24, copper: 26, bronze: 26, iron: 28,
      steel: 28, silver: 24, gold: 24, lava: 18, obsidian: 28, ember: 24,
      magma: 26, crystal: 24, geode: 26, relic: 28, special: 24,
    }),
  }),
});

export function resolveMiningImpactPolish(search = globalThis.location?.search || "") {
  const cfg = MINING_IMPACT_POLISH_CONFIG;
  const query = new URLSearchParams(search);
  const enabled = key => !cfg.disabledValues.includes(query.get(key)?.trim().toLowerCase());
  const active = cfg.enabled && enabled(cfg.queryParam);
  return { enabled: active, shake: active && enabled(cfg.shakeQueryParam), hitstop: active && enabled(cfg.hitstopQueryParam) };
}
