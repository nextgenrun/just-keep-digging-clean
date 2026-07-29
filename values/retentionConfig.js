// ==================== RETENTION / PLAYER PROMISES ====================
// Presentation and lightweight progression tuning for the approved
// "one more dig" systems. These values never alter combo decay or core drops.

export const TOWN_TUTORIAL_CHOICES = Object.freeze({
  YES: "yes",
  NO: "no",
  LEGACY: "legacy",
});

export const TOWN_TUTORIAL_STAGES = Object.freeze({
  UNSELECTED: "unselected",
  MOVE: "move",
  DIG: "dig",
  SELL: "sell",
  UPGRADE: "upgrade",
  COMPLETE: "complete",
  SKIPPED: "skipped",
});

export const RETENTION_CONFIG = Object.freeze({
  saveVersion: 2,

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
    stages: Object.freeze(Object.values(TOWN_TUTORIAL_STAGES)),
    activeStages: Object.freeze([
      TOWN_TUTORIAL_STAGES.MOVE,
      TOWN_TUTORIAL_STAGES.DIG,
      TOWN_TUTORIAL_STAGES.SELL,
      TOWN_TUTORIAL_STAGES.UPGRADE,
    ]),
    moveDistanceTiles: 2,
    digSite: Object.freeze({
      tileX: 24,
      surfaceRowOffset: -1,
      tileTypeName: "DIRT",
      tileHp: 1,
    }),
    merchants: Object.freeze({
      sell: "moneyMonster",
      upgrade: "playerUpgrades",
    }),
    starterReward: Object.freeze({
      money: 3,
      resources: Object.freeze({ dirt: 6 }),
    }),
    completionReward: Object.freeze({
      money: 40,
      flightUpgradeId: "gemPowerUnlock",
      freeFlightMs: 30000,
    }),
    choice: Object.freeze({
      title: "DO YOU WANT TO PLAY THE TUTORIAL?",
      body: "A short guided start through movement, digging, selling,\nand your first NPC upgrade.\n\nSkip it if you know the loop — Flight and rewards are still granted.",
      yesLabel: "YES  •  TEACH ME",
      noLabel: "NO  •  START PLAYING",
      footer: "A / D OR ARROWS  CHOOSE     ENTER  CONFIRM     ESC  BACK",
    }),
    copy: Object.freeze({
      move: Object.freeze({
        phase: "1 / 4  •  MOVE",
        title: "GET COMFORTABLE IN TOWN",
        body: "{left}/{right} move and aim  •  {interact} talks to people",
      }),
      dig: Object.freeze({
        phase: "2 / 4  •  DIG",
        title: "BREAK THE PRACTICE BLOCK",
        body: "Walk to the mining marker  •  face the block  •  hold {mine} to dig",
      }),
      sell: Object.freeze({
        phase: "3 / 4  •  SELL",
        title: "TURN CARGO INTO MONEY",
        body: "Return to the Money Monster  •  press {interact}  •  sell any stack",
      }),
      upgrade: Object.freeze({
        phase: "4 / 4  •  UPGRADE",
        title: "MAKE THE NEXT DIG EASIER",
        body: "Visit Upgrades  •  press {interact}  •  buy Agility Training",
      }),
      complete: Object.freeze({
        phase: "CORE LOOP LEARNED",
        title: "MINE  →  SELL  →  UPGRADE  →  DIG DEEPER",
        body: "Flight unlocked  •  30 seconds free  •  +40 M",
      }),
    }),
    ui: Object.freeze({
      guideNotificationKey: "town-tutorial-guide",
      completionNotificationKey: "town-tutorial-complete",
      markerHeightPx: 138,
      markerDepth: 54,
      markerPulseScale: 1.045,
      markerPulseMs: 820,
      digMarkerOffsetYPx: -8,
      merchantMarkerGapPx: 10,
      merchantMinimumHeightPx: 48,
      rewardFlashDurationMs: 180,
      rewardFlashRgb: Object.freeze([126, 225, 255]),
      freeFlightSaveIntervalMs: 1000,
      choiceDepth: 4250,
      choicePanelWidthPx: 960,
      choicePanelHeightPx: 640,
      choiceTitleYPx: -170,
      choiceBodyYPx: -91,
      choiceButtonYPx: 68,
      choiceButtonWidthPx: 286,
      choiceButtonHeightPx: 52,
      choiceButtonGapPx: 330,
      choiceFooterYPx: 204,
      choiceTitleFontSize: "30px",
      choiceBodyFontSize: "16px",
      choiceFooterFontSize: "12px",
      choiceBackdropAlpha: 0.9,
      choiceEnterDurationMs: 180,
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
    defaultMode: "reduced",
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
    labelFontSize: "13px",
    labelOffsetY: 18,
    abilityInputBufferMs: 220,
  }),

  settings: Object.freeze({
    objectiveLabel: "Session Objective",
    objectiveHint: "Show an optional goal with no streak or failure penalty.",
    floatingTextLabel: "Floating Damage / Reward Text",
    floatingTextHint: "Reduced keeps critical and special feedback while hiding routine damage and resource numbers.",
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
