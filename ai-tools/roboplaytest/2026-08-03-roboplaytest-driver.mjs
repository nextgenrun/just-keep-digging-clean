function stringifyError(error) {
  return error?.stack || error?.message || String(error);
}

export class GameDriver {
  constructor({ config, report, session }) {
    this.config = config;
    this.report = report;
    this.session = session;
    this.page = session.page;
  }

  async snapshot() {
    return this.page.evaluate(() => {
      const game = globalThis.__phaserGame;
      const activeScenes = game?.scene?.getScenes?.(true) || [];
      const scene = game?.scene?.getScene?.("PlayScene");
      const safe = (callback, fallback = null) => {
        try { return callback(); } catch (_) { return fallback; }
      };
      const tile = safe(() => scene?.playerController?.getPlayerTile?.(), null);
      const journey = safe(() => scene?.journeySystem?.captureSnapshot?.(), null);
      const viewModel = safe(() => scene?.journeySystem?.getViewModel?.(), null);
      const health = safe(() => globalThis.__jkdHealth?.snapshot?.(), null);
      const performance = health?.telemetry?.performance || null;
      const assetLoads = performance?.streaming?.assetLoads || performance?.streaming?.worldRenderer?.assetQueue || null;
      const textureMemory = assetLoads?.textureMemory || null;
      return {
        ready: Boolean(game),
        activeScenes: activeScenes.map(entry => entry.scene?.key).filter(Boolean),
        harnessReady: Boolean(globalThis.__jkdE2E),
        uiErrors: [...(globalThis.__jkdUiErrors || [])],
        health: health ? {
          status: health.status || health.severity || null,
          findings: (health.findings || []).map(finding => ({
            key: finding.key,
            severity: finding.severity,
            message: finding.message,
            context: finding.context || null,
          })),
          performance: performance ? {
            frameMs: performance.frameMs || null,
            medianFps: performance.medianFps ?? null,
            onePercentLowFps: performance.onePercentLowFps ?? null,
            longFramesInWindow: performance.longFramesInWindow ?? null,
            totalLongFrames: performance.totalLongFrames ?? null,
            longTaskMs: performance.longTaskMs || null,
            longTasksInWindow: performance.longTasksInWindow ?? null,
            assetLoads: assetLoads ? {
              queued: assetLoads.queued,
              active: assetLoads.active,
              completed: assetLoads.completed,
              failed: assetLoads.failed,
              cancelled: assetLoads.cancelled,
              totalMs: assetLoads.totalMs || null,
              decodeMs: assetLoads.decodeMs || null,
              activationMs: assetLoads.activationMs || null,
            } : null,
            textureMemory: textureMemory ? {
              estimatedMiB: textureMemory.estimatedMiB,
              highWatermarkMiB: textureMemory.highWatermarkMiB,
              lowWatermarkMiB: textureMemory.lowWatermarkMiB,
              overBudget: textureMemory.overBudget,
              sourceCount: textureMemory.sourceCount,
              registeredRuntimeTextures: textureMemory.registeredRuntimeTextures,
            } : null,
            saves: performance.streaming?.saves ? {
              failedFlushes: performance.streaming.saves.failedFlushes,
              scheduledFlushes: performance.streaming.saves.scheduledFlushes,
              forcedFlushes: performance.streaming.saves.forcedFlushes,
            } : null,
          } : null,
        } : null,
        play: scene ? {
          active: Boolean(scene.scene?.isActive?.()),
          gameState: scene.gameState,
          controlsEnabled: Boolean(scene.playerController?.input?.controlsEnabled),
          tile,
          depth: tile ? Math.max(0, tile.ty - scene.config.topAirRows + 1) : null,
          resources: safe(() => scene.digSystem?.getResourceTotals?.(), {}),
          money: safe(() => scene.upgradeSystem?.getMoney?.(), 0),
          upgrades: safe(() => scene.upgradeSystem?.getUpgradeLevels?.(), {}),
          level: scene.playerLevelSystem?.level || 1,
          relics: safe(() => scene.ancientRelicSystem?.getCount?.(), 0),
          runtime: safe(() => ({
            teleportInAnimating: scene._teleportInAnimating === true,
            digAnimating: scene.isDigAnimating === true,
            aimLabel: scene.playerController?.getAimLabel?.() || null,
            aimTarget: scene.inputHandler?.resolveAimTargetTile?.() || null,
            mineKeyDown: scene.inputHandler?.keys?.mine?.isDown === true,
            tutorialDescentBlocked: scene.townSquareTutorialSystem?.isDescentBlocked?.() === true,
            animationKey: scene.player?.anims?.currentAnim?.key || null,
            animationPlaying: scene.player?.anims?.isPlaying === true,
            animationFrame: scene.player?.anims?.currentFrame?.index ?? null,
            contactTimelineActive: scene.ualActionContactTimeline?.isActive === true,
            contactFired: scene.ualActionContactTimeline?.contactFired === true,
          }), null),
          depthGates: safe(() => scene.depthGateSystem?.getSaveData?.(), null),
          heavenblocks: safe(() => scene.heavenblocksProgressionSystem?.getSaveData?.(), null),
          journey,
          journeyGoals: viewModel?.goals || [],
        } : null,
      };
    });
  }

  async waitFor(expression, label, timeoutMs = this.config.phaseTimeoutMs, argument) {
    try {
      await this.page.waitForFunction(expression, argument, { timeout: timeoutMs });
    } catch (error) {
      throw new Error(`Timed out waiting for ${label} after ${timeoutMs} ms: ${error.message}`);
    }
  }

  async runPhase({ id, title, accelerated = false, fatal = false, category = "critical" }, action) {
    const phase = this.report.beginPhase(id, title, accelerated, category);
    let actionResult = null;
    console.log(`[roboplaytest] START ${String(this.report.phases.length).padStart(2, "0")} [${category}] ${title}`);
    let failure = null;
    try {
      phase.before = await this.snapshot().catch(() => null);
      actionResult = await action();
      phase.after = await this.snapshot();
    } catch (error) {
      failure = error;
      phase.after = await this.snapshot().catch(() => null);
      this.report.addIssue(fatal ? "fatal" : "error", id, error.message || String(error), stringifyError(error));
    }

    try {
      phase.screenshot = await this.session.capture(this.report.screenshotPath(phase));
      const visual = phase.screenshot.visual;
      if (visual?.available && visual.nearBlackRatio > 0.985 && visual.luminanceStdDev < 8) {
        this.report.addIssue("error", id, "Screenshot is effectively black.", visual);
      }
    } catch (error) {
      this.report.addIssue("warning", id, `Screenshot capture failed: ${error.message}`);
    }

    this.report.finishPhase(phase, failure ? "fail" : "pass", { result: actionResult });
    if (failure && fatal) throw failure;
    console.log(`[roboplaytest] ${failure ? "FAIL" : "PASS"}  ${id} (${phase.durationMs} ms)${failure ? `: ${failure.message}` : ""}`);
    return failure ? null : actionResult;
  }

  async closeTransientUi() {
    return this.page.evaluate(() => globalThis.__jkdE2E?.closeAll?.() || null);
  }

  async prepareStarterMineTarget() {
    await this.closeTransientUi();
    await this.page.keyboard.down("s");
    try {
      await this.waitFor(() => {
        const scene = globalThis.__phaserGame?.scene?.getScene?.("PlayScene");
        const tile = scene?.playerController?.getPlayerTile?.();
        return Boolean(tile) && tile.ty >= scene.config.topAirRows + 1;
      }, "the real surface drop to reach starter terrain", 15_000);
    } finally {
      await this.page.keyboard.up("s").catch(() => undefined);
    }
    await this.page.waitForTimeout(250);
    return this.page.evaluate(() => {
      const scene = globalThis.__phaserGame?.scene?.getScene?.("PlayScene");
      const target = scene?.inputHandler?.resolveAimTargetTileForVector?.({ x: 0, y: 1 });
      const model = scene?.worldModel;
      const player = scene?.playerController?.getPlayerTile?.();
      if (!target || !player || !model?.isDiggable?.(target.tx, target.ty)) return null;
      return {
        tx: target.tx,
        ty: target.ty,
        playerTx: player.tx,
        playerTy: player.ty,
        key: "s",
        aim: "down",
        type: model.getTileType(target.tx, target.ty),
        hp: model.getTileHp(target.tx, target.ty),
      };
    });
  }

  async prepareMineTarget({ minimumDepth = 1, maximumDepth = 90, level = 1 } = {}) {
    return this.page.evaluate(({ minimumDepth, maximumDepth, level }) => {
      const game = globalThis.__phaserGame;
      const scene = game?.scene?.getScene?.("PlayScene");
      const model = scene?.worldModel;
      if (!scene || !model || !globalThis.__jkdE2E) return null;
      const minX = level === 2 ? scene.config.levelTwoLeftTile + 1 : 1;
      const maxX = level === 2 ? scene.config.levelTwoRightTile - 1 : scene.config.levelTwoLeftTile - 2;
      const minY = scene.config.topAirRows + minimumDepth;
      const maxY = Math.min(model.depth - 3, scene.config.topAirRows + maximumDepth);
      const directions = [
        { vector: { x: 0, y: 1 }, key: "s", aim: "down" },
        { vector: { x: 1, y: 0 }, key: "d", aim: "right" },
        { vector: { x: -1, y: 0 }, key: "a", aim: "left" },
        { vector: { x: 0, y: -1 }, key: "w", aim: "up" },
      ];
      globalThis.__jkdE2E.closeAll();
      for (let playerTy = minY - 2; playerTy <= maxY; playerTy += 1) {
        for (let playerTx = minX; playerTx <= maxX; playerTx += 1) {
          if (model.isSolid(playerTx, playerTy) || !model.isSolid(playerTx, playerTy + 1)) continue;
          globalThis.__jkdE2E.forcePlayerState({ tx: playerTx, ty: playerTy });
          for (const direction of directions) {
            const target = scene.inputHandler?.resolveAimTargetTileForVector?.(direction.vector);
            const depth = target ? target.ty - scene.config.topAirRows + 1 : -1;
            if (!target || target.tx < minX || target.tx > maxX
              || depth < minimumDepth || depth > maximumDepth
              || !model.isDiggable(target.tx, target.ty)) continue;
            if (model.tileDamageGuard?.({
              tileX: target.tx,
              tileY: target.ty,
              damage: 1,
              type: model.getTileType(target.tx, target.ty),
              hp: model.getTileHp(target.tx, target.ty),
            }) === true) continue;
            return {
              tx: target.tx,
              ty: target.ty,
              playerTx,
              playerTy,
              key: direction.key,
              aim: direction.aim,
              type: model.getTileType(target.tx, target.ty),
              hp: model.getTileHp(target.tx, target.ty),
            };
          }
        }
      }
      return null;
    }, { minimumDepth, maximumDepth, level });
  }

  async minePreparedTarget(target) {
    if (!target) throw new Error("No reachable diggable tile was found for the mining probe.");
    const settleStartedAt = Date.now();
    await this.waitFor(() => {
      const scene = globalThis.__phaserGame?.scene?.getScene?.("PlayScene");
      return scene?._teleportInAnimating !== true && scene?.gameState === "playing"
        && scene?.playerController?.input?.controlsEnabled === true;
    }, "accelerated mining placement to finish teleport recovery", this.config.loadTimeoutMs);
    const settleMs = Date.now() - settleStartedAt;
    await this.page.waitForTimeout(500);
    await this.page.keyboard.down(target.key);
    await this.page.keyboard.down("f");
    try {
      await this.waitFor(({ tx, ty, hp }) => {
        const scene = globalThis.__phaserGame?.scene?.getScene?.("PlayScene");
        const model = scene?.worldModel;
        return Boolean(model) && (!model.isSolid(tx, ty) || model.getTileHp(tx, ty) < hp);
      }, `mining damage at ${target.tx},${target.ty}`, this.config.naturalDigMs, target);
    } finally {
      await this.page.keyboard.up("f").catch(() => undefined);
      await this.page.keyboard.up(target.key).catch(() => undefined);
    }
    return this.page.evaluate(({ tx, ty, settleMs }) => {
      const scene = globalThis.__phaserGame.scene.getScene("PlayScene");
      return {
        solid: scene.worldModel.isSolid(tx, ty),
        hp: scene.worldModel.getTileHp(tx, ty),
        type: scene.worldModel.getTileType(tx, ty),
        resources: scene.digSystem.getResourceTotals(),
        settleMs,
      };
    }, { ...target, settleMs });
  }

  async teleportToDepth(depth, level = 2) {
    return this.page.evaluate(({ depth, level }) => {
      const scene = globalThis.__phaserGame?.scene?.getScene?.("PlayScene");
      const model = scene?.worldModel;
      if (!scene || !model) return null;
      const minX = level === 2 ? scene.config.levelTwoLeftTile + 1 : 1;
      const maxX = level === 2 ? scene.config.levelTwoRightTile - 1 : scene.config.levelTwoLeftTile - 2;
      const targetY = scene.config.topAirRows + depth - 1;
      let best = null;
      for (let radius = 0; radius <= 48 && !best; radius += 1) {
        for (const ty of new Set([targetY - radius, targetY + radius])) {
          if (ty < 1 || ty >= model.depth - 2) continue;
          for (let tx = minX; tx <= maxX; tx += 1) {
            if (!model.isSolid(tx, ty) && model.isSolid(tx, ty + 1)) {
              best = { tx, ty, actualDepth: ty - scene.config.topAirRows + 1 };
              break;
            }
          }
        }
      }
      const target = best || { tx: minX + 4, ty: targetY, actualDepth: depth };
      globalThis.__jkdE2E?.closeAll?.();
      globalThis.__jkdE2E?.forcePlayerState?.(target);
      return target;
    }, { depth, level });
  }
}
