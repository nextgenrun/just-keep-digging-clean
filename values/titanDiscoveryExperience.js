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
    minimumRevealRatio: 0.025,
    minimumRevealTiles: 4,
    entryPaddingTiles: 1,
    legacyTriggerRangeTiles: 16,
  }),
  guidance: Object.freeze({
    enabledByDefault: true,
    queryParam: "titanGuidance",
    disabledValues: DISABLED_QUERY_VALUES,
    verticalRangeTiles: 72,
    refreshIntervalMs: 900,
    messageDurationMs: 2200,
    discoveryDurationMs: 5200,
    nearDistanceTiles: 10,
    notificationPriority: 1,
    notificationKey: "titan-resonance",
    discoveryKeyPrefix: "titan-discovered:",
    clueSourceId: "clue",
    resonanceSourceId: "resonance",
    resonanceCopy: "ANCIENT RESONANCE",
    clueCopy: "TITAN LOCATOR CLUE",
    nearbyCopy: "TITAN CHAMBER NEARBY",
    insideCopy: "TITAN CHAMBER - KEEP EXCAVATING",
    discoveredCopy: "TITAN DISCOVERED",
    eastCopy: "EAST",
    westCopy: "WEST",
    aboveCopy: "ABOVE",
    belowCopy: "BELOW",
    tileUnitCopy: "TILES",
    meterUnitCopy: "m",
    separatorCopy: "  -  ",
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
    ? "legacy"
    : "entry";
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
