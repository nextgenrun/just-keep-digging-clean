// Review-only SSOT for the complete ground-level runtime composition.
// It maps the fourteen approved 2026-07-28 surface panels to checked-in assets.

const freezeList = values => Object.freeze(values.map(value => Object.freeze(value)));

const chapter = (id, label, leftTile, anchor, supports, activity) => ({
  id,
  label,
  leftTile,
  rightTile: leftTile + 20,
  centerTile: leftTile + 10,
  anchor,
  supports,
  activity,
});

export const WORLD_VISUAL_GROUND_LEVEL_RUNTIME_REVIEW = Object.freeze({
  reviewOnly: true,
  productionChanged: false,
  version: "ground-level-world-piecemeal-background-v4-2026-08-31",
  benchmark: "observatory-authored-layers-v15-motion-quality",
  assetPolicy: "background-sources-only-no-legacy-prop-or-structure-overlays",
  backgroundPolicy: "one-explicit-profile-per-chapter-no-generic-fallback",
  overlayPolicy: "legacy-and-archive-overlays-excluded",
  hardBakedSurfaceChunkPolicy: "excluded",
  actorPolicy: "none-background-review",
  townVideoPolicy: "preserve-surface-town-air-v1-byte-for-byte",
  townVideoSha256: "1650f7a88e2445ef9ab1be954680e4a8d5ffb51b2ccd8e7def5bec19726132d6",
  viewport: Object.freeze({ width: 1536, height: 864 }),
  tileSize: 94,
  surfaceTileY: 65,
  worldWidthTiles: 280,
  backgroundColor: "#050911",
  defaultChapterId: "observatory",
  camera: Object.freeze({
    centerTileY: 61.15,
    defaultZoom: 1,
    minimumZoom: 0.78,
    maximumZoom: 1.18,
    wheelZoomStep: 0.0005,
  }),
  chapters: freezeList([
    chapter("merchant-hearth", "Merchant Hearth", 0, "Town Square and hearth", "market edge, lamps, contact clutter", "merchant crossing"),
    chapter("titan-west", "Titan Walk West", 20, "western Titan promenade", "plinth gaps, plants, lantern rhythm", "pilgrim walk"),
    chapter("titan-east", "Titan Walk East + Honor Garden", 40, "eastern Titan promenade", "garden rests, benches, tribute pockets", "groundskeeper"),
    chapter("craftsmen", "Craftsmen Commons", 60, "working commons", "carts, supplies, low fences", "craft worker"),
    chapter("skywell", "Skywell Market", 80, "Skywell threshold", "market rest, portal clearance, lamps", "survey talk"),
    chapter("relic-grove", "Three-Relic Gate Grove", 100, "three protected gates", "grove edges, path markers, breathing clearances", "gate watch"),
    chapter("mine-threshold", "Mine Threshold + Drop Seam", 120, "bridge and descent seam", "threshold staging, warning lamps, clear drop", "miner patrol"),
    chapter("arrival-forge", "Level 2 Arrival Forge", 140, "arrival forge shelter", "smith tools, ember work, ore contact cluster", "active smith"),
    chapter("caravan-rest", "Caravan Rest", 160, "caravan waystation", "wagon camp, tack, water and rest pockets", "traveller rest"),
    chapter("starwell-herb", "Starwell Herb Court", 180, "live portal frame", "herb workstations, planters, portal clearance", "herbalist"),
    chapter("timberwright", "Timberwright Yard", 200, "timber gantry", "wood stacks, ropes, benches and carts", "yard worker"),
    chapter("observatory", "Heavenblocks Observatory", 220, "observatory telescope", "instruments, charts, low flight-lane details", "stargazer"),
    chapter("frontier-survey", "Frontier Survey Garden", 240, "survey pavilion", "samples, irrigation, tripods and planting", "field survey"),
    chapter("far-east", "Far-East Expedition Overlook", 260, "Three Kings overlook", "expedition shelter, cases, climbing stores", "expedition prep"),
  ]),
  composition: Object.freeze({
    weatherAtlas: Object.freeze({
      key: "ground-weather-particles-v2",
      path: "sprites/environment/v11-skyline-weather-vfx-v1/weather-particles-v2.png",
      frameWidth: 256,
      frameHeight: 256,
    }),
  }),
  motion: Object.freeze({
    displayedDefaultPercent: 100,
    observatoryBenchmarkMultiplier: 1.5,
    minimumPercent: 0,
    maximumPercent: 150,
    foregroundPropMotion: false,
    weatherSpeed: Object.freeze({ clear: 1, drizzle: 1.12, rain: 1.34, storm: 1.62, snow: 0.74 }),
    systems: Object.freeze([
      "per-chapter-authored-background-profile",
      "observatory-independent-star-ids",
      "observatory-offscreen-reset-atmosphere",
      "world-day-lighting",
      "weather-particles",
      "unchanged-town-video",
    ]),
  }),
  chronology: Object.freeze({
    defaultDay: 12,
    defaultHour: 22,
    daysPerWeek: 7,
    daysPerMonth: 28,
    weatherKinds: Object.freeze(["clear", "drizzle", "rain", "storm", "snow"]),
  }),
});
