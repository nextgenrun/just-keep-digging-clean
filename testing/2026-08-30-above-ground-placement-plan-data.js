import { WORLD_VISUAL_ABOVE_GROUND_COMPLETE_MAP_REVIEW as REVIEW } from
  "../values/worldVisualAboveGroundCompleteMapReview.js";
import { WORLD_VISUAL_ABOVE_GROUND_PIECEMEAL_MERGE_PLAN as PLAN } from
  "../values/worldVisualAboveGroundPiecemealMergePlan.js";
import { WORLD_VISUAL_SURFACE_PROP_LAYOUT } from
  "../values/worldVisualSurfacePropLayout.js";
import { buildBackgroundPlacementRecords } from
  "./2026-08-30-above-ground-placement-plan-backgrounds.js";
import { buildPropPlacementRecords } from
  "./2026-08-30-above-ground-placement-plan-props.js";

function summarize(records) {
  const families = [...new Set(records.map(entry => entry.family))].sort();
  const familyCounts = Object.fromEntries(families.map(family => [
    family,
    records.filter(entry => entry.family === family).length,
  ]));
  const phases = PLAN.slices.map(slice => {
    const owned = records.filter(entry => entry.phaseId === slice.id);
    return Object.freeze({
      ...slice,
      backgroundCount: owned.filter(entry => entry.kind === "background").length,
      propCount: owned.filter(entry => entry.kind === "prop").length,
    });
  });
  return Object.freeze({
    totalRecords: records.length,
    backgrounds: records.filter(entry => entry.kind === "background").length,
    props: records.filter(entry => entry.kind === "prop").length,
    excludedBackgrounds: records.filter(entry => (
      entry.kind === "background" && entry.status === "excluded"
    )).length,
    suppressedBackgrounds: records.filter(entry => (
      entry.kind === "background" && entry.status === "suppressed"
    )).length,
    familyCounts: Object.freeze(familyCounts),
    phases: Object.freeze(phases),
  });
}

export function buildAboveGroundPlacementPlanData() {
  const records = Object.freeze([
    ...buildBackgroundPlacementRecords(),
    ...buildPropPlacementRecords(),
  ]);
  return Object.freeze({
    plan: PLAN,
    review: REVIEW,
    chapters: REVIEW.chapters,
    constraints: Object.freeze({
      protected: WORLD_VISUAL_SURFACE_PROP_LAYOUT.protectedClearZones,
      lowProfile: WORLD_VISUAL_SURFACE_PROP_LAYOUT.lowProfileZones,
    }),
    records,
    summary: summarize(records),
  });
}
