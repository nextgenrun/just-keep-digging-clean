const asset = (file, frameCount, fps, source, skin, impactFrame) => Object.freeze({
  file,
  frameCount,
  fps,
  source,
  skin,
  impactFrame,
  frameWidth: 256,
  frameHeight: 256,
  columns: 16,
});
const step = (assetId, label) => Object.freeze({ assetId, label });

export const SURVIVAL_SIDE_COMBO_REVIEW = Object.freeze({
  productionChanged: false,
  selectionQueryKey: "candidate",
  selectionStorageKey: "dig-game-survivor-side-combo-review-v1",
  defaultCandidateId: "current-chain",
  assets: Object.freeze({
    ualJab: asset(
      "../../../sprites/character/survival-ual-player-v1/runtime/survival-ual-player-v1-punch-jab-sheet.webp",
      27, 30, "Punch_Jab", "Unreal-retargeted Survivor", 7,
    ),
    ualCross: asset(
      "../../../sprites/character/survival-ual-player-v1/runtime/survival-ual-player-v1-punch-cross-sheet.webp",
      31, 30, "Punch_Cross", "Unreal-retargeted Survivor", 9,
    ),
    blenderAttack: asset(
      "../../../sprites/character/survival-character-blender-v2/runtime/survival-character-blender-v2-attack-sheet.png",
      18, 18, "Blender MINER_attack", "Approved Blender Survivor", 9,
    ),
    blenderSide: asset(
      "../../../sprites/character/survival-character-blender-v2/runtime/survival-character-blender-v2-dig-side-sheet.png",
      32, 36, "Blender MINER_dig_side", "Approved Blender Survivor", 18,
    ),
  }),
  candidates: Object.freeze([
    Object.freeze({
      id: "current-chain",
      option: "A",
      label: "Approved four-hit chain",
      summary: "The live Jab → Cross → Jab → Cross sequence. It is the production control for rhythm and responsiveness.",
      sequence: Object.freeze([
        step("ualJab", "Jab"), step("ualCross", "Cross"), step("ualJab", "Jab"),
        step("ualCross", "Cross"),
      ]),
    }),
    Object.freeze({
      id: "tight-straight",
      option: "B",
      label: "Tight straight finish",
      summary: "Quick Jab → Cross, then the Blender Survivor's direct forward punch. Short, readable and easy to time against a side tile.",
      sequence: Object.freeze([
        step("ualJab", "Jab"), step("ualCross", "Cross"), step("blenderAttack", "Straight finish"),
      ]),
    }),
    Object.freeze({
      id: "side-power",
      option: "C",
      label: "Side power finish",
      summary: "Quick Jab → Cross, then the wider Blender Survivor side-power strike. This is the strongest candidate for a satisfying mining break.",
      sequence: Object.freeze([
        step("ualJab", "Jab"), step("ualCross", "Cross"), step("blenderSide", "Side power finish"),
      ]),
    }),
    Object.freeze({
      id: "full-blender",
      option: "D",
      label: "Full Blender rhythm",
      summary: "A three-beat proof using only the approved Blender Survivor punches: direct → side power → direct. It shows the most consistent body presentation.",
      sequence: Object.freeze([
        step("blenderAttack", "Direct"), step("blenderSide", "Side power"), step("blenderAttack", "Direct finish"),
      ]),
    }),
  ]),
  stage: Object.freeze({
    tileSizePx: 94,
    displaySizePx: 109,
    groundYRatio: 0.78,
    actorXRatio: 0.38,
    targetXRatio: 0.72,
    minimumCanvasWidthPx: 300,
    canvasHeightPx: 252,
    maxDevicePixelRatio: 2,
    actionGapMs: 65,
    zoomOptions: Object.freeze([1, 1.45]),
  }),
});
