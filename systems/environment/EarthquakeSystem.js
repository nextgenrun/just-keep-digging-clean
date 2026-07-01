/**
 * EarthquakeSystem
 *
 * Manages seismic hazards: earthquakes, cave-ins, falling rocks.
 * Uses a state machine: idle → warning → earthquake → aftermath → idle.
 *
 * WARNING TEXT: Uses the existing FloatingTextSystem ("⚠ EARTHQUAKE!")
 * which appears during the warning phase and persists through the quake.
 *
 * RED FLASH: Uses ScreenFlashSystem.flashCrit() to tint the screen red
 * at the start of each earthquake event (brief, 120ms).
 *
 * CAVE-IN RESTORATION: After collapse, each destroyed tile is queued
 * for re-spawn as rubble (partial HP, same type as the original).
 * The player must dig through the rubble to escape — they get "stuck"
 * until they clear the debris.
 */

import { TILE_TYPES } from "../../values/tileTypes.js";
import { EARTHQUAKE_CONFIG } from "../../values/earthquakes.js";

const MUTABLE_TYPES = new Set([
  TILE_TYPES.DIRT,
  TILE_TYPES.STONE,
  TILE_TYPES.DARK_DIRT_NORMAL,
  TILE_TYPES.DARK_DIRT_STRONG,
]);

const COLORS = {
  [TILE_TYPES.DIRT]: 0x8a4f28,
  [TILE_TYPES.STONE]: 0x858585,
  [TILE_TYPES.DARK_DIRT_NORMAL]: 0x5d3825,
  [TILE_TYPES.DARK_DIRT_STRONG]: 0x3f2b22,
};

const rand = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const tileKey = (tx, ty) => `${tx},${ty}`;

export class EarthquakeSystem {
  constructor(scene, config = EARTHQUAKE_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.state = "idle";
    this.intensity = null;
    this.stateRemaining = 0;
    this.nextEventMs = 0;
    this.mutationTimer = 0;
    this.caveIns = [];
    this.fallingRocks = [];
    this.chainTimer = 0;
    this.chainPending = false;
    this.impactCooldown = 0;
    this.paused = false;

    this._restoreQueue = [];
    this._rubbleTimer = 0;

    // ===== NEW: Warning text state =====
    this._warningText = null; // floating "⚠ EARTHQUAKE!" text
    this._warningTextTimer = 0;

    this.fx = scene.add.graphics().setDepth(34);
    this.stressFx = scene.add.graphics().setDepth(18);
    this._stressTimer = 0;
    this._scheduleNext();
    this._installDebugApi();
    this._log("initialized", this.getStatus());
  }

  update(delta) {
    if (!this.config.enabled || this.paused) return;
    const dt = Math.min(delta, 100);
    this.impactCooldown = Math.max(0, this.impactCooldown - dt);
    this._updateFallingRocks(dt);
    this._updateCaveIns(dt);

    // ===== NEW: Update warning text =====
    this._updateWarningText(dt);

    // ===== NEW: Update rubble restoration =====
    this._updateRubbleRestoration(dt);

    this._stressTimer -= dt;
    if (this._stressTimer <= 0) {
      this._stressTimer = 500;
      this._drawInstability();
    }

    if (this.chainPending) {
      this.chainTimer -= dt;
      if (this.chainTimer <= 0) {
        this.chainPending = false;
        const candidate = this._findCeilingCandidates(1)[0];
        if (candidate) {
          this._queueCaveIn(candidate, true);
          this._log("chain reaction warning", candidate);
        }
      }
    }

    if (this.state === "idle") {
      const depth = this._getDepth();
      if (depth < this.config.minimumDepth) return;
      this.nextEventMs -= dt;
      if (this.nextEventMs <= 0) this.start();
      return;
    }

    this.stateRemaining -= dt;
    if (this.state === "warning") {
      this._warningFx(dt);
      if (this.stateRemaining <= 0) this._beginQuake();
      return;
    }

    if (this.state === "earthquake") {
      this._quakeFx(dt);
      this.mutationTimer -= dt;
      if (this.mutationTimer <= 0) {
        this.mutationTimer += this.config.mutationPulseMs;
        this._mutateNearbyTiles();
      }
      // ===== NEW: Red flash on each mutation pulse =====
      if (this.mutationTimer === 0) {
        this._redFlash();
      }
      if (this.stateRemaining <= 0) this._beginAftermath();
      return;
    }

    if (this.state === "aftermath" && this.stateRemaining <= 0) {
      this._finishEvent();
    }
  }

  start(forcedIntensity = null) {
    if (this.state !== "idle") this.cancelActiveHazards();
    const depth = this._getDepth();
    this.intensity = forcedIntensity && this.config.intensities[forcedIntensity]
      ? forcedIntensity
      : this._rollIntensity(depth);
    const cfg = this.config.intensities[this.intensity];
    this.state = "warning";
    this.stateRemaining = rand(...cfg.warningMs);
    this._playTone("rumble");

    // ===== NEW: Show warning text + red flash =====
    this._showWarningText();
    this._redFlash();

    this._log("warning started", { intensity: this.intensity, depth, durationMs: Math.round(this.stateRemaining) });
  }

  setPaused(paused) {
    this.paused = Boolean(paused);
    this._log(this.paused ? "paused" : "resumed");
  }

  cancelActiveHazards() {
    this.state = "idle";
    this.intensity = null;
    this.stateRemaining = 0;
    this.caveIns.length = 0;
    this.chainPending = false;
    this.chainTimer = 0;

    // ===== NEW: Clear restore queue =====
    this._restoreQueue.length = 0;

    // ===== NEW: Destroy warning text =====
    if (this._warningText) {
      this._warningText.destroy();
      this._warningText = null;
    }

    for (const rock of this.fallingRocks) rock.object?.destroy();
    this.fallingRocks.length = 0;
    this.fx.clear();
    // Scene may already be shutting down — camera could be gone
    const camera = this.scene?.cameras?.main;
    if (camera) {
      camera.stopShake?.();
      camera.shakeEffect?.reset?.();
      camera.shakeEffect?.stop?.();
    }
    if (this.scene?.shakeSystem) this.scene.shakeSystem.stop();
    this._scheduleNext();
    this._log("active hazards cancelled");
  }

  getStatus() {
    return {
      state: this.state,
      intensity: this.intensity,
      depth: this._getDepth(),
      nextEventMs: Math.round(this.nextEventMs),
      caveIns: this.caveIns.length,
      fallingRocks: this.fallingRocks.length,
      chainPending: this.chainPending,
      rubbleQueue: this._restoreQueue.length,
      rubbleTiles: this.scene.worldModel?.getRubbleTiles?.().length ?? 0,
      warningTextActive: !!this._warningText,
      debug: this._debugEnabled(),
    };
  }

  destroy() {
    this.cancelActiveHazards();
    this.fx?.destroy();
    this.stressFx?.destroy();
    // NEW: Destroy warning text
    if (this._warningText) {
      this._warningText.destroy();
      this._warningText = null;
    }
    if (typeof window !== "undefined" && window.earthquakeDebug?.system === this) {
      delete window.earthquakeDebug;
    }
  }

  // ── State handlers ────────────────────────────────────────────

  _beginQuake() {
    const cfg = this.config.intensities[this.intensity];
    this.state = "earthquake";
    this.stateRemaining = rand(...cfg.quakeMs);
    this.mutationTimer = 0;

    // ===== NEW: Save original tile types for cave-in recovery =====
    // Before we collapse, we queue up the cave-in candidates with their
    // original type so _collapse can save them for restoration.
    const count = randInt(...cfg.caveIns);
    for (const candidate of this._findCeilingCandidates(count)) {
      // Save the original type before queueing
      const originalType = this.scene.worldModel.getTileType(candidate.tx, candidate.ty);
      this._queueCaveIn({
        ...candidate,
        originalType,
        originalHp: this.scene.worldModel.getTileHp(candidate.tx, candidate.ty),
      }, false);
    }

    this._playTone("crack");

    // ===== NEW: Red flash at quake start =====
    this._redFlash();
    this._showWarningText();

    this._log("earthquake started", {
      intensity: this.intensity,
      durationMs: Math.round(this.stateRemaining),
      caveIns: this.caveIns.length,
    });
  }

  _beginAftermath() {
    const cfg = this.config.intensities[this.intensity];
    this.state = "aftermath";
    this.stateRemaining = rand(5000, 9000);

    const restoreDelay = this.config?.rubbleRestoreDelayMs || 3000;
    this._scheduleDugTunnelRubble(restoreDelay);

    if (Math.random() < cfg.chainChance) {
      this.chainPending = true;
      this.chainTimer = rand(...this.config.chainDelayMs);
      this._log("chain reaction scheduled", { delayMs: Math.round(this.chainTimer) });
    }
    this._playTone("settle");

    // ===== NEW: Hide warning text after quake =====
    if (this._warningText) {
      this.scene.tweens.add({
        targets: this._warningText,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          if (this._warningText) {
            this._warningText.destroy();
            this._warningText = null;
          }
        },
      });
    }

    this.scene.queueDugTilesSave?.();
    this._log("aftermath started");
  }

  _finishEvent() {
    this.state = "idle";
    this.intensity = null;
    this.stateRemaining = 0;
    this.fx.clear();
    this._scheduleNext();
    this._log("event complete", { nextEventMs: Math.round(this.nextEventMs) });
  }

  _scheduleDugTunnelRubble(delayMs) {
    const baseCount = this.config.rubbleRespawnCounts?.[this.intensity] ?? 0;
    const depth = this._getDepth();
    const scale = this._getRubbleDepthScale(depth);
    const multiplier = Number.isFinite(scale.multiplier) ? scale.multiplier : 1;
    const count = Math.ceil(baseCount * multiplier);
    if (count <= 0) return;

    const radius = Number.isFinite(scale.radiusTiles)
      ? scale.radiusTiles
      : this.config.rubbleRespawnRadiusTiles ?? this.config.radiusTiles ?? 12;
    const spreadMs = Math.max(0, Math.floor(Number.isFinite(scale.spreadMs) ? scale.spreadMs : 0));
    const candidates = this._findDugRubbleCandidates(count, radius);
    const hpRatio = Number.isFinite(this.config.rubbleHpRatio) ? this.config.rubbleHpRatio : 0.25;

    candidates.forEach((candidate) => {
      this._queueRubbleRestore({
        tx: candidate.tx,
        ty: candidate.ty,
        type: candidate.type,
        maxHp: candidate.maxHp,
        hp: Math.max(1, Math.floor(candidate.maxHp * hpRatio)),
        delayMs: delayMs + rand(0, spreadMs),
        source: "dug",
      });
    });

    this._log("dug tunnel rubble queued", {
      baseCount,
      depth,
      multiplier,
      requested: count,
      queued: candidates.length,
      radius,
      spreadMs,
    });
  }

  _getRubbleDepthScale(depth = this._getDepth()) {
    const bands = Array.isArray(this.config.rubbleDepthScaling)
      ? this.config.rubbleDepthScaling
      : [];
    return bands.find(band => depth >= band.min && depth <= band.max) ?? {
      multiplier: 1,
      radiusTiles: this.config.rubbleRespawnRadiusTiles ?? this.config.radiusTiles ?? 12,
      spreadMs: 0,
    };
  }

  _queueRubbleRestore(entry) {
    if (!entry || !Number.isInteger(entry.tx) || !Number.isInteger(entry.ty) || !Number.isInteger(entry.type)) {
      return;
    }

    this._restoreQueue.push({
      tx: entry.tx,
      ty: entry.ty,
      type: entry.type,
      hp: Math.max(1, Math.floor(entry.hp || 1)),
      maxHp: Math.max(1, Math.floor(entry.maxHp || entry.hp || 1)),
      delayMs: Math.max(0, entry.delayMs || 0),
      scheduledAt: performance.now(),
      source: entry.source || "unknown",
    });
  }

  /**
   * Update rubble restoration — restore tiles from the queue
   * @param {number} dt - delta time ms
   * @private
   */
  _updateRubbleRestoration(dt) {
    const now = performance.now();
    let restoredAny = false;
    let restoredThisFrame = 0;
    const restoresPerFrame = Math.max(1, Math.floor(this.config.rubbleRestoresPerFrame ?? 24));
    for (let i = this._restoreQueue.length - 1; i >= 0; i--) {
      const entry = this._restoreQueue[i];
      if (now - entry.scheduledAt >= entry.delayMs) {
        this._restoreQueue.splice(i, 1);
        if (this._isPlayerOccupiedTile(entry.tx, entry.ty)) continue;
        if (this.scene.worldModel.getTileType(entry.tx, entry.ty) !== TILE_TYPES.AIR) continue;

        const restored = this.scene.worldModel.setRubbleTile(entry.tx, entry.ty, entry.type, entry.hp, entry.maxHp);
        if (!restored) continue;

        this.scene.worldRenderer.applyTileUpdate(entry.tx, entry.ty);
        this._emitDust(entry.tx, entry.ty, entry.source === "dug" ? 4 : 5);
        restoredAny = true;
        restoredThisFrame += 1;
        if (restoredThisFrame >= restoresPerFrame) break;
      }
    }

    if (restoredAny) {
      this.scene.queueDugTilesSave?.();
    }
  }

  // ── Warning / Flash / Text helpers ──────────────────────────────

  /**
   * Show a red flash across the entire screen (120ms duration).
   * Uses ScreenFlashSystem if available, or falls back to a direct
   * screen-space rectangle.
   * @private
   */
  _redFlash() {
    // Use ScreenFlashSystem if available (clean, reparentable)
    if (this.scene.screenFlashSystem) {
      this.scene.screenFlashSystem._flash(0xff0000, 0.06, 120);
      return;
    }

    // Fallback: direct red flash rectangle
    try {
      const { width, height } = this.scene.scale;
      const flash = this.scene.add.rectangle(0, 0, width, height, 0xff0000, 0.06)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(1001);

      this.scene.tweens.add({
        targets: flash,
        alpha: 0,
        duration: 120,
        ease: 'Power2.out',
        onComplete: () => flash.destroy(),
      });
    } catch (e) {
      // ignore if scene is shutting down
    }
  }

  /**
   * Show "⚠ EARTHQUAKE!" warning text that floats up and fades.
   * Uses FloatingTextSystem if available, or fallback text.
   * @private
   */
  _showWarningText() {
    if (!this.scene.playerController) return;

    // Only show one warning text at a time
    if (this._warningText) return;

    const player = this.scene.playerController?.getPlayerTile();
    if (!player) return;

    const ts = this.scene.config.tileSize;
    const worldX = player.tx * ts + ts / 2;
    const worldY = (player.ty - 2) * ts + ts / 2;

    // Use FloatingTextSystem if available (manages its own life cycle)
    if (this.scene.floatingTextSystem) {
      this.scene.floatingTextSystem.showFloatingText(
        worldX, worldY,
        "⚠  EARTHQUAKE!",
        "#ff3333",
        2000, // duration before fade
        28   // font size
      );
      return;
    }

    // Fallback: direct text
    const warningText = this.scene.add.text(worldX, worldY, "⚠  EARTHQUAKE!", {
      fontFamily: 'Consolas, monospace',
      fontSize: '28px',
      color: '#ff3333',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
      shadow: {
        offsetX: 2, offsetY: 2,
        color: '#ff0000',
        blur: 8,
        stroke: true, fill: true,
      },
    }).setOrigin(0.5).setDepth(50).setAlpha(0);

    this._warningText = warningText;

    // Pop up and fade out
    this.scene.tweens.add({
      targets: warningText,
      alpha: 1,
      y: warningText.y - 60,
      duration: 1200,
      ease: 'Power2.out',
      onComplete: () => {
        this.scene.tweens.add({
          targets: warningText,
          alpha: 0,
          duration: 800,
          onComplete: () => {
            warningText.destroy();
            this._warningText = null;
          },
        });
      },
    });
  }

  /**
   * Update the floating warning text timer (re-issue it if quake persists).
   * @param {number} dt - delta
   * @private
   */
  _updateWarningText(dt) {
    this._warningTextTimer -= dt;
    if (this._warningTextTimer <= 0 && (this.state === "warning" || this.state === "earthquake")) {
      this._warningTextTimer = 3000; // re-display every 3s during active quake
      this._showWarningText();
    }
  }

  // ── Original cave-in logic (modified for rubble tracking) ──────

  _mutateNearbyTiles() {
    const player = this.scene.playerController?.getPlayerTile();
    if (!player) return;
    const cfg = this.config.intensities[this.intensity];
    const candidates = [];
    const radius = this.config.radiusTiles;
    for (let i = 0; i < 48; i += 1) {
      const tx = player.tx + randInt(-radius, radius);
      const ty = player.ty + randInt(-radius, radius);
      const type = this.scene.worldModel.getTileType(tx, ty);
      if (!MUTABLE_TYPES.has(type)) continue;
      const distance = Math.abs(tx - player.tx) + Math.abs(ty - player.ty);
      const exposed = this._hasAdjacentAir(tx, ty);
      const unstable = this._isUnstable(tx, ty);
      candidates.push({ tx, ty, type, score: (exposed ? 4 : 0) + (unstable ? 5 : 0) - distance * 0.05 });
    }
    candidates.sort((a, b) => b.score - a.score);
    for (const tile of candidates.slice(0, cfg.mutationsPerPulse)) {
      const hp = this.scene.worldModel.getTileHp(tile.tx, tile.ty);
      const roll = Math.random();
      const damage = roll < 0.1 ? hp : roll < 0.35 ? hp * 0.55 : hp * 0.25;
      const result = this.scene.worldModel.damageTile(tile.tx, tile.ty, Math.max(1, damage));
      this.scene.worldRenderer.applyTileUpdate(tile.tx, tile.ty);
      if (result.destroyed) {
        this._emitDust(tile.tx, tile.ty, 7);
        const reward = this.scene.digSystem?.processDestroyedTile(tile.tx, tile.ty, result.typeBeforeDamage, performance.now(), false, result.wasRubble);
        this.scene.showLootPickupFeedback?.(reward, { tx: tile.tx, ty: tile.ty });
      }
      this._log("tile mutation", { ...tile, destroyed: result.destroyed, hp: result.hp });
    }
  }

  _findDugRubbleCandidates(limit, radiusOverride = null) {
    const player = this.scene.playerController?.getPlayerTile();
    if (!player) return [];

    const model = this.scene.worldModel;
    const radius = Number.isFinite(radiusOverride)
      ? radiusOverride
      : this.config.rubbleRespawnRadiusTiles ?? this.config.radiusTiles ?? 12;
    const occupied = this._getPlayerOccupiedTileKeys();
    const candidates = [];

    for (const key of model.getDugTileKeys()) {
      const [txText, tyText] = key.split(",");
      const tx = Number.parseInt(txText, 10);
      const ty = Number.parseInt(tyText, 10);
      if (!Number.isInteger(tx) || !Number.isInteger(ty) || !model.inBounds(tx, ty)) continue;
      if (occupied.has(tileKey(tx, ty))) continue;
      if (model.getTileType(tx, ty) !== TILE_TYPES.AIR) continue;

      const distance = Math.abs(tx - player.tx) + Math.abs(ty - player.ty);
      if (distance > radius) continue;

      const source = model.getDugTileSource(tx, ty);
      if (!source) continue;

      candidates.push({
        ...source,
        score: -distance + (ty >= player.ty ? 0.35 : 0) + Math.random() * 0.25,
      });
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, limit);
  }

  _findCeilingCandidates(limit) {
    if (limit <= 0) return [];
    const player = this.scene.playerController?.getPlayerTile();
    if (!player) return [];
    const candidates = [];
    for (let tx = player.tx - 10; tx <= player.tx + 10; tx += 1) {
      for (let ty = player.ty - 7; ty <= player.ty + 4; ty += 1) {
        if (this.scene.worldModel.getTileType(tx, ty) !== TILE_TYPES.AIR) continue;
        const ceilingY = ty - 1;
        const type = this.scene.worldModel.getTileType(tx, ceilingY);
        if (!MUTABLE_TYPES.has(type)) continue;
        let airBelow = 0;
        while (airBelow < 8 && this.scene.worldModel.getTileType(tx, ty + airBelow) === TILE_TYPES.AIR) airBelow += 1;
        if (airBelow < 2) continue;
        const distance = Math.abs(tx - player.tx) + Math.abs(ceilingY - player.ty);
        candidates.push({
          tx, ty: ceilingY,
          type,
          airBelow,
          originalType: type,
          score: (this._isUnstable(tx, ceilingY) ? 8 : 0) - distance + Math.random() * 3,
        });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    const selected = [];
    for (const candidate of candidates) {
      if (selected.some(other => Math.abs(other.tx - candidate.tx) < 3)) continue;
      selected.push(candidate);
      if (selected.length >= limit) break;
    }
    return selected;
  }

  _queueCaveIn(candidate, chain) {
    this.caveIns.push({
      ...candidate,
      remaining: this.config.caveInWarningMs,
      chain,
      lastStage: -1,
      originalType: candidate.originalType || this.scene?.worldModel?.getTileType(candidate.tx, candidate.ty),
      originalHp: candidate.originalHp || this.scene?.worldModel?.getTileHp(candidate.tx, candidate.ty),
      _rubbleQueued: false,
    });
    this._log("cave-in queued", candidate);
  }

  _updateCaveIns(delta) {
    for (let i = this.caveIns.length - 1; i >= 0; i -= 1) {
      const caveIn = this.caveIns[i];
      caveIn.remaining -= delta;
      const elapsed = this.config.caveInWarningMs - caveIn.remaining;
      const stage = elapsed < 1000 ? 0 : elapsed < 2000 ? 1 : 2;
      if (stage !== caveIn.lastStage) {
        caveIn.lastStage = stage;
        this._emitDust(caveIn.tx, caveIn.ty + 1, stage === 0 ? 3 : 5);
        if (stage === 2) this._playTone("crack");
      }
      if (caveIn.remaining <= 0) {
        // ===== MODIFIED: collapse saves original type before destroying =====
        this._collapse(caveIn);
        this.caveIns.splice(i, 1);
      }
    }
  }

  /**
   * Collapse a cave-in tile — destroys it AND schedules rubble
   * restoration so the player gets "stuck" underground.
   * @param {Object} caveIn - { tx, ty, type, originalType }
   * @private
   */
  _collapse(caveIn) {
    const width = this.intensity === "cataclysmic" ? 3 : this.intensity === "major" ? 2 : 1;
    for (let offset = 0; offset < width; offset += 1) {
      const tx = caveIn.tx + offset;
      const ty = caveIn.ty;
      const type = this.scene.worldModel.getTileType(tx, ty);
      if (!MUTABLE_TYPES.has(type)) continue;
      const hp = this.scene.worldModel.getTileHp(tx, ty);
      const result = this.scene.worldModel.damageTile(tx, ty, Math.max(1, hp));
      if (!result.destroyed) continue;

      const reward = this.scene.digSystem?.processDestroyedTile(tx, ty, result.typeBeforeDamage, performance.now(), false, result.wasRubble);
      this.scene.showLootPickupFeedback?.(reward, { tx, ty });
      this._queueRubbleRestore({
        tx,
        ty,
        type,
        hp: Math.max(1, Math.floor(hp * (this.config.rubbleHpRatio || 0.25))),
        maxHp: this.scene.worldModel.getTileMaxHp(tx, ty, type),
        delayMs: this.config?.rubbleRestoreDelayMs || 3000,
        source: "cave-in",
      });

      // Emit falling rock visual
      this._spawnFallingRock(tx, ty, type);
    }
    this.scene.shakeSystem?.shake("earthquake.caveIn");
    this._playTone("collapse");

    if (this.scene.floatingTextSystem) {
      const ts = this.scene.config.tileSize;
      const worldX = caveIn.tx * ts + ts / 2;
      const worldY = (caveIn.ty - 1) * ts + ts / 2;
      this.scene.floatingTextSystem.showFloatingText(
        worldX, worldY,
        "💥 CAVE IN! Rubble blocking path",
        "#ff8800",
        2500,
        24
      );
    }

    this.scene.queueDugTilesSave?.();
    this._log("cave-in collapsed", caveIn);
  }

  _spawnFallingRock(tx, ty, type) {
    const ts = this.scene.config.tileSize;
    const x = tx * ts + ts / 2;
    const y = ty * ts + ts / 2;
    let landingTy = ty + 1;
    while (landingTy < ty + 12 && this.scene.worldModel.getTileType(tx, landingTy) === TILE_TYPES.AIR) landingTy += 1;
    const object = this.scene.add.rectangle(x, y, ts * 0.62, ts * 0.48, COLORS[type] ?? 0x777777).setDepth(35).setAngle(rand(-12, 12));
    this.fallingRocks.push({ object, x, y, previousY: y, endY: landingTy * ts - ts * 0.25, vy: 100, hit: false });
  }

  _updateFallingRocks(delta) {
    const seconds = delta / 1000;
    const body = this.scene.playerController?.physicsBody;
    for (let i = this.fallingRocks.length - 1; i >= 0; i -= 1) {
      const rock = this.fallingRocks[i];
      rock.previousY = rock.y;
      rock.vy += 1500 * seconds;
      rock.y = Math.min(rock.endY, rock.y + rock.vy * seconds);
      rock.object.y = rock.y;
      rock.object.angle += 160 * seconds;
      if (!rock.hit && body && this.impactCooldown <= 0 && this._rockCrossesBody(rock, body)) {
        rock.hit = true;
        this.impactCooldown = this.config.impactCooldownMs;
        const drained = this.scene.playerController.drainAllGemPower();
        const direction = body.x + body.w / 2 < rock.x ? -1 : 1;
        this.scene.playerController.applyExternalKnockback(direction * 430, -520);
        this.scene.shakeSystem?.shake("earthquake.rockImpact");
        this._log("player impact", { drainedGemPower: drained, zeroGpHit: drained <= 0 });
      }
      if (rock.y >= rock.endY) {
        this._emitDust(Math.floor(rock.x / this.scene.config.tileSize), Math.floor(rock.y / this.scene.config.tileSize), 5);
        rock.object.destroy();
        this.fallingRocks.splice(i, 1);
      }
    }
  }

  _rockCrossesBody(rock, body) {
    const halfWidth = this.scene.config.tileSize * 0.31;
    const bodyLeft = body.x;
    const bodyRight = body.x + body.w;
    const bodyTop = body.y;
    const bodyBottom = body.y + body.h;
    return rock.x + halfWidth >= bodyLeft && rock.x - halfWidth <= bodyRight
      && rock.y >= bodyTop && rock.previousY <= bodyBottom;
  }

  _warningFx(delta) {
    if (Math.random() < delta / 280) {
      const player = this.scene.playerController.getPlayerTile();
      this._emitDust(player.tx + randInt(-7, 7), player.ty - randInt(2, 6), 1);
    }
    if (this.scene.shakeSystem && !this.scene.shakeSystem._active) this.scene.shakeSystem.shake("earthquake.warning");
  }

  _quakeFx(delta) {
    const cfg = this.config.intensities[this.intensity];
    if (this.scene.shakeSystem && !this.scene.shakeSystem._active) this.scene.shakeSystem.shake("earthquake." + this.intensity);
    if (Math.random() < delta / 90) {
      const player = this.scene.playerController.getPlayerTile();
      this._emitDust(player.tx + randInt(-9, 9), player.ty - randInt(2, 8), 2);
    }
  }

  _emitDust(tx, ty, count) {
    const ts = this.scene.config.tileSize;
    for (let i = 0; i < count; i += 1) {
      const dot = this.scene.add.circle(tx * ts + rand(8, ts - 8), ty * ts + rand(5, ts * 0.5), rand(2, 5), 0xb9a58d, 0.75).setDepth(34);
      this.scene.tweens.add({ targets: dot, y: dot.y + rand(20, 60), x: dot.x + rand(-12, 12), alpha: 0, duration: rand(450, 1000), onComplete: () => dot.destroy() });
    }
  }

  _drawInstability() {
    this.stressFx.clear();
    const player = this.scene.playerController?.getPlayerTile();
    if (!player || this._getDepth() < 100) return;
    const ts = this.scene.config.tileSize;
    let drawn = 0;
    this.stressFx.lineStyle(2, 0x6e5445, 0.28);
    for (let ty = player.ty - 8; ty <= player.ty + 8 && drawn < 18; ty += 1) {
      for (let tx = player.tx - 10; tx <= player.tx + 10 && drawn < 18; tx += 1) {
        if (!MUTABLE_TYPES.has(this.scene.worldModel.getTileType(tx, ty)) || !this._isUnstable(tx, ty) || !this._hasAdjacentAir(tx, ty)) continue;
        const x = tx * ts;
        const y = ty * ts;
        this.stressFx.lineBetween(x + ts * 0.3, y + ts * 0.1, x + ts * 0.48, y + ts * 0.38);
        this.stressFx.lineBetween(x + ts * 0.48, y + ts * 0.38, x + ts * 0.62, y + ts * 0.62);
        drawn += 1;
      }
    }
  }

  _getPlayerOccupiedTileKeys() {
    const occupied = new Set();
    const body = this.scene.playerController?.physicsBody;
    const ts = this.scene.config.tileSize;

    if (!body || !Number.isFinite(ts) || ts <= 0) {
      const player = this.scene.playerController?.getPlayerTile();
      if (player) occupied.add(tileKey(player.tx, player.ty));
      return occupied;
    }

    const left = Math.floor(body.x / ts);
    const right = Math.floor((body.x + body.w - 1) / ts);
    const top = Math.floor(body.y / ts);
    const bottom = Math.floor((body.y + body.h - 1) / ts);

    for (let ty = top; ty <= bottom; ty += 1) {
      for (let tx = left; tx <= right; tx += 1) {
        occupied.add(tileKey(tx, ty));
      }
    }

    const player = this.scene.playerController?.getPlayerTile();
    if (player) occupied.add(tileKey(player.tx, player.ty));
    return occupied;
  }

  _isPlayerOccupiedTile(tx, ty) {
    return this._getPlayerOccupiedTileKeys().has(tileKey(tx, ty));
  }

  _isUnstable(tx, ty) {
    const depth = Math.max(0, ty - this.scene.config.topAirRows + 1);
    const chance = depth < 100 ? 0.01 : depth < 300 ? 0.03 : depth < 600 ? 0.06 : depth < 1000 ? 0.1 : 0.15;
    let hash = (tx * 73856093) ^ (ty * 19349663) ^ this.scene.config.seed;
    hash = ((hash >>> 0) * 2654435761) >>> 0;
    return (hash % 10000) / 10000 < chance;
  }

  _hasAdjacentAir(tx, ty) {
    const model = this.scene.worldModel;
    return model.getTileType(tx - 1, ty) === TILE_TYPES.AIR
      || model.getTileType(tx + 1, ty) === TILE_TYPES.AIR
      || model.getTileType(tx, ty - 1) === TILE_TYPES.AIR
      || model.getTileType(tx, ty + 1) === TILE_TYPES.AIR;
  }

  _getDepth() {
    const tile = this.scene.playerController?.getPlayerTile();
    return tile ? Math.max(0, tile.ty - this.scene.config.topAirRows + 1) : 0;
  }

  _getBand(depth) {
    return this.config.depthBands.find(band => depth >= band.min && depth <= band.max) ?? this.config.depthBands[0];
  }

  _scheduleNext() {
    const band = this._getBand(this._getDepth());
    const multiplier = this._debugEnabled() ? this.config.debugFrequencyMultiplier : 1;
    this.nextEventMs = rand(...this.config.baseIntervalMs) * band.cooldown / multiplier;
  }

  _rollIntensity(depth) {
    const weights = this._getBand(depth).weights;
    const roll = Math.random();
    let cumulative = 0;
    for (const [name, weight] of Object.entries(weights)) {
      cumulative += weight;
      if (roll <= cumulative) {
        this._log("intensity roll", { depth, roll, result: name, weights });
        return name;
      }
    }
    return "minor";
  }

  _debugEnabled() {
    return this.config.debugFlags?.Earthquakes === true;
  }

  _log(message, data) {
    if (!this._debugEnabled()) return;
    if (data === undefined) console.log(`[Earthquakes] ${message}`);
    else console.log(`[Earthquakes] ${message}`, data);
  }

  _installDebugApi() {
    if (!this._debugEnabled() || typeof window === "undefined") return;
    const system = this;
    window.earthquakeDebug = {
      system,
      status: () => system.getStatus(),
      force: intensity => {
        const selected = String(intensity ?? "minor").toLowerCase();
        if (!system.config.intensities[selected]) throw new Error(`Unknown intensity: ${selected}`);
        system.start(selected);
        return system.getStatus();
      },
      cancel: () => system.cancelActiveHazards(),
    };
  }

  _playTone(kind) {
    const soundSystem = this.scene.soundSystem;
    if (!soundSystem?.sfxEnabled) return;
    const context = this.scene.sound?.context;
    if (!context || context.state === "suspended" || typeof context.createOscillator !== "function") return;
    const settings = {
      rumble: [42, 1.2, 0.055],
      crack: [130, 0.18, 0.08],
      collapse: [58, 0.7, 0.12],
      settle: [75, 0.35, 0.035],
    }[kind];
    if (!settings) return;
    const [frequency, duration, volume] = settings;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = kind === "crack" ? "square" : "sawtooth";
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, frequency * 0.55), context.currentTime + duration);
    gain.gain.setValueAtTime(volume * (soundSystem.masterVolume ?? 1), context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }
}
