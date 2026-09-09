import { DYNAMIC_EVENT_HEALTH } from "../../values/dynamicEventHealth.js";
import { RUNTIME_CANARY_CONFIG } from "../../values/runtimeCanaryConfig.js";
import { CELESTIAL_ENGINE_CONFIG } from "../../values/celestialEngines.js";
import { ARC_CORE_VISUAL_CONFIG } from "../../values/arcCoreVisualConfig.js";

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

function celestialFindings(scene, nowMs, config) {
  const findings = [];
  const progression = scene?.starHeartProgressionSystem?.getSnapshot?.();
  const health = scene?.celestialEngineController?.getHealthSnapshot?.(nowMs);
  if (!progression || !health) return findings;

  const invalidProgression = progression.charge < 0
    || progression.charge > progression.chargeCapacity
    || progression.heartsSpent > progression.heartsEarned
    || progression.heartsEarned > CELESTIAL_ENGINE_CONFIG.unlock.maxHearts
    || !Array.isArray(progression.unlockedEngines)
    || progression.heartsSpent !== progression.unlockedEngines?.length
    || (
      progression.selectedEngine
      && !progression.godMode
      && !progression.unlockedEngines?.includes(progression.selectedEngine)
    )
    || (progression.godMode && (!progression.selectedEngine || !progression.charged));
  if (invalidProgression) {
    findings.push(finding(
      config,
      config.events.celestialInvariant,
      config.severity.error,
      `${config.messages.celestialInvariant}: progression bounds`,
      { sceneKey: "PlayScene", progression },
    ));
  }

  const activation = health.activation;
  const invalidActivation = health.activeCount > 1
    || (activation && (
      activation.impacts > activation.maxImpacts
      || activation.bounces > activation.maxBounces
      || activation.redirects > activation.maxRedirects
      || activation.ageMs > activation.lifetimeMs + config.timing.sampleIntervalMs * 2
    ));
  if (invalidActivation) {
    findings.push(finding(
      config,
      config.events.celestialInvariant,
      config.severity.error,
      `${config.messages.celestialInvariant}: activation cap`,
      { sceneKey: "PlayScene", health },
    ));
  }

  const transactionCount = scene?.digSystem?._celestialTransactions?.size || 0;
  if (transactionCount > CELESTIAL_ENGINE_CONFIG.damage.rememberedTransactions) {
    findings.push(finding(
      config,
      config.events.celestialInvariant,
      config.severity.error,
      `${config.messages.celestialInvariant}: transaction memory cap`,
      { sceneKey: "PlayScene", transactionCount },
    ));
  }
  return findings;
}

function talentTreeFindings(scene, config) {
  const health = scene?.starPillarSystem?.getTalentTreeHealthSnapshot?.();
  if (!health || health.ready) return [];
  return [finding(
    config,
    config.events.talentTreeInvariant,
    config.severity.error,
    config.messages.talentTreeInvariant,
    { sceneKey: "PlayScene", health },
  )];
}

function starProgressionFindings(scene, config) {
  const health = scene?.floatingTextSystem?.getStarProgressionHealthSnapshot?.();
  if (!health || health.ready) return [];
  return [finding(
    config,
    config.events.starProgressionInvariant,
    config.severity.error,
    config.messages.starProgressionInvariant,
    { sceneKey: "PlayScene", health },
  )];
}

function heavenblocksFindings(scene, config) {
  const findings = [];
  const health = scene?.heavenblocksAccessSystem?.getHealthSnapshot?.();
  if (!health || health.enabled === false) return findings;
  if (!health.promptReady || !health.layoutReady || !health.progressionReady) {
    findings.push(finding(
      config,
      config.events.heavenblocksInvariant,
      config.severity.error,
      config.messages.heavenblocksInvariant,
      { sceneKey: "PlayScene", health },
    ));
  }
  return findings;
}

function shopUiFindings(scene, config) {
  const health = scene?.npcManager?.getInteractionHealthSnapshot?.();
  if (!health || health.ready) return [];
  return [finding(
    config,
    config.events.shopUiInvariant,
    config.severity.error,
    config.messages.shopUiInvariant,
    { sceneKey: "PlayScene", health },
  )];
}

function arcCoreVisualFindings(scene, config) {
  const health = scene?.arcCoreVehicleSystem?.visuals?.getHealthSnapshot?.();
  if (!health) return [];
  const expected = ARC_CORE_VISUAL_CONFIG.health;
  const invalid = !health.ready
    || (health.enabled && (
      health.packageId !== expected.packageId
      || health.pipeline !== expected.pipeline
      || health.fixedCenter !== true
      || health.productionRoleCount !== expected.productionRoleCount
      || health.missingTextures.length > 0
    ));
  if (!invalid) return [];
  return [finding(
    config,
    config.events.arcCoreVisualInvariant,
    config.severity.error,
    config.messages.arcCoreVisualInvariant,
    { sceneKey: "PlayScene", health },
  )];
}

function resourceEconomyFindings(scene, config) {
  const health = scene?.digSystem?.getDepthEconomyHealthSnapshot?.();
  if (!health || health.ready) return [];
  return [finding(
    config,
    config.events.resourceEconomyInvariant,
    config.severity.error,
    config.messages.resourceEconomyInvariant,
    { sceneKey: "PlayScene", health },
  )];
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
      const eventHealth = scene.dynamicEventRuntime?.getHealthSnapshot?.();
      if (scene.gameState === "playing" && eventHealth && !eventHealth.ready) {
        findings.push(finding(config, DYNAMIC_EVENT_HEALTH.invariantCode, config.severity.error,
          DYNAMIC_EVENT_HEALTH.invariantMessage, { sceneKey: key, eventHealth }));
      }
      findings.push(...shopUiFindings(scene, config));
      findings.push(...celestialFindings(scene, nowMs, config));
      findings.push(...starProgressionFindings(scene, config));
      findings.push(...talentTreeFindings(scene, config));
      findings.push(...heavenblocksFindings(scene, config));
      findings.push(...arcCoreVisualFindings(scene, config));
      findings.push(...resourceEconomyFindings(scene, config));
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
