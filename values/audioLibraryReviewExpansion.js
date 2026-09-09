const SONNISS_BASE =
  "sound/library-v2/SoundLibrary_Review/00_INBOX_RAW_EXPORTS/"+
  "sonniss-ingame-sfx-mockup-v1-2026-08-27/";
const GOOD_LOOP_BASE =
  "sound/library-v2/SoundLibrary_Review/01_REVIEW_BY_TAG/GOOD/";
const CREEPY_BASE =
  "sound/library-v2/SoundLibrary_Review/02_ACCEPTED_CANDIDATES/deep_scary/";

const GROUPS = Object.freeze({
  panic: Object.freeze({ worldMode: "panic", stress: 82, musicDuck: 0.68, volume: 0.3 }),
  cave: Object.freeze({ worldMode: "deep", stress: 48, musicDuck: 0.82, volume: 0.13 }),
  mining: Object.freeze({ worldMode: "dig", stress: 34, musicDuck: 0.86, volume: 0.36 }),
  star: Object.freeze({ worldMode: "star", stress: 34, musicDuck: 0.74, volume: 0.32 }),
  movement: Object.freeze({ worldMode: "calm", stress: 28, musicDuck: 0.88, volume: 0.32 }),
  ui: Object.freeze({ worldMode: "calm", stress: 24, musicDuck: 0.92, volume: 0.28 }),
  reward: Object.freeze({ worldMode: "levelUp", stress: 24, musicDuck: 0.78, volume: 0.32 }),
  weather: Object.freeze({ worldMode: "rain", stress: 28, musicDuck: 0.9, volume: 0.14 }),
});

const candidate = (
  id,
  label,
  shortLabel,
  role,
  group,
  previewPath,
  collection,
  sourceName,
) => Object.freeze({
  id,
  label,
  shortLabel,
  role,
  group,
  previewPath,
  collection,
  sourceName,
});

const sonniss = (id, label, shortLabel, role, group, file, sourceName) => candidate(
  id,
  label,
  shortLabel,
  role,
  group,
  `${SONNISS_BASE}slices/${file}`,
  "SONNISS GDC19",
  sourceName,
);
const goodLoop = (id, label, shortLabel, file) => candidate(
  id,
  label,
  shortLabel,
  "loop",
  "weather",
  `${GOOD_LOOP_BASE}${file}`,
  "LOCAL GOOD LOOP",
  file,
);
const creepyLoop = (id, label, shortLabel, file) => candidate(
  id,
  label,
  shortLabel,
  "loop",
  "cave",
  `${CREEPY_BASE}${file}`,
  "LOCAL ACCEPTED",
  file,
);

const LOCAL_CANDIDATES = Object.freeze([
  sonniss("libDeepCaveBedA", "Deep cave bed A", "CAVE BED A", "loop", "cave", "deep-cave-danger-01-SONNISS19-MINE-02-030000ms.wav", "Eerie cave, water drips, interior wind"),
  sonniss("libTunnelWind", "Tunnel wind bed", "TUNNEL WIND", "loop", "cave", "deep-cave-danger-02-SONNISS19-SRC-116-008000ms.wav", "Wind blowing microphone"),
  sonniss("libWaterSeep", "Underground water seep", "WATER SEEP", "oneShot", "cave", "deep-cave-danger-03-SONNISS19-SRC-109-000300ms.wav", "Water pouring"),
  sonniss("libChainWarning", "Chain warning gesture", "CHAIN WARNING", "oneShot", "panic", "deep-cave-danger-04-SONNISS19-SRC-063-000000ms.wav", "Old barn chain clink"),
  sonniss("libSupportCreak", "Timber support strain", "SUPPORT CREAK", "oneShot", "panic", "deep-cave-danger-05-SONNISS19-SRC-077-000350ms.wav", "Old wood floor creak"),
  sonniss("libFarCollapse", "Distant rock collapse", "FAR COLLAPSE", "oneShot", "panic", "deep-cave-danger-06-SONNISS19-MINE-28-003100ms.wav", "Rocks falling"),
  sonniss("libDeepImpact", "Deep sledge impact", "DEEP IMPACT", "oneShot", "panic", "deep-cave-danger-07-SONNISS19-MINE-32-044500ms.wav", "Sledgehammer on concrete block"),
  sonniss("libPressureRumble", "Pressure rumble", "PRESSURE RUMBLE", "oneShot", "panic", "deep-cave-danger-08-SONNISS19-SRC-101-041000ms.wav", "Distant thunder-like mass"),
  sonniss("libTorchReact", "Torch heat reaction", "TORCH REACT", "oneShot", "panic", "deep-cave-danger-09-SONNISS19-SRC-097-000300ms.wav", "Water sizzle on hot pan"),
  sonniss("libDarkEnergy", "Dark electrical pressure", "DARK ENERGY", "oneShot", "panic", "deep-cave-danger-10-SONNISS19-SRC-040-007000ms.wav", "Electric crackling"),
  sonniss("libAirStop", "Air-stop accent", "AIR STOP", "oneShot", "panic", "deep-cave-danger-11-SONNISS19-SRC-111-000000ms.wav", "Organic fabric whoosh"),
  sonniss("libDeepCaveBedB", "Deep cave bed B", "CAVE BED B", "loop", "cave", "mining-material-loop-01-SONNISS19-MINE-02-020000ms.wav", "Eerie cave alternate window"),

  sonniss("libDirtSwingA", "Dirt swing A", "DIRT SWING A", "oneShot", "mining", "mining-material-loop-02-SONNISS19-SRC-110-000000ms.wav", "Breathy glove whoosh"),
  sonniss("libDirtHitA", "Dirt impact A", "DIRT HIT A", "oneShot", "mining", "mining-material-loop-03-SONNISS19-MINE-20-000000ms.wav", "Gritty dirt shovel impact"),
  sonniss("libDirtSwingB", "Dirt swing B", "DIRT SWING B", "oneShot", "mining", "mining-material-loop-04-SONNISS19-SRC-111-000000ms.wav", "Strap whoosh"),
  sonniss("libDirtHitB", "Dirt impact B", "DIRT HIT B", "oneShot", "mining", "mining-material-loop-05-SONNISS19-MINE-23-000000ms.wav", "Dry ground contact"),
  sonniss("libDirtBreak", "Dirt block break", "DIRT BREAK", "oneShot", "mining", "mining-material-loop-07-SONNISS19-MINE-24-000000ms.wav", "Heavy dry-ground contact"),
  sonniss("libStoneBody", "Stone impact body", "STONE BODY", "oneShot", "mining", "mining-material-loop-09-SONNISS19-SRC-080-000000ms.wav", "Concrete body impact"),
  sonniss("libToolContact", "Pick metal contact", "TOOL CONTACT", "oneShot", "mining", "mining-material-loop-10-SONNISS19-SRC-070-000120ms.wav", "Sledgehammer on metal sheet"),
  sonniss("libStoneBreak", "Stone block break", "STONE BREAK", "oneShot", "mining", "mining-material-loop-11-SONNISS19-MINE-18-001200ms.wav", "Large falling-rock impact"),
  sonniss("libResourcePop", "Resource pop", "RESOURCE POP", "oneShot", "reward", "mining-material-loop-12-SONNISS19-MINE-13-000000ms.wav", "Coin drop on carpet"),
  sonniss("libCrystalHit", "Crystal impact", "CRYSTAL HIT", "oneShot", "star", "mining-material-loop-13-SONNISS19-MINE-19-000000ms.wav", "Heavy ice debris impact"),
  sonniss("libCrystalBreak", "Crystal cluster break", "CRYSTAL BREAK", "oneShot", "star", "mining-material-loop-14-SONNISS19-SRC-092-000000ms.wav", "Ice shatter"),
  sonniss("libDiscoveryConfirm", "Discovery confirmation", "DISCOVERY", "oneShot", "star", "mining-material-loop-15-SONNISS19-SRC-105-000150ms.wav", "Mechanical UI confirm"),

  sonniss("libPowerOn", "Robot power on", "POWER ON", "oneShot", "movement", "robot-flight-movement-01-SONNISS19-SRC-108-000000ms.wav", "Mechanical turning on"),
  sonniss("libServoWake", "Robot servo wake", "SERVO WAKE", "oneShot", "movement", "robot-flight-movement-02-SONNISS19-SRC-086-000000ms.wav", "Rotator motor"),
  sonniss("libStepLeft", "Robot step A", "ROBOT STEP A", "oneShot", "movement", "robot-flight-movement-03-SONNISS19-MINE-23-000000ms.wav", "Dry ground contact"),
  sonniss("libStepRight", "Robot step B", "ROBOT STEP B", "oneShot", "movement", "robot-flight-movement-04-SONNISS19-MINE-24-000000ms.wav", "Heavy dry-ground contact"),
  sonniss("libArmExtend", "Robot arm extend", "ARM EXTEND", "oneShot", "movement", "robot-flight-movement-06-SONNISS19-SRC-102-000000ms.wav", "Antique crank mechanism"),
  sonniss("libLiftRelease", "Flight lift release", "LIFT RELEASE", "oneShot", "movement", "robot-flight-movement-07-SONNISS19-SRC-036-001250ms.wav", "Air compressor release"),
  sonniss("libFlightBody", "Flight motor body", "FLIGHT BODY", "oneShot", "movement", "robot-flight-movement-08-SONNISS19-SRC-073-000000ms.wav", "Long motor"),
  sonniss("libFlightPassA", "Flight pass A", "FLIGHT PASS A", "oneShot", "movement", "robot-flight-movement-09-SONNISS19-SRC-100-001250ms.wav", "Fast cloth swipe"),
  sonniss("libFlightPassB", "Flight pass B", "FLIGHT PASS B", "oneShot", "movement", "robot-flight-movement-10-SONNISS19-SRC-100-002050ms.wav", "Fast cloth swipe alternate"),
  sonniss("libFlightPassC", "Flight pass C", "FLIGHT PASS C", "oneShot", "movement", "robot-flight-movement-11-SONNISS19-SRC-100-003050ms.wav", "Fast cloth swipe alternate"),
  sonniss("libBoostEnergy", "Flight boost energy", "BOOST ENERGY", "oneShot", "movement", "robot-flight-movement-12-SONNISS19-SRC-034-000200ms.wav", "Electric arc surge"),
  sonniss("libLandingBody", "Heavy landing body", "LANDING BODY", "oneShot", "movement", "robot-flight-movement-13-SONNISS19-SRC-081-000000ms.wav", "Metal-grid body impact"),
  sonniss("libLandingDebris", "Heavy landing debris", "LANDING DEBRIS", "oneShot", "movement", "robot-flight-movement-14-SONNISS19-MINE-18-000050ms.wav", "Falling rock debris"),

  sonniss("libMenuOpen", "Mechanical menu open", "MENU OPEN", "oneShot", "ui", "ui-reward-flow-01-SONNISS19-SRC-093-000000ms.wav", "Small mechanism open"),
  sonniss("libUiHover", "Mechanical hover", "UI HOVER", "oneShot", "ui", "ui-reward-flow-02-SONNISS19-SRC-107-000000ms.wav", "Mechanical UI move"),
  sonniss("libUiClick", "Mechanical click", "UI CLICK", "oneShot", "ui", "ui-reward-flow-03-SONNISS19-SRC-050-000000ms.wav", "Door lock click"),
  sonniss("libUiConfirm", "Mechanical confirm", "UI CONFIRM", "oneShot", "ui", "ui-reward-flow-04-SONNISS19-SRC-105-000150ms.wav", "Mechanical UI confirm"),
  sonniss("libPurchaseCoin", "Purchase coin", "PURCHASE COIN", "oneShot", "reward", "ui-reward-flow-05-SONNISS19-MINE-11-000000ms.wav", "Coin slide"),
  sonniss("libUiBlocked", "Blocked action", "UI BLOCKED", "oneShot", "ui", "ui-reward-flow-07-SONNISS19-SRC-106-000000ms.wav", "Mechanical UI error"),
  sonniss("libRewardItem", "Item reward", "ITEM REWARD", "oneShot", "reward", "ui-reward-flow-08-SONNISS19-SRC-104-001500ms.wav", "Toolbox reward window"),
  sonniss("libRewardCoins", "Coin reward cluster", "COIN REWARD", "oneShot", "reward", "ui-reward-flow-09-SONNISS19-MINE-12-000000ms.wav", "Bottlecap coin cluster"),
  sonniss("libSaveCard", "Soft save-card cue", "SAVE CARD", "oneShot", "ui", "ui-reward-flow-12-SONNISS19-MINE-14-000000ms.wav", "Coins in drawstring sack"),

  creepyLoop("libCreepySingerA", "Distant creepy singer A", "CREEPY SINGER A", "Creepy Girl Singing In The Dinstance.mp3"),
  creepyLoop("libCreepySingerB", "Distant creepy singer B", "CREEPY SINGER B", "Creepy Girl Singing In The Dinstance(1).mp3"),
  creepyLoop("libCreepySingerC", "Distant creepy singer C", "CREEPY SINGER C", "Creepy Girl Singing In The Dinstance(2).mp3"),
  creepyLoop("libCreepySingerD", "Distant creepy singer D", "CREEPY SINGER D", "Creepy Singing In The Dinstance.mp3"),
  creepyLoop("libDeepVoicesA", "Deep voices A", "DEEP VOICES A", "Deep Underground Voices Creepy.mp3"),
  creepyLoop("libDeepVoicesB", "Deep voices B", "DEEP VOICES B", "Deep Underground Voices Creepy(1).mp3"),
  creepyLoop("libSoundsDeep", "Sounds from the deep", "SOUNDS DEEP", "Sounds From The Deep Creepy.mp3"),
  creepyLoop("libWhispersDeep", "Whispers from the deep", "WHISPERS DEEP", "Wispers From The Deep Creepy.mp3"),

  goodLoop("libRainDirtA", "Rain on dirt A", "RAIN DIRT A", "Loopable Field Recording Medium Rain Falling On Dirt Ground And Scattered Gr_1.mp3"),
  goodLoop("libRainDirtB", "Rain on dirt B", "RAIN DIRT B", "Loopable Field Recording Medium Rain Falling On Dirt Ground And Scattered Gr_2.mp3"),
  goodLoop("libRainDirtC", "Rain on dirt C", "RAIN DIRT C", "Loopable Field Recording Medium Rain Falling On Dirt Ground And Scattered Gr.mp3"),
  goodLoop("libShopRainInside", "Shop rain interior", "SHOP RAIN IN", "Loopable Foley Recording Inside Empty Wooden Shop During Rain Raindrops On_1.mp3"),
  goodLoop("libShopRainOutside", "Shop rain exterior", "SHOP RAIN OUT", "Loopable Foley Recording Outside A Small Wooden Shop In A Mining Town During.mp3"),
  goodLoop("libNightWindDirtA", "Night wind over dirt A", "NIGHT WIND A", "Loopable Ground-level Foley Night Wind Brushing Across Compact Dirt Dry Sur_3.mp3"),
  goodLoop("libNightWindDirtB", "Night wind over dirt B", "NIGHT WIND B", "Loopable Natural Foley Sound Empty Dry Ground At Night Light Wind Over Dirt_2.mp3"),
  goodLoop("libWoodRainInside", "Wood building rain", "WOOD RAIN IN", "Loopable Natural Indoor Sound Rain Heard From Inside Wooden Building With Wa.mp3"),
  goodLoop("libLightRainStoneA", "Light rain on stone A", "LIGHT RAIN A", "Loopable Natural Rain Foley Light Rain Tapping On Small Stones And Compact D_1.mp3"),
  goodLoop("libLightRainStoneB", "Light rain on stone B", "LIGHT RAIN B", "Loopable Natural Rain Foley Light Rain Tapping On Small Stones And Compact D.mp3"),
  goodLoop("libTownHeavyRain", "Mining town heavy rain", "TOWN HEAVY RAIN", "Loopable Natural Sound Effect Heavy Rain On A Small Mining Town Exterior Ra_1.mp3"),
  goodLoop("libNightWindOnly", "Night wind only", "NIGHT WIND ONLY", "Loopable Natural Sound Effect Wind Only Over Empty Dry Ground At Night Smoo_1.mp3"),
  goodLoop("libTownDayBreeze", "Mining town day breeze", "TOWN DAY BREEZE", "Loopable Outdoor Foley Daytime Wooden Mining Town Exterior Light Breeze Mov_1.mp3"),
  goodLoop("libAfterSunset", "Ground after sunset", "AFTER SUNSET", "Seamless Loopable Field Recording Outdoor Dirt Ground After Sunset Soft Nat.mp3"),
  goodLoop("libGravelNight", "Gravel and dirt night", "GRAVEL NIGHT", "Seamless Loopable Foley Outside At Night On Gravel And Dirt Gentle Air Move.mp3"),
]);

const sourceFromCandidate = item => Object.freeze({
  key: `review-library-${item.id}`,
  label: item.label,
  role: item.role,
  previewPath: item.previewPath,
  provenance: `${item.collection} · ${item.sourceName}`,
  collection: item.collection,
  approval: "sandbox-candidate",
  runtimeEligible: false,
  cooldownMs: 0,
  peakLinear: 0.9,
});

const scenarioFromCandidate = item => {
  const group = GROUPS[item.group];
  const entry = Object.freeze({ sourceId: item.id, volume: group.volume });
  return Object.freeze({
    label: item.label,
    shortLabel: item.shortLabel,
    hotkey: "",
    stress: group.stress,
    worldMode: group.worldMode,
    musicDuck: group.musicDuck,
    loops: Object.freeze(item.role === "loop" ? [entry] : []),
    oneShots: Object.freeze(item.role === "oneShot" ? [entry] : []),
    sequentialOneShots: false,
  });
};

const idsFor = group => LOCAL_CANDIDATES
  .filter(item => item.group === group)
  .map(item => item.id);
const category = (id, label, itemIds) => Object.freeze({
  id,
  label,
  itemIds: Object.freeze(itemIds),
});

export const AUDIO_LIBRARY_REVIEW_EXPANSION = Object.freeze({
  schemaVersion: 1,
  reviewOnly: true,
  runtimeEligible: false,
  runtimeWired: false,
  sourceApprovalIsRuntimeApproval: false,
  sources: Object.freeze(Object.fromEntries(
    LOCAL_CANDIDATES.map(item => [item.id, sourceFromCandidate(item)]),
  )),
  scenarios: Object.freeze(Object.fromEntries(
    LOCAL_CANDIDATES.map(item => [item.id, scenarioFromCandidate(item)]),
  )),
  categories: Object.freeze([
    category("panic", "PANIC", ["panicWarning", "panicCritical", ...idsFor("panic")]),
    category("cave", "CAVE", ["creepyCaveSolo", "creepyIndustrialSolo", "creepyDroneSolo", "deepCave", ...idsFor("cave")]),
    category("mining", "MINING", ["digSequence", ...idsFor("mining")]),
    category("star", "STAR", ["starProximity", "starRelease", "starDestruction", ...idsFor("star")]),
    category("movement", "MOVE", idsFor("movement")),
    category("ui", "UI", idsFor("ui")),
    category("reward", "REWARD", ["levelUpShort", "levelUpEpic", ...idsFor("reward")]),
    category("weather", "WEATHER", ["rainReference", ...idsFor("weather")]),
  ]),
  defaultCategoryId: "cave",
  itemPageSize: 6,
  categoryColumns: 4,
  localCandidateCount: LOCAL_CANDIDATES.length,
  onlineCandidateCount: 24,
  onlineManifestPath:
    "sound/library-v2/SoundLibrary_Review/00_INBOX_RAW_EXPORTS/"+
    "public-candidate-index-2026-09-01/manifest.json",
  gapFamilies: Object.freeze([
    "panic-body", "cave-loops", "mining-materials", "star-cosmic",
    "movement-flight", "ui-feedback", "rewards-pickups", "weather-town",
    "portals", "hazards-creatures",
  ]),
});
