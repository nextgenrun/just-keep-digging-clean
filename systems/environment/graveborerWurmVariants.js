import { WURM_SIZES, WURM_DIFFICULTIES, WURM_POLISH } from "../../values/graveborerWurmVariants.js";

export function selectWurmVariant(depth, count, selection = {}) {
  const available = WURM_DIFFICULTIES.filter(profile => depth >= profile.depth);
  const difficulty = WURM_DIFFICULTIES.find(profile => profile.id === selection.difficulty)
    || available[Math.max(0, count - 1) % Math.max(1, available.length)]
    || WURM_DIFFICULTIES[0];
  const size = WURM_SIZES.find(profile => profile.id === selection.size)
    || WURM_SIZES.find(profile => profile.id === difficulty.size);
  return { difficulty, size };
}

export function configureWurmVariant(base, variant) {
  const scale = variant.size.scale;
  return {
    ...base,
    variant,
    path: { ...base.path,
      carveLaneOffsetsTiles: variant.size.carveLanes,
      segmentSpacingTiles: WURM_POLISH.segmentSpacingTiles * scale,
      neckSpacingTiles: WURM_POLISH.neckSpacingTiles * scale,
      tailSpacingTiles: WURM_POLISH.tailSpacingTiles * scale,
      arcSamples: WURM_POLISH.arcSamples },
    combat: { ...base.combat,
      headHitRadiusTiles: base.combat.headHitRadiusTiles * scale,
      bodyHitRadiusTiles: base.combat.bodyHitRadiusTiles * scale },
  };
}

export function applyWurmVariantDifficulty(difficulty, variant) {
  if (!variant) return difficulty;
  const profile = variant.difficulty;
  return Object.freeze({
    ...difficulty,
    variant: profile.id,
    size: variant.size.id,
    passCount: profile.passes,
    warningMs: Math.max(WURM_POLISH.minimumWarningMs, Math.round(difficulty.warningMs * profile.warning)),
    travelMs: Math.max(WURM_POLISH.minimumTravelMs, Math.round(difficulty.travelMs * profile.travel)),
    headDamageRatio: difficulty.headDamageRatio * profile.damage,
    bodyDamageRatio: difficulty.bodyDamageRatio * profile.damage,
    minimumHeadDamageGp: Math.round(difficulty.minimumHeadDamageGp * profile.damage),
    minimumBodyDamageGp: Math.round(difficulty.minimumBodyDamageGp * profile.damage),
  });
}

// Offspring use the same controller, warnings, collision and renderer as adults.
export function updateWurmBrood(parent, dtMs, context, createChild) {
  if (parent.isOffspring) return;
  if (parent.active && !parent.broodSpawned
    && parent.variant?.difficulty.brood > 0 && parent.passIndex >= WURM_POLISH.broodPass) {
    parent.broodSpawned = true;
    for (let index = 0; index < parent.variant.difficulty.brood; index += 1) {
      const child = createChild();
      const tile = context.playerTile;
      child.forceEncounter({
        tx: Math.max(0, Math.min((context.worldWidthTiles || Infinity) - 1,
          tile.tx + (index === 0 ? -1 : 1) * WURM_POLISH.broodOffsetTiles)),
        ty: tile.ty,
      }, { difficulty: WURM_POLISH.offspringDifficulty, size: WURM_POLISH.offspringSizes[index] });
      child.broodDelayMs = index * WURM_POLISH.broodStaggerMs;
      parent.offspring.push(child);
    }
  }
  for (const child of parent.offspring) {
    if (child.phase === WURM_POLISH.completedPhase) continue;
    if (child.broodDelayMs > 0) {
      if (parent.active) child.broodDelayMs = Math.max(0, child.broodDelayMs - dtMs);
      continue;
    }
    child.update(dtMs, context);
    for (const event of child.drainEvents()) {
      parent._events.push({
        ...event,
        type: event.type === "phase" ? "offspring-phase"
          : event.type === "encounter-complete" ? "offspring-complete" : event.type,
        offspring: true,
      });
    }
  }
}