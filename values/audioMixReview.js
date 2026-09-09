const SONNISS_2019_PREVIEWS =
  "sound/library-v2/SoundLibrary_Review/00_INBOX_RAW_EXPORTS/"+
  "sonniss-gdc2019-recorded-mining-pilot-2026-08-26/previews/";
const SONNISS_2026_PREVIEWS =
  "sound/library-v2/SoundLibrary_Review/00_INBOX_RAW_EXPORTS/"+
  "sonniss-gdc2026-recorded-pilot-2026-08-26/previews/";
const DIG_BASE = "sound/soundEffects/costume-sounds/dig/";
const STAR_DIG_BASE = "sound/soundEffects/costume-sounds/dig/dig-star/";
const WEATHER_BASE = "sound/soundEffects/weather-ambience-v1/";
const APPROVED_SFX_BASE = "sound/soundEffects/approved-sfx-findings-v1/";

const source = (definition) => Object.freeze({
  runtimeEligible: false,
  ...definition,
});

const SOURCES = Object.freeze({
  panicTimber: source({
    key: "review-panic-timber", label: "Mine-shaft timber stress", role: "oneShot",
    previewPath: `${SONNISS_2019_PREVIEWS}BROKEN---DESIGNED---MINE-SHAFT-Wood-Meta.mp3`,
    provenance: "Sonniss GameAudioGDC 2019", approval: "audition-only", cooldownMs: 9000,
  }),
  panicBreath: source({
    key: "review-panic-breath", label: "Restrained respirator breath", role: "loop",
    previewPath: `${SONNISS_2026_PREVIEWS}12_HMNBrth_Respirator-Specimen-Breathing-Mad-Scient.mp3`,
    provenance: "Sonniss GameAudioGDC 2026", approval: "audition-only",
  }),
  panicDowner: source({
    key: "review-panic-downer", label: "Rattling critical downer", role: "oneShot",
    previewPath: `${SONNISS_2026_PREVIEWS}25_DSGNBass_Rattling-Downer-3_344-Audio_Bass-Drops-.mp3`,
    provenance: "Sonniss GameAudioGDC 2026", approval: "audition-only", cooldownMs: 9000,
  }),
  starChime: source({
    key: "review-star-current-chime", label: "Current Star-dig chime", role: "oneShot",
    previewPath: `${STAR_DIG_BASE}MUSCChim_Chimes dream 3 (ID 2081)_BigSoundBank.com.ogg`,
    provenance: "Current runtime baseline", approval: "baseline-license-recheck", cooldownMs: 650,
  }),
  digOne: source({
    key: "review-runtime-dig-one", label: "Runtime dig variant 1", role: "oneShot",
    previewPath: `${DIG_BASE}dig-1.ogg`,
    provenance: "Current randomized runtime dig pool", approval: "runtime-reference",
    runtimeEligible: true, cooldownMs: 150,
  }),
  digTwo: source({
    key: "review-runtime-dig-two", label: "Runtime dig variant 2", role: "oneShot",
    previewPath: `${DIG_BASE}dig-2.ogg`,
    provenance: "Current randomized runtime dig pool", approval: "runtime-reference",
    runtimeEligible: true, cooldownMs: 150,
  }),
  starAura: source({
    key: "review-star-electric-aura", label: "Electric Star aura", role: "loop",
    previewPath: `${SONNISS_2019_PREVIEWS}Bluezone_BC0239_electric_crackling_0-p1-25c876bb.mp3`,
    provenance: "Sonniss GameAudioGDC 2019", approval: "audition-only",
  }),
  starArc: source({
    key: "review-star-electric-arc", label: "Electric release arc", role: "oneShot",
    previewPath: `${SONNISS_2019_PREVIEWS}Accent-Sound-Design-Electric-Arc-Buz-p1-0ee406a0.mp3`,
    provenance: "Sonniss GameAudioGDC 2019", approval: "audition-only", cooldownMs: 650,
  }),
  starDestruction: source({
    key: "review-approved-star-destruction", label: "Approved Star destruction",
    role: "oneShot",
    previewPath: `${APPROVED_SFX_BASE}star-destruction-shockwave-freesound-814053.mp3`,
    provenance: "Freesound 814053 · qubodup · CC0 1.0",
    approval: "approved-runtime", runtimeEligible: true, peakLinear: 0.977,
  }),
  levelUpShort: source({
    key: "review-approved-level-up-short", label: "Approved level up · short",
    role: "oneShot",
    previewPath: `${APPROVED_SFX_BASE}level-up-short-freesound-320655.mp3`,
    provenance: "Freesound 320655 · rhodesmas · CC BY 4.0",
    approval: "approved-runtime", runtimeEligible: true, peakLinear: 0.822,
  }),
  levelUpEpic: source({
    key: "review-approved-level-up-epic", label: "Approved level up · epic",
    role: "oneShot",
    previewPath: `${APPROVED_SFX_BASE}level-up-epic-freesound-682633.mp3`,
    provenance: "Freesound 682633 · Bastianhallo · CC0 1.0",
    approval: "approved-runtime", runtimeEligible: true, peakLinear: 0.32,
  }),
  caveEerie: source({
    key: "review-ambience-eerie-cave", label: "A · Eerie cave", role: "loop",
    previewPath: `${SONNISS_2019_PREVIEWS}ATMO-EERIE-Cave-Water-Drips-Emptyness-Ho.mp3`,
    provenance: "Sonniss GameAudioGDC 2019", approval: "audition-only",
  }),
  miningMars: source({
    key: "review-ambience-mining-mars",
    label: "B · Mining on Mars",
    role: "loop",
    previewPath: `${SONNISS_2019_PREVIEWS}mining-on-mars.mp3`,
    provenance: "Sonniss GameAudioGDC 2019",
    approval: "audition-only",
  }),
  evilSpell: source({
    key: "review-ambience-evil-spell",
    label: "C · Dark spell drone",
    role: "loop",
    previewPath: `${SONNISS_2026_PREVIEWS}15_AMBDsgn_Evil-Spell-Ambience_344-Audio_Ghostly-Pr.mp3`,
    provenance: "Sonniss GameAudioGDC 2026",
    approval: "audition-only",
  }),
  rainReference: source({
    key: "review-weather-rain-reference",
    label: "Approved rain reference",
    role: "loop",
    previewPath: `${WEATHER_BASE}rain-open-soft-v1.wav`,
    provenance: "Approved weather ambience v1",
    approval: "runtime-reference",
    runtimeEligible: true,
  }),
  windReference: source({
    key: "review-weather-wind-reference",
    label: "Approved wind reference",
    role: "loop",
    previewPath: `${WEATHER_BASE}wind-open-v1.wav`,
    provenance: "Approved weather ambience v1",
    approval: "runtime-reference",
    runtimeEligible: true,
  }),
});

const SCENARIOS = Object.freeze({
  silence: Object.freeze({
    label: "Silence / reset", hotkey: "0", stress: 28, worldMode: "calm",
    musicDuck: 1, loops: Object.freeze([]), oneShots: Object.freeze([]),
  }),
  panicWarning: Object.freeze({
    label: "Panic warning", hotkey: "1", stress: 63, worldMode: "panic",
    musicDuck: 0.86,
    loops: Object.freeze([{ sourceId: "$ambience", volume: 0.11 }]),
    oneShots: Object.freeze([{ sourceId: "panicTimber", volume: 0.12 }]),
  }),
  panicCritical: Object.freeze({
    label: "Panic critical", hotkey: "2", stress: 88, worldMode: "panic",
    musicDuck: 0.68,
    loops: Object.freeze([
      { sourceId: "$ambience", volume: 0.09 },
      { sourceId: "panicBreath", volume: 0.08 },
    ]),
    oneShots: Object.freeze([{ sourceId: "panicDowner", volume: 0.18 }]),
  }),
  starProximity: Object.freeze({
    label: "Star proximity", hotkey: "3", stress: 34, worldMode: "star",
    musicDuck: 0.92,
    loops: Object.freeze([{ sourceId: "starAura", volume: 0.07 }]),
    oneShots: Object.freeze([]),
  }),
  starRelease: Object.freeze({
    label: "Star release", hotkey: "4", stress: 34, worldMode: "star",
    musicDuck: 0.72,
    loops: Object.freeze([{ sourceId: "starAura", volume: 0.055 }]),
    oneShots: Object.freeze([
      { sourceId: "starArc", volume: 0.13 },
      { sourceId: "starChime", volume: 0.28, delayMs: 90 },
    ]),
  }),
  deepCave: Object.freeze({
    label: "Creepy layers", shortLabel: "CREEPY ×3", hotkey: "5",
    stress: 42, worldMode: "deep", musicDuck: 0.88,
    loops: Object.freeze([
      { sourceId: "caveEerie", volume: 0.08 },
      { sourceId: "miningMars", volume: 0.045 },
      { sourceId: "evilSpell", volume: 0.055 },
    ]),
    oneShots: Object.freeze([{ sourceId: "panicTimber", volume: 0.08 }]),
  }),
  creepyCaveSolo: Object.freeze({
    label: "Eerie cave bed", shortLabel: "EERIE CAVE", hotkey: "",
    stress: 42, worldMode: "deep", musicDuck: 1,
    loops: Object.freeze([{ sourceId: "caveEerie", volume: 0.14 }]),
    oneShots: Object.freeze([]),
  }),
  creepyIndustrialSolo: Object.freeze({
    label: "Industrial mine bed", shortLabel: "INDUSTRIAL", hotkey: "",
    stress: 42, worldMode: "deep", musicDuck: 1,
    loops: Object.freeze([{ sourceId: "miningMars", volume: 0.14 }]),
    oneShots: Object.freeze([]),
  }),
  creepyDroneSolo: Object.freeze({
    label: "Dark spell drone", shortLabel: "DARK DRONE", hotkey: "",
    stress: 42, worldMode: "deep", musicDuck: 1,
    loops: Object.freeze([{ sourceId: "evilSpell", volume: 0.14 }]),
    oneShots: Object.freeze([]),
  }),
  digSequence: Object.freeze({
    label: "Dig sound run", shortLabel: "DIG RUN", hotkey: "D",
    stress: 30, worldMode: "dig", musicDuck: 0.92,
    sequentialOneShots: true,
    loops: Object.freeze([]),
    oneShots: Object.freeze([
      { sourceId: "digOne", volume: 0.47, rate: 0.96 },
      { sourceId: "digTwo", volume: 0.46, rate: 1.03, delayMs: 320 },
      { sourceId: "digOne", volume: 0.45, rate: 1.05, delayMs: 640 },
      { sourceId: "digTwo", volume: 0.46, rate: 0.97, delayMs: 960 },
    ]),
  }),
  rainReference: Object.freeze({
    label: "Rain reference", hotkey: "6", stress: 28, worldMode: "rain",
    musicDuck: 1,
    loops: Object.freeze([
      { sourceId: "rainReference", volume: 0.24 },
      { sourceId: "windReference", volume: 0.085 },
    ]),
    oneShots: Object.freeze([]),
  }),
  starDestruction: Object.freeze({
    label: "Star destruction", shortLabel: "STAR BREAK", hotkey: "7",
    stress: 34, worldMode: "star", musicDuck: 0.72,
    loops: Object.freeze([]),
    oneShots: Object.freeze([{ sourceId: "starDestruction", volume: 0.4725 }]),
  }),
  levelUpShort: Object.freeze({
    label: "Level up · short", shortLabel: "LEVEL A", hotkey: "8",
    stress: 28, worldMode: "levelUp", musicDuck: 0.82,
    loops: Object.freeze([]),
    oneShots: Object.freeze([{ sourceId: "levelUpShort", volume: 0.225 }]),
    previewReward: Object.freeze({
      level: 12, levelsGained: 1, panicResistanceGainMeters: 25,
      panicResistanceMeters: 240, miningPowerGainPercent: 56, gemPowerMaxGain: 100,
    }),
  }),
  levelUpEpic: Object.freeze({
    label: "Level up · epic", shortLabel: "LEVEL B", hotkey: "9",
    stress: 28, worldMode: "levelUp", musicDuck: 0.72,
    loops: Object.freeze([]),
    oneShots: Object.freeze([{ sourceId: "levelUpEpic", volume: 0.5625 }]),
    previewReward: Object.freeze({
      level: 25, levelsGained: 3, panicResistanceGainMeters: 85,
      panicResistanceMeters: 620, miningPowerGainPercent: 168, gemPowerMaxGain: 300,
    }),
  }),
});

export const AUDIO_MIX_REVIEW = Object.freeze({
  schemaVersion: 4,
  reviewOnly: true,
  runtimeEligible: false,
  title: "Audio Decision Review",
  viewport: Object.freeze({ width: 1280, height: 720 }),
  layout: Object.freeze({
    worldPaneWidth: 918,
    floorY: 586,
    floorTileSize: 94,
    floorTileCount: 9,
  }),
  output: Object.freeze({
    masterSafetyCap: 0.72,
    estimatedPeakBudget: 0.42,
    maxConcurrentLoops: 3,
    loopFadeMs: 900,
    transitionTransientDelayMs: 1000,
    stopEpsilon: 0.001,
  }),
  policy: Object.freeze({
    automaticVoice: false,
    interruptVoice: false,
    productionImportsAllowed: false,
    rawRedistributionAllowed: false,
  }),
  thresholds: Object.freeze({
    warning: 55,
    critical: 80,
    noticeCooldownMs: 9000,
  }),
  currentRuntimeReference: Object.freeze({
    masterVolume: 0.9,
    sfxVolume: 0.9,
    starDigRequestedVolume: 0.85,
    starDigEstimatedOutput: 0.6885,
    starDigLoaderPath: SOURCES.starChime.previewPath,
    starDigLibraryMetadataPath: SOURCES.starChime.previewPath,
    panicFamily: "hardcoreNearDeath",
    rainOpenVolume: 0.24,
    windOpenVolume: 0.085,
  }),
  diagnostics: Object.freeze([
    Object.freeze({
      id: "approved-runtime-routing",
      severity: "pass",
      copy: "Three approved cues are wired; every other candidate stays sandbox-only.",
    }),
    Object.freeze({
      id: "panic-semantic-reuse",
      severity: "warning",
      copy: "Warning, critical, and near-death currently reuse one cue family.",
    }),
    Object.freeze({
      id: "review-boundary",
      severity: "pass",
      copy: "Creepy layers remain audition-only; dig uses current runtime references.",
    }),
  ]),
  approvedRuntimeSourceIds: Object.freeze([
    "starDestruction",
    "levelUpShort",
    "levelUpEpic",
  ]),
  ambienceOptions: Object.freeze(["caveEerie", "miningMars", "evilSpell"]),
  scenarioOrder: Object.freeze([
    "silence",
    "panicWarning",
    "panicCritical",
    "starProximity",
    "starRelease",
    "creepyCaveSolo",
    "creepyIndustrialSolo",
    "creepyDroneSolo",
    "deepCave",
    "digSequence",
    "rainReference",
    "starDestruction",
    "levelUpShort",
    "levelUpEpic",
  ]),
  defaultAmbience: "caveEerie",
  defaultScenario: "silence",
  sources: SOURCES,
  scenarios: SCENARIOS,
});
