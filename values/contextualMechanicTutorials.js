export const CONTEXTUAL_MECHANIC_TUTORIAL_IDS = Object.freeze({
  EMBER_CAMPFIRE: "ember-campfire",
  DARKNESS: "darkness",
  HARDCORE: "hardcore",
  EARTHQUAKE: "earthquake",
  GRAVEBORER_WURM: "graveborer-wurm",
});

const entry = (badgeValue, promise, detail) => Object.freeze({
  badgeKicker: "GUIDE",
  badgeValue,
  promise,
  detail,
});

export const CONTEXTUAL_MECHANIC_TUTORIAL_CONFIG = Object.freeze({
  visibleDwellMs: 12000,
  maximumFrameMs: 250,
  priority: Object.freeze([
    CONTEXTUAL_MECHANIC_TUTORIAL_IDS.GRAVEBORER_WURM,
    CONTEXTUAL_MECHANIC_TUTORIAL_IDS.EARTHQUAKE,
    CONTEXTUAL_MECHANIC_TUTORIAL_IDS.EMBER_CAMPFIRE,
    CONTEXTUAL_MECHANIC_TUTORIAL_IDS.HARDCORE,
    CONTEXTUAL_MECHANIC_TUTORIAL_IDS.DARKNESS,
  ]),
  entries: Object.freeze({
    [CONTEXTUAL_MECHANIC_TUTORIAL_IDS.EMBER_CAMPFIRE]: entry(
      "EMBER",
      "EMBER ORE  •  FUELS CAMPFIRE BLESSINGS",
      "RETURN TO TOWN  •  INTERACT TO CHOOSE  •  CAMPFIRE SLOT IGNITES",
    ),
    [CONTEXTUAL_MECHANIC_TUTORIAL_IDS.DARKNESS]: entry(
      "DARKNESS",
      "DARKNESS  •  {torch} TOGGLES YOUR TORCH",
      "CLICK OR WHEEL TORCH %  •  MORE LIGHT COSTS MORE GP",
    ),
    [CONTEXTUAL_MECHANIC_TUTORIAL_IDS.HARDCORE]: entry(
      "HARDCORE",
      "HARDCORE  •  STRESS AND HAZARDS CAN TAKE A LIFE",
      "LIGHT / STAR / SURFACE RECOVER  •  FLIGHT + TORCH KEEP 1 GP",
    ),
    [CONTEXTUAL_MECHANIC_TUTORIAL_IDS.EARTHQUAKE]: entry(
      "QUAKE",
      "EARTHQUAKE  •  LEAVE MARKED FALL ZONES",
      "WALK OR FLY CLEAR  •  DIG THROUGH RETURNED RUBBLE",
    ),
    [CONTEXTUAL_MECHANIC_TUTORIAL_IDS.GRAVEBORER_WURM]: entry(
      "WURM",
      "WURM  •  MINING NOISE FILLS ITS THREAT METER",
      "BREACH LINE = FLY CLEAR  •  EACH PASS CAN MAUL GP",
    ),
  }),
});

const VALID_IDS = new Set(CONTEXTUAL_MECHANIC_TUTORIAL_CONFIG.priority);

export function isContextualMechanicTutorialId(value) {
  return typeof value === "string" && VALID_IDS.has(value);
}

export function sanitizeContextualMechanicTutorialIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isContextualMechanicTutorialId))];
}
