import { PLAYER_TRAVERSAL_CONFIG } from "../values/playerTraversal.js";

function findPreviewApproach(scene) {
  const controller = scene.playerController;
  const body = controller?.physicsBody;
  const world = scene.worldModel;
  const tileSize = scene.config?.tileSize;
  if (!body || !world || !(tileSize > 0)) return null;
  const width = scene.config?.worldWidthTiles || world.width || 0;
  const startTy = Math.max(1, scene.config?.topAirRows || 1);
  const depth = Math.min(
    world.depth || world.depthTiles || startTy + 600,
    startTy + 600,
  );
  const gripRatio = PLAYER_TRAVERSAL_CONFIG.ledgeAssist.capture.gripBodyHeightRatio;
  const approachGap = tileSize * 0.06;

  for (let ty = startTy; ty < depth; ty += 1) {
    for (let tx = 1; tx < width - 1; tx += 1) {
      if (!world.isSolid(tx, ty) || world.isSolid(tx, ty - 1)) continue;
      for (const direction of [1, -1]) {
        const sideTx = tx - direction;
        if (world.isSolid(sideTx, ty) || world.isSolid(sideTx, ty - 1)) continue;
        const faceX = direction > 0 ? tx * tileSize : (tx + 1) * tileSize;
        const x = direction > 0
          ? faceX - body.w - approachGap
          : faceX + approachGap;
        const y = ty * tileSize - body.h * gripRatio;
        const probe = { ...body, x, y, surfaceDropThroughRow: null };
        if (scene.tileCollisionSystem?.isBodyOverlappingSolid?.(probe)) continue;
        return { tx, ty, direction, x, y };
      }
    }
  }
  return null;
}

export function createLedgeAssistE2EPreviewController(scene) {
  return Object.freeze({
    advance() {
      const controller = scene.playerController;
      const assist = controller?.ledgeAssist;
      const body = controller?.physicsBody;
      if (!assist?.enabled || !body) {
        console.warn("[JkdE2ELedgeAssist] Ledge Assist is disabled or unavailable");
        return null;
      }
      if (assist.phase === "hang") {
        assist.pendingClimb = true;
        assist.phaseElapsedMs = assist.config.hang.minimumDurationMs;
        console.info("[JkdE2ELedgeAssist] Pull-up queued from the live hang");
        return assist.getSnapshot();
      }
      if (assist.phase === "climb") {
        console.info("[JkdE2ELedgeAssist] Pull-up already in progress");
        return assist.getSnapshot();
      }

      const approach = findPreviewApproach(scene);
      if (!approach) {
        console.warn("[JkdE2ELedgeAssist] No collision-safe preview lip was found");
        return null;
      }
      controller.abilities?.resetFlyingState?.();
      controller.state?.setFlightActive?.(false);
      body.setFlightActive?.(false);
      assist.cancel();
      assist.regrabCooldownMs = 0;
      controller.setFacingRight(approach.direction > 0);
      body.setPosition(approach.x, approach.y);
      body.vx = approach.direction * scene.config.tileSize * 0.35;
      body.vy = scene.config.tileSize * 0.6;
      body.onGround = false;
      const grabbed = assist.tryGrab({
        input: controller.input,
        grounded: false,
        flightActive: false,
        facingRight: approach.direction > 0,
        actionLocked: false,
      });
      controller._syncSpriteWithPhysics?.();
      scene.cameras?.main?.centerOn?.(
        body.x + body.w / 2,
        body.y + body.h / 2,
      );
      console.info(
        `[JkdE2ELedgeAssist] ${grabbed ? "Live hang staged" : "Preview grab failed"} `
        + `at ${approach.tx},${approach.ty}`,
      );
      return assist.getSnapshot();
    },
  });
}
