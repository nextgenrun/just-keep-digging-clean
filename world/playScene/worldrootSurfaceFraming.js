import { WORLDROOT_SANCTUARY_CONFIG } from "../../values/worldrootSanctuary.js";

const clamp = value => Math.max(0, Math.min(1, value));

/** Give the nearby ground-only tree headroom; never zoom the shared HUD camera. */
export function updateWorldrootSurfaceFraming(scene, delta) {
  const camera = scene.cameras?.main;
  const player = scene.player;
  if (!camera || !player || !scene.shakeSystem?.setBaseFollowOffset) return;
  const config = WORLDROOT_SANCTUARY_CONFIG.camera;
  const view = scene.starPillarSystem?._townWorldVisual?.sanctuaryView;
  const transform = view?.enabled ? view.transform : null;
  if (!transform && !scene._worldrootSurfaceFraming) return;
  const zoom = camera.zoom || 1;
  let weight = 0, target = 0;
  if (transform) {
    const distance = Math.abs(player.x - transform.hearthX) / transform.tileSize;
    const horizontal = 1 - clamp((distance - config.nearbyTiles)
      / (config.fadeOutTiles - config.nearbyTiles));
    const depth = (player.y - transform.surfaceY) / transform.tileSize;
    const vertical = depth > 0 ? 1 - clamp(depth / config.belowGroundTiles)
      : 1 - clamp((-depth - 1) / config.aboveGroundTiles);
    weight = horizontal * vertical;
    target = Math.max(0, camera.height * (config.groundScreenFraction - 0.5) / zoom
      - (transform.surfaceY - player.y)) * weight;
  }
  const state = scene._worldrootSurfaceFraming ||= { offsetY: 0, weight: 0 };
  const blend = 1 - Math.exp(-Math.max(0, Math.min(config.maximumDeltaMs, delta || 0)) / config.easeMs);
  state.offsetY += (target - state.offsetY) * blend;
  state.weight += (weight - state.weight) * blend;
  // The normal deadzone would otherwise leave the crown clipped by up to half its height.
  const width = scene.config.viewportWidth * (scene.config.cameraDeadzoneXFrac || 0) / zoom;
  const height = scene.config.viewportHeight * (scene.config.cameraDeadzoneYFrac || 0) / zoom;
  // Phaser setDeadzone also snaps scroll to the follow target. Resize the
  // existing rectangle only, preserving normal follow/lerp outside the tree.
  if (camera.deadzone) {
    camera.deadzone.width = width;
    camera.deadzone.height = height * (1 - state.weight);
  } else if (width > 0 || height > 0) {
    camera.setDeadzone?.(width, height * (1 - state.weight));
  }
  scene.shakeSystem.setBaseFollowOffset(0, state.offsetY);
}
