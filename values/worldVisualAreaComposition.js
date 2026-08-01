const DISABLED_QUERY_VALUES = Object.freeze(["0", "false", "off"]);

const profile = ({
  areaWidthCards,
  areaHeightCards,
  motifSpan,
  rowRepeatCards,
  horizontalAssetStep,
  verticalAssetStep,
}) => Object.freeze({
  areaWidthCards,
  areaHeightCards,
  motifSpan,
  rowRepeatCards,
  horizontalAssetStep,
  verticalAssetStep,
});

export const WORLD_VISUAL_AREA_COMPOSITION = Object.freeze({
  enabledByDefault: true,
  queryParam: "naturalDepthAreas",
  disabledQueryValues: DISABLED_QUERY_VALUES,
  profiles: Object.freeze({
    backdrop: profile({
      areaWidthCards: 6,
      areaHeightCards: 5,
      motifSpan: 3,
      rowRepeatCards: 2,
      horizontalAssetStep: 3,
      verticalAssetStep: 1,
    }),
    terrain: profile({
      areaWidthCards: 6,
      areaHeightCards: 5,
      motifSpan: 3,
      rowRepeatCards: 2,
      horizontalAssetStep: 3,
      verticalAssetStep: 1,
    }),
    groundStructure: profile({
      areaWidthCards: 8,
      areaHeightCards: 6,
      motifSpan: 2,
      rowRepeatCards: 3,
      horizontalAssetStep: 2,
      verticalAssetStep: 1,
    }),
  }),
});

export function resolveWorldVisualAreaCompositionEnabled(
  config = WORLD_VISUAL_AREA_COMPOSITION,
  search = globalThis.location?.search || ""
) {
  const value = new URLSearchParams(search)
    .get(config.queryParam)
    ?.trim()
    .toLowerCase();
  if (value && config.disabledQueryValues.includes(value)) return false;
  return config.enabledByDefault !== false;
}

export function resolveWorldVisualAreaCompositionProfile(
  profileId,
  config = WORLD_VISUAL_AREA_COMPOSITION
) {
  return config.profiles[profileId] || config.profiles.backdrop;
}
