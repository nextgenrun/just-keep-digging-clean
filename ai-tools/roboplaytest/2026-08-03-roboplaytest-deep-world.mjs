async function exerciseWeatherMatrix(driver) {
  return driver.page.evaluate(async () => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const { WEATHER_CONFIG } = await import("/values/weatherConfig.js");
    const weather = scene.weatherSystem;
    const results = [];
    for (const kind of Object.keys(WEATHER_CONFIG.phases)) {
      weather.forceWeather(kind, kind === "clear" ? 0 : 0.82, 60_000);
      weather.update((scene.time.now || 0) + 100, 100);
      await new Promise(resolve => setTimeout(resolve, 30));
      const snapshot = weather.getSnapshot();
      const lighting = weather.getLightingSnapshot();
      const occlusion = weather.getOcclusionSnapshot();
      const passed = snapshot.kind === kind
        && Number.isFinite(snapshot.targetIntensity)
        && lighting?.kind === kind
        && occlusion != null;
      results.push({ kind, passed, snapshot, lighting, occlusion });
      if (!passed) throw new Error(`Weather phase ${kind} did not propagate through lighting and occlusion.`);
    }
    weather.forceWeather("clear", 0, 60_000);
    return { weatherKinds: results.length, results };
  });
}

async function exerciseCaveHazardRecovery(driver) {
  return driver.page.evaluate(() => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const hazards = scene.worldModel.caveHazardZones || [];
    const kinds = ["timed-gate", "spike-run", "ember-vent"];
    const samples = kinds.map(kind => hazards.find(hazard => hazard.kind === kind));
    if (samples.some(sample => !sample)) throw new Error("Not every cave hazard family has a live sample.");
    const originalTile = scene.playerController.getPlayerTile();
    const before = scene.caveHazardSystem.getSnapshot();
    const recoveries = [];
    samples.forEach((hazard, index) => {
      scene.playerController.fillGemPower?.();
      const centerX = (hazard.centerTx + 0.5) * scene.config.tileSize;
      scene.caveHazardSystem._handleFailure(
        hazard,
        { left: centerX - 12, right: centerX - 4, top: 0, bottom: 16 },
        (scene.time.now || 0) + index * (scene.caveHazardSystem.config.failureCooldownMs + 10),
      );
      const snapshot = scene.caveHazardSystem.getSnapshot();
      const tile = scene.playerController.getPlayerTile();
      const expected = hazard.leftCheckpoint;
      const recovered = snapshot.lastFailure?.hazardId === hazard.id
        && tile.tx === expected.tx && tile.ty === expected.ty;
      recoveries.push({ kind: hazard.kind, id: hazard.id, expected, tile, snapshot, recovered });
      if (!recovered) throw new Error(`Hazard ${hazard.id} did not recover to its safe checkpoint.`);
    });
    globalThis.__jkdE2E.forcePlayerState(originalTile);
    scene.playerController.fillGemPower?.();
    const after = scene.caveHazardSystem.getSnapshot();
    if (after.failureCount !== before.failureCount + samples.length) {
      throw new Error("Cave hazard failure accounting did not advance once per family.");
    }
    return { generatedHazards: hazards.length, before, after, recoveries };
  });
}

async function auditRandomEventLifecycles(driver) {
  return driver.page.evaluate(async () => {
    const { RandomEventDirector } = await import("/systems/events/RandomEventDirector.js");
    const {
      RANDOM_EVENT_TYPE_ORDER,
      RANDOM_EVENT_TYPES,
      RANDOM_WORLD_EVENT_CONFIG,
    } = await import("/values/randomWorldEvents.js");
    const { MONEY_MONSTER_RESOURCE_KEYS } = await import("/values/resourceTypes.js");
    const director = new RandomEventDirector(0x4a4b44, { debug: true });
    const results = [];
    for (const type of RANDOM_EVENT_TYPE_ORDER) {
      const payload = {
        anchors: [{ tx: 18, ty: 140 }, { tx: 20, ty: 140 }],
        targetResource: MONEY_MONSTER_RESOURCE_KEYS[0],
        choirId: type === RANDOM_EVENT_TYPES.CRYSTAL_CHOIR ? "roboplaytest-choir" : null,
        startedDepth: 140,
      };
      const active = director.start(type, payload);
      if (!active) throw new Error(`Random event ${type} could not start.`);
      const half = Math.max(1, Math.floor(active.remainingMs / 2));
      const tick = director.tick(half);
      const remaining = director.getSnapshot().active.remainingMs;
      director.setSuspended(true);
      director.tick(half);
      const suspendedRemaining = director.getSnapshot().active.remainingMs;
      director.setSuspended(false);
      director.setProgress(2);
      if (type === RANDOM_EVENT_TYPES.MONEY_MONSTER_RUSH) director.addRushBonus(125);
      const completed = director.finish();
      if (!completed || remaining !== suspendedRemaining || tick.expired) {
        throw new Error(`Random event ${type} failed its timer/suspend/finish contract.`);
      }
      results.push({ type, active, completed, cooldownMs: director.getSnapshot().cooldownMs });
      director.state.cooldownMs = 0;
    }
    const snapshot = director.getSnapshot();
    if (snapshot.stats.started !== RANDOM_EVENT_TYPE_ORDER.length
      || snapshot.stats.completed !== RANDOM_EVENT_TYPE_ORDER.length) {
      throw new Error("Random event lifecycle statistics are inconsistent.");
    }
    return {
      eventCount: results.length,
      results,
      scheduler: RANDOM_WORLD_EVENT_CONFIG.scheduler,
      finalState: snapshot,
    };
  });
}

async function auditHardcoreRules(driver) {
  return driver.page.evaluate(async () => {
    const { HardcoreModeSystem } = await import("/systems/hardcore/HardcoreModeSystem.js");
    const { HARDCORE_MODE_CONFIG } = await import("/values/hardcoreMode.js");
    const system = new HardcoreModeSystem();
    system.selectMode(HARDCORE_MODE_CONFIG.modes.hardcore, 1_000);
    if (!system.arm("roboplaytest", 1_100)) throw new Error("Hardcore did not arm after selection.");
    const armed = system.getSnapshot();
    let stress = armed;
    for (let index = 0; index < 180; index += 1) {
      stress = system.update(HARDCORE_MODE_CONFIG.stress.maxFrameMs, {
        gameplayActive: true,
        depth: 4_500,
        darknessAlpha: 1,
        torchActive: false,
        descentTilesPerSecond: 24,
        nowMs: 2_000 + index * HARDCORE_MODE_CONFIG.stress.maxFrameMs,
      });
    }
    const teleportCost = system.getTeleportCost(4_500, "undergroundToSky");
    const teleportRecorded = system.recordTeleport(teleportCost);
    system.recordUnstuck(30_000);
    const final = system.getSnapshot();
    const roundTrip = new HardcoreModeSystem(system.getSaveData()).getSnapshot();
    const paidTeleportExpected = HARDCORE_MODE_CONFIG.teleport.free !== true;
    const teleportRuleValid = paidTeleportExpected
      ? teleportCost > 0 && teleportRecorded === true && final.paidTeleports === 1
      : teleportCost === 0 && teleportRecorded === false && final.paidTeleports === 0;
    if (!armed.isHardcore || !armed.armed || stress.stress <= 0
      || !teleportRuleValid
      || final.unstuckUses !== 1 || roundTrip.stress !== final.stress) {
      throw new Error("Hardcore stress, cost, action, or save rules failed.");
    }
    return {
      armed, stressed: stress, teleportCost, teleportRecorded, paidTeleportExpected,
      final, events: system.drainEvents(), roundTrip,
    };
  });
}

async function auditProgressionSurfaces(driver) {
  return driver.page.evaluate(async () => {
    const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
    const { TILE_TYPES } = await import("/values/tileTypes.js");
    const specials = [
      "TELEPORT_TILE", "GAMBLE_TILE", "GEM_POWER_BLOCK", "SPEED_BLOCK",
      "XP_BLOCK", "BERSERK_BLOCK", "COMBO_BLOCK",
      "LEGEND_BLOCK", "ANCIENT_RELIC_CACHE", "SKY_TILE",
    ];
    const counts = Object.fromEntries(specials.map(name => [name, 0]));
    const wanted = new Map(specials.map(name => [TILE_TYPES[name], name]));
    for (const type of scene.worldModel._types) {
      const name = wanted.get(type);
      if (name) counts[name] += 1;
    }
    const safe = callback => { try { return callback(); } catch (error) { return { error: error.message }; } };
    const snapshots = {
      retention: safe(() => scene.retentionProgressSystem.getJournalSnapshot()),
      journey: safe(() => scene.journeySystem.captureSnapshot()),
      depthGates: safe(() => scene.depthGateSystem.getSaveData()),
      specialTiles: safe(() => scene.specialTileSystem.getSaveData()),
      activatedPortals: safe(() => scene.specialTileSystem.getActivatedPortals()),
      deepestPortal: safe(() => scene.specialTileSystem.getDeepestPortal()),
      heavenblocks: safe(() => scene.heavenblocksProgressionSystem.getSaveData()),
      crafting: safe(() => scene.craftingSystem.getHealthSnapshot?.() || scene.craftingSystem.getSaveData?.()),
      starHeart: safe(() => scene.starHeartProgressionSystem.getSnapshot()),
      celestialEngine: safe(() => scene.celestialEngineController.getHealthSnapshot()),
      titanClues: safe(() => scene.titanClueSystem.getSnapshot?.() || scene.titanClueSystem.getSaveData?.()),
      worldMap: safe(() => scene.worldMapDiscoverySystem.getSaveData?.() || scene.worldMapDiscoverySystem.getSnapshot?.()),
      campfire: safe(() => scene.campfireSystem.getSaveData?.() || null),
    };
    const errored = Object.entries(snapshots).filter(([, value]) => value?.error).map(([key]) => key);
    if (!counts.TELEPORT_TILE || !counts.ANCIENT_RELIC_CACHE || errored.length) {
      throw new Error(`Progression surface audit failed: ${JSON.stringify({ counts, errored })}`);
    }
    return { specialTileCounts: counts, snapshots };
  });
}

async function captureMiningDiagnostic(driver, target) {
  return driver.page.evaluate(({ tx, ty }) => {
    const scene = globalThis.__phaserGame?.scene?.getScene?.("PlayScene");
    const input = scene?.playerController?.input;
    const body = scene?.playerController?.physicsBody || scene?.player?.body;
    const safe = callback => { try { return callback(); } catch (error) { return { error: error.message }; } };
    return {
      target: { tx, ty, solid: scene?.worldModel?.isSolid?.(tx, ty), hp: scene?.worldModel?.getTileHp?.(tx, ty) },
      playerTile: safe(() => scene.playerController.getPlayerTile()),
      aim: safe(() => scene.playerController.getAimLabel()),
      state: { game: scene?.gameState, teleporting: scene?._teleportInAnimating === true,
        controls: input?.controlsEnabled, mineDown: input?.keys?.mine?.isDown, mineLatched: input?._lastMineState,
        digging: scene?.isDigAnimating === true, animation: scene?.player?.anims?.currentAnim?.key || null,
        animationPlaying: scene?.player?.anims?.isPlaying === true, grounded: safe(() => scene.playerController.isGrounded()),
        motion: safe(() => scene.playerController.getMotionState()), velocity: { x: body?.vx ?? body?.velocity?.x, y: body?.vy ?? body?.velocity?.y } },
      arcCore: safe(() => scene.arcCoreVehicleSystem?.getSnapshot?.() || null),
      lastContactValidation: scene?._lastPlayerRigContactValidation || null,
    };
  }, target);
}

async function runMiningDepthMatrix(driver) {
  const samples = [
    { depth: 140, level: 1 },
    { depth: 700, level: 1 },
    { depth: 120, level: 2 },
    { depth: 1_500, level: 2 },
    { depth: 3_200, level: 2 },
    { depth: 4_650, level: 2 },
  ];
  for (const sample of samples) {
    await driver.runPhase({
      id: `mine-l${sample.level}-${sample.depth}`,
      title: `Real mining input near ${sample.depth}m in World ${sample.level}`,
      category: "mining",
      accelerated: true,
    }, async () => {
      const target = await driver.prepareMineTarget({
        minimumDepth: sample.depth,
        maximumDepth: sample.depth + 40,
        level: sample.level,
      });
      try {
        const result = await driver.minePreparedTarget(target);
        return { sample, target, result };
      } catch (error) {
        const diagnostic = await captureMiningDiagnostic(driver, target);
        throw new Error(`${error.message}; miningDiagnostic=${JSON.stringify(diagnostic)}`);
      }
    });
  }
}

async function runDepthVisualSweep(driver) {
  const checkpoints = [
    [1, 0], [1, 140], [1, 700], [1, 1_500], [1, 3_500], [1, 4_990],
    [2, 0], [2, 120], [2, 1_000], [2, 2_500], [2, 4_990],
  ];
  for (const [level, depth] of checkpoints) {
    await driver.runPhase({
      id: `visual-l${level}-${depth}`,
      title: `Renderer and atmosphere checkpoint: World ${level} at ${depth}m`,
      category: "visual",
      accelerated: true,
    }, async () => {
      const target = await driver.teleportToDepth(depth, level);
      await driver.page.waitForTimeout(420);
      const runtime = await driver.page.evaluate(() => {
        const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
        return {
          playerTile: scene.playerController.getPlayerTile(),
          worldVisualRuntimeMode: scene.worldVisualRuntimeMode,
          biome: scene.biomeSystem?.getCurrentBiome?.() || scene.biomeSystem?.currentBiome || null,
          weather: scene.weatherSystem?.getSnapshot?.() || null,
          lighting: scene.weatherSystem?.getLightingSnapshot?.() || null,
          cave: scene.caveHazardSystem?.getSnapshot?.() || null,
          atmosphere: scene.atmosphereSystem?.getSnapshot?.() || null,
        };
      });
      if (!target || !runtime.playerTile) throw new Error("Depth checkpoint could not position the player.");
      return { level, requestedDepth: depth, target, runtime };
    });
  }
}

export async function runDeepWorldScenarios(driver) {
  await driver.runPhase(
    { id: "weather-matrix", title: "Every weather phase reaches lighting and occlusion", category: "environment" },
    () => exerciseWeatherMatrix(driver),
  );
  await driver.runPhase(
    { id: "cave-hazard-recovery", title: "All cave hazard families drain and recover safely", category: "environment" },
    () => exerciseCaveHazardRecovery(driver),
  );
  await driver.runPhase(
    { id: "random-events", title: "All retained random-event timer and completion lifecycles", category: "events" },
    () => auditRandomEventLifecycles(driver),
  );
  await driver.runPhase(
    { id: "hardcore-rules", title: "Hardcore arming, stress, costs, cooldown, and save rules", category: "hardcore" },
    () => auditHardcoreRules(driver),
  );
  await driver.runPhase(
    { id: "progression-surfaces", title: "Special tiles and cross-system progression snapshots", category: "progression" },
    () => auditProgressionSurfaces(driver),
  );
  await runMiningDepthMatrix(driver);
  await runDepthVisualSweep(driver);
}
