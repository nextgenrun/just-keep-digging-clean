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
      "EMBER ORE POWERS CAMPFIRE BLESSINGS",
      "RETURN TO THE CAMPFIRE  •  PRESS INTERACT  •  CHOOSE A BLESSING",
    ),
    [CONTEXTUAL_MECHANIC_TUTORIAL_IDS.DARKNESS]: entry(
      "DARKNESS",
      "PRESS {torch} TO TURN YOUR TORCH ON OR OFF",
      "CLICK OR WHEEL THE TORCH METER  •  BRIGHTER LIGHT USES MORE GP",
    ),
    [CONTEXTUAL_MECHANIC_TUTORIAL_IDS.HARDCORE]: entry(
      "HARDCORE",
      "DARKNESS AND HAZARDS CAN COST A LIFE",
      "RECOVER IN LIGHT, NEAR A STAR, OR AT THE SURFACE  •  1 GP STAYS RESERVED",
    ),
    [CONTEXTUAL_MECHANIC_TUTORIAL_IDS.EARTHQUAKE]: entry(
      "QUAKE",
      "LEAVE MARKED GROUND BEFORE ROCKS FALL",
      "WALK OR FLY CLEAR  •  DIG THROUGH THE RUBBLE AFTERWARD",
    ),
    [CONTEXTUAL_MECHANIC_TUTORIAL_IDS.GRAVEBORER_WURM]: entry(
      "WURM",
      "MINING NOISE DRAWS THE GRAVEBORER WURM",
      "WHEN THE BREACH LINE APPEARS, FLY CLEAR  •  EACH PASS DRAINS GP",
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
