// Deterministic tutorial captions and optional authored voice cues.
// Runtime paths stay null until the user's recordings are exported; captions
// remain the complete muted-play contract in the meantime.

function cue(id, script, promise, detail) {
  return Object.freeze({
    id,
    assetKey: `tutorial-narration-${id}-v1`,
    path: null,
    script,
    caption: Object.freeze({ promise, detail }),
  });
}

export const TUTORIAL_NARRATION_CUES = Object.freeze({
  move: cue(
    "move",
    "Head to the marked ground. That is your first way down.",
    "STEP 1  •  WALK TO THE GLOWING ARROW",
    "PRESS {left}/{right}  •  STOP ON THE MARKED GROUND",
  ),
  dig: cue(
    "dig",
    "Face the block and keep mining until it breaks.",
    "STEP 2  •  DIG THE MARKED BLOCK",
    "FACE THE GLOWING BLOCK  •  HOLD {mine} UNTIL IT BREAKS",
  ),
  flight: cue(
    "flight",
    "Hold Flight to rise. Use it whenever you need to recover locally.",
    "STEP 3  •  LIFT OFF ONCE",
    "HOLD {fly} UNTIL YOU LEAVE THE GROUND  •  THEN FOLLOW THE GHOST",
  ),
  portal: cue(
    "portal",
    "Descend to the return gate. Activating it opens a permanent route home.",
    "STEP 4  •  DIG DOWN TO THE RETURN GATE AT 15M",
    "PRESS {down} TO AIM DOWN  •  HOLD {mine} TO DIG  •  {interact} AT THE GATE",
  ),
  portalNear: cue(
    "portal-near",
    "That gate is your way home. Activate it once and it stays unlocked.",
    "RETURN GATE NEARBY",
    "FOLLOW ITS LIGHT  •  PRESS {interact} WHEN YOU REACH IT",
  ),
  sell: cue(
    "sell",
    "Your route is open. Return to town and sell what you actually found.",
    "STEP 5  •  SELL YOUR REAL CARGO",
    "RETURN TO THE MONEY MONSTER  •  {interact}  •  SELL 1+ ITEM",
  ),
  upgrade: cue(
    "upgrade",
    "Spend part of that first haul on one upgrade. The choice is yours.",
    "STEP 6  •  BUY ONE UPGRADE",
    "VISIT PLAYER UPGRADES  •  BUY ANY AFFORDABLE CHOICE  •  NEXT: RESUME",
  ),
  resume: cue(
    "resume",
    "The surface gate now returns you to the route you opened.",
    "STEP 7  •  RESUME AT 15M",
    "USE THE MARKED SURFACE GATE  •  THEN ENTER YOUR PAIRED SKY GATE",
  ),
  complete: cue(
    "complete",
    "Your route is yours. Dig deeper, return through gates, and spend only what you earn.",
    "CORE ROUTE LEARNED  •  DIG DEEPER",
    "FLIGHT = LOCAL RECOVERY  •  PORTALS = LONG-DISTANCE RETURN",
  ),
});

export const TUTORIAL_NARRATION_CONFIG = Object.freeze({
  enabled: true,
  recordingsReady: false,
  cues: TUTORIAL_NARRATION_CUES,
  portalNearRadiusTiles: 7,
});
