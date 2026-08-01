const QUERY_ENABLE_VALUES = Object.freeze(["1", "on", "true", "authored"]);
const QUERY_DISABLE_VALUES = Object.freeze(["0", "off", "false", "procedural"]);

const imageAsset = (role, key, path, provenanceId) => Object.freeze({
  role,
  key,
  path,
  provenanceId,
  type: "image",
});

export const HIGH_IMPACT_FX_CONFIG = Object.freeze({
  schemaVersion: 1,
  enabled: true,
  queryParam: "highImpactFx",
  queryEnableValues: QUERY_ENABLE_VALUES,
  queryDisableValues: QUERY_DISABLE_VALUES,
  debugGlobalKey: "__jkdHighImpactFx",
  owner: "high-impact-fx-thunder",
  priority: 97,
  reducedMotionMediaQuery: "(prefers-reduced-motion: reduce)",
  blendMode: "ADD",
  assets: Object.freeze([
    imageAsset(
      "flare",
      "high-impact-fx-thunder-ground-slam-flare-v1",
      "sprites/fx/high-impact-v1/thunder-ground-slam-flare-v1.png",
      "a0048-thunder-ground-slam-flare",
    ),
    imageAsset(
      "ring",
      "high-impact-fx-thunder-chain-echo-ring-v1",
      "sprites/fx/high-impact-v1/thunder-chain-echo-ring-v1.png",
      "a0049-thunder-chain-echo-ring",
    ),
    imageAsset(
      "crackles",
      "high-impact-fx-thunder-lingering-crackles-v1",
      "sprites/fx/high-impact-v1/thunder-lingering-crackles-v1.png",
      "a0050-thunder-lingering-crackles",
    ),
  ]),
  presentation: Object.freeze({
    origin: 0.5,
    depthOffsets: Object.freeze({
      flare: 0,
      ring: 1,
      crackles: 2,
    }),
    stageScale: Object.freeze({
      base: 0.9,
      perStage: 0.045,
      maximum: 1.32,
    }),
    flare: Object.freeze({
      displayWidthPx: 146,
      displayHeightPx: 117,
      alpha: 0.92,
      startScale: 0.68,
      endScale: 1.26,
      durationMs: 360,
      ease: "Cubic.Out",
    }),
    ring: Object.freeze({
      displayWidthPx: 116,
      displayHeightPx: 93,
      widthStepPx: 12,
      heightStepPx: 10,
      alpha: 0.82,
      startScale: 0.58,
      endScale: 1.82,
      durationMs: 470,
      staggerMs: 34,
      minimumCopies: 2,
      maximumCopies: 6,
      ease: "Cubic.Out",
    }),
    crackles: Object.freeze({
      displayWidthPx: 164,
      displayHeightPx: 131,
      alpha: 0.9,
      startScale: 0.76,
      endScale: 1.08,
      durationMs: 430,
      ease: "Quad.Out",
    }),
    reducedMotion: Object.freeze({
      enabled: true,
      lifetimeMs: 260,
      ringCopies: 1,
      flareAlpha: 0.62,
      ringAlpha: 0.55,
      cracklesAlpha: 0.58,
      scale: 0.94,
    }),
  }),
});

export function resolveHighImpactFxEnabled(
  config = HIGH_IMPACT_FX_CONFIG,
  search = globalThis.location?.search || "",
) {
  const value = new URLSearchParams(search)
    .get(config.queryParam)
    ?.trim()
    .toLowerCase();
  if (value && config.queryDisableValues.includes(value)) return false;
  if (value && config.queryEnableValues.includes(value)) return true;
  return config.enabled === true;
}
