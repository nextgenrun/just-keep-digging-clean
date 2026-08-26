function hasFiniteBody(body) {
  return Boolean(
    body
    && Number.isFinite(body.x)
    && Number.isFinite(body.y)
    && Number.isFinite(body.w)
    && Number.isFinite(body.h)
  );
}

function profileSocket(config, playerAssetProfile) {
  const id = playerAssetProfile?.characterId;
  return {
    ...config.socket.fallback,
    ...(id ? config.socket.profiles?.[id] : null),
  };
}

export function resolveFireLightAnchor({
  player,
  playerController,
  playerAssetProfile,
  tileSize,
  config,
  digging = false,
}) {
  const socket = profileSocket(config, playerAssetProfile);
  const safeTileSize = Math.max(1, Number(tileSize) || 1);
  const facingSign = playerController?.isFacingRight?.() === false ? -1 : 1;
  const body = playerController?.physicsBody;

  if (hasFiniteBody(body)) {
    const bodyCenterX = body.x + body.w * 0.5;
    const bodyCenterY = body.y + body.h * 0.5;
    const spriteUsesCenterOrigin = playerController?.config?.playerVisualOriginCenter === true;
    const nominalSpriteY = spriteUsesCenterOrigin ? bodyCenterY : body.y + body.h;
    const visualOffsetX = Number.isFinite(player?.x) ? player.x - bodyCenterX : 0;
    const visualOffsetY = Number.isFinite(player?.y) ? player.y - nominalSpriteY : 0;

    return {
      x: body.x + body.w * socket.bodyXRatio
        + visualOffsetX
        + facingSign * socket.facingOffsetTiles * safeTileSize,
      y: body.y + body.h * socket.bodyYRatio
        + visualOffsetY
        + socket.verticalOffsetTiles * safeTileSize,
      facingSign,
      obstructed: digging === true,
      animationKey: player?.anims?.currentAnim?.key || null,
      animationFrame: player?.anims?.currentFrame?.index ?? player?.frame?.name ?? 0,
      playerDepth: Number.isFinite(player?.depth) ? player.depth : null,
      source: `fire-socket:${playerAssetProfile?.characterId || "fallback"}`,
    };
  }

  return {
    x: (Number(player?.x) || 0) + facingSign * socket.facingOffsetTiles * safeTileSize,
    y: (Number(player?.y) || 0) + socket.spriteFallbackYOffsetTiles * safeTileSize,
    facingSign,
    obstructed: digging === true,
    animationKey: player?.anims?.currentAnim?.key || null,
    animationFrame: player?.anims?.currentFrame?.index ?? player?.frame?.name ?? 0,
    playerDepth: Number.isFinite(player?.depth) ? player.depth : null,
    source: "fire-socket:sprite-fallback",
  };
}
