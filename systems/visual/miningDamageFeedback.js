/** Present exactly one floating damage style for one authoritative mining hit. */
export function showMiningDamageFeedback(
  floatingTextSystem,
  worldX,
  worldY,
  result,
) {
  if (!floatingTextSystem || !result || result.frontDamageApplied === false) return null;

  if (result.isCriticalHit === true) {
    floatingTextSystem.showCriticalHit?.(
      worldX,
      worldY,
      result.damage,
      result.critMultiplier,
    );
    return "critical";
  }

  floatingTextSystem.showDamage?.(worldX, worldY, result.damage);
  return "normal";
}
