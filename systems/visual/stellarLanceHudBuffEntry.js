import { CELESTIAL_ENGINE_CONFIG } from "../../values/celestialEngines.js";

function compactNumber(value, decimals) {
  return Number(value || 0).toFixed(decimals).replace(/0+$/, "").replace(/\.$/, "");
}

/** Converts the live Stellar Lance authority snapshot into one approved HUD chip. */
export function createStellarLanceHudBuffEntry(snapshot) {
  if (!snapshot?.projectileEnabled) return null;
  const cfg = CELESTIAL_ENGINE_CONFIG.hud.stellarLanceBuff;
  const passive = snapshot.passiveEcho === true;
  const remaining = passive ? "" : compactNumber(snapshot.remainingMs / 1000, cfg.timeDecimals);
  const lanes = 1 + Math.max(0, Number(snapshot.projectileSideLanes) || 0) * 2;
  const baseDamage = compactNumber(
    snapshot.projectileDamageMultiplier,
    cfg.damageDecimals,
  );
  const maximumDamage = compactNumber(
    snapshot.projectileMaximumDamageMultiplier
      || snapshot.projectileDamageMultiplier,
    cfg.damageDecimals,
  );
  const damage = baseDamage === maximumDamage
    ? `${baseDamage}× DAMAGE`
    : `${baseDamage}–${maximumDamage}× DAMAGE`;
  const range = snapshot.projectileInfiniteRange
    ? cfg.infiniteRangeLabel
    : `${snapshot.projectileRangeTiles} TILE RANGE`;
  return Object.freeze({
    text: passive ? cfg.passiveChipLabel : `${cfg.chipLabel} ${remaining}s`,
    icon: cfg.icon,
    color: cfg.cssAccent,
    tooltip: Object.freeze({
      title: passive ? cfg.passiveTooltipTitle : cfg.tooltipTitle,
      color: cfg.cssAccent,
      body: (passive ? cfg.passiveTooltipBody : cfg.activeTooltipBody)
        .replace("{damage}", damage).replace("{range}", range)
        .replace("{lanes}", `${lanes} ${lanes === 1 ? "LANE" : "LANES"}`)
        .replace("{remaining}", remaining),
    }),
  });
}
