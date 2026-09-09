import { SHADOW_MINER_CONFIG } from "../../values/shadowMiner.js";

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function distance(left, right) {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

function capturePose(time, sprite, playerTile, actionTokens, actionContext) {
  const textureKey = sprite?.texture?.key;
  const frameName = sprite?.frame?.name;
  if (!textureKey || frameName === undefined || frameName === null) return null;
  const animationKey = sprite.anims?.currentAnim?.key || null;
  const normalizedAnimationKey = String(animationKey || "").toLowerCase();
  const targetTile = actionContext?.targetTile;
  const hasRelativeTarget = Number.isFinite(targetTile?.tx)
    && Number.isFinite(targetTile?.ty)
    && Number.isFinite(playerTile?.tx)
    && Number.isFinite(playerTile?.ty);
  return {
    time,
    x: finite(sprite.x),
    y: finite(sprite.y),
    tileX: Number.isFinite(playerTile?.tx) ? playerTile.tx : null,
    tileY: Number.isFinite(playerTile?.ty) ? playerTile.ty : null,
    textureKey,
    frameName,
    animationKey,
    frameIndex: finite(sprite.anims?.currentFrame?.index),
    flipX: sprite.flipX === true,
    originX: finite(sprite.originX, 0.5),
    originY: finite(sprite.originY, 0.5),
    displayWidth: Math.max(1, finite(sprite.displayWidth, sprite.width || 1)),
    displayHeight: Math.max(1, finite(sprite.displayHeight, sprite.height || 1)),
    action: Boolean(actionContext)
      || actionTokens.some(token => normalizedAnimationKey.includes(token)),
    actionTargetOffsetX: hasRelativeTarget
      ? Math.round(targetTile.tx - playerTile.tx)
      : null,
    actionTargetOffsetY: hasRelativeTarget
      ? Math.round(targetTile.ty - playerTile.ty)
      : null,
    actionDirectionX: Number.isFinite(actionContext?.direction?.x)
      ? Math.sign(actionContext.direction.x)
      : null,
    actionDirectionY: Number.isFinite(actionContext?.direction?.y)
      ? Math.sign(actionContext.direction.y)
      : null,
    actionTileType: Number.isFinite(actionContext?.tileType)
      ? actionContext.tileType
      : null,
  };
}

export class ShadowMinerPoseHistory {
  constructor(tileSize, config = SHADOW_MINER_CONFIG.history) {
    this.tileSize = Math.max(1, finite(tileSize, 1));
    this.config = config;
    this.samples = [];
    this.lastSampleAt = Number.NEGATIVE_INFINITY;
  }

  record(time, sprite, playerTile, actionContext = null) {
    if (!Number.isFinite(time)) return false;
    if (time - this.lastSampleAt < this.config.sampleIntervalMs) return false;
    const pose = capturePose(
      time,
      sprite,
      playerTile,
      this.config.actionAnimationTokens,
      actionContext,
    );
    if (!pose) return false;

    const previous = this.samples.at(-1);
    if (previous) {
      const gapMs = time - previous.time;
      const jumpPx = distance(previous, pose);
      if (
        gapMs > this.config.maximumSampleGapMs
        || jumpPx > this.config.maximumSampleJumpTiles * this.tileSize
      ) {
        this.clear();
      }
    }

    this.samples.push(pose);
    this.lastSampleAt = time;
    this._prune(time);
    return true;
  }

  sampleAt(targetTime) {
    const first = this.samples[0];
    const last = this.samples.at(-1);
    if (!first || !last || targetTime < first.time || targetTime > last.time) return null;
    if (targetTime === first.time) return { ...first };
    if (targetTime === last.time) return { ...last };

    let rightIndex = 1;
    while (
      rightIndex < this.samples.length
      && this.samples[rightIndex].time < targetTime
    ) {
      rightIndex += 1;
    }
    const right = this.samples[Math.min(rightIndex, this.samples.length - 1)];
    const left = this.samples[Math.max(0, rightIndex - 1)];
    const span = Math.max(1, right.time - left.time);
    const ratio = Math.max(0, Math.min(1, (targetTime - left.time) / span));
    const frameSource = ratio < 0.5 ? left : right;
    return {
      ...frameSource,
      time: targetTime,
      x: left.x + (right.x - left.x) * ratio,
      y: left.y + (right.y - left.y) * ratio,
    };
  }

  findFirstPose(startTime, endTime, predicate) {
    if (typeof predicate !== "function") return null;
    const pose = this.samples.find(sample => (
      sample.time >= startTime
      && sample.time <= endTime
      && predicate(sample)
    ));
    return pose ? { ...pose } : null;
  }

  getWindowSummary(startTime, endTime) {
    const poses = this.samples.filter(sample => (
      sample.time >= startTime && sample.time <= endTime
    ));
    let travelPx = 0;
    for (let index = 1; index < poses.length; index += 1) {
      travelPx += distance(poses[index - 1], poses[index]);
    }
    const actionSamples = poses.filter(pose => pose.action).length;
    return Object.freeze({
      ready: poses.length >= this.config.minimumReplaySamples
        && (travelPx >= this.config.minimumTravelTiles * this.tileSize || actionSamples > 0),
      samples: poses.length,
      travelTiles: travelPx / this.tileSize,
      actionSamples,
      startPose: this.sampleAt(startTime),
      endPose: this.sampleAt(endTime),
    });
  }

  getNearestActionWindow(referenceTime = this.lastSampleAt) {
    const windows = [];
    let active = [];
    const commit = () => {
      if (active.length >= this.config.minimumActionReplaySamples) {
        windows.push({
          startTime: active[0].time,
          endTime: active.at(-1).time,
          samples: active.length,
        });
      }
      active = [];
    };
    for (const sample of this.samples) {
      const previous = active.at(-1);
      if (
        sample.action !== true
        || (previous && sample.time - previous.time > this.config.maximumSampleGapMs)
      ) {
        commit();
      }
      if (sample.action === true) active.push(sample);
    }
    commit();
    if (windows.length === 0) return null;
    const distanceToWindow = window => {
      if (referenceTime < window.startTime) return window.startTime - referenceTime;
      if (referenceTime > window.endTime) return referenceTime - window.endTime;
      return 0;
    };
    const selected = windows.sort(
      (left, right) => distanceToWindow(left) - distanceToWindow(right),
    )[0];
    return Object.freeze({ ...selected });
  }

  replaceSamples(samples = []) {
    this.samples = samples
      .filter(sample => Number.isFinite(sample?.time))
      .map(sample => ({ ...sample }))
      .sort((left, right) => left.time - right.time);
    this.lastSampleAt = this.samples.at(-1)?.time ?? Number.NEGATIVE_INFINITY;
  }

  getSnapshot() {
    return Object.freeze({
      samples: this.samples.length,
      oldestAtMs: this.samples[0]?.time ?? null,
      newestAtMs: this.samples.at(-1)?.time ?? null,
    });
  }

  clear() {
    this.samples.length = 0;
    this.lastSampleAt = Number.NEGATIVE_INFINITY;
  }

  _prune(time) {
    const oldestAllowed = time - this.config.retentionMs;
    while (this.samples.length > 0 && this.samples[0].time < oldestAllowed) {
      this.samples.shift();
    }
  }
}
