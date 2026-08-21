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
  saveVersion: 10,

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
      title: "DO YOU WANT TO PLAY THE TUTORIAL?",
      body: "A short guided start through movement, digging, Flight,\na permanent return gate, selling, and resuming below.\n\nSkip it if you know the loop — Flight is still unlocked.",
      yesLabel: "YES  •  TEACH ME",
      noLabel: "NO  •  START PLAYING",
      footer: "A / D OR ARROWS  CHOOSE     ENTER  CONFIRM     ESC  BACK",
    }),
    copy: Object.freeze({
      move: Object.freeze({
        phase: "1 / 7  •  MOVE",
        title: "GET COMFORTABLE IN TOWN",
        body: "{left}/{right} move and aim  •  {interact} talks to people",
      }),
      dig: Object.freeze({
        phase: "2 / 7  •  DIG",
        title: "BREAK THE PRACTICE BLOCK",
        body: "Follow the marker  •  face the block  •  hold {mine} to dig",
      }),
      flight: Object.freeze({
        phase: "3 / 7  •  FLIGHT",
        title: "PROVE LOCAL RECOVERY",
        body: "Hold {fly} until you lift off  •  then descend toward 15m",
      }),
      portal: Object.freeze({
        phase: "4 / 7  •  RETURN GATE",
        title: "OPEN A PERMANENT ROUTE HOME",
        body: "Hold {down} to go down  •  follow the guide to 15m  •  press {interact}",
      }),
      sell: Object.freeze({
        phase: "5 / 7  •  SELL",
        title: "TURN YOUR REAL CARGO INTO MONEY",
        body: "Return to the Money Monster  •  press {interact}  •  sell any stack",
      }),
      upgrade: Object.freeze({
        phase: "6 / 7  •  UPGRADE",
        title: "TURN THE FIRST HAUL INTO POWER",
        body: "Visit Player Upgrades  •  press {interact}  •  buy any affordable upgrade",
      }),
      resume: Object.freeze({
        phase: "7 / 7  •  RESUME",
        title: "REOPEN THE DEEP ROUTE",
        body: "Use the surface gate  •  enter the paired sky gate  •  resume at 15m",
      }),
      complete: Object.freeze({
        phase: "CORE ROUTE LEARNED",
        title: "DIG DEEPER  •  OPEN THE WAY BACK",
        body: "Flight is local recovery  •  portals are long-distance return",
      }),
    }),
    ui: Object.freeze({
      markerHeightPx: 138,
      markerDepth: 54,
      markerPulseScale: 1.045,
      markerPulseMs: 820,
      markerKeyFontSize: "22px",
      markerKeyStrokePx: 5,
      markerKeyOffsetYPx: 46,
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
    x: 14,
    // Sits one clean row above the currency strip instead of being hidden
    // directly behind it at bottom-left.
    bottom: 84,
    width: 430,
    height: 107.5,
    // Measured against the authored 1024x256 foundation: the medallion is
    // centered at source x160 and the readable plaque ends before x950.
    paddingX: 119,
    textWidth: 280,
    promiseY: 39,
    detailY: 69,
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
    promiseFontSize: "12px",
    promiseMinimumFontSizePx: 9,
    detailFontSize: "10px",
    detailMinimumFontSizePx: 8,
    badgeKickerFontSize: "9px",
    badgeValueFontSize: "15px",
    badgeKickerColor: "#7e9eae",
    badgeValueColor: "#65d8f2",
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
    preferenceVersion: 2,
    enabled: true,
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
