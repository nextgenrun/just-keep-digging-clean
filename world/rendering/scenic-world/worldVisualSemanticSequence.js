import {
  WORLD_VISUAL_AREA_COMPOSITION,
  resolveWorldVisualAreaCompositionEnabled,
  resolveWorldVisualAreaCompositionProfile,
} from "../../../values/worldVisualAreaComposition.js";

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function legacySequenceIndex(column, row, seedOffset, count) {
  return positiveModulo(column + row + seedOffset, count);
}

/**
 * Resolve a card from a broad deterministic area made from a small authored
 * motif. Each vertical area advances by one library entry, so the complete
 * modern library still appears during a full descent without turning every
 * neighboring card into a different biome painting.
 */
export function resolveWorldVisualSemanticSequenceIndex(
  column,
  row,
  seedOffset,
  assetCount,
  {
    profileId = "backdrop",
    config = WORLD_VISUAL_AREA_COMPOSITION,
    search = globalThis.location?.search || "",
  } = {}
) {
  const count = Math.max(0, Math.trunc(Number(assetCount) || 0));
  if (count === 0) return -1;
  const safeColumn = Math.trunc(Number(column) || 0);
  const safeRow = Math.trunc(Number(row) || 0);
  const safeSeed = Math.trunc(Number(seedOffset) || 0);
  if (!resolveWorldVisualAreaCompositionEnabled(config, search)) {
    return legacySequenceIndex(safeColumn, safeRow, safeSeed, count);
  }

  const profile = resolveWorldVisualAreaCompositionProfile(profileId, config);
  const areaWidth = Math.max(1, Math.trunc(profile.areaWidthCards));
  const areaHeight = Math.max(1, Math.trunc(profile.areaHeightCards));
  const motifSpan = Math.max(
    1,
    Math.min(count, Math.trunc(profile.motifSpan))
  );
  const rowRepeat = Math.max(1, Math.trunc(profile.rowRepeatCards));
  const areaColumn = Math.floor(safeColumn / areaWidth);
  const areaRow = Math.floor(safeRow / areaHeight);
  const localColumn = positiveModulo(safeColumn, areaWidth);
  const localRow = positiveModulo(safeRow, areaHeight);
  const areaBase = (
    safeSeed
    + areaColumn * Math.trunc(profile.horizontalAssetStep)
    + areaRow * Math.trunc(profile.verticalAssetStep)
  );
  const localMotifStep = (
    localColumn + Math.floor(localRow / rowRepeat)
  ) % motifSpan;
  return positiveModulo(areaBase + localMotifStep, count);
}