// Enforces the static-transform and live-portal safety policies shared by the landmark renderer.
export function assertStaticSurfaceHeroLandmarkPolicy(config) {
  if (
    config.motion.enabled
    || config.motion.pulse
    || config.motion.bob
    || config.motion.sway
    || config.motion.rotate
    || config.motion.runtimeResize
  ) {
    throw new Error(
      "[WorldVisualSurfaceHeroLandmarkLayer] Hero landmarks must remain static",
    );
  }
}

export function assertStarwellPortalSafety({
  enabled,
  config,
  placements,
  assets,
  geometryFor,
}) {
  if (!enabled.starwellPortalFrame) return;
  const contract = config.portalSafety;
  const item = placements.find(candidate => candidate.id === contract.landmarkId);
  if (!item) {
    throw new Error(
      "[WorldVisualSurfaceHeroLandmarkLayer] Live Starwell frame is missing",
    );
  }
  const profile = config.distanceProfiles[item.distanceProfile];
  const geometry = geometryFor(assets[item.assetId]);
  const leftTile = item.tileX - geometry.widthTiles / 2;
  const rightTile = item.tileX + geometry.widthTiles / 2;
  if (
    item.tileX !== contract.centerTileX
    || item.allowedProtectedZoneId !== contract.protectedZoneId
    || profile.depth >= contract.livePortalRenderDepth
    || leftTile >= contract.livePortalLeftTile
    || rightTile <= contract.livePortalRightTile
  ) {
    throw new Error(
      "[WorldVisualSurfaceHeroLandmarkLayer] Live Starwell portal safety contract failed",
    );
  }
}
