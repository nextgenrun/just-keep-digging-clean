const DISABLED_QUERY_VALUES = Object.freeze([
  "0",
  "false",
  "off",
  "disabled",
]);

const LEGACY_ENCOUNTER_VALUES = Object.freeze([
  "legacy",
  "full",
  "full-clear",
]);

export const TITAN_DISCOVERY_EXPERIENCE = Object.freeze({
  encounter: Object.freeze({
    queryParam: "titanEncounter",
    legacyValues: LEGACY_ENCOUNTER_VALUES,
    creatureModeId: "creature",
    legacyModeId: "legacy",
    minimumCoverageTiles: 8,
    requiredClearRatio: 0.5,
    autoClearRemainingCoverage: true,
    legacyTriggerRangeTiles: 16,
  }),
  guidance: Object.freeze({
    enabledByDefault: true,
    queryParam: "titanGuidance",
    disabledValues: DISABLED_QUERY_VALUES,
    proximityRangeTiles: 72,
    refreshIntervalMs: 900,
    nearDistanceTiles: 10,
    clueSourceId: "clue",
    resonanceSourceId: "resonance",
    resonanceCopy: "ANCIENT RESONANCE",
    clueCopy: "TITAN LOCATOR CLUE",
    nearbyCopy: "TITAN CHAMBER NEARBY",
    insideCopy: "TITAN RESONANCE FOUND",
    eastCopy: "EAST",
    westCopy: "WEST",
    aboveCopy: "ABOVE",
    belowCopy: "BELOW",
    tileUnitCopy: "TILES",
    meterUnitCopy: "m",
    separatorCopy: "  -  ",
    indicator: Object.freeze({
      depth: 994,
      referenceViewportWidthPx: 1280,
      referenceViewportHeightPx: 720,
      pointerSizePx: 72,
      onScreenTargetGapPx: 42,
      pointerAlpha: 0.94,
      resonanceAlpha: 0.72,
      clueAlpha: 0.88,
      pointerPulseScale: 0.018,
      pointerPulsePeriodMs: 2100,
      safeArea: Object.freeze({
        leftPx: 18,
        rightPx: 18,
        topPx: 168,
        bottomPx: 88,
      }),
    }),
  }),
});

export function resolveTitanEncounterMode(
  config = TITAN_DISCOVERY_EXPERIENCE,
  search = globalThis.location?.search || ""
) {
  const value = new URLSearchParams(search)
    .get(config.encounter.queryParam)
    ?.trim()
    .toLowerCase();
  return value && config.encounter.legacyValues.includes(value)
    ? config.encounter.legacyModeId
    : config.encounter.creatureModeId;
}

export function resolveTitanGuidanceEnabled(
  config = TITAN_DISCOVERY_EXPERIENCE,
  search = globalThis.location?.search || ""
) {
  const guidance = config.guidance;
  const value = new URLSearchParams(search)
    .get(guidance.queryParam)
    ?.trim()
    .toLowerCase();
  if (value && guidance.disabledValues.includes(value)) return false;
  return guidance.enabledByDefault;
}
