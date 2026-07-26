function isFinitePoint(point) {
  return Number.isFinite(point?.x) && Number.isFinite(point?.y);
}

function writePoint(output, x, y) {
  output.x = x;
  output.y = y;
  return output;
}

/**
 * Resolves the visible center of the player sprite in world space.
 * Phaser's calibrated per-animation origin is preferred, with body geometry
 * and the sprite position retained as safe fallbacks.
 */
export function resolvePlayerLightWorldCenter(
  player,
  playerController = null,
  output = { x: 0, y: 0 }
) {
  if (!player) return writePoint(output, 0, 0);

  if (typeof player.getCenter === "function") {
    try {
      player.getCenter(output, true);
      if (isFinitePoint(output)) return output;
    } catch (_) {
      // Fall through to the explicit geometry paths below.
    }
  }

  const displayWidth = Number(player.displayWidth);
  const displayHeight = Number(player.displayHeight);
  if (
    Number.isFinite(player.x)
    && Number.isFinite(player.y)
    && Number.isFinite(displayWidth)
    && Number.isFinite(displayHeight)
  ) {
    const originX = Number.isFinite(player.originX) ? player.originX : 0.5;
    const originY = Number.isFinite(player.originY) ? player.originY : 0.5;
    let centerX = player.x - displayWidth * originX + displayWidth * 0.5;
    let centerY = player.y - displayHeight * originY + displayHeight * 0.5;
    const rotation = Number(player.rotation) || 0;

    if (rotation !== 0) {
      const dx = centerX - player.x;
      const dy = centerY - player.y;
      const cosine = Math.cos(rotation);
      const sine = Math.sin(rotation);
      centerX = player.x + dx * cosine - dy * sine;
      centerY = player.y + dx * sine + dy * cosine;
    }

    return writePoint(output, centerX, centerY);
  }

  const body = playerController?.physicsBody;
  if (
    Number.isFinite(body?.x)
    && Number.isFinite(body?.y)
    && Number.isFinite(body?.w)
    && Number.isFinite(body?.h)
  ) {
    return writePoint(output, body.x + body.w * 0.5, body.y + body.h * 0.5);
  }

  return writePoint(
    output,
    Number.isFinite(player.x) ? player.x : 0,
    Number.isFinite(player.y) ? player.y : 0
  );
}
