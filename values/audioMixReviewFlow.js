const reviewCategory = (id, label, itemIds) => Object.freeze({
  id,
  label,
  itemIds: Object.freeze(itemIds),
});

const CATEGORIES = Object.freeze([
  reviewCategory("panic", "PANIC", [
    "panicWarning",
    "panicCritical",
  ]),
  reviewCategory("star", "STAR", [
    "starProximity",
    "starRelease",
    "starDestruction",
  ]),
  reviewCategory("creepy", "CREEPY", [
    "creepyCaveSolo",
    "creepyIndustrialSolo",
    "creepyDroneSolo",
    "deepCave",
    "digSequence",
  ]),
  reviewCategory("references", "REFS", [
    "levelUpShort",
    "levelUpEpic",
    "rainReference",
  ]),
]);

export const AUDIO_MIX_REVIEW_FLOW = Object.freeze({
  schemaVersion: 1,
  defaultCategoryId: "creepy",
  reviewItemIds: Object.freeze(CATEGORIES.flatMap(category => category.itemIds)),
  categories: CATEGORIES,
  decisions: Object.freeze({
    approved: "approved",
    rejected: "rejected",
  }),
  decisionStorageKey: "understar-audio-mix-review-decisions-v1",
  exportFilename: "understar-audio-review-decisions.json",
  copy: Object.freeze({
    title: "AUDIO DECISION REVIEW",
    boundary: "REVIEW NOTES ONLY · NOTHING AUTO-WIRES",
    chooseItem: "Choose one named item below",
    noSound: "NO SOUND IS PLAYING",
    decisionBoundary: "Saved locally · never changes production wiring",
    controls: "J/K move · Space play · Y approve · N reject · C clear · 0 stop",
  }),
});
