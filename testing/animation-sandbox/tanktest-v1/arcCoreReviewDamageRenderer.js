import {
  ARC_CORE_ANIMATION_REVIEW,
  getArcCoreAnimationReviewMode,
} from "../../../values/arcCoreAnimationReview.js";

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function smooth(amount) {
  const t = clamp(amount);
  return t * t * (3 - 2 * t);
}

export function drawArcCoreAnimationReviewDamage(g, options) {
  const config = getArcCoreAnimationReviewMode(options.mode);
  if (!config || !Array.isArray(options.targets)) return false;
  const { targets, progress, direction, tileSize, timeMs } = options;

  if (options.mode === ARC_CORE_ANIMATION_REVIEW.small.id) {
    for (const target of targets) {
      const cx = (target.tx + 0.5) * tileSize;
      const cy = (target.ty + 0.5) * tileSize;
      const energy = smooth((progress - 0.16 - target.depthIndex * 0.08) / 0.34);
      g.fillStyle(config.energyColor, 0.05 + energy * 0.14);
      g.fillCircle(cx, cy, 10 + energy * 22);
      g.lineStyle(2, target.widthIndex % 2 ? config.accentColor : config.coreColor, 0.32 + energy * 0.56);
      g.strokeCircle(cx, cy, 8 + energy * 25);
      g.lineBetween(cx - direction.y * 23, cy + direction.x * 23, cx + direction.x * 24, cy + direction.y * 24);
    }
    return true;
  }

  const sweep = smooth((progress - 0.32) / 0.42) * 8;
  for (const target of targets) {
    const activation = smooth((sweep - target.depthIndex - target.widthIndex * 0.04) / 1.2);
    if (activation <= 0) continue;
    const x = target.tx * tileSize;
    const y = target.ty * tileSize;
    const inset = 5 + (target.depthIndex % 2) * 2;
    const pulse = 0.5 + Math.sin(timeMs * 0.018 + target.widthIndex) * 0.5;
    g.fillStyle(config.energyColor, 0.04 + activation * (0.08 + pulse * 0.04));
    g.fillRect(x + inset, y + inset, tileSize - inset * 2, tileSize - inset * 2);
    g.lineStyle(2, target.widthIndex % 2 ? config.energyColor : config.accentColor, 0.2 + activation * 0.56);
    g.strokeRect(x + inset, y + inset, tileSize - inset * 2, tileSize - inset * 2);
    g.lineBetween(x + inset, y + inset, x + tileSize - inset, y + tileSize - inset);
    g.lineBetween(x + tileSize - inset, y + inset, x + inset, y + tileSize - inset);
  }
  return true;
}
