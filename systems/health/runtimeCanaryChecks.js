import { RUNTIME_CANARY_CONFIG } from "../../values/runtimeCanaryConfig.js";

function sceneKey(scene) {
  return scene?.sys?.settings?.key || scene?.scene?.key || scene?.constructor?.name || "UnknownScene";
}

function activeScenes(game) {
  const fromManager = game?.scene?.getScenes?.(true);
  if (Array.isArray(fromManager)) return fromManager;
  const scenes = Array.isArray(game?.scene?.scenes) ? game.scene.scenes : [];
  return scenes.filter(scene => scene?.sys?.isActive?.() || scene?.scene?.isActive?.());
}

function hasPath(root, path) {
  let cursor = root;
  for (const segment of path.split(".")) {
    cursor = cursor?.[segment];
    if (cursor === undefined || cursor === null) return false;
  }
  return true;
}

function finding(config, code, severity, message, context = {}) {
  const suffix = context.sceneKey || context.path || "";
  return {
    key: `${code}:${suffix}`,
    code,
    severity,
    message,
    context,
  };
}

function heavenblocksFindings(scene, config) {
  const findings = [];
  const health = scene?.heavenblocksAccessSystem?.getHealthSnapshot?.();
  const relicGuidanceHealth = scene?.ancientRelicBeaconSystem?.getHealthSnapshot?.();
  if (!health || health.enabled === false) return findings;
  if (
    !health.promptReady
    || !health.objectiveReady
    || !health.shaftBeaconsReady
    || !health.layoutReady
    || !health.visualReady
    || !health.progressionReady
    || relicGuidanceHealth?.ready !== true
  ) {
    findings.push(finding(
      config,
      config.events.heavenblocksInvariant,
      config.severity.error,
      config.messages.heavenblocksInvariant,
      { sceneKey: "PlayScene", health, relicGuidanceHealth },
    ));
  }
  return findings;
}
export function evaluateRuntimeCanaries(
  game,
  sampleState,
  nowMs,
  documentHidden = false,
  config = RUNTIME_CANARY_CONFIG,
) {
  const findings = [];
  const scenes = activeScenes(game);
  const activeSceneKeys = scenes.map(sceneKey);
  const activeKeySet = new Set(activeSceneKeys);

  if (!game?.canvas || game.canvas.isConnected === false) {
    findings.push(finding(
      config,
      config.events.canvasMissing,
      config.severity.error,
      config.messages.canvasMissing,
    ));
  }

  if (scenes.length === 0) {
    sampleState.noActiveSinceMs ??= nowMs;
    if (nowMs - sampleState.noActiveSinceMs >= config.timing.noActiveSceneGraceMs) {
      findings.push(finding(
        config,
        config.events.noActiveScene,
        config.severity.error,
        config.messages.noActiveScene,
      ));
    }
  } else {
    sampleState.noActiveSinceMs = null;
  }

  for (const key of sampleState.activeSinceByScene.keys()) {
    if (!activeKeySet.has(key)) sampleState.activeSinceByScene.delete(key);
  }

  for (const scene of scenes) {
    const key = sceneKey(scene);
    const rule = config.scenes[key];
    if (!sampleState.activeSinceByScene.has(key)) {
      sampleState.activeSinceByScene.set(key, nowMs);
    }
    if (!rule) continue;
    const activeForMs = nowMs - sampleState.activeSinceByScene.get(key);
    if (rule.maxActiveMs > 0 && activeForMs >= rule.maxActiveMs) {
      findings.push(finding(
        config,
        config.events.sceneStalled,
        config.severity.error,
        `${config.messages.sceneStalled}: ${key}`,
        { sceneKey: key, activeForMs, maxActiveMs: rule.maxActiveMs },
      ));
    }
    if (activeForMs < rule.settleMs || rule.requiredPaths.length === 0) continue;
    const missingPaths = rule.requiredPaths.filter(path => !hasPath(scene, path));
    if (missingPaths.length > 0) {
      findings.push(finding(
        config,
        config.events.sceneInvariant,
        config.severity.error,
        `${config.messages.sceneInvariant}: ${key}`,
        { sceneKey: key, missingPaths },
      ));
    }
    if (key === "PlayScene") {
      findings.push(...heavenblocksFindings(scene, config));
    }
  }

  const frame = Number(game?.loop?.frame);
  const loopRunning = game?.loop?.running === true;
  const pageFocused = game?.loop?.inFocus !== false && !documentHidden;
  if (Number.isFinite(frame) && frame !== sampleState.lastFrame) {
    sampleState.lastFrame = frame;
    sampleState.lastFrameChangedAtMs = nowMs;
  } else if (!loopRunning || !pageFocused) {
    sampleState.lastFrameChangedAtMs = nowMs;
  } else if (nowMs - sampleState.lastFrameChangedAtMs >= config.timing.frozenFrameMs) {
    findings.push(finding(
      config,
      config.events.frozenFrame,
      config.severity.error,
      config.messages.frozenFrame,
      { frame, frozenForMs: nowMs - sampleState.lastFrameChangedAtMs },
    ));
  }

  return {
    findings,
    telemetry: {
      activeScenes: activeSceneKeys,
      frame: Number.isFinite(frame) ? frame : null,
      fps: Number.isFinite(game?.loop?.actualFps) ? Math.round(game.loop.actualFps) : null,
      loopRunning,
      pageFocused,
    },
  };
}
