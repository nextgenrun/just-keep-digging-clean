// ==================== RETENTION / PLAYER PROMISES ====================
// Presentation and lightweight progression tuning for the approved
// "one more dig" systems. These values never alter combo decay or core drops.

export const RETENTION_CONFIG = Object.freeze({
  saveVersion: 1,

  depth: Object.freeze({
    surfaceMaxMeters: 2,
    expeditionStartMeters: 10,
    personalBestApproachMeters: 25,
    personalBestToastStepMeters: 25,
    journalBands: Object.freeze([
      Object.freeze({ depth: 1, label: "Surface Strata" }),
      Object.freeze({ depth: 250, label: "Lower Earth" }),
      Object.freeze({ depth: 700, label: "Metal Depths" }),
      Object.freeze({ depth: 1300, label: "Ancient Deep" }),
      Object.freeze({ depth: 2000, label: "Level 2 Frontier" }),
      Object.freeze({ depth: 3500, label: "Core Expanse" }),
    ]),
  }),

  tutorial: Object.freeze({
    stages: Object.freeze(["mine", "sell", "upgrade", "complete"]),
    copy: Object.freeze({
      mine: "FIRST RUN  •  MINE a tile",
      sell: "FIRST RUN  •  SELL your cargo in town",
      upgrade: "FIRST RUN  •  BUY one upgrade",
      complete: "CORE LOOP LEARNED  •  Mine → Sell → Upgrade → Dig deeper",
    }),
  }),

  objective: Object.freeze({
    rewardSuffix: " M",
    definitions: Object.freeze([
      Object.freeze({
        id: "break-tiles",
        label: "Break 35 tiles",
        event: "tileBreak",
        target: 35,
        rewardMoney: 30,
      }),
      Object.freeze({
        id: "gather-cargo",
        label: "Collect 25 cargo",
        event: "resource",
        target: 25,
        rewardMoney: 35,
      }),
      Object.freeze({
        id: "push-depth",
        label: "Push 60m deeper",
        event: "depthGain",
        target: 60,
        rewardMoney: 45,
      }),
      Object.freeze({
        id: "land-crits",
        label: "Land 4 critical hits",
        event: "criticalHit",
        target: 4,
        rewardMoney: 40,
      }),
    ]),
  }),

  notifications: Object.freeze({
    routineLevelMs: 1900,
    discoveryMs: 3000,
    tutorialMs: 3200,
    objectiveMs: 3400,
    personalBestMs: 1700,
    summaryMs: 5200,
    upgradePayoffMs: 2200,
    earthquakeRecapMs: 3600,
  }),

  hud: Object.freeze({
    x: 16,
    bottom: 14,
    width: 350,
    height: 58,
    paddingX: 13,
    promiseY: 12,
    detailY: 36,
    depth: 1001,
    backgroundColor: 0x08121b,
    backgroundAlpha: 0.9,
    borderColor: 0x31566d,
    borderAlpha: 0.95,
    promiseColor: "#f0c765",
    detailColor: "#b9c8d3",
    promiseFontSize: "13px",
    detailFontSize: "11px",
    refreshMs: 120,
    cargoPrefix: "CARGO VALUE",
  }),

  miningFeedback: Object.freeze({
    overkillPrefix: "OVERKILL",
    overkillColor: "#ff9a52",
    overkillDurationMs: 900,
    overkillFontSize: 20,
    overkillMinHpRatio: 0.25,
    critPrefix: "CRIT",
    luckyText: "LUCKY +1",
    luckyColor: "#55ff9a",
    rarityDurationMs: 1800,
    rarity: Object.freeze({
      rich: Object.freeze({ label: "RICH", color: "#6be7ff" }),
      packed: Object.freeze({ label: "PACKED", color: "#d68cff" }),
      ancient: Object.freeze({ label: "ANCIENT", color: "#ffd35a" }),
    }),
  }),

  floatingText: Object.freeze({
    preferenceVersion: 1,
    legacyDefaultMode: "reduced",
    defaultMode: "full",
    modes: Object.freeze({
      off: Object.freeze({
        label: "OFF",
        summary: "No floating combat or reward text.",
        maxActive: 0,
        minIntervalMs: 0,
        maxBurstParticles: 0,
        hiddenCategories: Object.freeze(["*"]),
      }),
      reduced: Object.freeze({
        label: "REDUCED",
        summary: "Status text only; routine damage and resources stay hidden.",
        maxActive: 4,
        minIntervalMs: 180,
        maxBurstParticles: 3,
        hiddenCategories: Object.freeze(["damage", "resource"]),
      }),
      full: Object.freeze({
        label: "FULL",
        summary: "Damage, resources, and status text are visible.",
        maxActive: 8,
        minIntervalMs: 60,
        maxBurstParticles: 7,
        hiddenCategories: Object.freeze([]),
      }),
    }),
  }),

  intentPreview: Object.freeze({
    depth: 54,
    lineWidth: 3,
    fillAlpha: 0.12,
    heavyColor: 0xff9a52,
    thunderColor: 0x65d8f2,
    quickslashColor: 0xd68cff,
    labelFontSize: "13px",
    labelOffsetY: 18,
    abilityInputBufferMs: 220,
  }),

  settings: Object.freeze({
    expeditionLabel: "Return Summaries",
    expeditionHint: "Show a compact haul recap when you return to town.",
    discoveryLabel: "Discovery Cards",
    discoveryHint: "Show a card the first time a material is found.",
    objectiveLabel: "Session Objective",
    objectiveHint: "Show an optional goal with no streak or failure penalty.",
    floatingTextLabel: "Floating Damage / Reward Text",
    floatingTextHint: "Full is enabled automatically. Reduced hides routine damage and resource numbers.",
  }),
});

export const RETENTION_EVENT_TYPES = Object.freeze({
  DISCOVERY: "discovery",
  TUTORIAL: "tutorial",
  OBJECTIVE_COMPLETE: "objectiveComplete",
  PERSONAL_BEST: "personalBest",
  EXPEDITION_SUMMARY: "expeditionSummary",
  UPGRADE_PAYOFF: "upgradePayoff",
  EARTHQUAKE_RECAP: "earthquakeRecap",
});
