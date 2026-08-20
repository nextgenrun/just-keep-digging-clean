import {
  ANIMATION_TILE_CLEARANCE_CONFIG,
  ANIMATION_TILE_CLEARANCE_POLICIES,
  resolveAnimationTileClearanceEnabled,
} from "../values/animationTileClearance.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { resolvePlayerTargetDirection } from "./playerDirectionalTargets.js";

const unique = values => [...new Set((values || []).filter(Boolean))];

function normalizeFamily(family) {
  const value = String(family || "").replace(/^complex-/, "");
  if (value === "up-side" || value === "down-side") return "diagonal";
  if (value.includes("side")) return "side";
  if (value.includes("up")) return "up";
  if (value.includes("down")) return "down";
  return value || "side";
}

function familyFromDirection(direction, fallback) {
  if (!direction) return fallback;
  if (direction.x !== 0 && direction.y !== 0) return "diagonal";
  if (direction.y < 0) return "up";
  if (direction.y > 0) return "down";
  return "side";
}

function defaultPolicy(family) {
  return {
    side: ANIMATION_TILE_CLEARANCE_POLICIES.sideCanonical,
    up: ANIMATION_TILE_CLEARANCE_POLICIES.upCanonical,
    down: ANIMATION_TILE_CLEARANCE_POLICIES.downCanonical,
    diagonal: ANIMATION_TILE_CLEARANCE_POLICIES.diagonalCanonical,
  }[family] || ANIMATION_TILE_CLEARANCE_POLICIES.sideCanonical;
}

function resolveMotion(scene, config, playerController = scene?.playerController) {
  if (playerController?.isGrounded?.() !== true) return "airborne";
  const velocity = playerController?.physicsBody?.vx
    ?? scene.player?.body?.velocity?.x
    ?? 0;
  const motion = playerController?.getMotionState?.();
  return Math.abs(Number(velocity) || 0) >= config.movingSpeedThresholdPxPerSecond
    && (motion === "walk-left" || motion === "walk-right")
    ? "moving"
    : "stationary";
}

function getPlayerAnchor(scene, playerController = scene?.playerController) {
  const body = playerController?.physicsBody;
  const tileSize = scene.config?.tileSize;
  if (!body || !(tileSize > 0)) return null;
  return {
    tx: Math.floor((body.x + body.w / 2) / tileSize),
    ty: Math.floor((body.y + body.h / 2) / tileSize),
  };
}

function clearanceTile(token, player, target, direction) {
  if (!player || !target) return null;
  if (token === "head") return { tx: player.tx, ty: player.ty - 1 };
  if (token === "rear-head") {
    return { tx: player.tx - Math.sign(direction?.x || 0), ty: player.ty - 1 };
  }
  if (token === "target-above") return { tx: target.tx, ty: target.ty - 1 };
  if (token === "target-left") return { tx: target.tx - 1, ty: target.ty };
  if (token === "target-right") return { tx: target.tx + 1, ty: target.ty };
  return null;
}

function inspectPolicy(worldModel, policy, context) {
  if (policy.targetFamily !== context.targetFamily) {
    return { safe: false, reason: "target-family-mismatch" };
  }
  if (!policy.allowedMotion.includes(context.motion)) {
    return { safe: false, reason: `motion-${context.motion}-not-allowed` };
  }
  for (const token of policy.requiredOpen) {
    const tile = clearanceTile(
      token,
      context.playerTile,
      context.targetTile,
      context.direction,
    );
    if (tile && worldModel?.isSolid?.(tile.tx, tile.ty)) {
      return { safe: false, reason: `occupied-${token}`, tile };
    }
  }
  return { safe: true, reason: "clear" };
}

export function resolveAnimationTileClearance({
  scene,
  profile,
  family,
  animationKeys,
  fallback,
  targetTile,
  playerController = scene?.playerController,
  worldModel = scene?.worldModel,
  search = globalThis.location?.search || "",
} = {}) {
  const keys = unique(animationKeys);
  const requestedFamily = normalizeFamily(family);
  const direction = resolvePlayerTargetDirection(
    playerController?.physicsBody,
    scene?.config?.tileSize,
    targetTile,
  );
  const context = {
    targetFamily: familyFromDirection(direction, requestedFamily),
    direction,
    targetTile: targetTile ? { tx: targetTile.tx, ty: targetTile.ty } : null,
    playerTile: getPlayerAnchor(scene, playerController),
    motion: resolveMotion(scene, ANIMATION_TILE_CLEARANCE_CONFIG, playerController),
  };
  if (!resolveAnimationTileClearanceEnabled(search)) {
    return Object.freeze({
      animationKeys: Object.freeze(keys),
      fallback,
      enabled: false,
      context: Object.freeze(context),
      rejected: Object.freeze([]),
      usedCanonicalFallback: false,
    });
  }

  const metadata = profile?.animationTileClearanceByAnimation || {};
  const accepted = [];
  const rejected = [];
  for (const animationKey of keys) {
    const policy = metadata[animationKey] || defaultPolicy(requestedFamily);
    const result = inspectPolicy(worldModel, policy, context);
    if (result.safe) accepted.push(animationKey);
    else rejected.push(Object.freeze({ animationKey, policyId: policy.id, ...result }));
  }
  const canonical = fallback || keys[0] || null;
  const usedCanonicalFallback = accepted.length === 0 && Boolean(canonical);
  const decision = Object.freeze({
    animationKeys: Object.freeze(usedCanonicalFallback ? [canonical] : accepted),
    fallback: canonical,
    enabled: true,
    context: Object.freeze(context),
    rejected: Object.freeze(rejected),
    usedCanonicalFallback,
  });
  if (scene) scene.animationTileClearanceDecision = decision;
  if (GAME_CONFIG.debugMode && typeof globalThis.window !== "undefined") {
    scene._animationTileClearanceDiagnosticsApi ||= Object.freeze({
      snapshot: () => scene.animationTileClearanceDecision || null,
      rollbackQuery: `?${ANIMATION_TILE_CLEARANCE_CONFIG.rollbackQuery}=0`,
    });
    globalThis.window[ANIMATION_TILE_CLEARANCE_CONFIG.runtimeGlobal]
      = scene._animationTileClearanceDiagnosticsApi;
  }
  return decision;
}

export function destroyAnimationTileClearanceDiagnostics(scene) {
  const key = ANIMATION_TILE_CLEARANCE_CONFIG.runtimeGlobal;
  if (
    typeof globalThis.window !== "undefined"
    && globalThis.window[key] === scene?._animationTileClearanceDiagnosticsApi
  ) {
    delete globalThis.window[key];
  }
  if (scene) {
    scene._animationTileClearanceDiagnosticsApi = null;
    scene.animationTileClearanceDecision = null;
  }
}
