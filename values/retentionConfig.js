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
  FLIGHT: "flight",
  PORTAL: "portal",
  SELL: "sell",
  UPGRADE: "upgrade",
  RESUME: "resume",
  COMPLETE: "complete",
  SKIPPED: "skipped",
});

export const TUTORIAL_FREE_TELEPORT_PASSES = Object.freeze({
  EARLY_SKY_RETURN: "early-sky-return",
  GROUND_ASCENT: "ground-ascent",
  RESUME_RETURN: "resume-return",
});

export const RETENTION_CONFIG = Object.freeze({
  saveVersion: 7,

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
      TOWN_TUTORIAL_STAGES.FLIGHT,
      TOWN_TUTORIAL_STAGES.PORTAL,
      TOWN_TUTORIAL_STAGES.SELL,
      TOWN_TUTORIAL_STAGES.UPGRADE,
      TOWN_TUTORIAL_STAGES.RESUME,
    ]),
    moveDistanceTiles: 2,
    digSite: Object.freeze({
      tileX: 12,
      surfaceRowOffset: 0,
      tileTypeName: "DIRT",
      tileHp: 1,
    }),
    merchants: Object.freeze({
      sell: "moneyMonster",
      upgrade: "playerUpgrades",
    }),
    flightTraining: Object.freeze({
      flightUpgradeId: "gemPowerUnlock",
      freeFlightMs: 30000,
    }),
    freeTeleports: Object.freeze({
      passIds: Object.freeze(Object.values(TUTORIAL_FREE_TELEPORT_PASSES)),
      rules: Object.freeze([
        Object.freeze({
          id: TUTORIAL_FREE_TELEPORT_PASSES.EARLY_SKY_RETURN,
          kind: "skyToDungeon",
          stages: Object.freeze([
            TOWN_TUTORIAL_STAGES.SELL,
            TOWN_TUTORIAL_STAGES.UPGRADE,
          ]),
        }),
        Object.freeze({
          id: TUTORIAL_FREE_TELEPORT_PASSES.GROUND_ASCENT,
          kind: "groundToSky",
          stages: Object.freeze([TOWN_TUTORIAL_STAGES.RESUME]),
        }),
        Object.freeze({
          id: TUTORIAL_FREE_TELEPORT_PASSES.RESUME_RETURN,
          kind: "skyToDungeon",
          stages: Object.freeze([TOWN_TUTORIAL_STAGES.RESUME]),
        }),
      ]),
    }),
    choice: Object.freeze({
      title: "WOULD YOU LIKE A GUIDED START?",
      body: "Learn movement, digging, Flight, return gates,\nselling, upgrades, and how to continue deeper.\n\nSkip it to start immediately with Flight unlocked.",
      yesLabel: "SHOW ME",
      noLabel: "SKIP TUTORIAL",
      footer: "A / D OR ARROWS  CHOOSE     ENTER  CONFIRM     ESC  BACK",
    }),
    copy: Object.freeze({
      move: Object.freeze({
        phase: "1 / 7  â€¢  MOVE",
        title: "WALK TO THE GLOWING ARROW",
        body: "PRESS {left}/{right}  â€¢  STOP ON THE MARKED GROUND",
      }),
      dig: Object.freeze({
        phase: "2 / 7  â€¢  DIG",
        title: "DIG THE MARKED BLOCK",
        body: "FACE THE GLOWING BLOCK  â€¢  HOLD {mine} UNTIL IT BREAKS",
      }),
      flight: Object.freeze({
        phase: "3 / 7  â€¢  FLIGHT",
        title: "LIFT OFF ONCE",
        body: "HOLD {fly} UNTIL YOU LEAVE THE GROUND  â€¢  THEN FOLLOW THE GHOST",
      }),
      portal: Object.freeze({
        phase: "4 / 7  â€¢  RETURN GATE",
        title: "DIG DOWN TO THE RETURN GATE AT 15M",
        body: "PRESS {down} TO AIM DOWN  â€¢  HOLD {mine} TO DIG  â€¢  PRESS {interact} AT THE GATE",
      }),
      sell: Object.freeze({
        phase: "5 / 7  â€¢  SELL",
        title: "SELL WHAT YOU MINED",
        body: "Return to the Money Monster  â€¢  press {interact}  â€¢  sell any material",
      }),
      upgrade: Object.freeze({
        phase: "6 / 7  â€¢  UPGRADE",
        title: "BUY YOUR FIRST UPGRADE",
        body: "Visit Player Upgrades  â€¢  press {interact}  â€¢  buy any affordable upgrade",
      }),
      resume: Object.freeze({
        phase: "7 / 7  â€¢  RESUME",
        title: "RETURN TO 15m",
        body: "Use the surface gate  â€¢  enter the paired sky gate  â€¢  resume at 15m",
      }),
      complete: Object.freeze({
        phase: "GUIDED START COMPLETE",
        title: "YOU'RE READY TO DIG DEEPER",
        body: "Use Flight for nearby recovery  â€¢  use gates to travel farther",
      }),
    }),
    ui: Object.freeze({
      markerHeightPx: 138,
      // Keep both tutorial arrows above every current UI and cinematic layer.
      markerDepth: 20000,
      markerPulseScale: 1.045,
      markerPulseMs: 820,
      markerKeyFontSize: "22px",
      markerKeyStrokePx: 5,
      markerKeyOffsetYPx: 46,
      offscreenMarkerHeightPx: 72,
      offscreenMarkerMarginPx: 54,
      offscreenMarkerDepth: 20000,
      offscreenMarkerRotationOffsetRad: -1.5707963267948966,
      digMarkerOffsetYPx: -8,
      merchantMarkerGapPx: 10,
      merchantMinimumHeightPx: 48,
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
        label: "Mine 35 blocks",
        event: "tileBreak",
        target: 35,
        rewardMoney: 30,
      }),
      Object.freeze({
        id: "gather-cargo",
        label: "Collect 25 resources",
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
    x: 14,
    top: 111,
    width: 332,
    height: 48,
    paddingX: 166,
    textWidth: 300,
    promiseY: 15,
    detailY: 33,
    badgeX: 67,
    badgeKickerY: 42,
    badgeValueY: 63,
    depth: 1001,
    backgroundColor: 0x08121b,
    backgroundAlpha: 0.9,
    borderColor: 0x31566d,
    borderAlpha: 0.95,
    promiseColor: "#f0c765",
    detailColor: "#b9c8d3",
    promiseFontSize: "14px",
    promiseMinimumFontSizePx: 9,
    detailFontSize: "12px",
    detailMinimumFontSizePx: 8,
    badgeKickerFontSize: "9px",
    badgeValueFontSize: "15px",
    badgeKickerColor: "#7e9eae",
    badgeValueColor: "#65d8f2",
    refreshMs: 120,
    cargoPrefix: "CARGO VALUE",
  }),

  floatingText: Object.freeze({
    // v3 retires stale saves written while REDUCED was the implicit default.
    // Explicit OFF remains respected; every older enabled preference migrates
    // to FULL so damage numbers cannot silently disappear at run start.
    preferenceVersion: 3,
    enabled: true,
    legacyDefaultMode: "reduced",
    defaultMode: "full",
    modes: Object.freeze({
      off: Object.freeze({
        label: "OFF",
        summary: "Hide all damage and reward numbers.",
        maxActive: 0,
        minIntervalMs: 0,
        maxBurstParticles: 0,
        hiddenCategories: Object.freeze(["*"]),
      }),
      reduced: Object.freeze({
        label: "REDUCED",
        summary: "Show only important rewards.",
        maxActive: 4,
        minIntervalMs: 180,
        maxBurstParticles: 3,
        hiddenCategories: Object.freeze(["damage", "resource"]),
      }),
      full: Object.freeze({
        label: "FULL",
        summary: "Show damage and important reward numbers.",
        maxActive: 8,
        minIntervalMs: 60,
        maxBurstParticles: 7,
        hiddenCategories: Object.freeze(["resource"]),
      }),
    }),
  }),

  intentPreview: Object.freeze({
    depth: 54,
    lineWidth: 3,
    fillAlpha: 0.12,
    thunderColor: 0x65d8f2,
    labelFontSize: "13px",
    labelOffsetY: 18,
    abilityInputBufferMs: 220,
  }),

  settings: Object.freeze({
    objectiveLabel: "Optional Goal",
    objectiveHint: "Show one bonus goal. Ignoring it has no penalty.",
    floatingTextLabel: "Damage and Reward Numbers",
    floatingTextHint: "Reduced shows only important rewards.",
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
