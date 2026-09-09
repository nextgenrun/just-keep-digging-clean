import { SIGNAL_TRAP, SIGNAL_REWARDS } from "../../values/signalRisk.js";
import { RESOURCE_PRICES_CONFIG } from "../../values/resourcePrices.js";

// Base ore value avoids merchant modifiers changing the price of generosity.
export function signalCargoValue(resources) {
  return Object.entries(RESOURCE_PRICES_CONFIG.basePrices).reduce(
    (total, [key, price]) => total + Math.max(0, Number(resources?.[key]) || 0) * price, 0);
}
export function signalGiftRequirement(owned, depth = 0) {
  return Math.ceil(Math.max(SIGNAL_REWARDS.giftMinimumValue,
    Math.max(0, depth) * SIGNAL_REWARDS.giftValuePerDepth,
    signalCargoValue(owned) * SIGNAL_REWARDS.giftCargoShare));
}
export function signalGiftReward(owned, given, depth = 0) {
  const generous = signalCargoValue(given) >= signalGiftRequirement(owned, depth);
  return { generous, stars: generous ? SIGNAL_REWARDS.generousStars : SIGNAL_REWARDS.giftStars };
}

// Tile-centre ray, including both cells at a crossed corner. Rock shields the player;
// the blast never mines the shielding tile before checking it.
export function signalHasCover(world, source, target) {
  let x = source.tx, y = source.ty;
  const dx = target.tx - x, dy = target.ty - y;
  const stepX = Math.sign(dx), stepY = Math.sign(dy);
  const deltaX = dx ? 1 / Math.abs(dx) : Infinity, deltaY = dy ? 1 / Math.abs(dy) : Infinity;
  let edgeX = deltaX / 2, edgeY = deltaY / 2;
  const solid = (tx, ty) => !(tx === source.tx && ty === source.ty) && world.isSolid(tx, ty);
  while (x !== target.tx || y !== target.ty) {
    if (edgeX === edgeY) {
      if (solid(x + stepX, y) || solid(x, y + stepY)) return true;
      x += stepX; y += stepY; edgeX += deltaX; edgeY += deltaY;
    } else if (edgeX < edgeY) { x += stepX; edgeX += deltaX; }
    else { y += stepY; edgeY += deltaY; }
    if (solid(x, y)) return true;
  }
  return false;
}
export function signalBlastHits(world, source, target) {
  return Math.hypot(source.tx - target.tx, source.ty - target.ty) <= SIGNAL_TRAP.radius
    && !signalHasCover(world, source, target);
}
