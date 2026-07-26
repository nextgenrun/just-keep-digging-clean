import { ASSET_KEYS } from "../../../values/assetKeys.js";

export function createArcCorePiskelStage(scene, artwork) {
  if (!scene.textures.exists(ASSET_KEYS.vehicles.arcCore.reviewStage)) {
    throw new Error("Approved Arc Core Piskel review background is missing");
  }
  const depth = artwork?.meta?.reviewStage?.depth;
  if (!Number.isFinite(depth)) {
    throw new Error("Arc Core Piskel review background depth is missing");
  }
  return {
    scene,
    background: scene.add.image(
      0,
      0,
      ASSET_KEYS.vehicles.arcCore.reviewStage,
    ).setOrigin(0.5)
      .setDepth(depth)
      .setVisible(false),
  };
}

export function hideArcCorePiskelStage(state) {
  if (!state) return;
  state.background.setVisible(false);
}

export function drawArcCorePiskelStage(state, options) {
  const cameraView = options?.camera?.worldView;
  if (!state || !cameraView) return false;
  state.background
    .setPosition(cameraView.centerX, cameraView.centerY)
    .setDisplaySize(cameraView.width, cameraView.height)
    .setVisible(true);
  return true;
}
