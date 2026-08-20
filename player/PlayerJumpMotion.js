import { PLAYER_TRAVERSAL_CONFIG } from "../values/playerTraversal.js";

export function resolveFixedJumpVelocityPxPerSec({
  gravityPxPerSecondSquared,
  tileSizePx,
  heightTiles = PLAYER_TRAVERSAL_CONFIG.jump.heightTiles,
}) {
  const gravity = Math.max(0, Number(gravityPxPerSecondSquared) || 0);
  const heightPx = Math.max(0, Number(tileSizePx) || 0) * Math.max(0, Number(heightTiles) || 0);
  return Math.sqrt(2 * gravity * heightPx);
}

export class PlayerJumpMotion {
  constructor(body, config, traversalConfig = PLAYER_TRAVERSAL_CONFIG.jump) {
    this.body = body;
    this.jumpVelocityPxPerSec = resolveFixedJumpVelocityPxPerSec({
      gravityPxPerSecondSquared: config.gravityY,
      tileSizePx: config.tileSize,
      heightTiles: traversalConfig.heightTiles,
    });
  }

  tryStart(input, grounded, flightActive) {
    const requested = input?.consumeJumpInput?.() === true;
    if (!requested || !grounded || flightActive || !this.body) return false;
    this.body.vy = -this.jumpVelocityPxPerSec;
    this.body.onGround = false;
    return true;
  }
}
