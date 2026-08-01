export const FIRE_LIGHT_PRESENTATION_CONFIG = Object.freeze({
  id: "natural-fire-presentation-v1",
  defaultProfile: "natural",
  legacyPresentationId: "legacy-procedural-v2",
  query: Object.freeze({
    name: "fireLightStyle",
    naturalValue: "natural",
    layeredValue: "layered",
  }),
  profiles: Object.freeze({
    natural: Object.freeze({
      id: "natural-fire-v1",
      flameAlphaScale: 0.88,
      volumeAlphaScale: 0,
      atmosphereAlphaScale: 0,
      expandedIllumination: false,
      proceduralWorldGlow: true,
      proceduralWorldGlowScale: 0.98,
      proceduralShaderMix: 0.96,
      eyeAdaptationEffectScale: 0.24,
      authoredLayerTarget: 1,
    }),
    layered: Object.freeze({
      id: "layered-fire-v3",
      flameAlphaScale: 1,
      volumeAlphaScale: null,
      atmosphereAlphaScale: 1,
      expandedIllumination: true,
      proceduralWorldGlow: false,
      proceduralWorldGlowScale: 0,
      proceduralShaderMix: null,
      eyeAdaptationEffectScale: 1,
      authoredLayerTarget: 8,
    }),
  }),
});

function queryValue(search, name) {
  try {
    return new URLSearchParams(search || "").get(name);
  } catch {
    return null;
  }
}

export function resolveFireLightPresentation(
  search = globalThis.location?.search || "",
  config = FIRE_LIGHT_PRESENTATION_CONFIG
) {
  const selected = queryValue(search, config.query.name);
  return selected === config.query.layeredValue
    ? config.profiles.layered
    : config.profiles.natural;
}
