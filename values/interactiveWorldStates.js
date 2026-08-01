const QUERY_DISABLED_VALUES = Object.freeze([
  "0",
  "false",
  "off",
  "disabled",
  "legacy",
]);

const RUNTIME_ROOT = "sprites/environment/interactive-world-states-v1";
const APPROVED_FAMILIES = Object.freeze([
  "cache",
  "memory-reliquary",
]);

const stateFrame = (id, index) => Object.freeze({ id, index });
const biomeRegion = (id, topTile, bottomTileExclusive) => Object.freeze({
  id,
  topTile,
  bottomTileExclusive,
});
const reliquary = (
  id,
  biomeId,
  caveId,
  tileX,
  floorTileY,
  title,
  inscription,
) => Object.freeze({
  id,
  biomeId,
  caveId,
  tileX,
  floorTileY,
  journalKey: `memory-reliquary:${id}`,
  title,
  inscription,
});

export const INTERACTIVE_WORLD_STATES = Object.freeze({
  runtimeRoot: RUNTIME_ROOT,
  approvedFamilies: APPROVED_FAMILIES,
  atlas: Object.freeze({
    frameWidthPx: 448,
    frameHeightPx: 448,
    columns: 5,
    rows: 2,
    frameCount: 10,
    frameNamePrefix: "interactive-world-state-frame-",
    textureKeyPrefix: "interactive-world-state-v1-",
    textureFilter: "LINEAR",
  }),
  states: Object.freeze({
    dormant: stateFrame("dormant", 0),
    proximityReady: stateFrame("proximity-ready", 1),
    activation: Object.freeze([
      stateFrame("activation-01", 2),
      stateFrame("activation-02", 3),
      stateFrame("activation-03", 4),
    ]),
    activeLoop: Object.freeze([
      stateFrame("active-loop-a", 5),
      stateFrame("active-loop-b", 6),
    ]),
    resolved: stateFrame("resolved-success", 7),
    spent: stateFrame("depleted-spent", 8),
    damaged: stateFrame("damaged-broken", 9),
  }),
  streaming: Object.freeze({
    owner: "interactive-world-states",
    priority: 79,
    releaseDelayMs: 5000,
    assetType: "image",
  }),
  render: Object.freeze({
    depth: 2.49,
    fullAlpha: 1,
  }),
  biomeRegions: Object.freeze([
    biomeRegion("weathered-roots", 65, 160),
    biomeRegion("blue-caverns", 160, 520),
    biomeRegion("amber-depths", 520, 1040),
    biomeRegion("silver-core", 1040, 1600),
    biomeRegion("core-magma", 1600, 2065),
    biomeRegion("slagworks", 2065, 2665),
    biomeRegion("obsidian-catacombs", 2665, 3265),
    biomeRegion("pressure-foundry", 3265, 3865),
    biomeRegion("blackglass-abyss", 3865, 4465),
    biomeRegion("starfire-rift", 4465, 5065),
  ]),
  animatedCaches: Object.freeze({
    enabledByDefault: true,
    queryParam: "animatedCaches",
    disabledValues: QUERY_DISABLED_VALUES,
    familyId: "cache",
    displaySizeTiles: 2.65,
    cameraPaddingTiles: 7,
    proximityRangeTiles: 4,
    activationFrameMs: 115,
    activeLoopFrameMs: 145,
    activeLoopDurationMs: 580,
    resolvedHoldMs: 420,
    spentAlpha: 0.9,
    consumerPrefix: "animated-cache:",
    spriteNamePrefix: "animated-cache-visual:",
  }),
  memoryReliquaries: Object.freeze({
    enabledByDefault: true,
    queryParam: "memoryReliquaries",
    disabledValues: QUERY_DISABLED_VALUES,
    familyId: "memory-reliquary",
    displaySizeTiles: 3.1,
    preloadRangeTiles: 18,
    interactionRangeTiles: 3,
    activationFrameMs: 135,
    activeLoopFrameMs: 170,
    activeLoopDurationMs: 680,
    resolvedHoldMs: 460,
    consumerPrefix: "memory-reliquary:",
    spriteNamePrefix: "memory-reliquary-visual:",
    journalKeyPrefix: "memory-reliquary:",
    prompt: Object.freeze({
      openVerb: "Open Memory Reliquary",
      readVerb: "Read World Memory",
      yOffsetTiles: 3.25,
    }),
    notification: Object.freeze({
      titlePrefix: "WORLD MEMORY",
      archiveHint: "Recorded in Journey findings.",
      separator: "  •  ",
      keyPrefix: "memory-reliquary-lore:",
      priority: 28,
    }),
    placementContract: Object.freeze({
      clearanceHalfWidthTiles: 1,
      clearanceHeightTiles: 4,
      floorSupportHalfWidthTiles: 1,
    }),
    definitions: Object.freeze([
      reliquary(
        "root-oath",
        "weathered-roots",
        "second-world-cave-157",
        210,
        88,
        "The Root Oath",
        "The first miners asked the roots for passage. The roots answered by remembering every footstep.",
      ),
      reliquary(
        "ice-bell",
        "blue-caverns",
        "second-world-cave-154",
        159,
        373,
        "The Bell Beneath Ice",
        "A bell was lowered into the blue dark. It still rings whenever the stone shifts in its sleep.",
      ),
      reliquary(
        "small-sun",
        "amber-depths",
        "second-world-cave-131",
        233,
        796,
        "A Sun Kept Small",
        "Amber keepers trapped one morning in resin, saving its warmth for a generation that never arrived.",
      ),
      reliquary(
        "mirror-shift",
        "silver-core",
        "second-world-cave-17",
        165,
        1311,
        "The Mirror Shift",
        "The silver crews stopped signing their names. Their reflections had begun signing first.",
      ),
      reliquary(
        "sleeping-furnace",
        "core-magma",
        "second-world-cave-184",
        159,
        1785,
        "When the Furnace Slept",
        "For one quiet hour the deep fires went dark, and the mountain dreamed of snow.",
      ),
      reliquary(
        "rail-names",
        "slagworks",
        "second-world-cave-58",
        243,
        2366,
        "Names on the Rail",
        "Every freight crew carved a name into the iron. Heat erased the letters but never their order.",
      ),
      reliquary(
        "unbroken-choir",
        "obsidian-catacombs",
        "second-world-cave-53",
        239,
        3169,
        "The Unbroken Choir",
        "The catacombs learned the final note of each visitor and built a song no living throat could finish.",
      ),
      reliquary(
        "pressure-bell",
        "pressure-foundry",
        "second-world-cave-83",
        174,
        3552,
        "The Last Pressure Bell",
        "When the gauges failed, one engineer rang the warning by hand until the pipes themselves took up the rhythm.",
      ),
      reliquary(
        "sky-below",
        "blackglass-abyss",
        "second-world-cave-137",
        165,
        4119,
        "A Sky Below Stone",
        "Blackglass reflected stars that had not risen yet. The watchers called them promises; the miners called them exits.",
      ),
      reliquary(
        "deep-constellation",
        "starfire-rift",
        "second-world-cave-213",
        158,
        4729,
        "The Deepest Constellation",
        "At the last rift, scattered lights arranged themselves around the first miner to look back upward.",
      ),
    ]),
  }),
});

export function resolveInteractiveWorldStateFeature(
  feature,
  search = globalThis.location?.search || "",
) {
  const value = new URLSearchParams(search)
    .get(feature.queryParam)
    ?.trim()
    .toLowerCase();
  return value && feature.disabledValues.includes(value)
    ? false
    : feature.enabledByDefault;
}

export function getInteractiveWorldStateBiome(tileY) {
  const resolvedTileY = Math.floor(Number(tileY));
  return INTERACTIVE_WORLD_STATES.biomeRegions.find(region => (
    resolvedTileY >= region.topTile
    && resolvedTileY < region.bottomTileExclusive
  )) || null;
}

export function getInteractiveWorldStateAsset(biomeId, familyId) {
  if (
    !INTERACTIVE_WORLD_STATES.approvedFamilies.includes(familyId)
    || !INTERACTIVE_WORLD_STATES.biomeRegions.some(region => region.id === biomeId)
  ) {
    return null;
  }
  return Object.freeze({
    key: `${INTERACTIVE_WORLD_STATES.atlas.textureKeyPrefix}${biomeId}-${familyId}`,
    path: `${INTERACTIVE_WORLD_STATES.runtimeRoot}/${biomeId}-${familyId}-states-atlas-v1.webp`,
    type: INTERACTIVE_WORLD_STATES.streaming.assetType,
  });
}

export function getInteractiveWorldStateFrameName(index) {
  return `${INTERACTIVE_WORLD_STATES.atlas.frameNamePrefix}${index}`;
}

export function getMemoryReliquaryByJournalKey(journalKey) {
  return INTERACTIVE_WORLD_STATES.memoryReliquaries.definitions.find(
    definition => definition.journalKey === journalKey,
  ) || null;
}
